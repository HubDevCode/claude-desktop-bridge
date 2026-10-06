// Desktop in una scheda: serve noVNC su localhost e collega il WebSocket del browser
// al server VNC locale (wayvnc). Pensato per essere pilotato da Claude in Chrome.
import http from 'node:http';
import net from 'node:net';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 6080);
const VNC_PORT = Number(process.env.VNC_PORT || 5900);
const TOKEN = process.env.TOKEN || crypto.randomBytes(12).toString('hex');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const NOVNC = path.join(HERE, 'node_modules/@novnc/novnc');
const HOSTS = [`127.0.0.1:${PORT}`, `localhost:${PORT}`];
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };

// Il token è obbligatorio e l'host deve essere locale: impedisce che altre pagine web
// (o DNS rebinding) si colleghino al tuo desktop.
// Dopo il primo accesso con ?t=… il token resta in un cookie (serve ai moduli JS e al WebSocket).
const cookieToken = (req) => /(?:^|;\s*)dt=([0-9a-f]+)/.exec(req.headers.cookie || '')?.[1];
const allowed = (req, url) =>
  HOSTS.includes(req.headers.host || '') && (url.searchParams.get('t') === TOKEN || cookieToken(req) === TOKEN);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (!allowed(req, url)) return res.writeHead(403).end('forbidden');
  let file;
  if (url.pathname === '/') file = path.join(HERE, 'index.html');
  else if (url.pathname.startsWith('/novnc/')) file = path.join(NOVNC, path.normalize(url.pathname.slice(6)));
  if (!file || !file.startsWith(HERE) || file.includes('..')) return res.writeHead(404).end();
  try {
    const headers = { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' };
    if (url.searchParams.get('t') === TOKEN) headers['set-cookie'] = `dt=${TOKEN}; Path=/; HttpOnly; SameSite=Strict`;
    res.writeHead(200, headers);
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});

const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname !== '/websockify' || !allowed(req, url)) return socket.destroy();
  wss.handleUpgrade(req, socket, head, (ws) => {
    const tcp = net.connect(VNC_PORT, '127.0.0.1');
    tcp.on('data', (d) => ws.readyState === 1 && ws.send(d));
    ws.on('message', (d) => tcp.write(d));
    const close = () => { tcp.destroy(); ws.close(); };
    tcp.on('error', close); tcp.on('close', close); ws.on('close', close); ws.on('error', close);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${PORT}/?t=${TOKEN}`);
});
