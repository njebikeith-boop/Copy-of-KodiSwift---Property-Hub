
import React, { useState } from 'react';
import InvoiceCenter from './InvoiceCenter';
import { Property, Unit, Lease, Tenant, Invoice, Payment, User } from '../types';

interface PaymentCenterProps {
  permissions: {
    auto_generate: boolean;
    print: boolean;
    sms: boolean;
  };
  properties: Property[];
  units: Unit[];
  leases: Lease[];
  tenants: Tenant[];
  invoices: Invoice[];
  onSaveInvoice: (inv: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
  payments: Payment[];
  onSavePayment: (pay: Payment) => void;
  onDeletePayment: (id: string) => void;
  currentUser: User;
  setManagedProps: React.Dispatch<React.SetStateAction<Property[]>>;
}

const PaymentCenter: React.FC<PaymentCenterProps> = ({ 
  permissions, 
  properties, 
  units, 
  leases, 
  tenants,
  invoices,
  onSaveInvoice,
  onDeleteInvoice,
  payments,
  onSavePayment,
  onDeletePayment,
  currentUser,
  setManagedProps
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'billing' | 'history' | 'expenses' | 'penalties'>('billing');

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Payments Hub</h1>
          <p className="text-slate-500 mt-2 font-medium">Consolidated financial oversight for Billings, Expenses, and Penalties.</p>
        </div>
        
        <div className="bg-white p-1 rounded-2xl border border-slate-200 flex overflow-x-auto no-scrollbar space-x-0.5 shadow-sm max-w-full">
           {['billing', 'history', 'expenses', 'penalties'].map((tab) => (
             <button 
               key={tab}
               onClick={() => setActiveSubTab(tab as any)}
               className={`shrink-0 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${activeSubTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
             >
               {tab}
             </button>
           ))}
        </div>
      </header>

      <main>
        {activeSubTab === 'billing' && (
          <InvoiceCenter 
            permissions={permissions} 
            properties={properties}
            units={units}
            leases={leases}
            tenants={tenants}
            invoices={invoices}
            onSaveInvoice={onSaveInvoice}
            onDeleteInvoice={onDeleteInvoice}
            payments={payments}
            onSavePayment={onSavePayment}
            onDeletePayment={onDeletePayment}
            currentUser={currentUser}
            setManagedProps={setManagedProps}
          />
        )}

        {activeSubTab === 'history' && (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
             <div className="p-8 bg-amber-50 border-b border-amber-100 flex items-center space-x-4">
                <i className="fas fa-exclamation-circle text-amber-500"></i>
                <p className="text-sm font-bold text-amber-700">{payments.filter(p => p.status === 'Unmatched').length} payments are pending confirmation.</p>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full">
                  <thead className="bg-slate-50/50 border-b border-slate-50 text-left">
                    <tr>
                      <th className="py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference</th>
                      <th className="py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                      <th className="py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                      <th className="py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {payments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="py-6 px-10 font-bold text-slate-900">{pay.reference}</td>
                        <td className="py-6 px-10 font-black text-indigo-600">KES {pay.amount.toLocaleString()}</td>
                        <td className="py-6 px-8 text-xs font-bold text-slate-500">{pay.method}</td>
                        <td className="py-6 px-10">
                          <div className="flex justify-center">
                            <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${pay.status === 'Matched' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                              {pay.status}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
             </div>
          </div>
        )}

        {activeSubTab === 'expenses' && (
          <div className="p-32 border-2 border-dashed border-slate-100 rounded-[3rem] text-center bg-white flex flex-col items-center">
             <i className="fas fa-receipt text-4xl text-slate-200 mb-6"></i>
             <h3 className="text-2xl font-black text-slate-900 mb-2">Expense Ledger</h3>
             <p className="text-slate-400 font-medium max-sm">Maintenance, security, and staff costs will appear here to calculate net owner yields.</p>
          </div>
        )}

        {activeSubTab === 'penalties' && (
          <div className="p-32 border-2 border-dashed border-slate-100 rounded-[3rem] text-center bg-white flex flex-col items-center">
             <i className="fas fa-gavel text-4xl text-slate-200 mb-6"></i>
             <h3 className="text-2xl font-black text-slate-900 mb-2">Penalties & Fines</h3>
             <p className="text-slate-400 font-medium max-sm">Automatically calculated late fees based on property rules.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default PaymentCenter;
