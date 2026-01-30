import React, { useMemo } from 'react';
import { Property, Unit, Lease, Invoice } from '../types';

interface AdvisoryInsightsProps {
  permissions: {
    refresh: boolean;
  };
  properties: Property[];
  units: Unit[];
  leases: Lease[];
  invoices: Invoice[];
}

const AdvisoryInsights: React.FC<AdvisoryInsightsProps> = ({ properties, units, leases, invoices }) => {
  // Calculate per-property statistics using dynamic state props
  const propertyStats = useMemo(() => {
    return properties.filter(p => p.isManaged).map(prop => {
      const propUnits = units.filter(u => u.propertyId === prop.id);
      const occupiedUnits = propUnits.filter(u => u.isOccupied).length;
      const occupancyRate = propUnits.length > 0 ? (occupiedUnits / propUnits.length) * 100 : 0;
      
      // Revenue logic derived from dynamic ledger
      const propertyLeases = leases.filter(l => propUnits.some(u => u.id === l.unitId));
      const propertyInvoices = invoices.filter(inv => propertyLeases.some(l => l.id === inv.leaseId));
      
      const expectedRevenue = propertyInvoices.reduce((acc, inv) => acc + inv.amount, 0);
      const collectedRevenue = propertyInvoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
      const collectionRate = expectedRevenue > 0 ? (collectedRevenue / expectedRevenue) * 100 : 0;

      return {
        id: prop.id,
        name: prop.name,
        location: prop.location,
        totalUnits: propUnits.length,
        occupancyRate,
        collectionRate,
        revenue: collectedRevenue,
        status: occupancyRate > 90 && collectionRate > 90 ? 'High' : occupancyRate < 60 ? 'Low' : 'Stable'
      };
    });
  }, [properties, units, leases, invoices]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Performance Advisory</h1>
          <p className="text-slate-500 mt-2 font-medium max-w-2xl">Compare property performance metrics across your managed portfolio.</p>
        </div>
      </header>

      {/* Property Comparison Table - Populated from Added Properties */}
      <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-xl font-black text-slate-900">Competitive Metrics Matrix</h3>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Comparing {propertyStats.length} Managed Assets</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Property Name</th>
                <th className="py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Occupancy</th>
                <th className="py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Collection</th>
                <th className="py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue (KES)</th>
                <th className="py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {propertyStats.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs italic">
                    No active managed properties found to evaluate.
                  </td>
                </tr>
              ) : propertyStats.map((stat) => (
                <tr key={stat.id} className="hover:bg-slate-50/50 transition-all">
                  <td className="py-6 px-8">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900">{stat.name}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{stat.location}</span>
                    </div>
                  </td>
                  <td className="py-6 px-8">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${stat.occupancyRate > 80 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${stat.occupancyRate}%` }}></div>
                      </div>
                      <span className="text-xs font-black text-slate-700">{stat.occupancyRate.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="py-6 px-8">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${stat.collectionRate > 90 ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
                      {stat.collectionRate.toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-6 px-8">
                    <span className="font-black text-slate-900">{stat.revenue.toLocaleString()}</span>
                  </td>
                  <td className="py-6 px-8">
                    <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${stat.status === 'High' ? 'text-emerald-500' : stat.status === 'Low' ? 'text-rose-500' : 'text-indigo-500'}`}>
                      <i className={`fas ${stat.status === 'High' ? 'fa-arrow-trend-up' : stat.status === 'Low' ? 'fa-arrow-trend-down' : 'fa-minus'}`}></i>
                      {stat.status}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdvisoryInsights;