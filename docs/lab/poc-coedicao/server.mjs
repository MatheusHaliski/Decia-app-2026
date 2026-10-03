// PoC de coedição — Work Station / DECIA "Minuta Coletiva"
// Servidor mínimo: HTTP (serve client.html + módulos ESM de node_modules) e WebSocket (protocolo y-websocket:
// sync + awareness). Equivale ao setupWSConnection de @y/websocket-server, reescrito em ~80 linhas para
// mostrar o que o adapter `CollabDocPort` (ws-infrastructure) precisa cobrir.
//
// Uso: node server.mjs [porta]   → http://localhost:1234/?room=minuta-demo&user=Maria
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

const PORT = Number(process.argv[2] || process.env.PORT || 1234);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const NODE_MODULES = path.join(ROOT, 'node_modules');
const MSG_SYNC = 0, MSG_AWARENESS = 1;

/* ---------------------------------------------------------------- documentos em memória (um por sala) */
const docs = new Map(); // room → { doc, awareness, conns:Set<ws> }
function getRoom(name) {
  let r = docs.get(name);
  if (r) return r;
  const doc = new Y.Doc({ gc: true });
  const awareness = new awarenessProtocol.Awareness(doc);
  awareness.setLocalState(null);
  r = { doc, awareness, conns: new Set(), updates: 0 };
  // propaga updates do doc a todas as conexões (é o ponto onde um adapter persistiria: snapshot S3 + evento Cassandra)
  doc.on('update', (update, origin) => {
    r.updates++;
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MSG_SYNC);
    syncProtocol.writeUpdate(enc, update);
    const buf = encoding.toUint8Array(enc);
    for (const c of r.conns) if (c !== origin) send(c, buf);
  });
  awareness.on('update', ({ added, updated, removed }, origin) => {
    const changed = added.concat(updated, removed);
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MSG_AWARENESS);
    encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(awareness, changed));
    const buf = encoding.toUint8Array(enc);
    for (const c of r.conns) send(c, buf);
  });
  docs.set(name, r);
  return r;
}
function send(ws, buf) { if (ws.readyState === ws.OPEN) ws.send(buf, (err) => { if (err) ws.terminate(); }); }

/* ---------------------------------------------------------------- WebSocket */
const wss = new WebSocketServer({ noServer: true });
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://x');
  const roomName = url.pathname.replace(/^\/+/, '') || 'default';
  const room = getRoom(roomName);
  room.conns.add(ws);
  ws.binaryType = 'arraybuffer';
  const controlled = new Set(); // clientIDs de awareness desta conexão
  ws.on('message', (data) => {
    const dec = decoding.createDecoder(new Uint8Array(data));
    const enc = encoding.createEncoder();
    const type = decoding.readVarUint(dec);
    if (type === MSG_SYNC) {
      encoding.writeVarUint(enc, MSG_SYNC);
      syncProtocol.readSyncMessage(dec, enc, room.doc, ws);
      if (encoding.length(enc) > 1) send(ws, encoding.toUint8Array(enc));
    } else if (type === MSG_AWARENESS) {
      const upd = decoding.readVarUint8Array(dec);
      // registra os clientIDs para limpar quando a conexão cair
      const d2 = decoding.createDecoder(upd); const n = decoding.readVarUint(d2);
      for (let i = 0; i < n; i++) { controlled.add(decoding.readVarUint(d2)); decoding.readVarUint(d2); decoding.readVarString(d2); }
      awarenessProtocol.applyAwarenessUpdate(room.awareness, upd, ws);
    }
  });
  ws.on('close', () => {
    room.conns.delete(ws);
    awarenessProtocol.removeAwarenessStates(room.awareness, [...controlled], null);
  });
  // passo 1 do sync: envia o state vector e o awareness atual
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, MSG_SYNC);
  syncProtocol.writeSyncStep1(enc, room.doc);
  send(ws, encoding.toUint8Array(enc));
  const states = room.awareness.getStates();
  if (states.size > 0) {
    const e2 = encoding.createEncoder();
    encoding.writeVarUint(e2, MSG_AWARENESS);
    encoding.writeVarUint8Array(e2, awarenessProtocol.encodeAwarenessUpdate(room.awareness, [...states.keys()]));
    send(ws, encoding.toUint8Array(e2));
  }
});

/* ---------------------------------------------------------------- HTTP: client.html + /vendor/<pacote>/<sub> (ESM, condição "browser") */
function resolveVendor(spec) {
  const m = spec.match(/^(@[^/]+\/[^/]+|[^/]+)(?:\/(.*))?$/);
  if (!m) return null;
  const [, pkg, sub] = m;
  const pkgDir = path.join(NODE_MODULES, pkg);
  const pj = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
  const key = sub ? `./${sub}` : '.';
  let target = pj.exports?.[key] ?? pj.exports?.[key + '.js'];
  const pick = (t) => {
    if (typeof t === 'string') return t;
    if (!t) return null;
    for (const c of ['browser', 'module', 'import', 'default']) if (t[c]) { const r = pick(t[c]); if (r) return r; }
    return null;
  };
  let file = pick(target);
  if (!file && sub && fs.existsSync(path.join(pkgDir, sub)) && fs.statSync(path.join(pkgDir, sub)).isFile()) file = `./${sub}`; // import relativo interno (./trait/x.js)
  if (!file && sub && fs.existsSync(path.join(pkgDir, sub + '.js'))) file = `./${sub}.js`;
  if (!file && !sub) file = pj.module || pj.main;
  return file ? path.join(pkgDir, file) : null;
}
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/' || url.pathname === '/client.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return fs.createReadStream(path.join(ROOT, 'client.html')).pipe(res);
  }
  if (url.pathname === '/status') {
    const out = {};
    for (const [k, r] of docs) out[k] = { conns: r.conns.size, updates: r.updates, textLength: r.doc.getText('minuta').length, awareness: r.awareness.getStates().size };
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(out));
  }
  if (url.pathname.startsWith('/vendor/')) {
    try {
      const file = resolveVendor(decodeURIComponent(url.pathname.slice('/vendor/'.length)));
      if (file && fs.existsSync(file)) {
        res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' });
        return fs.createReadStream(file).pipe(res);
      }
    } catch (e) { /* cai no 404 */ }
  }
  res.writeHead(404); res.end('not found');
});
server.on('upgrade', (req, socket, head) => wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req)));
server.listen(PORT, () => console.log(`[poc-coedicao] http://localhost:${PORT}/?room=minuta-demo&user=Maria  (ws://localhost:${PORT}/<sala>)`));
