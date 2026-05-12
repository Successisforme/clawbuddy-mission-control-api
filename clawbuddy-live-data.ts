/**
 * ClawBuddy Live Data Integration
 * Connects ClawBuddy Mission Control to KPI Kenny's local API
 * 
 * This file replaces the static data in clawbuddy-data.ts with live data
 * from http://localhost:3456/api/*
 * 
 * Setup:
 * 1. Copy this file to src/lib/clawbuddy-live-data.ts
 * 2. Update components to use these hooks instead of static data
 * 3. Ensure API server is running: node mission-control-api-live.js
 */

import { useState, useEffect, useCallback } from "react";

const API_BASE_URL = "http://localhost:3456";
const POLLING_INTERVAL = 30000; // 30 seconds

// Types matching clawbuddy-data.ts
export type AgentStatus = "active" | "idle" | "error" | "offline";

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  type: string;
  role: string;
  subtitle: string;
  status: AgentStatus;
  currentActivity: string;
  lastSeen: string;
  tasksCompleted: number;
  accuracy: number;
  skills: string[];
  accent: string;
}

export interface ActivityEvent {
  id: string;
  agentEmoji: string;
  agentName: string;
  action: string;
  timestamp: string;
}

export type TaskStatus = "todo" | "doing" | "needs-input" | "done";
export type Priority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  title: string;
  agentEmoji: string;
  status: TaskStatus;
  priority: Priority;
  progress?: number;
}

export interface KPIMetrics {
  month: string;
  calls: number;
  contacts: number;
  responses: number;
  offers: number;
  contracts: number;
  deals: number;
  callsPerDeal: number;
  contactRate: number;
  responseRate: number;
}

