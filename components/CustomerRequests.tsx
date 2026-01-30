
import React, { useMemo } from 'react';
import { CustomerRequest } from '../types';

interface CustomerRequestsProps {
  requests: CustomerRequest[];
  onUpdateStatus: (id: string, status: CustomerRequest['status']) => void;
  onDeleteRequest: (id: string) => void;
  isEmbedded?: boolean;
}

const CustomerRequests: React.FC<CustomerRequestsProps> = ({ requests, onUpdateStatus, onDeleteRequest, isEmbedded }) => {
  const getStatusStyle = (status: CustomerRequest['status']) => {
    switch (status) {
      case 'NEW': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'CONTACTED': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'RESOLVED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  // Explicitly organize by date (Newest First)
  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [requests]);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`space-y-8 animate-in fade-in duration-500 pb-20 ${isEmbedded ? '' : 'px-4 md:px-0'}`}>
      <header>
        <h1 className={`${isEmbedded ? 'text-2xl' : 'text-4xl'} font-black text-slate-900 tracking-tight uppercase`}>Web Inquiries</h1>
        <p className="text-slate-500 mt-2 font-medium">Consolidated feed of tour requests and general property queries.</p>
      </header>

      {sortedRequests.length === 0 ? (
        <div className="py-32 border-2 border-dashed border-slate-200 rounded-[3rem] text-center bg-white flex flex-col items-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl text-slate-200 mb-6">
            <i className="fas fa-inbox"></i>
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">Queue is Empty</h3>
          <p className="text-slate-400 text-sm font-medium">New queries from the website will materialize here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="bg-slate-50/50 text-left border-b border-slate-100">
                <tr>
                  <th className="py-8 px-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">Visitor Info</th>
                  <th className="py-8 px-10 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Type</th>
                  <th className="py-8 px-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">Detail / Property</th>
                  <th className="py-8 px-10 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Logged At</th>
                  <th className="py-8 px-10 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Protocol Status</th>
                  <th className="py-8 px-10 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sortedRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="py-8 px-10">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-base">{req.name}</span>
                        <span className="text-xs text-slate-400 font-medium">{req.email}</span>
                        {req.phone && (
                          <span className="text-[10px] font-black text-indigo-600 mt-2 flex items-center bg-indigo-50 w-fit px-2 py-0.5 rounded border border-indigo-100">
                            <i className="fas fa-phone mr-1.5 opacity-60"></i> {req.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-8 px-10 text-center">
                       <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${req.type === 'TOUR' ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                         {req.type === 'TOUR' ? 'Tour Schedule' : 'General Query'}
                       </span>
                    </td>
                    <td className="py-8 px-10">
                      <div className="flex flex-col">
                        <span className="font-black text-[#0f172a] text-sm uppercase tracking-tight">{req.propertyName || 'Platform General'}</span>
                        <p className={`text-xs mt-1 leading-relaxed ${req.type === 'TOUR' ? 'text-indigo-600 font-black' : 'text-slate-400 font-medium italic'}`}>
                           {req.type === 'TOUR' && <i className="fas fa-calendar-clock mr-2 opacity-60"></i>}
                           "{req.message}"
                        </p>
                      </div>
                    </td>
                    <td className="py-8 px-10 text-center">
                       <p className="text-xs font-black text-slate-700">{formatDate(req.createdAt)}</p>
                       <p className="text-[9px] text-slate-300 font-bold uppercase tracking-tighter">Inbound Signal</p>
                    </td>
                    <td className="py-8 px-10 text-center">
                      <select 
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border outline-none shadow-sm transition-all focus:ring-4 focus:ring-indigo-100 ${getStatusStyle(req.status)}`}
                        value={req.status}
                        onChange={(e) => onUpdateStatus(req.id, e.target.value as any)}
                      >
                        <option value="NEW">Unprocessed</option>
                        <option value="CONTACTED">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                      </select>
                    </td>
                    <td className="py-8 px-10 text-right">
                       <button 
                        onClick={() => onDeleteRequest(req.id)}
                        className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all active:scale-90"
                        title="Archive Query"
                       >
                         <i className="fas fa-trash-alt"></i>
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex items-start space-x-5">
         <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-indigo-500">
            <i className="fas fa-shield-halved"></i>
         </div>
         <div className="flex-1">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">CRM Compliance</h4>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
               All web inquiries are end-to-end encrypted. Contact leads strictly through authorized corporate channels to maintain audit integrity and GDPR standards.
            </p>
         </div>
      </div>
    </div>
  );
};

export default CustomerRequests;
