/**
 * Lovable Mission Control Integration
 * Add this file to your Lovable app to connect to KPI Kenny
 * 
 * Instructions:
 * 1. Copy this file into your Lovable project
 * 2. Import it in your main App.tsx or App.jsx:
 *    import { MissionControlClient } from './lovable-integration';
 * 3. Initialize: const client = new MissionControlClient();
 * 4. Use: const data = await client.getAllData();
 * 
 * Or use the React hook:
 *    import { useMissionControl } from './lovable-integration';
 *    const { data, loading, error, refresh } = useMissionControl();
 */

const API_BASE_URL = 'http://localhost:3456';
const POLLING_INTERVAL = 30000; // 30 seconds

// Main client class
export class MissionControlClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || API_BASE_URL;
    this.pollingInterval = options.pollingInterval || POLLING_INTERVAL;
    this.onUpdate = options.onUpdate || (() => {});
    this.pollingIntervalId = null;
    this.lastData = null;
  }

  // Health check
  async health() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return await response.json();
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  // Get all data
  async getAllData() {
    try {
      const response = await fetch(`${this.baseUrl}/api/all`);
      const data = await response.json();
      this.lastData = data;
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch data: ${error.message}`);
    }
  }

  // Get specific endpoints
  async getKPIs() {
    const response = await fetch(`${this.baseUrl}/api/kpis`);
    return await response.json();
  }

  async getDeals() {
    const response = await fetch(`${this.baseUrl}/api/deals`);
    return await response.json();
  }

  async getTasks() {
    const response = await fetch(`${this.baseUrl}/api/tasks`);
    return await response.json();
  }

  async getAgents() {
    const response = await fetch(`${this.baseUrl}/api/agents`);
    return await response.json();
  }

  async getCalendar() {
    const response = await fetch(`${this.baseUrl}/api/calendar`);
    return await response.json();
  }

  // Start polling for updates
  startPolling() {
    if (this.pollingIntervalId) return;
    
    this.pollingIntervalId = setInterval(async () => {
      try {
        const data = await this.getAllData();
        this.onUpdate(data);
      } catch (error) {
        console.warn('Polling error:', error);
      }
    }, this.pollingInterval);
  }

  // Stop polling
  stopPolling() {
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
    }
  }
}

// React hook for easy integration
export function useMissionControl(options = {}) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [connected, setConnected] = React.useState(false);

  const clientRef = React.useRef(new MissionControlClient({
    ...options,
    onUpdate: (newData) => {
      setData(newData);
      setLoading(false);
    }
  }));

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const newData = await clientRef.current.getAllData();
      setData(newData);
      setError(null);
      setConnected(true);
    } catch (err) {
      setError(err.message);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // Initial load
    refresh();
    
    // Start polling
    clientRef.current.startPolling();
    
    return () => {
      clientRef.current.stopPolling();
    };
  }, [refresh]);

  return { data, loading, error, connected, refresh };
}

// Standalone function for vanilla JS
export async function fetchMissionControlData() {
  const client = new MissionControlClient();
  return await client.getAllData();
}

// Example usage component
export function MissionControlExample() {
  const { data, loading, error, connected, refresh } = useMissionControl();

  if (loading) return <div>Connecting to Mission Control...</div>;
  if (error) return (
    <div>
      <p>Error: {error}</p>
      <p>Make sure the API server is running on your local machine:</p>
      <code>node mission-control-api.js</code>
      <button onClick={refresh}>Retry</button>
    </div>
  );

  return (
    <div>
      <h2>Mission Control Connected {connected ? '✓' : '✗'}</h2>
      
      {/* KPIs */}
      <section>
        <h3>KPIs</h3>
        <p>Deals Closed: {data?.kpis?.currentMonth?.dealsClosed || 0}</p>
        <p>Calls Made: {data?.kpis?.currentMonth?.callsMade || 0}</p>
      </section>

      {/* Tasks */}
      <section>
        <h3>Tasks</h3>
        <p>Backlog: {data?.tasks?.backlog?.length || 0}</p>
        <p>In Progress: {data?.tasks?.inProgress?.length || 0}</p>
        <p>Review: {data?.tasks?.review?.length || 0}</p>
      </section>

      {/* Agents */}
      <section>
        <h3>Active Agents</h3>
        <ul>
          {data?.agents?.agents?.map(agent => (
            <li key={agent.id}>
              {agent.name} - {agent.status} - {agent.currentTask}
            </li>
          ))}
        </ul>
      </section>

      <button onClick={refresh}>Refresh</button>
    </div>
  );
}

// Default export
export default {
  MissionControlClient,
  useMissionControl,
  fetchMissionControlData,
  MissionControlExample
};

// Quick integration snippet for Lovable
/*
Add this to your Lovable app:

1. Create a new file: lovable-integration.js
2. Copy the above code into it
3. In your main component:

import { MissionControlClient } from './lovable-integration';

function App() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const client = new MissionControlClient({
      onUpdate: (newData) => setData(newData)
    });
    
    client.getAllData().then(setData);
    client.startPolling();
    
    return () => client.stopPolling();
  }, []);

  return (
    <div>
      {data ? (
        <div>Connected! Deals: {data.kpis.currentMonth.dealsClosed}</div>
      ) : (
        <div>Connecting to Mission Control...</div>
      )}
    </div>
  );
}
*/
