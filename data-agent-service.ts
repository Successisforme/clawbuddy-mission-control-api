// Data Agent Service Worker
// Handles: REI Sift sync, SmrtPhone integration, Sensei Flow logic

import { Property, senseiFlow } from './sensei-flow-engine';

interface DataSyncConfig {
  reiSiftUrl: string;
  reiSiftApiKey?: string;
  smrtPhoneUrl: string;
  smrtPhoneApiKey?: string;
  missionControlUrl: string;
  syncInterval: number; // seconds
}

interface SyncResult {
  timestamp: string;
  propertiesImported: number;
  propertiesUpdated: number;
  leadsSentToSmrtPhone: number;
  errors: string[];
}

export class DataAgentService {
  private config: DataSyncConfig;
  private properties: Property[] = [];
  private lastSync: Date | null = null;

  constructor(config: DataSyncConfig) {
    this.config = config;
  }

  // Phase 1: Import from REI Sift
  async syncFromREISift(): Promise<SyncResult> {
    const result: SyncResult = {
      timestamp: new Date().toISOString(),
      propertiesImported: 0,
      propertiesUpdated: 0,
      leadsSentToSmrtPhone: 0,
      errors: []
    };

    try {
      if (this.config.reiSiftApiKey) {
        // API Method
        await this.syncViaAPI(result);
      } else {
        // Fallback: Browser automation or manual CSV
        result.errors.push('REI Sift API key not configured. Using manual import mode.');
      }
    } catch (error) {
      result.errors.push(`Sync failed: ${error}`);
    }

    this.lastSync = new Date();
    return result;
  }

  private async syncViaAPI(result: SyncResult): Promise<void> {
    const response = await fetch(`${this.config.reiSiftUrl}/api/properties`, {
      headers: {
        'Authorization': `Bearer ${this.config.reiSiftApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`REI Sift API error: ${response.status}`);
    }

    const data = await response.json();
    
    for (const record of data) {
      const existing = this.properties.find(p => p.id === record.id);
      
      if (existing) {
        // Update existing
        Object.assign(existing, record);
        existing.updatedAt = new Date();
        result.propertiesUpdated++;
      } else {
        // New property
        const newProperty: Property = {
          ...record,
          priority: null, // Will calculate below
          createdAt: new Date(),
          updatedAt: new Date()
        };
        newProperty.priority = senseiFlow.calculateTier(newProperty);
        this.properties.push(newProperty);
        result.propertiesImported++;
      }
    }
  }

  // Phase 2: Process Sensei Flow Logic
  async processSenseiFlow(): Promise<{
    dailyQueue: Property[];
    followUps: Property[];
    deepProspecting: Property[];
  }> {
    // Calculate priorities for all unclassified properties
    this.properties.forEach(p => {
      if (p.priority === null) {
        p.priority = senseiFlow.calculateTier(p);
      }
    });

    return {
      dailyQueue: senseiFlow.getDailyQueue(this.properties, 'ninja1', 50),
      followUps: senseiFlow.getFollowUpQueue(this.properties, 'ninja1'),
      deepProspecting: senseiFlow.getDeepProspectingQueue(this.properties, 20)
    };
  }

  // Phase 3: Send to SmrtPhone
  async sendToSmrtPhone(properties: Property[]): Promise<number> {
    if (!this.config.smrtPhoneApiKey) {
      console.log('[Data Agent] SmrtPhone API not configured. Skipping.');
      return 0;
    }

    const validProperties = properties.filter(p => 
      p.phoneNumbers.some(ph => 
        ph.status === 'unchecked' || ph.status === 'correct'
      )
    );

    const formattedData = validProperties.map(p => ({
      id: p.id,
      name: p.ownerName,
      address: `${p.address}, ${p.city}, ${p.state} ${p.zip}`,
      phone: p.phoneNumbers.find(ph => ph.status === 'unchecked' || ph.status === 'correct')?.number,
      acres: p.acres,
      equity: p.equityPercent,
      priority: p.priority,
      tags: p.tags
    }));

    try {
      const response = await fetch(`${this.config.smrtPhoneUrl}/api/campaigns/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.smrtPhoneApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          campaign: 'Tier_1_Priority',
          contacts: formattedData
        })
      });

