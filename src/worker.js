import { DurableObject } from 'cloudflare:workers';
const C = ['members', 'cards', 'loans', 'entries'];

export class Ledger extends DurableObject {
  constructor(state, env) {
    super(state, env);
    this.sql = state.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS docs(c TEXT, id TEXT, v TEXT, PRIMARY KEY(c, id))');
    state.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  async fetch(req) {
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected websocket', { status: 426 });
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    const data = {};
    C.forEach((c) => (data[c] = {}));
    for (const r of this.sql.exec('SELECT c, id, v FROM docs')) data[r.c][r.id] = JSON.parse(r.v);
    server.send(JSON.stringify({ t: 'snap', data }));
    return new Response(null, { status: 101, webSocket: client });
  }
  webSocketMessage(ws, msg) {
    let j;
    try { j = JSON.parse(msg); } catch { return; }
    if (j.t !== 'ops' || !Array.isArray(j.ops)) return;
    const ok = [];
    for (const o of j.ops.slice(0, 500)) {
      if (!o || !C.includes(o.c) || typeof o.id !== 'string' || o.id.length > 40) continue;
      if (o.d) this.sql.exec('DELETE FROM docs WHERE c = ? AND id = ?', o.c, o.id);
      else {
        const v = JSON.stringify(o.v);
        if (!v || v.length > 200000) continue;
        this.sql.exec('INSERT OR REPLACE INTO docs(c, id, v) VALUES(?, ?, ?)', o.c, o.id, v);
      }
      ok.push(o);
    }
    ws.send(JSON.stringify({ t: 'ack' }));
    if (ok.length) for (const w of this.ctx.getWebSockets()) if (w !== ws) w.send(JSON.stringify({ t: 'ops', ops: ok }));
  }
  webSocketClose(ws) { try { ws.close(); } catch {} }
}

export default {
  fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname === '/api/ws') {
      const o = req.headers.get('Origin');
      if (o && new URL(o).host !== u.host) return new Response('Forbidden', { status: 403 });
      return env.LEDGER.get(env.LEDGER.idFromName('family')).fetch(req);
    }
    if (u.pathname === '/api/health') return Response.json({ ok: true });
    return new Response('Not found', { status: 404 });
  },
};
