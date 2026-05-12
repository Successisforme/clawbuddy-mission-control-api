/**
 * Lovable Mission Control Integration - v2.0
 * Real-time sync with webhooks and polling
 * 
 * Instructions:
 * 1. Copy this file into your Lovable project
 * 2. Import: import { MissionControlClient } from './lovable-integration';
 * 3. Initialize: const client = new MissionControlClient();
 * 4. Use: const data = await client.getAllData();
 * 
 * OR use the React hook:
 *    import { useMissionControl } from './lovable-integration';
 *    const { data, loading, error, refresh, triggerWebhook } = useMissionControl();
 */

const API_BASE_URL = 'http://localhost:3456';
const WEBHOOK_URL = 'http://localhost:3457/webhook/kpi-update';
const POLLING_INTERVAL = 30000; // 30 seconds

// Main client class
export class MissionControlClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || API_BASE_URL;
    this.webhookUrl = options.webhookUrl || WEBHOOK_URL;
    this.pollingInterval = options.pollingInterval || POLLING_INTERVAL;
    this.onUpdate = options.onUpdate || (() => {});
    this.onWebhook = options.onWebhook || (() => {});
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

  // Trigger webhook (push update to server)
  async triggerWebhook(payload = {}) {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'lovable-app',
          timestamp: new Date().toISOString(),
          ...payload
        })
      });
      return await response.json();
    } catch (error) {
      console.warn('Webhook trigger failed:', error);
      return { status: 'error', error: error.message };
    }
  }

  // Force sync from server
  async forceSync() {
    try {
      const response = await fetch(`${this.baseUrl}/api/trigger-sync`);
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to trigger sync: ${error.message}`);
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
  const [lastSync, setLastSync] = React.useState(null);

  const clientRef = React.useRef(new MissionControlClient({
    ...options,
    onUpdate: (newData) => {
      setData(newData);
      setLoading(false);
      setLastSync(new Date());
    }
  }));

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const newData = await clientRef.current.getAllData();
      setData(newData);
      setError(null);
      setConnected(true);
      setLastSync(new Date());
    } catch (err) {
      setError(err.message);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerWebhook = React.useCallback(async (payload = {}) => {
    try {
      const result = await clientRef.current.triggerWebhook(payload);
      // After triggering webhook, refresh data
      setTimeout(refresh, 1000);
      return result;
    } catch (err) {
      console.error('Webhook failed:', err);
      return { status: 'error', error: err.message };
    }
  }, [refresh]);

  const forceSync = React.useCallback(async () => {
    try {
      const result = await clientRef.current.forceSync();
      await refresh();
      return result;
    } catch (err) {
      console.error('Force sync failed:', err);
      return { status: 'error', error: err.message };
    }
  }, [refresh]);

  React.useEffect(() => {
    // Initial load
    refresh();
    
    // Start polling
    clientRef.current.startPolling();
    
    return () => {
      clientRef.current.stopPolling();
    };
  }, [refresh]);

  return { 
    data, 
    loading, 
    error, 
    connected, 
    lastSync,
    refresh,
    triggerWebhook,
    forceSync
  };
}

// Standalone function for vanilla JS
export async function fetchMissionControlData() {
  const client = new MissionControlClient();
  return await client.getAllData();
}

// Push update to server
export async function pushMissionControlUpdate(payload = {}) {
  const client = new MissionControlClient();
  return await client.triggerWebhook(payload);
}

// Example usage component
export function MissionControlDashboard() {
  const { data, loading, error, connected, lastSync, refresh, triggerWebhook, forceSync } = useMissionControl();

  if (loading && !data) return (
    <div style={{ padding: 20 }}>
      <h2>Connecting to Mission Control...</h2>
      <p>Establishing real-time sync...</p>
    </div>
  );
  
  if (error) return (
    <div style={{ padding: 20 }}>
      <h2>Connection Error</h2>
      <p>{error}</p>
      <p>Make sure the API server is running on your local machine:</p>
      <code style={{ background: '#f0f0f0', padding: 10, display: 'block' }}>
        node mission-control-api-live.js
      </code>
      <button onClick={refresh} style={{ marginTop: 10 }}>Retry Connection</button>
    </div>
  );

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Mission Control {connected ? '🟢' : '🔴'}</h2>
        <div>
          <button onClick={forceSync} style={{ marginRight: 10 }}>Force Sync</button>
          <button onClick={refresh}>Refresh</button>
        </div>
      </div>
      
      {lastSync && (
        <p>Last sync: {lastSync.toLocaleTimeString()}</p>
      )}
      
      {/* KPIs */}
      <section style={{ marginTop: 20, padding: 15, background: '#f9f9f9', borderRadius: 8 }}>
        <h3>📊 KPIs - {data?.kpis?.current_month?.month}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15 }}>
          <div>
            <strong>Deals Closed</strong>
            <p>{data?.kpis?.current_month?.deals || 0}</p>
          </div>
          <div>
            <strong>Calls Made</strong>
            <p>{data?.kpis?.current_month?.calls || 0}</p>
          </div>
          <div>
            <strong>Contacts</strong>
            <p>{data?.kpis?.current_month?.contacts || 0}</p>
          </div>
          <div>
            <strong>Offers</strong>
            <p>{data?.kpis?.current_month?.offers || 0}</p>
          </div>
          <div>
            <strong>Contracts</strong>
            <p>{data?.kpis?.current_month?.contracts || 0}</p>
          </div>
          <div>
            <strong>Calls/Deal</strong>
            <p>{data?.kpis?.conversion_ratios?.calls_per_deal || 0}</p>
          </div>
        </div>
      </section>

      {/* Tasks */}
      <section style={{ marginTop: 20, padding: 15, background: '#f9f9f9', borderRadius: 8 }}>
        <h3>📋 Task Board</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <div>
            <strong>Backlog</strong>
            <p>{data?.tasks?.backlog?.length || 0}</p>
          </div>
          <div>
            <strong>In Progress</strong>
            <p>{data?.tasks?.in_progress?.length || 0}</p>
          </div>
          <div>
            <strong>Review</strong>
            <p>{data?.tasks?.review?.length || 0}</p>
          </div>
          <div>
            <strong>Complete</strong>
            <p>{data?.tasks?.complete?.length || 0}</p>
          </div>
        </div>
      </section>

      {/* Agents */}
      <section style={{ marginTop: 20, padding: 15, background: '#f9f9f9', borderRadius: 8 }}>
        <h3>👥 Agent Team</h3>
        <div>
          {data?.agents?.agents?.map(agent => (
            <div key={agent.id} style={{ 
              padding: 10, 
              marginBottom: 10, 
              background: agent.status === 'active' ? '#e8f5e9' : '#fff3e0',
              borderRadius: 4
            }}>
              <strong>{agent.name}</strong> - {agent.status}
              <br/>
              <small>{agent.currentTask}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// Default export
export default {
  MissionControlClient,
  useMissionControl,
  fetchMissionControlData,
  pushMissionControlUpdate,
  MissionControlDashboard
};

// Quick integration snippet for Lovable
/*
Add this to your Lovable app:

1. Create a new file: lovable-integration.js
2. Copy the above code into it
3. In your main component:

import { MissionControlClient, MissionControlDashboard } from './lovable-integration';

function App() {
  return (
    <div>
      <MissionControlDashboard />
    </div>
  );
}

// Or custom integration:
function CustomDashboard() {
  const { data, triggerWebhook } = useMissionControl();
  
  const handleTaskComplete = async (taskId) => {
    await triggerWebhook({ 
      type: 'task_complete', 
      taskId: taskId 
    });
  };
  
  return (
    <div>Your custom dashboard</div>
  );
}
*/
