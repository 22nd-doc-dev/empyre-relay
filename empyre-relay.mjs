#!/usr/bin/env node
// Empyre relay: run this on the PC that spectates the game and runs OBS.
//
//   node empyre-relay.mjs
//
// It does two things, both only on this PC (it listens on 127.0.0.1, nothing is exposed to the network):
//   1. Reads the League client's live game feed (https://127.0.0.1:2999, available while a game or spectator view is open).
//   2. Serves the Empyre overlay at http://127.0.0.1:4747/... so the overlay page can read that feed.
// No Riot API key, no login, no dependencies beyond Node 18+.
//
// Options:  --port 4747   --site https://tournaments.empyre.gg   --source <url of an allgamedata JSON, for testing>

import http from "node:http";
import https from "node:https";

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback; };
const PORT = Number(arg("port", 4747));
const SITE = new URL(arg("site", "https://tournaments.empyre.gg"));
const SOURCE = new URL(arg("source", "https://127.0.0.1:2999/liveclientdata/allgamedata"));

let state = null, stateAt = 0, inGame = false;

function poll() {
  const lib = SOURCE.protocol === "https:" ? https : http;
  // The game client uses Riot's own self-signed certificate; this request never leaves this PC.
  const req = lib.get(SOURCE, { rejectUnauthorized: false, timeout: 1500 }, (res) => {
    const chunks = [];
    res.on("data", (c) => chunks.push(c));
    res.on("end", () => {
      try {
        const body = Buffer.concat(chunks).toString("utf8");
        const j = JSON.parse(body);
        if (res.statusCode === 200 && Array.isArray(j.allPlayers)) { state = body; stateAt = Date.now(); setInGame(true, j); }
      } catch { /* loading screen returns partial data: ignore */ }
    });
  });
  req.on("timeout", () => req.destroy());
  req.on("error", () => { if (Date.now() - stateAt > 4000) { state = null; setInGame(false); } });
}
function setInGame(v, j) {
  if (v === inGame) return;
  inGame = v;
  console.log(v ? `✔ Game found (${j.allPlayers.length} players). Sending live data to the overlay.` : "… Waiting for a game. Open the spectator view in League.");
}

const CORS = { "access-control-allow-origin": "*", "access-control-allow-private-network": "true", "access-control-allow-headers": "*", "cache-control": "no-store" };

http.createServer((req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }
  if (req.url.startsWith("/__live/state")) {
    const fresh = state && Date.now() - stateAt < 4000;
    res.writeHead(fresh ? 200 : 503, { ...CORS, "content-type": "application/json" });
    return res.end(fresh ? state : '{"error":"no game"}');
  }
  // Everything else: pass through to the Empyre site, so the overlay page loads from this same local address.
  const lib = SITE.protocol === "https:" ? https : http;
  const headers = { ...req.headers, host: SITE.host };
  delete headers["accept-encoding"];
  const up = lib.request({ protocol: SITE.protocol, hostname: SITE.hostname, port: SITE.port || undefined, method: req.method, path: req.url, headers }, (r) => {
    const h = { ...r.headers };
    delete h["strict-transport-security"]; delete h["content-security-policy"];
    res.writeHead(r.statusCode ?? 502, h);
    r.pipe(res);
  });
  up.on("error", () => { res.writeHead(502, { "content-type": "text/plain" }); res.end("Empyre relay: couldn't reach " + SITE.host + ". Check the internet connection."); });
  req.pipe(up);
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Empyre relay is running on http://127.0.0.1:${PORT}`);
  console.log("Keep this window open during the broadcast. Use the “live” link from the Broadcast tab in OBS.");
  console.log("… Waiting for a game. Open the spectator view in League.");
  poll(); setInterval(poll, 500);
}).on("error", (e) => { console.error(e.code === "EADDRINUSE" ? `Port ${PORT} is already in use. Is the relay already running?` : e.message); process.exit(1); });
