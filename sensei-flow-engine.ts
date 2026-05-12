// Sensei Flow Engine - Business Logic for Data Agent
// Implements Tyler Austin's Sensei Flow methodology

export interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  apn: string;
  acres?: number;
  ownerName: string;
  ownerAddress?: string;
  isVacant: boolean;
  isAbsentee: boolean;
  equityPercent?: number;
  estimatedValue?: number;
  taxDelinquent?: boolean;
  listSources: string[];
  lastSkipTrace?: Date;
  status: 'needs_work' | 'follow_up' | 'deep_prospecting' | 'lead' | 'not_interested' | 'offer_made' | 'contracted' | 'closed';
  priority: 'tier_1' | 'tier_2' | 'tier_3' | null;
  assignedTo?: string;
  lastContact?: Date;
  nextFollowUp?: Date;
  phoneNumbers: {
    number: string;
    type: 'mobile' | 'landline' | 'unknown';
    status: 'unchecked' | 'correct' | 'wrong' | 'dead' | 'dnc';
    lastCalled?: Date;
  }[];
  tags: string[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TierCriteria {
  tier_1: {
    minCriteria: number;
    criteria: {
      vacant: boolean;
      absentee: boolean;
      highEquity: boolean;
      multipleLists: boolean;
      recentlyVacant: boolean;
      recentlySkipTraced: boolean;
    };
  };
  tier_2: {
    singleCriteria: ('vacant' | 'absentee' | 'high_equity' | 'tax_delinquent' | 'expired_listing')[];
  };
  tier_3: {
    sources: ('expired' | 'probate' | 'inheritance' | 'fsbo' | 'auction')[];
  };
}

export const DEFAULT_CRITERIA: TierCriteria = {
  tier_1: {
    minCriteria: 3,
    criteria: {
      vacant: true,
      absentee: true,
      highEquity: true,
      multipleLists: true,
      recentlyVacant: false,
      recentlySkipTraced: false,
    }
  },
  tier_2: {
    singleCriteria: ['vacant', 'absentee', 'high_equity', 'tax_delinquent']
  },
  tier_3: {
    sources: ['expired', 'probate', 'inheritance']
  }
};

export class SenseiFlowEngine {
  private criteria: TierCriteria;

  constructor(criteria: TierCriteria = DEFAULT_CRITERIA) {
    this.criteria = criteria;
  }

  calculateTier(property: Property): 'tier_1' | 'tier_2' | 'tier_3' | null {
    let tier1Score = 0;
    
    if (property.isVacant && this.criteria.tier_1.criteria.vacant) tier1Score++;
    if (property.isAbsentee && this.criteria.tier_1.criteria.absentee) tier1Score++;
    if ((property.equityPercent ?? 0) > 30 && this.criteria.tier_1.criteria.highEquity) tier1Score++;
    if (property.listSources.length >= 2 && this.criteria.tier_1.criteria.multipleLists) tier1Score++;

    if (tier1Score >= this.criteria.tier_1.minCriteria) {
      return 'tier_1';
    }

    const hasTier2Criteria = this.criteria.tier_2.singleCriteria.some(criteria => {
      switch (criteria) {
        case 'vacant': return property.isVacant;
        case 'absentee': return property.isAbsentee;
        case 'high_equity': return (property.equityPercent ?? 0) > 30;
        case 'tax_delinquent': return property.taxDelinquent;
        case 'expired_listing': return property.listSources.includes('expired');
        default: return false;
      }
    });

    if (hasTier2Criteria) {
      return 'tier_2';
    }

    const hasTier3Source = property.listSources.some(source => 
      this.criteria.tier_3.sources.includes(source as any)
    );

    if (hasTier3Source) {
      return 'tier_3';
    }

    return null;
  }

  getDailyQueue(properties: Property[], ninjaName: string, limit: number = 50): Property[] {
    const eligible = properties
      .filter(p => 
        p.priority === 'tier_1' && 
        p.status === 'needs_work' &&
        !p.assignedTo
      )
      .sort((a, b) => {
        const aScore = a.listSources.length + (a.equityPercent ?? 0) / 100;
        const bScore = b.listSources.length + (b.equityPercent ?? 0) / 100;
        return bScore - aScore;
      })
      .slice(0, limit);

    return eligible;
  }

  getFollowUpQueue(properties: Property[], ninjaName: string): Property[] {
    const now = new Date();
    return properties
      .filter(p => 
        p.status === 'follow_up' &&
        p.assignedTo === ninjaName &&
        p.nextFollowUp && p.nextFollowUp <= now
      )
      .sort((a, b) => (a.nextFollowUp?.getTime() ?? 0) - (b.nextFollowUp?.getTime() ?? 0));
  }

  getDeepProspectingQueue(properties: Property[], limit: number = 20): Property[] {
    return properties
      .filter(p => 
        p.status === 'deep_prospecting' ||
        (p.phoneNumbers.every(phone => 
          ['wrong', 'dead', 'dnc'].includes(phone.status)
        ) && p.status !== 'lead')
      )
      .slice(0, limit);
  }

  processCallOutcome(
    property: Property, 
    phoneNumber: string, 
    outcome: 'dnc' | 'wrong' | 'dead' | 'no_answer' | 'voicemail' | 'correct_interested' | 'correct_not_interested' | 'callback'
  ): Property {
    const updated = { ...property };
    const phone = updated.phoneNumbers.find(p => p.number === phoneNumber);
    
    if (!phone) return updated;

    switch (outcome) {
      case 'dnc':
        phone.status = 'dnc';
        updated.tags.push('DNC');
        break;
      case 'wrong':
        phone.status = 'wrong';
        break;
      case 'dead':
        phone.status = 'dead';
        break;
      case 'no_answer':
        updated.status = 'follow_up';
        updated.nextFollowUp = new Date(Date.now() + 24 * 60 * 60 * 1000);
        updated.tags.push(`Daily Direct Mail ${new Date().toLocaleDateString()}`);
        break;
      case 'correct_interested':
        phone.status = 'correct';
        updated.status = 'lead';
        updated.tags.push('Lead');
        break;
      case 'correct_not_interested':
        phone.status = 'correct';
        updated.status = 'not_interested';
        updated.nextFollowUp = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        break;
      case 'callback':
        updated.status = 'follow_up';
        updated.nextFollowUp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        break;
    }

    phone.lastCalled = new Date();
    updated.lastContact = new Date();
    updated.updatedAt = new Date();

    return updated;
  }

  calculateMetrics(properties: Property[]) {
    const total = properties.length;
    
    return {
      total,
      byTier: {
        tier_1: properties.filter(p => p.priority === 'tier_1').length,
        tier_2: properties.filter(p => p.priority === 'tier_2').length,
        tier_3: properties.filter(p => p.priority === 'tier_3').length,
        unclassified: properties.filter(p => p.priority === null).length,
      },
      byStatus: {
        needs_work: properties.filter(p => p.status === 'needs_work').length,
        follow_up: properties.filter(p => p.status === 'follow_up').length,
        deep_prospecting: properties.filter(p => p.status === 'deep_prospecting').length,
        leads: properties.filter(p => p.status === 'lead').length,
        not_interested: properties.filter(p => p.status === 'not_interested').length,
        offers: properties.filter(p => p.status === 'offer_made').length,
        contracts: properties.filter(p => p.status === 'contracted').length,
        closed: properties.filter(p => p.status === 'closed').length,
      },
      bySource: this.aggregateBySource(properties),
      contactRates: this.calculateContactRates(properties),
      dailyAssignable: this.getDailyQueue(properties, '', 50).length,
      followUpDue: properties.filter(p => 
        p.status === 'follow_up' && 
        p.nextFollowUp && 
        p.nextFollowUp <= new Date()
      ).length,
    };
  }

  private aggregateBySource(properties: Property[]): Record<string, number> {
    const counts: Record<string, number> = {};
    properties.forEach(p => {
      p.listSources.forEach(source => {
        counts[source] = (counts[source] || 0) + 1;
      });
    });
    return counts;
  }

  private calculateContactRates(properties: Property[]) {
    const withPhones = properties.filter(p => p.phoneNumbers.length > 0);
    const totalPhones = withPhones.reduce((sum, p) => sum + p.phoneNumbers.length, 0);
    const correctPhones = withPhones.reduce(
      (sum, p) => sum + p.phoneNumbers.filter(ph => ph.status === 'correct').length, 
      0
    );
    const dncPhones = withPhones.reduce(
      (sum, p) => sum + p.phoneNumbers.filter(ph => ph.status === 'dnc').length, 
      0
    );
    const wrongPhones = withPhones.reduce(
      (sum, p) => sum + p.phoneNumbers.filter(ph => ph.status === 'wrong').length, 
      0
    );

    return {
      totalProperties: withPhones.length,
      totalPhoneNumbers: totalPhones,
      correctRate: totalPhones > 0 ? (correctPhones / totalPhones) * 100 : 0,
      dncRate: totalPhones > 0 ? (dncPhones / totalPhones) * 100 : 0,
      wrongNumberRate: totalPhones > 0 ? (wrongPhones / totalPhones) * 100 : 0,
      unreachableRate: totalPhones > 0 ? ((dncPhones + wrongPhones) / totalPhones) * 100 : 0,
    };
  }
}

export const senseiFlow = new SenseiFlowEngine();
