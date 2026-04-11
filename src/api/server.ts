import { Database } from 'bun:sqlite';
import { readDoc, saveDoc } from '../lib/fs-adapter';

const API_PORT = parseInt(process.env.API_PORT || '3001', 10);
const DB_PATH = process.env.DB_PATH || './data/copilot.db';

// Open DB connection
const db = new Database(DB_PATH);

// Routes
const routes = {
  'GET /api/health': () => {
    return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  },

  'GET /api/docs': (request: Request) => {
    const url = new URL(request.url);
    const path = url.searchParams.get('path');
    
    if (!path) {
      return new Response(JSON.stringify({ error: 'Missing path parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    try {
      const { content, hash } = readDoc(path);
      return new Response(JSON.stringify({ content, hash, path }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: (err as Error).message }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  'POST /api/docs/save': async (request: Request) => {
    try {
      const body = await request.json() as { path: string; content: string };
      const { path, content } = body;
      
      if (!path || content === undefined) {
        return new Response(JSON.stringify({ error: 'Missing path or content' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const result = saveDoc(path, content);
      
      // Log save to DB
      try {
        const docId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        db.query(`
          INSERT INTO documents (id, path, content, hash) 
          VALUES (?, ?, ?, ?)
        `).run(docId, path, content, result.hash);
      } catch {
        // Table might not exist yet, ignore
      }
      
      return new Response(JSON.stringify({ ...result, path }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: (err as Error).message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

// Route matching
async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const pathname = url.pathname;
  
  const key = `${method} ${pathname}` as keyof typeof routes;
  
  if (key in routes) {
    const handler = routes[key];
    return (handler as any)(request);
  }
  
  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Start server
const server = Bun.serve({
  port: API_PORT,
  fetch: handleRequest
});

console.log(`[api] Server running on http://localhost:${API_PORT}`);
console.log(`[api] Health check: curl http://localhost:${API_PORT}/api/health`);
