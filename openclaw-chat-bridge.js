/**
 * OpenClaw Chat Bridge
 * HTTP endpoint for Mission Control → Direct Agent Responses
 * 
 * POST /api/chat
 * Body: { agent_name, agent_role, agent_subtitle, message, history }
 * Response: { reply }
 */

const http = require('http');

const BRIDGE_PORT = 3458;

// Agent response generators
const agents = {
  'KPI Kenny': {
    role: 'KPI Tracker',
    subtitle: 'Navigator of performance metrics',
    responses: {
      greeting: 'KPI Kenny here. Tracking your numbers. What do you need?',
      numbers: 'Today: 50 calls dialed, 15 contacts made, 3 offers sent. Conversion rate: 30% contact rate.',
      default: 'Looking at your metrics. The trend shows steady activity. Need specific numbers?'
    }
  },
  'Data Agent': {
    role: 'Data Manager',
    subtitle: 'REI Sift and SmrtPhone integration',
    responses: {
      greeting: 'Data Agent online. Ready to sync your leads.',
      default: 'I can pull from REI Sift, process through Sensei Flow, and push to SmrtPhone. What do you need?'
    }
  },
  'Acquisitions': {
    role: 'Deal Hunter',
    subtitle: 'Finding and negotiating deals',
    responses: {
      greeting: 'Acquisitions here. Looking for the next deal.',
      default: 'I track offers, follow-ups, and negotiations. Need deal status?'
    }
  },
  'Disposition': {
    role: 'Deal Seller',
    subtitle: 'Selling to buyers',
    responses: {
      greeting: 'Disposition here. Ready to move inventory.',
      default: 'I manage buyer lists and marketing. Need to push a deal?'
    }
  },
  'Marketing': {
    role: 'Lead Generator',
    subtitle: 'SMS and cold calling campaigns',
    responses: {
      greeting: 'Marketing here. Campaigns ready to deploy.',
      default: 'I handle SMS lists and dialer uploads. What campaign needs to run?'
    }
  }
};

function generateResponse(agentName, message, history) {
  const agent = agents[agentName] || agents['KPI Kenny'];
  const msg = message.toLowerCase();
  
  // Simple intent matching
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
    return agent.responses.greeting;
  }
  
  if (msg.includes('number') || msg.includes('kpi') || msg.includes('metric') || msg.includes('today')) {
    return agent.responses.numbers || agent.responses.default;
  }
  
  if (msg.includes('sync') || msg.includes('pull') || msg.includes('push')) {
    return 'I can sync data between systems. Which direction? REI Sift → SmrtPhone? Or check current pipeline?';
  }
  
  if (msg.includes('deal') || msg.includes('offer') || msg.includes('contract')) {
    return 'Deal tracking is my specialty. What stage are we looking at? Lead, contacted, offer, or contract?';
  }
  
  if (msg.includes('buyer') || msg.includes('sell') || msg.includes('buy')) {
    return 'Buyer list management. I can segment by price, location, or timeline. What do you need?';
  }
  
  if (msg.includes('campaign') || msg.includes('sms') || msg.includes('call')) {
    return 'Campaign management ready. Which list needs to run? Tier 1 (Hot), Tier 2 (Warm), or Tier 3 (Cold)?';
  }
  
  return agent.responses.default;
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${BRIDGE_PORT}`);
  
  console.log(`${new Date().toISOString()} - ${req.method} ${url.pathname}`);

  if (req.method === 'POST' && url.pathname === '/api/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { agent_name = 'Agent', agent_role = '', agent_subtitle = '', message, history = [] } = data;
        
        if (!message) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'message required' }));
          return;
        }

        console.log(`[Bridge] Chat request for ${agent_name}: "${message.substring(0, 50)}..."`);
        
        // Generate response
        const reply = generateResponse(agent_name, message, history);
        
        res.writeHead(200);
        res.end(JSON.stringify({ reply }));
        
      } catch (err) {
        console.error('[Bridge] Error:', err.message);
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (url.pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ 
      status: 'ok', 
      service: 'OpenClaw Chat Bridge',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(BRIDGE_PORT, () => {
  console.log(`
========================================
  OpenClaw Chat Bridge - RUNNING
========================================
  Server: http://localhost:${BRIDGE_PORT}
  
  Endpoints:
    - POST http://localhost:${BRIDGE_PORT}/api/chat
    - GET  http://localhost:${BRIDGE_PORT}/health
  
  Agents available:
    - KPI Kenny
    - Data Agent
    - Acquisitions
    - Disposition
    - Marketing
  
  Test command:
    curl -X POST http://localhost:${BRIDGE_PORT}/api/chat \\
      -H "Content-Type: application/json" \\
      -d '{"agent_name":"KPI Kenny","message":"Hello"}'
  
========================================
  `);
});

process.on('SIGINT', () => {
  console.log('\n[Bridge] Shutting down...');
  process.exit(0);
});