// Live data state
interface LiveDataState {
  agents: Agent[];
  activities: ActivityEvent[];
  tasks: Task[];
  kpis: KPIMetrics | null;
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

// Map my API data to ClawBuddy format
function mapAPIToAgents(apiData: any): Agent[] {
  if (!apiData?.agents?.agents) return [];
  
  const emojiMap: Record<string, string> = {
    "kpi-kenny": "🎯",
    "data-agent": "📊",
    "acquisitions-1": "📞",
    "dispo-1": "💰"
  };
  
  const roleMap: Record<string, string> = {
    "kpi-kenny": "KPI Tracker",
    "data-agent": "Data Management",
    "acquisitions-1": "Lead Qualification",
    "dispo-1": "Buyer Outreach"
  };
  
  const accentMap: Record<string, string> = {
    "kpi-kenny": "#10b981",
    "data-agent": "#3b82f6",
    "acquisitions-1": "#f59e0b",
    "dispo-1": "#8b5cf6"
  };
  
  return apiData.agents.agents.map((agent: any) => ({
    id: agent.id,
    name: agent.name,
    emoji: emojiMap[agent.id] || "🤖",
    type: agent.role,
    role: roleMap[agent.id] || agent.role,
    subtitle: agent.skills?.slice(0, 2).join(" • ") || "AI Agent",
    status: agent.status === "active" ? "active" : "idle",
    currentActivity: agent.current_task || "Standby",
    lastSeen: agent.last_activity 
      ? formatTimeAgo(new Date(agent.last_activity))
      : "just now",
    tasksCompleted: agent.metrics?.tasks_completed || agent.metrics?.tasksCompleted || 0,
    accuracy: parseFloat(agent.metrics?.accuracy || "98"),
    skills: agent.skills || [],
    accent: accentMap[agent.id] || "#10b981"
  }));
}

function mapAPIToTasks(apiData: any): Task[] {
  if (!apiData?.tasks) return [];
  
  const tasks: Task[] = [];
  const emojiMap: Record<string, string> = {
    "KPI Kenny": "🎯",
    "Data Agent": "📊",
    "Acquisitions Agent 1": "📞",
    "Disposition Agent 1": "💰"
  };
  
  // Map backlog -> todo
  apiData.tasks.backlog?.forEach((t: any, i: number) => {
    tasks.push({
      id: t.id || `backlog-${i}`,
      title: t.title,
      agentEmoji: emojiMap[t.assignee] || "📋",
      status: "todo",
      priority: mapPriority(t.priority),
      progress: 0
    });
  });
  
  // Map inProgress -> doing
  apiData.tasks.in_progress?.forEach((t: any, i: number) => {
    tasks.push({
      id: t.id || `progress-${i}`,
      title: t.title,
      agentEmoji: emojiMap[t.assignee] || "📋",
      status: "doing",
      priority: mapPriority(t.priority),
      progress: 50
    });
  });
  
  // Map review -> needs-input
  apiData.tasks.review?.forEach((t: any, i: number) => {
    tasks.push({
      id: t.id || `review-${i}`,
      title: t.title,
      agentEmoji: emojiMap[t.assignee] || "📋",
      status: "needs-input",
      priority: mapPriority(t.priority),
      progress: 75
    });
  });
  
  // Map complete -> done
  apiData.tasks.complete?.forEach((t: any, i: number) => {
    tasks.push({
      id: t.id || `complete-${i}`,
      title: t.title,
      agentEmoji: "✅",
      status: "done",
      priority: mapPriority(t.priority) || "medium",
      progress: 100
    });
  });
  
  return tasks;
}

function mapPriority(priority: string): Priority {
  switch (priority?.toLowerCase()) {
    case "high": return "high";
    case "urgent": return "urgent";
    case "low": return "low";
    default: return "medium";
  }
}

function mapAPIToActivities(apiData: any): ActivityEvent[] {
  const activities: ActivityEvent[] = [];
  
  // Create activities from agent status
  if (apiData?.agents?.agents) {
    apiData.agents.agents.forEach((agent: any, i: number) => {
      if (agent.current_task) {
        activities.push({
          id: `activity-${agent.id}`,
          agentEmoji: getEmojiForAgent(agent.id),
          agentName: agent.name,
          action: agent.current_task,
          timestamp: agent.last_activity 
            ? formatTimeAgo(new Date(agent.last_activity))
            : "just now"
        });
      }
    });
  }
  
  // Add KPI activities
  if (apiData?.kpis?.today) {
    const today = apiData.kpis.today;
    if (today.calls > 0) {
      activities.unshift({
        id: "activity-calls",
        agentEmoji: "📞",
        agentName: "Acquisitions Agent",
        action: `made ${today.calls} calls today`,
        timestamp: "today"
      });
    }
    if (today.deals > 0) {
      activities.unshift({
        id: "activity-deals",
        agentEmoji: "🏆",
        agentName: "Disposition Agent",
        action: `closed ${today.deals} deal${today.deals > 1 ? 's' : ''}`,
        timestamp: "today"
      });
    }
  }
  
  return activities;
}

function getEmojiForAgent(agentId: string): string {
  const emojiMap: Record<string, string> = {
    "kpi-kenny": "🎯",
    "data-agent": "📊",
    "acquisitions-1": "📞",
    "dispo-1": "💰"
  };
  return emojiMap[agentId] || "🤖";
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function mapAPIToKPIs(apiData: any): KPIMetrics | null {
  if (!apiData?.kpis?.current_month) return null;
  
  const month = apiData.kpis.current_month;
  const ratios = apiData.kpis.conversion_ratios || {};
  
  return {
    month: month.month,
    calls: month.calls || 0,
    contacts: month.contacts || 0,
    responses: month.responses || 0,
    offers: month.offers || 0,
    contracts: month.contracts || 0,
    deals: month.deals || 0,
    callsPerDeal: ratios.calls_per_deal || 0,
    contactRate: ratios.calls_to_contact || 0,
    responseRate: ratios.contact_to_response || 0
  };
}

// Main hook for live data
export function useLiveMissionControlData() {
  const [state, setState] = useState<LiveDataState>({
    agents: [],
    activities: [],
    tasks: [],
    kpis: null,
    loading: true,
    error: null,
    lastUpdate: null
  });

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/all`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const apiData = await response.json();
      
      setState({
        agents: mapAPIToAgents(apiData),
        activities: mapAPIToActivities(apiData),
        tasks: mapAPIToTasks(apiData),
        kpis: mapAPIToKPIs(apiData),
        loading: false,
        error: null,
        lastUpdate: new Date()
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error"
      }));
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Manual refresh
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    await fetchData();
  }, [fetchData]);

  return {
    ...state,
    refresh
  };
}

// Hook for just agents data
export function useLiveAgents() {
  const { agents, loading, error, refresh } = useLiveMissionControlData();
  return { agents, loading, error, refresh };
}

// Hook for just tasks
export function useLiveTasks() {
  const { tasks, loading, error, refresh } = useLiveMissionControlData();
  return { tasks, loading, error, refresh };
}

// Hook for just KPIs
export function useLiveKPIs() {
  const { kpis, loading, error, refresh } = useLiveMissionControlData();
  return { kpis, loading, error, refresh };
}

// Hook for just activities
export function useLiveActivities() {
  const { activities, loading, error, refresh } = useLiveMissionControlData();
  return { activities, loading, error, refresh };
}

// Health check hook
export function useAPIHealth() {
  const [health, setHealth] = useState<{ connected: boolean; lastCheck: Date | null }>({
    connected: false,
    lastCheck: null
  });

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`);
        setHealth({
          connected: response.ok,
          lastCheck: new Date()
        });
      } catch {
        setHealth(prev => ({ ...prev, connected: false, lastCheck: new Date() }));
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return health;
}

// Export types for compatibility
export type { TaskStatus, Priority };
