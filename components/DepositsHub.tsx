
import React, { useMemo } from 'react';
import { Property, Unit, Lease, Payment, User } from '../types';

interface DepositsHubProps {
  properties: Property[];
  units: Unit[];
  leases: Lease[];
  payments: Payment[];
  currentUser: User;
}

const DepositsHub: React.FC<DepositsHubProps> = ({ properties, units, leases, payments, currentUser }) => {
  const landlordPropertyIds = useMemo(() => 
    properties.filter(p => p.ownerId === currentUser.id).map(p => p.id), 
    [properties, currentUser.id]
  );

  const landlordUnits = useMemo(() => 
    units.filter(u => landlordPropertyIds.includes(u.propertyId)), 
    [units, landlordPropertyIds]
  );

  const landlordUnitIds = landlordUnits.map(u => u.id);

  const activeLeases = useMemo(() => 
    leases.filter(l => landlordUnitIds.includes(l.unitId) && l.status === 'Active'), 
    [leases, landlordUnitIds]
  );

  const totalHeldDeposits = activeLeases.reduce((acc, l) => acc + (l.depositAmount || 0), 0);

  // Administrative Held Funds (Security holds)
  const heldFunds = useMemo(() => {
    // 1. Get all invoices for landlord properties
    // 2. Filter payments for those invoices that are marked as isHeld
    const landlordLeaseIds = leases.filter(l => landlordUnitIds.includes(l.unitId)).map(l => l.id);
    return payments.filter(p => p.isHeld && p.invoiceId && landlordLeaseIds.includes(p.invoiceId));
  }, [payments, leases, landlordUnitIds]);

  const totalAdminHeld = heldFunds.reduce((acc, h) => acc + h.amount, 0);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase text-[#0f172a]">Security Deposits Hub</h1>
        <p className="text-slate-500 mt-2 font-medium">Oversight of security bonds and funds held for property securing.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#0f172a] p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5 text-8xl pointer-events-none"><i className="fas fa-vault"></i></div>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Total Lease Deposits Held</p>
          <h2 className="text-5xl font-black tracking-tight mb-4">KES {totalHeldDeposits.toLocaleString()}</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aggregate across {activeLeases.length} active leases</p>
        </div>

        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5 text-8xl pointer-events-none text-amber-500"><i className="fas fa-hand-holding-dollar"></i></div>
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Administrative Held Funds</p>
          <h2 className="text-5xl font-black tracking-tight text-slate-900 mb-4">KES {totalAdminHeld.toLocaleString()}</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payments secured by agents for deposit reconciliation</p>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
           <h3 className="text-xl font-black text-slate-900">Held Funds Details</h3>
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{heldFunds.length} Active Holds</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
             <thead className="bg-white border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
               <tr>
                 <th className="py-6 px-10">Payment Reference</th>
                 <th className="py-6 px-10">Property Context</th>
                 <th className="py-6 px-10">Hold Reason</th>
                 <th className="py-6 px-10 text-right">Amount (KES)</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
               {heldFunds.length === 0 ? (
                 <tr>
                   <td colSpan={4} className="py-20 text-center text-slate-300 font-bold uppercase text-xs italic tracking-widest">No administrative holds in effect for your portfolio</td>
                 </tr>
               ) : heldFunds.map(h => {
                 const lease = leases.find(l => l.id === h.invoiceId); // simplified lookup
                 const unit = landlordUnits.find(u => u.id === lease?.unitId);
                 const prop = properties.find(p => p.id === unit?.propertyId);
                 
                 return (
                   <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                     <td className="py-6 px-10 font-black text-slate-900">{h.reference}</td>
                     <td className="py-6 px-10">
                        <div className="flex flex-col">
                           <span className="font-bold text-slate-700 text-sm">{prop?.name || 'Asset Ledger'}</span>
                           <span className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">Unit: {unit?.unitNumber}</span>
                        </div>
                     </td>
                     <td className="py-6 px-10">
                        <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-lg border border-amber-100">
                           {h.holdReason || 'Security Securing'}
                        </span>
                     </td>
                     <td className="py-6 px-10 text-right font-black text-slate-900 text-lg">
                        {h.amount.toLocaleString()}
                     </td>
                   </tr>
                 );
               })}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DepositsHub;
