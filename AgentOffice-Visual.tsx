import React, { useEffect, useRef, useState } from 'react';
import { useLiveData } from '../lib/clawbuddy-live-data';

// Agent definitions with pixel art representations
const AGENT_SPRITES = {
  'KPI Kenny': {
    color: '#3b82f6', // Blue
    role: 'KPI Tracker',
    avatar: '🎯',
    desk: { x: 100, y: 200 },
    currentAction: 'analyzing_metrics'
  },
  'Data Agent': {
    color: '#10b981', // Green
    role: 'Data Management',
    avatar: '📊',
    desk: { x: 300, y: 200 },
    currentAction: 'organizing_data'
  },
  'Acquisitions': {
    color: '#f59e0b', // Orange
    role: 'Lead Management',
    avatar: '🤝',
    desk: { x: 500, y: 200 },
    currentAction: 'following_up'
  },
  'Disposition': {
    color: '#8b5cf6', // Purple
    role: 'Buyer Coordination',
    avatar: '🏠',
    desk: { x: 700, y: 200 },
    currentAction: 'coordinating_buyers'
  },
  'Marketing': {
    color: '#ef4444', // Red
    role: 'Campaign Manager',
    avatar: '📢',
    desk: { x: 900, y: 200 },
    currentAction: 'launching_campaigns'
  }
};

interface AgentState {
  name: string;
  isWorking: boolean;
  currentTask: string | null;
  position: { x: number; y: number };
  targetPosition: { x: number; y: number };
  animationFrame: number;
  direction: 'left' | 'right';
  activityLevel: number;
}

interface TaskData {
  id: string;
  title: string;
  assignee: string;
  status: 'backlog' | 'in_progress' | 'review' | 'complete';
  priority: 'high' | 'medium' | 'low';
}

