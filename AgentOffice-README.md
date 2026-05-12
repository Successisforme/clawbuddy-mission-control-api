# Agent Office Visual Component

## Overview
A pixel-art style 3D office visualization showing AI agents working at their desks in real-time.

## Features
- **Pixel Art Style**: 3D-esque pixel agents at their desks
- **Real-time Activity**: Agents animate when they have active tasks
- **Idle State**: Agents sit still when no tasks assigned
- **Working State**: Agents type, move slightly, show activity bars
- **Speech Bubbles**: Show current task names when working
- **Office Environment**: Desks, computers, windows, floor tiles
- **Live Status Panel**: Bottom panel showing all agent statuses

## Agent Behavior

### Idle (No Tasks)
- Agent sits still at desk
- Gray status indicator
- No animation
- Shows "Waiting..." in status panel

### Working (Has Task)
- Agent bobs slightly (breathing animation)
- Arms move (typing animation)
- Green status indicator
- Activity bar shows task intensity
- Speech bubble shows task name
- Green border in status panel

## Visual Elements
- **KPI Kenny** (Blue): Analyzes metrics
- **Data Agent** (Green): Manages data
- **Acquisitions** (Orange): Handles leads
- **Disposition** (Purple): Coordinates buyers
- **Marketing** (Red): Manages campaigns

## Integration Steps

1. Copy `AgentOffice-Visual.tsx` to `src/components/AgentOffice-Visual.tsx`

2. Import and use in your dashboard:
```tsx
import AgentOfficeVisual from './components/AgentOffice-Visual';

// In your main component:
<AgentOfficeVisual />
```

3. Ensure `clawbuddy-live-data.ts` exists and is properly configured

4. The component automatically:
   - Polls live data every 30 seconds
   - Animates agents based on their task status
   - Updates in real-time

## File Location
`/Users/carr/.openclaw/workspace/integrations/AgentOffice-Visual.tsx`

## Technical Notes
- Canvas-based rendering for performance
- 30fps animation loop
- Smooth transitions between states
- Responsive design
- No external dependencies (uses existing live-data hook)
