/**
 * Mission Control API Bridge
 * Serves KPI and operational data for Lovable integration
 * 
 * Endpoints:
 * - GET /api/kpis - Current KPI metrics
 * - GET /api/deals - Active deals pipeline
 * - GET /api/tasks - Task board data
 * - GET /api/agents - Agent team status
 * - GET /api/calendar - Upcoming events
 * - GET /api/all - Complete data snapshot
 * 
 * Usage from Lovable:
 * fetch('http://localhost:3456/api/all')
 *   .then(r => r.json())
 *   .then(data => updateDashboard(data));
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Sample data structure (will be populated from actual systems)
const getKPIData = () => {
  // Read from SQLite or generate from memory
  return {
    currentMonth: {
      callsMade: 0,
      leadsContacted: 0,
      responsesReceived: 0,
      offersMade: 0,
      contractsSigned: 0,
      dealsClosed: 1,
      lastUpdated: new Date().toISOString()
    },
    targets: {
      monthlyDeals: 1,
      annualDeals: 12,
      callsPerDeal: 75
    },
    trends: {
      callsToContacts: 0,
      contactsToResponses: 0,
      callsPerDeal: 0
    }
  };
};

const getDealsData = () => {
  return {
    active: [
      {
        id: 'deal-001',
        address: 'Pending - Upload from REI Sift',
        status: 'under_contract',
        stage: 'acquisitions',
        purchasePrice: 0,
        estimatedSale: 0,
        spread: 0,
        daysInPipeline: 0,
        nextAction: 'Import from REI Sift',
        priority: 'high'
      }
    ],
    pipeline: {
      lead: 0,
      contacted: 0,
      offerMade: 0,
      underContract: 1,
      closed: 1
    }
  };
};

const getTasksData = () => {
  return {
    backlog: [
      { id: 't1', title: 'Setup SmrtPhone dialer', priority: 'high', tags: ['setup', 'calling'] },
      { id: 't2', title: 'Import REI Sift deals', priority: 'high', tags: ['data', 'integration'] }
    ],
    inProgress: [
      { id: 't3', title: 'Connect Mission Control', priority: 'high', tags: ['integration', 'active'], assignee: 'KPI Kenny' },
      { id: 't4', title: 'Review SMS campaign performance', priority: 'medium', tags: ['marketing', 'kpi'] },
      { id: 't5', title: 'Build buyer outreach system', priority: 'medium', tags: ['dispo', 'automation'] }
    ],
    review: [
      { id: 't6', title: 'Validate KPI tracking accuracy', priority: 'medium', tags: ['kpi', 'qa'] }
    ],
    complete: [
      { id: 't7', title: 'Created Mission Control integration', completed: '2026-05-09', tags: ['integration'] },
      { id: 't8', title: 'Closed last deal', completed: '2026-04-30', tags: ['deal'] },
      { id: 't9', title: 'Setup browser automation', completed: '2026-04-18', tags: ['tools'] }
    ]
  };
};

const getAgentsData = () => {
  return {
    agents: [
      {
        id: 'kpi-kenny',
        name: 'KPI Kenny',
        role: 'KPI Tracker',
        status: 'active',
        currentTask: 'Mission Control integration',
        lastActivity: new Date().toISOString(),
        skills: ['Data Analysis', 'Performance Tracking', 'Reporting'],
        metrics: { tasksCompleted: 5, accuracy: '98%' }
      },
      {
        id: 'data-agent',
        name: 'Data Agent',
        role: 'Data Management',
        status: 'standby',
        currentTask: 'Waiting for REI Sift sync',
        lastActivity: '2026-05-08T20:00:00Z',
        skills: ['Data Entry', 'List Management', 'REI Sift'],
        metrics: { recordsProcessed: 0, accuracy: '99%' }
      },
      {
        id: 'acquisitions-1',
        name: 'Acquisitions Agent 1',
        role: 'Lead Qualification',
        status: 'standby',
        currentTask: 'Waiting for SmrtPhone setup',
        lastActivity: '2026-05-01T10:00:00Z',
        skills: ['Cold Calling', 'Lead Qualification', 'Follow-up'],
        metrics: { callsMade: 0, leadsQualified: 0 }
      },
      {
        id: 'dispo-1',
        name: 'Disposition Agent 1',
        role: 'Buyer Outreach',
        status: 'standby',
        currentTask: 'Building buyer list',
        lastActivity: '2026-05-08T15:00:00Z',
        skills: ['Buyer Relations', 'Marketing', 'Deal Coordination'],
        metrics: { buyersContacted: 0, dealsMarketed: 0 }
      }
    ]
  };
};

const getCalendarData = () => {
  return {
    events: [
      {
        id: 'e1',
        title: 'Weekly KPI Review',
        date: '2026-05-11',
        time: '19:00',
        type: 'review',
        description: 'Automated weekly report delivery'
      },
      {
        id: 'e2',
        title: 'SmrtPhone License Expected',
        date: '2026-05-15',
        type: 'milestone',
        description: 'Cold calling operations can resume'
      },
      {
        id: 'e3',
        title: 'Mission Control Sync',
        date: '2026-05-09',
        time: '14:45',
        type: 'setup',
        description: 'Initial integration setup'
      }
    ],
    upcoming: [
      { title: 'Weekly KPI Review', daysUntil: 2 },
      { title: 'SmrtPhone License', daysUntil: 6 }
    ]
  };
};

const server = http.createServer((req, res) => {
  // CORS headers for Lovable integration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  console.log(`${new Date().toISOString()} - ${req.method} ${url.pathname}`);

  let response;
  
  switch (url.pathname) {
    case '/api/kpis':
      response = getKPIData();
      break;
    
    case '/api/deals':
      response = getDealsData();
      break;
    
    case '/api/tasks':
      response = getTasksData();
      break;
    
    case '/api/agents':
      response = getAgentsData();
      break;
    
    case '/api/calendar':
      response = getCalendarData();
      break;
    
    case '/api/all':
      response = {
        timestamp: new Date().toISOString(),
        kpis: getKPIData(),
        deals: getDealsData(),
        tasks: getTasksData(),
        agents: getAgentsData(),
        calendar: getCalendarData()
      };
      break;
    
    case '/health':
      response = { status: 'ok', service: 'Mission Control API', version: '1.0.0' };
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
  console.log(`
========================================
  Mission Control API Bridge
========================================
  Server running on http://localhost:${PORT}
  
  Available endpoints:
    - GET http://localhost:${PORT}/api/kpis
    - GET http://localhost:${PORT}/api/deals
    - GET http://localhost:${PORT}/api/tasks
    - GET http://localhost:${PORT}/api/agents
    - GET http://localhost:${PORT}/api/calendar
    - GET http://localhost:${PORT}/api/all
    - GET http://localhost:${PORT}/health
  
  From Lovable app, use:
    fetch('http://localhost:3456/api/all')
      .then(r => r.json())
      .then(data => console.log(data));
  
  Press Ctrl+C to stop
========================================
  `);
});

// Save data to file for persistence
const saveDataSnapshot = () => {
  const snapshot = {
    timestamp: new Date().toISOString(),
    kpis: getKPIData(),
    deals: getDealsData(),
    tasks: getTasksData(),
    agents: getAgentsData(),
    calendar: getCalendarData()
  };
  
  fs.writeFileSync(
    path.join(DATA_DIR, 'mission-control-data.json'),
    JSON.stringify(snapshot, null, 2)
  );
};

// Save initial snapshot
saveDataSnapshot();
console.log('Initial data snapshot saved to data/mission-control-data.json');
