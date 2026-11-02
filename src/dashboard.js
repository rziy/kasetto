"use strict";

const http = require("http");
const crypto = require("crypto");
const { ICON_KEYS } = require("./profile");
const defaultIcons = require("./icons");
const PAGE = require("./dashboard-page");

const MAX_BODY = 16 * 1024;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 10;

const sha = (s) => crypto.createHash("sha256").update(String(s)).digest();

function createDashboard({ password, host, port, store, logger, trustProxy = false }) {
  const expected = sha(password);
  const fails = new Map(); // ip -> { n, since }
  let loggedFirst = false;

  /**
   * Behind a trusted proxy the socket address is the proxy itself. The right-most
   * X-Forwarded-For entry is the one the proxy added, so a client cannot fake it
   * through that proxy.
   */
  function clientIp(req) {
    if (trustProxy) {
      const list = String(req.headers["x-forwarded-for"] || "").split(",").map((s) => s.trim()).filter(Boolean);
      if (list.length) return list[list.length - 1].slice(0, 64);
    }
    return req.socket.remoteAddress || "?";
  }

  function blocked(ip) {
    const f = fails.get(ip);
    if (!f) return false;
    if (Date.now() - f.since > WINDOW_MS) {
      fails.delete(ip);
      return false;
    }
    return f.n >= MAX_FAILS;
  }

  function authorized(req) {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Basic ")) return false;
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const given = decoded.slice(decoded.indexOf(":") + 1); // user name is ignored
    return crypto.timingSafeEqual(sha(given), expected);
  }

  function send(res, status, body, type = "application/json; charset=utf-8", extra = {}) {
    res.writeHead(status, {
      "Content-Type": type,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
      ...extra,
    });
    res.end(body);
  }

  function readBody(req) {
    return new Promise((resolve, reject) => {
      let size = 0;
      const chunks = [];
      req.on("data", (c) => {
        size += c.length;
        if (size > MAX_BODY) {
          reject(new Error("Request too large"));
          req.destroy();
        } else chunks.push(c);
      });
      req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      req.on("error", reject);
    });
  }

  const server = http.createServer(async (req, res) => {
    if (!loggedFirst) {
      loggedFirst = true;
      const h = (name) => String(req.headers[name] || "-").slice(0, 100);
      logger.info(`Dashboard first request: socket=${req.socket.remoteAddress} x-forwarded-for=${h("x-forwarded-for")} x-real-ip=${h("x-real-ip")} trustProxy=${trustProxy}`);
    }
    const ip = clientIp(req);
    if (blocked(ip)) return send(res, 429, '{"error":"Too many wrong passwords. Try again in 15 minutes."}');

    if (!authorized(req)) {
      if (req.headers.authorization) {
        if (fails.size > 5000) fails.clear(); // bounded memory
        const f = fails.get(ip) || { n: 0, since: Date.now() };
        f.n += 1;
        fails.set(ip, f);
      }
      return send(res, 401, "Password required", "text/plain; charset=utf-8", {
        "WWW-Authenticate": 'Basic realm="Turntable settings", charset="UTF-8"',
      });
    }
    fails.delete(ip);

    const url = (req.url || "/").split("?")[0];
    try {
      if (req.method === "GET" && url === "/") return send(res, 200, PAGE, "text/html; charset=utf-8");
      if (req.method === "GET" && url === "/api/profile") {
        return send(res, 200, JSON.stringify({ profile: store.get(), iconKeys: ICON_KEYS, defaults: defaultIcons }));
      }
      if (req.method === "POST" && url === "/api/profile") {
        // JSON-only blocks cross-site form posts (CSRF).
        if (!(req.headers["content-type"] || "").startsWith("application/json")) {
          return send(res, 415, '{"error":"Expected JSON"}');
        }
        const saved = store.save(JSON.parse(await readBody(req)));
        logger.info("Profile saved from the dashboard");
        return send(res, 200, JSON.stringify({ profile: saved }));
      }
      return send(res, 404, '{"error":"Not found"}');
    } catch (err) {
      return send(res, 400, JSON.stringify({ error: err.message }));
    }
  });

  server.on("error", (err) => logger.error(`Dashboard could not start: ${err.message}`));

  return {
    start: () => server.listen(port, host, () => logger.info(`Dashboard on http://${host}:${port} (password protected)`)),
    stop: () => server.close(),
  };
}

module.exports = { createDashboard };
