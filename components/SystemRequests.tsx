
import React, { useState, useMemo } from 'react';
import { SystemRequest, User } from '../types';

interface SystemRequestsProps {
  requests: SystemRequest[];
  users: User[];
  onApprove: (request: SystemRequest) => void;
  onApproveBatch: (requestIds: string[]) => void;
  onDecline: (requestId: string) => void;
}

interface VerificationState {
  type: 'APPROVE' | 'DECLINE';
  mode: 'SINGLE' | 'BATCH' | 'CATEGORY';
  ids: string[];
  categoryName?: string;
  request?: SystemRequest;
}

const SystemRequests: React.FC<SystemRequestsProps> = ({ requests, users, onApprove, onApproveBatch, onDecline }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [verification, setVerification] = useState<VerificationState | null>(null);
  const [viewingRequest, setViewingRequest] = useState<SystemRequest | null>(null);

  const getInitiator = (req: SystemRequest) => {
    return users.find(u => u.id === req.requestedByUserId) || { name: req.requestedByUserName, id: 'deleted' };
  };

  const getActionBadge = (type: SystemRequest['actionType']) => {
    switch(type) {
      case 'DELETE': return 'bg-rose-50 text-rose-500 border-rose-100';
      case 'PROPERTY_ACTIVATE': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'PROPERTY_UPDATE': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'WITHDRAW_FUNDS': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'ASSIGN_ROLE': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  const getRequestDescription = (req: SystemRequest) => {
    const p = req.payload;
    switch(req.actionType) {
      case 'PROPERTY_ACTIVATE':
        return `Request to deploy "${p.name}" as an active managed asset in ${p.location}. Units: ${p.totalUnits}.`;
      case 'PROPERTY_UPDATE':
        return `Requested configuration update for "${p.propertyName || p.name}". Logs: ${p.changeLogs?.length || 0} entries.`;
      case 'DELETE':
        return `Security request to release "${p.name}" from management.`;
      case 'WITHDRAW_FUNDS':
        return `Authorized withdrawal of KES ${p.amount?.toLocaleString()}.`;
      default:
        return `System update for target ${req.targetType}.`;
    }
  };

  const groupedRequests = useMemo(() => {
    const groups: Record<string, SystemRequest[]> = {};
    requests.forEach(req => {
      if (!groups[req.actionType]) groups[req.actionType] = [];
      groups[req.actionType].push(req);
    });
    return groups;
  }, [requests]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev => prev.length === requests.length ? [] : requests.map(r => r.id));
  };

  const initiateApprove = (req: SystemRequest) => setVerification({ type: 'APPROVE', mode: 'SINGLE', ids: [req.id], request: req });
  const initiateDecline = (req: SystemRequest) => setVerification({ type: 'DECLINE', mode: 'SINGLE', ids: [req.id], request: req });
  const initiateBatchApprove = () => setVerification({ type: 'APPROVE', mode: 'BATCH', ids: selectedIds });
  const initiateBatchDecline = () => setVerification({ type: 'DECLINE', mode: 'BATCH', ids: selectedIds });
  const initiateCategoryApprove = (type: string, ids: string[]) => setVerification({ type: 'APPROVE', mode: 'CATEGORY', ids, categoryName: type });
  const initiateCategoryDecline = (type: string, ids: string[]) => setVerification({ type: 'DECLINE', mode: 'CATEGORY', ids, categoryName: type });

  const executeAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!verification) return;
    if (verification.type === 'APPROVE') {
      if (verification.mode === 'SINGLE' && verification.request) onApprove(verification.request);
      else onApproveBatch(verification.ids);
    } else {
      verification.ids.forEach(id => onDecline(id));
    }
    setSelectedIds(prev => prev.filter(id => !verification.ids.includes(id)));
    setVerification(null);
  };

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [requests]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-32">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-[#0f172a] tracking-tight">Approval Queue</h1>
          <p className="text-slate-500 font-medium">Authorize administrative and financial updates.</p>
        </div>
        <div className="flex flex-col sm:flex-row space-x-4">
           <button onClick={initiateBatchDecline} disabled={selectedIds.length === 0} className="px-8 py-4 rounded-2xl font-black text-xs uppercase bg-white border border-slate-200 text-slate-500 disabled:opacity-50">Decline {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}</button>
           <button onClick={initiateBatchApprove} disabled={selectedIds.length === 0} className="px-8 py-4 rounded-2xl font-black text-xs uppercase bg-[#0f172a] text-white disabled:opacity-50 shadow-xl">Approve {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}</button>
        </div>
      </header>

      {requests.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.keys(groupedRequests).map((type) => {
            const group = groupedRequests[type];
            return (
              <div key={type} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="mb-8">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{type.replace('_', ' ')}</p>
                   <h4 className="text-3xl font-black text-[#0f172a] tracking-tight">{group.length} Pending</h4>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => initiateCategoryApprove(type, group.map(r => r.id))} className="flex-1 py-4 bg-[#0f172a] text-white rounded-2xl text-[10px] font-black uppercase shadow-lg">Approve All</button>
                  <button onClick={() => initiateCategoryDecline(type, group.map(r => r.id))} className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-100"><i className="fas fa-trash-can text-sm"></i></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="p-32 border-2 border-dashed border-slate-200 rounded-[4rem] text-center bg-white flex flex-col items-center shadow-sm">
          <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center text-4xl text-indigo-200 mb-8"><i className="fas fa-check-double"></i></div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">Queue is Clear</h3>
        </div>
      ) : (
        <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-white text-left border-b border-slate-50">
                <tr>
                  <th className="py-10 px-10 w-12 text-center"><input type="checkbox" checked={selectedIds.length === requests.length} onChange={toggleSelectAll} className="w-6 h-6 rounded-lg" /></th>
                  <th className="py-10 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                  <th className="py-10 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Details</th>
                  <th className="py-10 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Initiated By</th>
                  <th className="py-10 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sortedRequests.map((req) => {
                  const initiator = getInitiator(req);
                  const isSelected = selectedIds.includes(req.id);
                  return (
                    <tr key={req.id} className={isSelected ? 'bg-indigo-50/30' : ''}>
                      <td className="py-10 px-10 text-center"><input type="checkbox" checked={isSelected} onChange={() => toggleSelect(req.id)} className="w-6 h-6 rounded-lg" /></td>
                      <td className="py-10 px-8"><span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase border ${getActionBadge(req.actionType)}`}>{req.actionType.replace('_', ' ')}</span></td>
                      <td className="py-10 px-8"><div><p className="font-black text-[#0f172a] text-lg">{req.payload.name || 'System Asset'}</p><p className="text-[10px] text-slate-400 uppercase">{req.targetType}</p></div></td>
                      <td className="py-10 px-8"><div><p className="text-base font-black text-slate-800">{initiator.name}</p><p className="text-[10px] text-slate-400">{new Date(req.createdAt).toLocaleString()}</p></div></td>
                      <td className="py-10 px-8 text-right"><div className="flex justify-end space-x-2"><button onClick={() => setViewingRequest(req)} className="p-3 text-slate-300 hover:text-indigo-600"><i className="fas fa-eye"></i></button><button onClick={() => initiateDecline(req)} className="px-6 py-3 bg-white border text-slate-400 font-black rounded-xl text-[10px] uppercase">Decline</button><button onClick={() => initiateApprove(req)} className="px-6 py-3 bg-[#0f172a] text-white font-black rounded-xl text-[10px] uppercase shadow-lg">Approve</button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEWING MODAL: Impact Analysis */}
      {viewingRequest && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-[#0f172a]/95 backdrop-blur-md" onClick={() => setViewingRequest(null)}></div>
           <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
              <header className="p-10 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
                 <div>
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getActionBadge(viewingRequest.actionType)}`}>
                       {viewingRequest.actionType.replace('_', ' ')}
                    </span>
                    <h3 className="text-2xl font-black text-[#0f172a] mt-2 tracking-tight">Request Impact Analysis</h3>
                 </div>
                 <button onClick={() => setViewingRequest(null)} className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors">
                    <i className="fas fa-times text-xl"></i>
                 </button>
              </header>

              <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                 <section className="space-y-4">
                    <div className="flex items-center space-x-4">
                       <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-indigo-500">
                          <i className="fas fa-user-circle text-xl"></i>
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initiator Info</p>
                          <p className="text-base font-black text-[#0f172a]">{getInitiator(viewingRequest).name}</p>
                          <p className="text-xs text-slate-400">{new Date(viewingRequest.createdAt).toLocaleString()}</p>
                       </div>
                    </div>
                 </section>

                 <section className="p-8 bg-indigo-50 rounded-[2rem] border border-indigo-100 space-y-4">
                    <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center">
                       <i className="fas fa-bolt mr-2"></i>
                       System Impact Summary
                    </h4>
                    <p className="text-slate-700 font-bold leading-relaxed">
                       {viewingRequest.actionType === 'PROPERTY_ACTIVATE' && "Approval will officially initialize this asset into the active management portfolio, allowing staff to begin unit onboarding and resident leasing."}
                       {viewingRequest.actionType === 'PROPERTY_UPDATE' && `Approving this request will commit ledger modifications (Meters/Rent/Occupancy) for "${viewingRequest.payload.propertyName}". This synchronizes staff field-reports with the system master-ledger.`}
                       {viewingRequest.actionType === 'DELETE' && "CRITICAL: Approval will permanently release this asset from the active portfolio. Historical financial data will be moved to the system archive."}
                       {viewingRequest.actionType === 'WITHDRAW_FUNDS' && `This authorizes a debit of KES ${viewingRequest.payload.amount?.toLocaleString()} from the property system balance to the landlord's verified bank account.`}
                       {viewingRequest.actionType === 'ASSIGN_ROLE' && "Approval grants elevated system rights to the specified staff member, potentially exposing sensitive financial or PII data modules."}
                    </p>
                 </section>

                 {viewingRequest.payload.changeLogs && viewingRequest.payload.changeLogs.length > 0 && (
                    <section className="space-y-6">
                       <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
                          <i className="fas fa-list-check mr-2"></i>
                          Detailed Activity Log
                       </h4>
                       <div className="space-y-3">
                          {viewingRequest.payload.changeLogs.map((log: string, idx: number) => (
                             <div key={idx} className="flex items-start space-x-3 p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs font-medium text-slate-600">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0"></div>
                                <span>{log}</span>
                             </div>
                          ))}
                       </div>
                    </section>
                 )}
              </div>

              <footer className="p-10 border-t border-slate-50 bg-white grid grid-cols-2 gap-4">
                 <button 
                   onClick={() => { initiateDecline(viewingRequest); setViewingRequest(null); }}
                   className="py-5 border border-slate-200 text-slate-400 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-all"
                 >
                    Decline Request
                 </button>
                 <button 
                   onClick={() => { initiateApprove(viewingRequest); setViewingRequest(null); }}
                   className="py-5 bg-[#0f172a] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl hover:bg-emerald-600 transition-all"
                 >
                    Authorize Changes
                 </button>
              </footer>
           </div>
        </div>
      )}

      {verification && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-[#0f172a]/90 backdrop-blur-sm" onClick={() => setVerification(null)}></div>
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl relative z-10 p-12 text-center flex flex-col items-center">
                 <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mb-10 ${verification.type === 'APPROVE' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-500'}`}>
                    <i className={`fas text-4xl ${verification.type === 'APPROVE' ? 'fa-shield-check' : 'fa-shield-exclamation'}`}></i>
                 </div>
                 <h3 className="text-4xl font-black text-[#0f172a] mb-8">Confirm {verification.type === 'APPROVE' ? 'Approval' : 'Rejection'}</h3>
                 <p className="text-slate-400 mb-12">Verify administrative authorization for {verification.ids.length} records.</p>
                 <button onClick={executeAction} className={`w-full py-6 rounded-2xl font-black uppercase text-sm shadow-xl ${verification.type === 'APPROVE' ? 'bg-[#0f172a] text-white' : 'bg-rose-600 text-white'}`}>Verify & Confirm</button>
                 <button onClick={() => setVerification(null)} className="w-full py-6 text-[#94a3b8] font-black uppercase text-sm mt-2">Cancel</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default SystemRequests;
