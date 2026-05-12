import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { senseiFlow, Property } from './sensei-flow-engine';

interface DataMetrics {
  total: number;
  byTier: {
    tier_1: number;
    tier_2: number;
    tier_3: number;
    unclassified: number;
  };
  byStatus: {
    needs_work: number;
    follow_up: number;
    deep_prospecting: number;
    leads: number;
    not_interested: number;
    offers: number;
    contracts: number;
    closed: number;
  };
  bySource: Record<string, number>;
  contactRates: {
    totalProperties: number;
    totalPhoneNumbers: number;
    correctRate: number;
    dncRate: number;
    wrongNumberRate: number;
    unreachableRate: number;
  };
  dailyAssignable: number;
  followUpDue: number;
}

export default function DataBreakdownDashboard() {
  const [metrics, setMetrics] = useState<DataMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);

  useEffect(() => {
    fetchProperties();
    const interval = setInterval(fetchProperties, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/properties');
      const data = await response.json();
      setProperties(data);
      const calculatedMetrics = senseiFlow.calculateMetrics(data);
      setMetrics(calculatedMetrics);
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse text-blue-400">Loading data breakdown...</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6 text-red-400">Failed to load data metrics</div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Data Breakdown</h1>
        <div className="text-sm text-slate-400">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Total Properties"
          value={metrics.total}
          subtitle="in database"
          color="blue"
        />
        <MetricCard
          title="Tier 1 (Hot)"
          value={metrics.byTier.tier_1}
          subtitle={`${((metrics.byTier.tier_1 / metrics.total) * 100).toFixed(1)}% of total`}
          color="green"
        />
        <MetricCard
          title="Daily Assignable"
          value={metrics.dailyAssignable}
          subtitle="ready for 50/day rule"
          color="orange"
        />
        <MetricCard
          title="Follow-Up Due"
          value={metrics.followUpDue}
          subtitle="need callback today"
          color="purple"
        />
      </div>

      {/* Pipeline Status */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Pipeline Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <StatusBar 
              label="Needs Work" 
              value={metrics.byStatus.needs_work} 
              total={metrics.total}
              color="bg-slate-500"
            />
            <StatusBar 
              label="Follow Up" 
              value={metrics.byStatus.follow_up} 
              total={metrics.total}
              color="bg-yellow-500"
            />
            <StatusBar 
              label="Deep Prospecting" 
              value={metrics.byStatus.deep_prospecting} 
              total={metrics.total}
              color="bg-orange-500"
            />
            <StatusBar 
              label="Leads" 
              value={metrics.byStatus.leads} 
              total={metrics.total}
              color="bg-blue-500"
            />
            <StatusBar 
              label="Not Interested" 
              value={metrics.byStatus.not_interested} 
              total={metrics.total}
              color="bg-gray-500"
            />
            <StatusBar 
              label="Offers Made" 
              value={metrics.byStatus.offers} 
              total={metrics.total}
              color="bg-purple-500"
            />
            <StatusBar 
              label="Under Contract" 
              value={metrics.byStatus.contracts} 
              total={metrics.total}
              color="bg-pink-500"
            />
            <StatusBar 
              label="Closed" 
              value={metrics.byStatus.closed} 
              total={metrics.total}
              color="bg-green-500"
            />
          </div>        
        </CardContent>
      </Card>

      {/* Data In / Data Out */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <span>←</span> Data In (REI Sift)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-slate-400">By List Source:</p>
              {Object.entries(metrics.bySource)
                .sort(([,a], [,b]) => b - a)
                .map(([source, count]) => (
                  <div key={source} className="flex justify-between items-center">
                    <span className="text-white capitalize">{source.replace('_', ' ')}</span>
                    <span className="text-slate-400">{count}</span>
                  </div>
                ))}
            </div>
            
            <div className="pt-4 border-t border-slate-700">
              <p className="text-sm text-slate-400">By Priority Tier:</p>
              <div className="mt-2 space-y-2">
                <TierRow tier="Tier 1" count={metrics.byTier.tier_1} total={metrics.total} color="bg-green-500" />
                <TierRow tier="Tier 2" count={metrics.byTier.tier_2} total={metrics.total} color="bg-yellow-500" />
                <TierRow tier="Tier 3" count={metrics.byTier.tier_3} total={metrics.total} color="bg-orange-500" />
                <TierRow tier="Unclassified" count={metrics.byTier.unclassified} total={metrics.total} color="bg-gray-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              Data Out (SmrtPhone) <span>→</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-slate-400">Contact Quality:</p>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white">Correct Numbers</span>
                    <span className="text-green-400">{metrics.contactRates.correctRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={metrics.contactRates.correctRate} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white">Wrong Numbers</span>
                    <span className="text-yellow-400">{metrics.contactRates.wrongNumberRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={metrics.contactRates.wrongNumberRate} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white">DNC/Unsubscribe</span>
                    <span className="text-red-400">{metrics.contactRates.dncRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={metrics.contactRates.dncRate} className="h-2" />
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Unreachable Rate:</span>
                <span className="text-red-400 font-bold">{metrics.contactRates.unreachableRate.toFixed(1)}%</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Wrong + DNC numbers = wasted dials
              </p>
            </div>
            
            <div className="pt-4 border-t border-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Ready for SmrtPhone:</span>
                <span className="text-green-400 font-bold">{metrics.byStatus.needs_work} properties</span>
              </div>
              <button className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm">
                Send Tier 1 to SmrtPhone
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Velocity Metrics */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Pipeline Velocity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4 text-center">
            <VelocityStage 
              label="Imported" 
              count={metrics.total} 
              description="Data from REI Sift"
            />
            <VelocityStage 
              label="Contacted" 
              count={metrics.contactRates.totalProperties - metrics.byStatus.needs_work} 
              description="Called/texted"
            />
            <VelocityStage 
              label="Leads" 
              count={metrics.byStatus.leads} 
              description="Interested sellers"
            />
            <VelocityStage 
              label="Offers" 
              count={metrics.byStatus.offers} 
              description="Offers made"
            />
            <VelocityStage 
              label="Closed" 
              count={metrics.byStatus.closed} 
              description="Deals done"
            />
          </div>
          
          <div className="mt-6 flex justify-between text-sm text-slate-400">
            <span>Conversion Rate: {metrics.total > 0 ? ((metrics.byStatus.closed / metrics.total) * 100).toFixed(2) : 0}%</span>
            <span>Lead Rate: {metrics.total > 0 ? ((metrics.byStatus.leads / metrics.total) * 100).toFixed(2) : 0}%</span>
            <span>Offer Rate: {metrics.byStatus.leads > 0 ? ((metrics.byStatus.offers / metrics.byStatus.leads) * 100).toFixed(2) : 0}%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper Components
function MetricCard({ title, value, subtitle, color }: { title: string; value: number; subtitle: string; color: string }) {
  const colorClasses = {
    blue: 'bg-blue-900/30 border-blue-700',
    green: 'bg-green-900/30 border-green-700',
    orange: 'bg-orange-900/30 border-orange-700',
    purple: 'bg-purple-900/30 border-purple-700',
  };

  return (
    <Card className={`${colorClasses[color as keyof typeof colorClasses]} border`}>
      <CardContent className="p-4">
        <p className="text-slate-400 text-sm">{title}</p>
        <p className="text-3xl font-bold text-white mt-1">{value.toLocaleString()}</p>
        <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function StatusBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-400">{value} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function TierRow({ tier, count, total, color }: { tier: string; count: number; total: number; color: string }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  
  return (
    <div className="flex items-center gap-3">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-slate-300 text-sm flex-1">{tier}</span>
      <span className="text-slate-400 text-sm">{count}</span>
      <span className="text-slate-500 text-xs w-12 text-right">{percentage.toFixed(1)}%</span>
    </div>
  );
}

function VelocityStage({ label, count, description }: { label: string; count: number; description: string }) {
  return (
    <div className="space-y-2">
      <p className="text-slate-400 text-sm">{label}</p>
      <p className="text-2xl font-bold text-white">{count.toLocaleString()}</p>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
  );
}
