
import React, { useState, useMemo } from 'react';
import { User, Property, Lease, Tenant, UserRole, Unit } from '../types';

interface ArchiveFolderProps {
  users: User[];
  properties: Property[];
  leases: Lease[];
  tenants: Tenant[];
  units: Unit[];
  currentUser: User;
  onRestoreUser: (user: User) => void;
  onRestoreProperty: (propertyId: string) => void;
  onRestoreLease: (leaseId: string) => void;
  onPermanentDeleteProperty?: (propertyId: string) => void;
  onPermanentDeleteUser?: (userId: string) => void;
  onPermanentDeleteTenant?: (tenantId: string) => void;
}

type ArchiveView = 'SHELVES' | 'STAFF' | 'PROPERTIES';

const ArchiveFolder: React.FC<ArchiveFolderProps> = ({ 
  users, 
  properties, 
  leases, 
  tenants,
  units,
  currentUser,
  onRestoreUser,
  onRestoreProperty,
  onPermanentDeleteProperty,
  onPermanentDeleteUser,
  onPermanentDeleteTenant
}) => {
  const [activeView, setActiveView] = useState<ArchiveView>('SHELVES');
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);
  const [previewNoticeUrl, setPreviewNoticeUrl] = useState<string | null>(null);

  const isLandlord = currentUser.role === UserRole.LANDLORD;
  const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;

  const archivedProperties = useMemo(() => 
    properties.filter(p => p.approvalStatus === 'ARCHIVED' && (isLandlord ? p.ownerId === currentUser.id : true)),
    [properties, currentUser.id, isLandlord]
  );

  const activeApprovedProps = useMemo(() => 
    properties.filter(p => p.approvalStatus === 'APPROVED' && p.isManaged && (isLandlord ? p.ownerId === currentUser.id : true)),
    [properties, currentUser.id, isLandlord]
  );

  const archivedUsers = useMemo(() => 
    users.filter(u => u.status === 'TRASHED'),
    [users]
  );

  const getShelfHistory = (propId: string) => {
    const propUnits = units.filter(u => u.propertyId === propId);
    const unitIds = propUnits.map(u => u.id);
    
    // Get all terminated leases for these units (Historical records)
    const history: any[] = [];
    leases.filter(l => unitIds.includes(l.unitId) && l.status === 'Terminated').forEach(lease => {
      const tenant = tenants.find(t => t.id === lease.tenantId);
      if (tenant) {
        const unit = propUnits.find(u => u.id === lease.unitId);
        history.push({
          id: `${tenant.id}-${lease.id}`,
          tenantId: tenant.id,
          tenantName: tenant.name,
          idNumber: tenant.idNumber,
          unitNumber: unit?.unitNumber || 'N/A',
          occupancyDate: lease.startDate,
          vacationDate: lease.endDate || tenant.tenancyEndDate || 'N/A',
          vacationNoticeUrl: tenant.vacationNoticeUrl
        });
      }
    });
    return history.sort((a, b) => b.vacationDate.localeCompare(a.vacationDate));
  };

  const getArchivedAssetOccupancy = (propId: string) => {
    const propUnits = units.filter(u => u.propertyId === propId);
    const unitIds = propUnits.map(u => u.id);
    
    // For archived assets, find active leases at time of termination or latest terminated leases
    return propUnits.map(unit => {
      const latestLease = leases
        .filter(l => l.unitId === unit.id)
        .sort((a, b) => (b.endDate || '').localeCompare(a.endDate || ''))[0];
      
      const tenant = latestLease ? tenants.find(t => t.id === latestLease.tenantId) : null;
      
      return {
        unitNumber: unit.unitNumber,
        tenantName: tenant?.name || 'Vacant at termination',
        tenantId: tenant?.id,
        status: latestLease?.status || 'Vacant'
      };
    });
  };

  const handlePermanentDelete = (id: string, type: 'PROPERTY' | 'USER' | 'TENANT') => {
    if (!isSuperAdmin) {
      alert("Unauthorized: Only Super Admins can purge archived data.");
      return;
    }
    if (window.confirm(`CRITICAL: Permanent deletion will purge all records of this ${type.toLowerCase()}. This cannot be undone. Proceed?`)) {
      if (type === 'PROPERTY') onPermanentDeleteProperty?.(id);
      else if (type === 'USER') onPermanentDeleteUser?.(id);
      else if (type === 'TENANT') onPermanentDeleteTenant?.(id);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="flex items-center space-x-3 text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] mb-3">
             <i className="fas fa-vault"></i>
             <span>SYSTEM SECURITY / {isLandlord ? 'ASSET ARCHIVES' : 'DATA ARCHIVE'}</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Archive Folder</h1>
          <p className="text-slate-500 mt-2 font-medium max-w-2xl">Historical records preserved for <span className="text-indigo-600 font-bold">7 years</span>. Tenant profiles move to shelves upon vacation.</p>
        </div>
        {!isLandlord && (
          <div className="bg-indigo-900 text-white px-6 py-3 rounded-2xl border border-indigo-800 shadow-xl flex items-center space-x-4">
             <i className="fas fa-shield-check text-indigo-400"></i>
             <div className="text-[10px] font-black uppercase tracking-widest leading-none">
                Super Admin Authorized<br/>
                <span className="text-indigo-400 font-bold opacity-60">Level 5 Security Clearance</span>
             </div>
          </div>
        )}
      </header>

      <div className="bg-white p-1 rounded-2xl border border-slate-200 flex overflow-x-auto no-scrollbar shadow-sm w-full md:w-fit max-w-full">
        <button onClick={() => { setActiveView('SHELVES'); setSelectedShelfId(null); }} className={`shrink-0 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'SHELVES' ? 'bg-[#0f172a] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Asset Shelves ({activeApprovedProps.length})</button>
        {!isLandlord && (
          <>
            <button onClick={() => { setActiveView('PROPERTIES'); setSelectedShelfId(null); }} className={`shrink-0 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'PROPERTIES' ? 'bg-[#0f172a] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Archived Assets ({archivedProperties.length})</button>
            <button onClick={() => { setActiveView('STAFF'); setSelectedShelfId(null); }} className={`shrink-0 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'STAFF' ? 'bg-[#0f172a] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Staff Archive ({archivedUsers.length})</button>
          </>
        )}
      </div>

      <main className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
        {activeView === 'SHELVES' && !selectedShelfId && (
          <div className="p-10 animate-in fade-in">
             <div className="mb-10">
               <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Active Portfolio Shelves</h3>
               <p className="text-xs text-slate-400 font-medium italic">Terminated lease records and vacated tenant profiles are stored within their respective asset shelf.</p>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {activeApprovedProps.length === 0 ? (
                   <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]"><p className="text-slate-300 font-bold uppercase text-[10px] tracking-widest">No active asset shelves</p></div>
                ) : activeApprovedProps.map(prop => (
                   <div key={prop.id} onClick={() => setSelectedShelfId(prop.id)} className="bg-slate-50 border border-slate-200 p-8 rounded-[2.5rem] relative group hover:bg-white hover:shadow-xl hover:border-indigo-100 transition-all cursor-pointer">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 border border-slate-100 mb-6 shadow-sm"><i className="fas fa-archive text-lg"></i></div>
                      <h4 className="text-lg font-black text-slate-900 mb-2 truncate group-hover:text-indigo-600">{prop.name}</h4>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6"><i className="fas fa-location-dot mr-2 text-indigo-400 opacity-60"></i>{prop.location}</p>
                      <div className="flex justify-between items-center text-[9px] font-black uppercase text-indigo-600 tracking-widest pt-4 border-t border-slate-200/50">
                        <span>History Log</span>
                        <span>{getShelfHistory(prop.id).length} Entries</span>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        )}

        {(selectedShelfId || (activeView === 'PROPERTIES' && selectedShelfId)) && (
          <div className="p-10 animate-in slide-in-from-bottom-4 duration-300">
             <button onClick={() => setSelectedShelfId(null)} className="mb-10 text-indigo-600 font-black text-[10px] uppercase tracking-widest flex items-center hover:underline"><i className="fas fa-arrow-left mr-2"></i> Back to Archive</button>
             <div className="mb-10 border-b border-slate-100 pb-8">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{properties.find(p => p.id === selectedShelfId)?.name}</h3>
                <p className="text-xs text-slate-400 font-bold uppercase mt-2 tracking-widest">{activeView === 'PROPERTIES' ? 'FINAL OCCUPANCY STATE AT TERMINATION' : 'CHRONOLOGICAL RESIDENT HISTORY'}</p>
             </div>
             
             {activeView === 'SHELVES' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <tr><th className="py-6 px-8">Unit</th><th className="py-6 px-8">Past Resident</th><th className="py-6 px-8 text-center">Period</th><th className="py-6 px-8 text-right">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {getShelfHistory(selectedShelfId!).length === 0 ? (
                        <tr><td colSpan={4} className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">No historical residents found in this shelf</td></tr>
                      ) : getShelfHistory(selectedShelfId!).map(entry => (
                        <tr key={entry.id} className="hover:bg-slate-50/50">
                          <td className="py-6 px-8 font-black text-indigo-600 uppercase text-xs">Unit {entry.unitNumber}</td>
                          <td className="py-6 px-8"><p className="font-black text-slate-900">{entry.tenantName}</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">ID: {entry.idNumber}</p></td>
                          <td className="py-6 px-8 text-center text-xs font-bold text-slate-500">{entry.occupancyDate} <i className="fas fa-arrow-right mx-2 text-[8px] opacity-30"></i> {entry.vacationDate}</td>
                          <td className="py-6 px-8 text-right">
                             <div className="flex justify-end space-x-4 items-center">
                                {entry.vacationNoticeUrl && <button onClick={() => setPreviewNoticeUrl(entry.vacationNoticeUrl)} className="text-indigo-600 font-black text-[9px] uppercase tracking-widest hover:underline">Notice</button>}
                                {isSuperAdmin && <button onClick={() => handlePermanentDelete(entry.tenantId, 'TENANT')} className="text-rose-500 text-[9px] font-black uppercase tracking-widest hover:underline">PURGE RECORD</button>}
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {getArchivedAssetOccupancy(selectedShelfId!).map((unit, i) => (
                    <div key={i} className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                       <p className="text-[10px] font-black text-indigo-600 uppercase mb-2">Unit {unit.unitNumber}</p>
                       <h5 className="font-black text-slate-900 text-sm">{unit.tenantName}</h5>
                       <p className={`text-[8px] font-black uppercase tracking-widest mt-4 inline-block px-2 py-1 rounded ${unit.status === 'Active' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>{unit.status === 'Active' ? 'Inhabited at Termination' : 'Vacant'}</p>
                    </div>
                  ))}
                </div>
             )}
          </div>
        )}

        {!isLandlord && activeView === 'PROPERTIES' && !selectedShelfId && (
          <div className="overflow-x-auto animate-in fade-in">
             <div className="p-10 border-b border-slate-50 bg-slate-50/30"><h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Released & Archived Assets</h3></div>
             <table className="w-full text-left">
               <thead className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                 <tr><th className="py-6 px-10">Asset Name</th><th className="py-6 px-10 text-center">Location</th><th className="py-6 px-10 text-center">Release Date</th><th className="py-6 px-10 text-right">Actions</th></tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {archivedProperties.map(prop => (
                   <tr key={prop.id} className="hover:bg-slate-50/50 transition-colors">
                     <td className="py-6 px-10">
                       <button onClick={() => setSelectedShelfId(prop.id)} className="text-left group">
                        <p className="font-black text-slate-900 group-hover:text-indigo-600">{prop.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{prop.category}</p>
                       </button>
                     </td>
                     <td className="py-6 px-10 text-center text-xs font-bold text-slate-500 uppercase">{prop.location}</td>
                     <td className="py-6 px-10 text-center text-xs font-black text-slate-400">{prop.archivedAt ? new Date(prop.archivedAt).toLocaleDateString('en-GB') : 'N/A'}</td>
                     <td className="py-6 px-10 text-right">
                        <div className="flex justify-end space-x-4">
                           <button onClick={() => onRestoreProperty(prop.id)} className="text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:underline">RE-DEPLOY</button>
                           {isSuperAdmin && <button onClick={() => handlePermanentDelete(prop.id, 'PROPERTY')} className="text-rose-500 text-[10px] font-black uppercase tracking-widest hover:underline">PURGE</button>}
                        </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        )}

        {!isLandlord && activeView === 'STAFF' && (
          <div className="overflow-x-auto animate-in fade-in">
             <div className="p-10 border-b border-slate-50 bg-slate-50/30"><h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Former Employee Audit</h3></div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <tr><th className="py-6 px-10">Employee Info</th><th className="py-6 px-10 text-center">Former Role</th><th className="py-6 px-10 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {archivedUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-6 px-10"><div className="flex items-center space-x-4"><div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400">{user.name.charAt(0)}</div><div><p className="font-black text-slate-900">{user.name}</p><p className="text-xs text-slate-400">{user.email}</p></div></div></td>
                    <td className="py-6 px-10 text-center"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user.role?.replace('_', ' ') || 'None'}</span></td>
                    <td className="py-6 px-10 text-right">
                      <div className="flex justify-end space-x-4">
                        <button onClick={() => onRestoreUser(user)} className="text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:underline">RESTORE</button>
                        {isSuperAdmin && <button onClick={() => handlePermanentDelete(user.id, 'USER')} className="text-rose-500 text-[10px] font-black uppercase tracking-widest hover:underline">PURGE</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {previewNoticeUrl && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0f172a]/95 backdrop-blur-md" onClick={() => setPreviewNoticeUrl(null)}></div>
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col h-[80vh] animate-in zoom-in-95">
             <header className="p-8 border-b border-slate-100 flex justify-between items-center"><h3 className="text-xl font-black text-[#0f172a] uppercase">Audit: Vacation Notice</h3><button onClick={() => setPreviewNoticeUrl(null)} className="text-slate-300 hover:text-rose-500 transition-colors"><i className="fas fa-times text-lg"></i></button></header>
             <div className="flex-1 bg-slate-50 p-10 flex items-center justify-center overflow-auto"><img src={previewNoticeUrl} className="max-w-full max-h-full shadow-2xl rounded-2xl border-8 border-white" alt="Notice" /></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchiveFolder;
