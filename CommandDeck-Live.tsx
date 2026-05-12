/**
 * CommandDeck with Live Data Integration
 * Replace src/components/clawbuddy/CommandDeck.tsx with this version
 * 
 * Changes:
 * - Uses useLiveMissionControlData() instead of static imports
 * - Adds connection status indicator
 * - Shows live KPI metrics from KPI Kenny's tracker
 * - Auto-refreshes every 30 seconds
 */

import { motion } from "framer-motion";
import { Activity, Bot, CheckCircle2, Zap, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { MetricCard } from "./MetricCard";
import { useLiveMissionControlData, useAPIHealth } from "@/lib/clawbuddy-live-data";

const statusColor: Record<"active" | "idle" | "error" | "offline", string> = {
  active: "bg-primary",
  idle: "bg-amber-400",
  error: "bg-red-500",
  offline: "bg-muted-foreground",
};

export function CommandDeck() {
  const { agents, activities, kpis, loading, error, refresh, lastUpdate } = useLiveMissionControlData();
  const { connected } = useAPIHealth();

  // Calculate metrics from live data
  const activeAgentsCount = agents.filter(a => a.status === "active").length;
  const totalTasksCompleted = agents.reduce((sum, a) => sum + a.tasksCompleted, 0);
  const systemHealth = connected ? 99 : 0;
  const actionsPerMin = connected ? Math.round(kpis?.calls || 0 / 24) : 0;

  return (
    <div className="space-y-6">
      {/* Connection Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-secondary/30 rounded-lg">
        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600 font-medium">Connected to Mission Control</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-amber-600 font-medium">Local API Offline</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              Updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={refresh}
            disabled={loading}
            className="p-1.5 rounded-md hover:bg-secondary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Live KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          label="Active Agents" 
          value={activeAgentsCount} 
          icon={Bot} 
          trend={connected ? "+1 today" : "offline"} 
          delay={0} 
        />
        <MetricCard 
          label="Tasks Completed" 
          value={totalTasksCompleted} 
          icon={CheckCircle2} 
          trend="+0 24h" 
          delay={0.05} 
        />
        
        <MetricCard 
          label="Actions/Min" 
          value={actionsPerMin} 
          icon={Zap} 
          trend={connected ? "↑ live" : "offline"} 
          delay={0.1} 
        />
        
        <MetricCard 
          label="System Health" 
          value={systemHealth} 
          suffix="%" 
          icon={Activity} 
          trend={connected ? "nominal" : "offline"} 
          delay={0.15} 
        />
      </div>

      {/* Real Estate KPIs Row */}
      {kpis && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="glass-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Real Estate KPIs — {kpis.month}</h2>
            <span className="text-xs text-muted-foreground font-mono">LIVE</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-3 rounded-lg bg-secondary/30">
              <div className="text-xs text-muted-foreground">Calls</div>
              <div className="text-2xl font-bold">{kpis.calls}</div>
            </div>
            
            <div className="p-3 rounded-lg bg-secondary/30">
              <div className="text-xs text-muted-foreground">Contacts</div>
              <div className="text-2xl font-bold">{kpis.contacts}</div>
            </div>
            
            <div className="p-3 rounded-lg bg-secondary/30">
              <div className="text-xs text-muted-foreground">Responses</div>
              <div className="text-2xl font-bold">{kpis.responses}</div>
            </div>
            
            <div className="p-3 rounded-lg bg-secondary/30">
              <div className="text-xs text-muted-foreground">Offers</div>
              <div className="text-2xl font-bold">{kpis.offers}</div>
            </div>
            
            <div className="p-3 rounded-lg bg-secondary/30">
              <div className="text-xs text-muted-foreground">Contracts</div>
              <div className="text-2xl font-bold">{kpis.contracts}</div>
            </div>
            
            <div className="p-3 rounded-lg bg-secondary/30">
              <div className="text-xs text-muted-foreground">Deals</div>
              <div className="text-2xl font-bold">{kpis.deals}</div>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Contact Rate: </span>
              <span className="font-mono">{kpis.contactRate}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Response Rate: </span>
              <span className="font-mono">{kpis.responseRate}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Calls/Deal: </span>
              <span className="font-mono">{kpis.callsPerDeal || 'N/A'}</span>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Live Activity Feed */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="glass-card p-5 lg:col-span-3"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent Activity</h2>
            <span className="text-xs text-muted-foreground font-mono">LIVE</span>
          </div>
          
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
            {activities.length > 0 ? (
              activities.map((e, i) => (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.04 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <span className="text-xl">{e.agentEmoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      <span className="font-medium">{e.agentName}</span>{" "}
                      <span className="text-muted-foreground">{e.action}</span>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{e.timestamp}</div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                {loading ? "Loading activities..." : "No recent activity"}
              </div>
            )}
          </div>
        </motion.div>

        {/* Live Agent Status */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="glass-card p-5 lg:col-span-2"
        >
          <h2 className="font-semibold mb-4">Agent Status</h2>
          
          <div className="space-y-3">
            {agents.length > 0 ? (
              agents.map((a) => (
                <div key={a.id} className="p-3 rounded-lg bg-secondary/30 flex items-center gap-3">
                  <span className="text-2xl">{a.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${statusColor[a.status]} ${a.status === "active" ? "pulse-dot" : ""}`} />
                      <span className="text-sm font-medium">{a.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{a.currentActivity}</div>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{a.lastSeen}</span>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                {loading ? "Loading agents..." : "No agents connected"}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