      if (response.ok) {
        // Mark as sent
        validProperties.forEach(p => {
          if (!p.tags.includes('sent_to_smrtphone')) {
            p.tags.push('sent_to_smrtphone');
          }
        });
        return validProperties.length;
      }
    } catch (error) {
      console.error('[Data Agent] SmrtPhone upload failed:', error);
    }

    return 0;
  }

  // Phase 4: Report to KPI Kenny
  async syncToKPIKenny(): Promise<void> {
    const metrics = senseiFlow.calculateMetrics(this.properties);
    
    const kpiData = {
      timestamp: new Date().toISOString(),
      dataIn: {
        totalProperties: metrics.total,
        tier1Count: metrics.byTier.tier_1,
        tier2Count: metrics.byTier.tier_2,
        tier3Count: metrics.byTier.tier_3,
        bySource: metrics.bySource
      },
      dataOut: {
        sentToSmrtPhone: this.properties.filter(p => 
          p.tags.includes('sent_to_smrtphone')
        ).length,
        contactRates: metrics.contactRates
      },
      pipeline: metrics.byStatus,
      velocity: {
        dailyAssignable: metrics.dailyAssignable,
        followUpDue: metrics.followUpDue
      }
    };

    // Send to Mission Control API
    try {
      await fetch(`${this.config.missionControlUrl}/api/kpi/data-agent-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kpiData)
      });
    } catch (error) {
      console.error('[Data Agent] KPI sync failed:', error);
    }
  }

  // Handle call outcome from SmrtPhone webhook
  async handleCallOutcome(propertyId: string, phoneNumber: string, outcome: string): Promise<void> {
    const property = this.properties.find(p => p.id === propertyId);
    if (!property) return;

    const validOutcome = outcome as Parameters<typeof senseiFlow.processCallOutcome>[2];
    const updated = senseiFlow.processCallOutcome(property, phoneNumber, validOutcome);
    
    Object.assign(property, updated);
    
    // Immediately sync to KPI Kenny
    await this.syncToKPIKenny();
  }

  // Get data breakdown for dashboard
  getDataBreakdown() {
    return senseiFlow.calculateMetrics(this.properties);
  }

  // Get all properties
  getProperties(): Property[] {
    return this.properties;
  }

  // Manual import (CSV fallback)
  importFromCSV(csvData: string): number {
    // Parse CSV and create properties
    // Implementation depends on CSV format
    console.log('[Data Agent] CSV import - implement based on REI Sift export format');
    return 0;
  }

  // Start auto-sync
  startAutoSync(): void {
    console.log(`[Data Agent] Auto-sync started (${this.config.syncInterval}s interval)`);
    
    setInterval(async () => {
      console.log('[Data Agent] Running scheduled sync...');
      await this.syncFromREISift();
      const flow = await this.processSenseiFlow();
      await this.sendToSmrtPhone(flow.dailyQueue);
      await this.syncToKPIKenny();
    }, this.config.syncInterval * 1000);
  }
}

// Export singleton instance
export const dataAgent = new DataAgentService({
  reiSiftUrl: process.env.REI_SIFT_URL || 'https://app.reisift.com',
  reiSiftApiKey: process.env.REI_SIFT_API_KEY,
  smrtPhoneUrl: process.env.SMRTPHONE_URL || 'https://app.smrtphone.io',
  smrtPhoneApiKey: process.env.SMRTPHONE_API_KEY,
  missionControlUrl: process.env.MISSION_CONTROL_URL || 'http://localhost:3456',
  syncInterval: parseInt(process.env.SYNC_INTERVAL || '300') // 5 minutes default
});
