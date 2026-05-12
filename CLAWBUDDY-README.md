# ClawBuddy Mission Control Integration

Connects your Lovable Mission Control to KPI Kenny's local API for real-time data.

## What This Does

Replaces static mock data with live data from:
- KPI Tracker database (SQLite)
- Task board
- Agent team status
- Real estate performance metrics

## Quick Setup

### 1. Ensure API Server is Running

On your local machine:
```bash
# From this directory
node ~/.openclaw/workspace/integrations/mission-control-api-live.js
```

Server starts at `http://localhost:3456`

### 2. Copy Integration Files

Into your ClawBuddy repo:

```bash
# Copy the live data hook
cp ~/.openclaw/workspace/integrations/clawbuddy-live-data.ts \
   src/lib/clawbuddy-live-data.ts

# Copy the updated CommandDeck
cp ~/.openclaw/workspace/integrations/CommandDeck-Live.tsx \
   src/components/clawbuddy/CommandDeck.tsx
```

### 3. That's It

The CommandDeck now displays:
- Live agent status from your team
- Real KPI metrics from the tracker
- Auto-refreshes every 30 seconds
- Connection status indicator

## File Changes

### Modified Files

| File | Change |
|------|--------|
| `src/components/clawbuddy/CommandDeck.tsx` | Replaced with live data version |

### New Files

| File | Purpose |
|------|---------|
| `src/lib/clawbuddy-live-data.ts` | Live data hooks |

## API Endpoints Used

```
GET http://localhost:3456/api/all     - Complete data snapshot
GET http://localhost:3456/health      - Connection status
GET http://localhost:3456/api/kpis    - KPI metrics
GET http://localhost:3456/api/agents  - Team status
GET http://localhost:3456/api/tasks   - Task board
```

## Data Mapping

### Agents
Your agents (KPI Kenny, Data Agent, etc.) map to ClawBuddy format:
- `kpi-kenny` → 🎯 KPI Kenny
- `data-agent` → 📊 Data Agent
- `acquisitions-1` → 📞 Acquisitions Agent
- `dispo-1` → 💰 Disposition Agent

### KPIs
Real estate metrics displayed:
- Calls / Contacts / Responses
- Offers / Contracts / Deals
- Conversion rates
- Calls per deal

### Tasks
Task board columns mapped:
- `backlog` → todo
- `in_progress` → doing
- `review` → needs-input
- `complete` → done

## Troubleshooting

### "Cannot connect to API"
1. Check server is running: `curl http://localhost:3456/health`
2. Verify no firewall blocking port 3456
3. Try restarting the API server

### "No data showing"
1. Check KPI tracker has data: `sqlite3 ~/.openclaw/workspace/automation/kpi_tracker.db "SELECT * FROM daily_metrics;"`
2. Verify database path in `mission-control-api-live.js`
3. Check browser console for CORS errors

### "CORS error"
The API server has CORS enabled. If you see CORS errors:
1. Make sure you're running the API, not a different server
2. Check the API is on `localhost:3456`
3. Verify no proxy/VPN interference

## Architecture

```
┌─────────────────────────────────────┐
│  ClawBuddy Mission Control (Web)  │
│  http://localhost:5173 (or similar)  │
└──────────────────┬──────────────────┘
                   │ fetch()
                   ▼
┌─────────────────────────────────────┐
│  KPI Kenny API                      │
│  http://localhost:3456              │
│  (mission-control-api-live.js)     │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│  Data Sources                       │
│  • SQLite (kpi_tracker.db)          │
│  • Task definitions                 │
│  • Agent configs                    │
└─────────────────────────────────────┘
```

## Optional: Extend Integration

### Add to Other Pages

Import the hooks in any component:

```typescript
import { useLiveMissionControlData, useLiveKPIs } from "@/lib/clawbuddy-live-data";

function MyComponent() {
  const { agents, tasks, kpis, loading } = useLiveMissionControlData();
  
  // Use live data...
}
```

### Create New Widgets

Example: KPI-only widget

```typescript
export function KPIWidget() {
  const { kpis, loading } = useLiveKPIs();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <div>Calls: {kpis?.calls}</div>
      <div>Deals: {kpis?.deals}</div>
    </div>
  );
}
```

### Push Updates from ClawBuddy

Trigger sync from your UI:

```typescript
async function triggerSync() {
  await fetch('http://localhost:3457/webhook/kpi-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'task_complete', taskId: 't1' })
  });
}
```

## Future Enhancements

- [ ] Real-time WebSocket connection (instead of polling)
- [ ] Push notifications for deal closes
- [ ] Historical trend charts
- [ ] Deal pipeline visualization
- [ ] Calendar integration
- [ ] Meeting summaries from REI Sift

## Support

API issues? Check:
1. `~/.openclaw/workspace/integrations/mission-control-api-live.js` logs
2. `~/.openclaw/workspace/data/mission-control-data.json` for cached data
3. SQLite database: `~/.openclaw/workspace/automation/kpi_tracker.db`
