/**
 * Mission Control API Bridge - LIVE DATA VERSION
 * Serves real KPI and operational data from kpi_tracker.db
 *
 * Server: http://localhost:3456
 *
 * Endpoints:
 * - GET /api/kpis - Current KPI metrics from database
 * - GET /api/deals - Active deals pipeline
 * - GET /api/tasks - Task board data
 * - GET /api/agents - Agent team status
 * - GET /api/calendar - Upcoming events
 * - GET /api/all - Complete data snapshot
 * - GET /api/trigger-sync - Force data refresh
 *
 * Webhooks:
 * - POST to http://localhost:3457/webhook/kpi-update to trigger sync
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure fetch is available (Node 18+)
const fetch = globalThis.fetch || require('node-fetch');

const PORT = process.env.PORT || 3456;
const SYNC_SCRIPT = path.join(__dirname, 'kpi-data-sync.py');
const DATA_FILE = path.join(__dirname, 'data', 'mission-control-data.json');

// API Token for authentication (set this in Lovable secrets or Render env vars)
const API_TOKEN = process.env.MISSION_CONTROL_TOKEN || process.env.API_TOKEN || 'clawbuddy-mission-control-live-2024';

// Cache for performance
let dataCache = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 5000; // 5 seconds

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function refreshData() {
  try {
    console.log('[API] Refreshing data from KPI tracker...');
    const output = execSync(`python3 "${SYNC_SCRIPT}" --mode api`, { encoding: 'utf8', timeout: 10000 });
    const data = JSON.parse(output);
    dataCache = data;
    lastCacheUpdate = Date.now();

    // Also save to file
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    console.log('[API] Data refreshed successfully');
    return data;
  } catch (error) {
    console.error('[API] Error refreshing data:', error.message);
    // Return cached data if available
    if (dataCache) return dataCache;

    // Try to read from file
    if (fs.existsSync(DATA_FILE)) {
      try {
        const fileData = fs.readFileSync(DATA_FILE, 'utf8');
        dataCache = JSON.parse(fileData);
        return dataCache;
      } catch (e) {
        console.error('[API] Error reading cached file:', e.message);
      }
    }

    // Fallback data
    return getFallbackData();
  }
}

function getCachedData() {
  if (!dataCache || (Date.now() - lastCacheUpdate) > CACHE_TTL) {
    return refreshData();
  }
  return dataCache;
}

function getFallbackData() {
  return {
    timestamp: new Date().toISOString(),
    source: 'fallback',
    kpis: {
      current_month: { month: new Date().toISOString().slice(0, 7), calls: 0, contacts: 0, responses: 0, offers: 0, contracts: 0, deals: 0 },
      today: { date: new Date().toISOString().slice(0, 10), calls: 0, contacts: 0, responses: 0, offers: 0, deals: 0 },
      conversion_ratios: { calls_to_contact: 0, contact_to_response: 0, response_to_offer: 0, offer_to_contract: 0, contract_to_close: 0, calls_per_deal: 0 },
      targets: { monthly_deals: 1, annual_deals: 12, calls_per_deal: 75 }
    },
    deals: { active: [], pipeline: { lead: 0, contacted: 0, offer_made: 0, under_contract: 0, closed: 0 } },
    tasks: { backlog: [], in_progress: [], review: [], complete: [] },
    agents: { agents: [] },
    calendar: { events: [], upcoming: [] }
  };
}

const server = http.createServer((req, res) => {
  // CORS headers for Lovable integration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  console.log(`${new Date().toISOString()} - ${req.method} ${url.pathname}`);

  // Public routes (no auth required)
  if (url.pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ 
      status: 'ok', 
      service: 'Mission Control API (LIVE)', 
      version: '2.0.0',
      data_source: dataCache ? dataCache.source : 'unknown',
      last_update: dataCache ? dataCache.timestamp : null
    }));
    return;
  }

  if (url.pathname === '/') {
    res.writeHead(200);
    res.end(JSON.stringify({ 
      service: 'Mission Control API',
      version: '2.0.0',
      endpoints: ['/api/all', '/api/kpis', '/api/deals', '/api/tasks', '/api/agents', '/api/calendar', '/api/chat', '/health']
    }));
    return;
  }

  // Token authentication for protected routes
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token !== API_TOKEN) {
    res.writeHead(401);
    res.end(JSON.stringify({ error: 'Unauthorized - invalid or missing token' }));
    return;
  }

  let response;

  switch (url.pathname) {
    case '/api/kpis':
      response = getCachedData().kpis;
      break;

    case '/api/deals':
      response = getCachedData().deals;
      break;

    case '/api/tasks':
      response = getCachedData().tasks;
      break;

    case '/api/agents':
      response = getCachedData().agents;
      break;

    case '/api/calendar':
      response = getCachedData().calendar;
      break;

    case '/api/all':
      response = getCachedData();
      break;

    case '/api/trigger-sync':
      response = refreshData();
      response = { status: 'synced', timestamp: response.timestamp, source: response.source };
      break;
    
    case '/api/chat':
      if (req.method !== 'POST') {
        res.writeHead(405);
        res.end(JSON.stringify({ error: 'Method not allowed - use POST' }));
        return;
      }
      
      // Handle chat request
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { agent_name = 'Agent', agent_role = '', agent_subtitle = '', message, history = [] } = JSON.parse(body);
          
          if (!message) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'message required' }));
            return;
          }

          const system = `You are ${agent_name}, ${agent_role} at Private Wealth Holdings (OpenClaw mission control). ${agent_subtitle} Stay in character. Be concise and useful.`;
          const msgs = [
            { role: 'system', content: system },
            ...history.slice(-20).map(m => ({ role: m.role === 'agent' ? 'assistant' : m.role, content: m.content })),
            { role: 'user', content: message },
          ];

          // Use Anthropic since that's what you have
          const anthropicKey = process.env.ANTHROPIC_API_KEY;
          if (!anthropicKey) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }));
            return;
          }

          const r = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json', 
              'x-api-key': anthropicKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({ 
              model: 'claude-3-haiku-20240307', 
              max_tokens: 1024,
              messages: msgs.filter(m => m.role !== 'system'),
              system: system
            }),
          });
          
          if (!r.ok) {
            const errText = await r.text();
            res.writeHead(502);
            res.end(JSON.stringify({ error: `Anthropic ${r.status}`, detail: errText }));
            return;
          }
          
          const j = await r.json();
          res.writeHead(200);
          res.end(JSON.stringify({ reply: j.content?.[0]?.text?.trim() || '(no reply)' }));
        } catch (e) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return; // Async handler, return here

    default:
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
  }

  res.writeHead(200);
  res.end(JSON.stringify(response, null, 2));
});

// Auto-refresh data every 30 seconds
setInterval(() => {
  try {
    refreshData();
  } catch (e) {
    console.error('[API] Auto-refresh error:', e.message);
  }
}, 30000);

// Initial data load
console.log('[API] Loading initial data...');
refreshData();

server.listen(PORT, () => {
  console.log(`
========================================
  Mission Control API - LIVE DATA
========================================
  Server running on http://localhost:${PORT}

  LIVE endpoints:
    - GET http://localhost:${PORT}/api/all     (complete live snapshot)
    - GET http://localhost:${PORT}/api/kpis    (live KPIs from DB)
    - GET http://localhost:${PORT}/api/deals   (active deals)
    - GET http://localhost:${PORT}/api/tasks   (task board)
    - GET http://localhost:${PORT}/api/agents  (team status)
    - GET http://localhost:${PORT}/api/calendar (events)
    - GET http://localhost:${PORT}/api/trigger-sync (force refresh)
    - GET http://localhost:${PORT}/health      (status check)

  From Lovable app:
    fetch('http://localhost:3456/api/all')
      .then(r => r.json())
      .then(data => console.log(data));

  Webhook endpoint:
    http://localhost:3457/webhook/kpi-update

  Press Ctrl+C to stop
========================================
  `);
});

// Save data to file for persistence
process.on('SIGINT', () => {
  console.log('\n[API] Shutting down...');
  if (dataCache) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(dataCache, null, 2));
    console.log('[API] Final data saved');
  }
  process.exit(0);
});