export default function AgentOfficeVisual() {
  const { data, loading, error } = useLiveData();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [agents, setAgents] = useState<AgentState[]>([]);
  const animationRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);

  // Initialize agents from data
  useEffect(() => {
    if (!data?.agents?.agents) return;

    const initialAgents: AgentState[] = data.agents.agents.map((agent: any) => {
      const sprite = AGENT_SPRITES[agent.name as keyof typeof AGENT_SPRITES] || {
        color: '#6b7280',
        desk: { x: 400, y: 200 }
      };

      return {
        name: agent.name,
        isWorking: agent.status === 'active',
        currentTask: null,
        position: { ...sprite.desk },
        targetPosition: { ...sprite.desk },
        animationFrame: 0,
        direction: 'right',
        activityLevel: 0
      };
    });

    setAgents(initialAgents);
  }, [data]);

  // Update agent states based on tasks
  useEffect(() => {
    if (!data?.tasks) return;

    setAgents(prevAgents => {
      return prevAgents.map(agent => {
        // Find tasks assigned to this agent
        const agentTasks = [
          ...(data.tasks?.in_progress || []),
          ...(data.tasks?.backlog || [])
        ].filter((task: TaskData) => 
          task.assignee?.toLowerCase().includes(agent.name.toLowerCase()) ||
          task.assignee === agent.name
        );

        const hasActiveTask = agentTasks.length > 0;
        const sprite = AGENT_SPRITES[agent.name as keyof typeof AGENT_SPRITES];
        
        if (hasActiveTask) {
          // Agent is working - slight movement
          return {
            ...agent,
            isWorking: true,
            currentTask: agentTasks[0]?.title || 'Working',
            activityLevel: Math.min(agent.activityLevel + 1, 10),
            targetPosition: {
              x: sprite?.desk.x + (Math.random() - 0.5) * 10,
              y: sprite?.desk.y + (Math.random() - 0.5) * 5
            }
          };
        } else {
          // Agent is idle - return to desk position
          return {
            ...agent,
            isWorking: false,
            currentTask: null,
            activityLevel: Math.max(agent.activityLevel - 1, 0),
            targetPosition: { ...sprite?.desk }
          };
        }
      });
    });
  }, [data?.tasks]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (timestamp: number) => {
      // Update at 30fps
      if (timestamp - lastUpdateRef.current < 33) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }
      lastUpdateRef.current = timestamp;

      // Clear canvas
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw office background
      drawOffice(ctx, canvas.width, canvas.height);

      // Draw desks
      agents.forEach(agent => {
        const sprite = AGENT_SPRITES[agent.name as keyof typeof AGENT_SPRITES];
        if (sprite) {
          drawDesk(ctx, sprite.desk.x, sprite.desk.y, sprite.color);
        }
      });

      // Update and draw agents
      agents.forEach(agent => {
        // Smooth movement
        const dx = agent.targetPosition.x - agent.position.x;
        const dy = agent.targetPosition.y - agent.position.y;
        
        agent.position.x += dx * 0.1;
        agent.position.y += dy * 0.1;

        // Update animation frame
        if (agent.isWorking) {
          agent.animationFrame = (agent.animationFrame + 0.2) % 4;
        } else {
          agent.animationFrame = 0;
        }

        // Update direction
        if (dx > 1) agent.direction = 'right';
        if (dx < -1) agent.direction = 'left';

        // Draw agent
        drawAgent(ctx, agent);
      });

      // Draw speech bubbles for active agents
      agents.filter(a => a.isWorking && a.currentTask).forEach(agent => {
        drawSpeechBubble(ctx, agent);
      });

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [agents]);

  const drawOffice = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Floor
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, height * 0.6, width, height * 0.4);

    // Floor tiles pattern
    ctx.strokeStyle = '#0f3460';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, height * 0.6);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Walls
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height * 0.6);

    // Windows
    ctx.fillStyle = '#16213e';
    for (let x = 100; x < width; x += 300) {
      ctx.fillRect(x, 50, 150, 100);
      // Window frame
      ctx.strokeStyle = '#e94560';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, 50, 150, 100);
    }

    // Company name
    ctx.fillStyle = '#e94560';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PWH MISSION CONTROL', width / 2, 40);

    // Clock
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(new Date().toLocaleTimeString(), width - 20, 30);
  };

  const drawDesk = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    // Desk surface
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(x - 40, y + 20, 80, 10);

    // Desk legs
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(x - 35, y + 30, 8, 40);
    ctx.fillRect(x + 27, y + 30, 8, 40);

    // Monitor
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x - 25, y - 20, 50, 35);
    ctx.fillStyle = color;
    ctx.fillRect(x - 23, y - 18, 46, 31);

    // Monitor stand
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(x - 5, y + 15, 10, 8);

    // Chair
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(x - 20, y + 50, 40, 5); // Seat
    ctx.fillRect(x - 5, y + 55, 10, 25); // Back

    // Keyboard
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(x - 20, y + 25, 40, 8);
  };

  const drawAgent = (ctx: CanvasRenderingContext2D, agent: AgentState) => {
    const sprite = AGENT_SPRITES[agent.name as keyof typeof AGENT_SPRITES];
    const x = agent.position.x;
    const y = agent.position.y - 40;

    // Bobbing animation when working
    const bobOffset = agent.isWorking ? Math.sin(agent.animationFrame) * 3 : 0;
    const bodyY = y + bobOffset;

    // Body (pixel style)
    const color = sprite?.color || '#6b7280';
    
    // Head
    ctx.fillStyle = '#fca5a5'; // Skin tone
    ctx.fillRect(x - 12, bodyY - 30, 24, 20);

    // Hair/Hat
    ctx.fillStyle = color;
    ctx.fillRect(x - 14, bodyY - 35, 28, 8);

    // Eyes (blink animation)
    if (Math.floor(agent.animationFrame) % 3 !== 0) {
      ctx.fillStyle = '#000';
      if (agent.direction === 'right') {
        ctx.fillRect(x + 2, bodyY - 22, 4, 4);
      } else {
        ctx.fillRect(x - 6, bodyY - 22, 4, 4);
      }
    }

    // Body
    ctx.fillStyle = color;
    ctx.fillRect(x - 15, bodyY - 10, 30, 25);

    // Arms
    if (agent.isWorking) {
      // Typing animation
      const armOffset = Math.sin(agent.animationFrame * 2) * 5;
      ctx.fillStyle = '#fca5a5';
      ctx.fillRect(x - 20, bodyY - 5 + armOffset, 8, 15);
      ctx.fillRect(x + 12, bodyY - 5 - armOffset, 8, 15);
    } else {
      // Idle arms
      ctx.fillStyle = '#fca5a5';
      ctx.fillRect(x - 20, bodyY - 5, 8, 15);
      ctx.fillRect(x + 12, bodyY - 5, 8, 15);
    }

    // Status indicator
    const statusColor = agent.isWorking ? '#22c55e' : '#6b7280';
    ctx.fillStyle = statusColor;
    ctx.beginPath();
    ctx.arc(x + 15, bodyY - 35, 4, 0, Math.PI * 2);
    ctx.fill();

    // Activity bars when working
    if (agent.isWorking && agent.activityLevel > 5) {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
      ctx.fillRect(x - 20, bodyY - 50, 40, 3);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(x - 20, bodyY - 50, (agent.activityLevel / 10) * 40, 3);
    }

    // Name label
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(agent.name.split(' ')[0], x, bodyY + 30);
  };

  const drawSpeechBubble = (ctx: CanvasRenderingContext2D, agent: AgentState) => {
    if (!agent.currentTask) return;

    const x = agent.position.x;
    const y = agent.position.y - 90;
    const text = agent.currentTask.length > 20 
      ? agent.currentTask.substring(0, 20) + '...'
      : agent.currentTask;

    // Bubble background
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(x - 60, y - 25, 120, 35, 8);
    ctx.fill();

    // Bubble pointer
    ctx.beginPath();
    ctx.moveTo(x, y + 10);
    ctx.lineTo(x - 10, y + 25);
    ctx.lineTo(x + 10, y + 25);
    ctx.closePath();
    ctx.fill();

    // Text
    ctx.fillStyle = '#1a1a2e';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y - 5);
  };

  if (loading) {
    return (
      <div className="bg-slate-900 rounded-lg p-6 text-center">
        <div className="animate-pulse text-blue-400">Loading Agent Office...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900 rounded-lg p-6">
        <div className="text-red-400">Failed to load agent data</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Agent Office Live</h2>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            Working
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-500"></span>
            Idle
          </span>
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        width={1100}
        height={400}
        className="w-full rounded-lg border border-slate-700"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Agent Status Panel */}
      <div className="mt-4 grid grid-cols-5 gap-2">
        {agents.map(agent => (
          <div 
            key={agent.name}
            className={`p-2 rounded text-xs ${
              agent.isWorking ? 'bg-green-900/30 border border-green-700' : 'bg-slate-800'
            }`}
          >
            <div className="font-bold text-white">{agent.name}</div>
            <div className="text-slate-400">
              {agent.isWorking ? agent.currentTask : 'Waiting...'}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {AGENT_SPRITES[agent.name as keyof typeof AGENT_SPRITES]?.role}
            </div>
          </div>
        ))}
      </div>

      {/* Live indicator */}
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        Live - Updated {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : '...'}
      </div>
    </div>
  );
}
