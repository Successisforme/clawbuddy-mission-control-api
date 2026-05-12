const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3456;
const API_TOKEN = process.env.API_TOKEN || 'clawbuddy-mission-control-live-2024';

// Sample data structure (will be populated from webhook or file)
let dataCache = {
  timestamp: new Date().toISOString(),
  source: 'render-deployment',
  kpis: {
    current_month: { month: new Date().toISOString().slice(0, 7), calls: 0, contacts: 0, responses: 0, offers: 0, contracts: 0, deals: 0 },
    today: { date: new Date().toISOString().slice(0, 10), calls: 0, contacts: 0, responses: 0, offers: 0, deals: 0 },
    conversion_ratios: { calls_to_contact: 0, contact_to_response: 0, response_to_offer: 0, offer_to_contract: 0, contract_to_close: 0, calls_per_deal: 0 },
    targets: { monthly_deals: 1, annual_deals: 12, calls_per_deal: 75 }
  },
  deals: { active: [], pipeline: { lead: 0, contacted: 0, offer_made: 0, under_contract: 0, closed: 0 } },
  tasks: { backlog: [], in_progress: [], review: [], complete: [] },
  agents: { agents: [
    { name: "KPI Kenny", role: "KPI Tracker", status: "active", avatar: "kenny" },
    { name: "Data Agent", role: "Data Management", status: "active", avatar: "data" },
    { name: "Acquisitions", role: "Lead Management", status: "active", avatar: "acquisitions" },
    { name: "Disposition", role: "Buyer Coordination", status: "active", avatar: "disposition" }
  ]},
  calendar: { events: [], upcoming: [] },
  activities: []
};

// Load data from file if exists
const DATA_FILE = './data.json';
function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const fileData = fs.readFileSync(DATA_FILE, 'utf8');
      dataCache = JSON.parse(fileData);
      console.log('[API] Data loaded from file');
    } catch (e) {
      console.error('[API] Error loading data:', e.message);
    }
  }
}

// Save data to file
function saveData(data) {
  dataCache = { ...data, timestamp: new Date().toISOString() };
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(dataCache, null, 2));
  } catch (e) {
    console.error('[API] Error saving data:', e.message);
  }
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Token authentication
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (token !== API_TOKEN) {
    res.writeHead(401);
    res.end(JSON.stringify({ error: 'Unauthorized - invalid or missing token' }));
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  console.log(`${new Date().toISOString()} - ${req.method} ${url.pathname}`);

  let response;
  
  switch (url.pathname) {
    case '/api/kpis':
      response = dataCache.kpis;
      break;
    case '/api/deals':
      response = dataCache.deals;
      break;
    case '/api/tasks':
      response = dataCache.tasks;
      break;
    case '/api/agents':
      response = dataCache.agents;
      break;
    case '/api/calendar':
      response = dataCache.calendar;
      break;
    case '/api/all':
      response = dataCache;
      break;
    case '/api/trigger-sync':
      response = { status: 'synced', timestamp: new Date().toISOString() };
      break;
    case '/health':
      response = { status: 'ok', service: 'Mission Control API', version: '2.0.0' };
      break;
    case '/webhook/update':
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            saveData(data);
            res.writeHead(200);
            res.end(JSON.stringify({ status: 'updated', timestamp: new Date().toISOString() }));
          } catch (e) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }
        });
        return;
      }
      response = { error: 'Use POST for webhooks' };
      break;
    default:
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
  }

  res.writeHead(200);
  res.end(JSON.stringify(response, null, 2));
});

server.listen(PORT, () => {
  console.log(`[API] Mission Control API running on port ${PORT}`);
  loadData();
});
