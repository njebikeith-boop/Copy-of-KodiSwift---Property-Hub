
import React, { useState, useMemo, useEffect } from 'react';
import { User, UserRole, Tenant, Property, PropertyCategory, Unit, Lease } from '../types';
import PropertyLedger from './PropertyLedger';

interface TenantManagerProps {
  highlightId: string | null;
  allUsers: User[];
  currentUser: User;
  tenants: Tenant[];
  properties: Property[];
  units: Unit[];
  leases: Lease[];
  onAddTenant: (tenant: Tenant) => void;
  onUpdateTenant: (tenant: Tenant) => void;
  onDeleteTenant: (tenantId: string, vacationNoticeUrl?: string) => void;
}

type SubTab = 'TENANTS' | 'LANDLORDS';

const TenantManager: React.FC<TenantManagerProps> = ({ 
  highlightId, 
  allUsers, 
  currentUser, 
  tenants, 
  properties,
  units,
  leases,
  onAddTenant,
  onUpdateTenant,
  onDeleteTenant
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('TENANTS');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingProfile, setViewingProfile] = useState<Tenant | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string; isPdf?: boolean } | null>(null);
  const [vacatingTenant, setVacatingTenant] = useState<Tenant | null>(null);
  const [vacationNoticeFile, setVacationNoticeFile] = useState<string | null>(null);
  
  const [selectedViewPropertyId, setSelectedViewPropertyId] = useState<string>('all');
  const [showTenantsList, setShowTenantsList] = useState(false);
  
  const isLandlord = currentUser.role === UserRole.LANDLORD;
  const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;
  const isStaff = currentUser.role === UserRole.PROPERTY_MANAGER || currentUser.role === UserRole.ACCOUNTANT || isSuperAdmin;

  const landlordProperties = useMemo(() => 
    properties.filter(p => 
      p.ownerId === currentUser.id && 
      p.isManaged && 
      p.approvalStatus === 'APPROVED' &&
      (p.category === PropertyCategory.RENTAL || p.category === PropertyCategory.LEASE)
    ), 
    [currentUser.id, properties]
  );

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  useEffect(() => {
    if (isLandlord && landlordProperties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(landlordProperties[0].id);
    }
  }, [landlordProperties, isLandlord, selectedPropertyId]);

  const [formData, setFormData] = useState<Partial<Tenant>>({
    name: '',
    idNumber: '',
    phoneNumber: '',
    altPhoneNumber: '',
    email: '',
    nextOfKin: '',
    occupation: '',
    idCopyUrl: '',
    agreementUrl: ''
  });

  const tenantsByProperty = useMemo(() => {
    const activeTenants = tenants.filter(t => t.status !== 'TRASHED');
    if (!showTenantsList && !searchTerm) return [];
    if (selectedViewPropertyId === 'all') return activeTenants;
    if (selectedViewPropertyId === 'unassigned') {
      const activeTenantIds = leases.filter(l => l.status === 'Active').map(l => l.tenantId);
      return activeTenants.filter(t => !activeTenantIds.includes(t.id));
    }
    const propertyUnitIds = units.filter(u => u.propertyId === selectedViewPropertyId).map(u => u.id);
    const tenantIdsInProperty = leases
      .filter(l => l.status === 'Active' && propertyUnitIds.includes(l.unitId))
      .map(l => l.tenantId);
    return activeTenants.filter(t => tenantIdsInProperty.includes(t.id));
  }, [selectedViewPropertyId, showTenantsList, searchTerm, tenants, units, leases]);

  const filteredTenants = tenantsByProperty.filter(t => {
    const s = searchTerm.toLowerCase();
    return (t.name?.toLowerCase() || '').includes(s) || 
           (t.email?.toLowerCase() || '').includes(s) ||
           (t.phoneNumber || '').includes(s);
  });

  const registeredLandlords = useMemo(() => 
    allUsers.filter(u => u.role === UserRole.LANDLORD && u.status === 'VERIFIED' && 
      (u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()))
    ), 
    [allUsers, searchTerm]
  );

  const getSafeDocumentUrl = (dataUrl: string) => {
    if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl;
    try {
      const parts = dataUrl.split(',');
      if (parts.length < 2) return dataUrl;

      const byteString = atob(parts[1]);
      const mimeString = parts[0].split(':')[1].split(';')[0];
      
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      const blob = new Blob([ab], { type: mimeString });
      return URL.createObjectURL(blob);
    } catch (e) {
      console.error("Critical: Document Blob conversion failed.", e);
      return dataUrl;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'idCopyUrl' | 'agreementUrl' | 'vacationNotice') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (field === 'vacationNotice') {
          setVacationNoticeFile(reader.result as string);
        } else {
          setFormData(prev => ({ ...prev, [field]: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const isFormValid = !!(formData.name && formData.idNumber && formData.phoneNumber && formData.email && formData.nextOfKin && formData.idCopyUrl && formData.agreementUrl);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      alert("System Protocol Error: All profile fields and required documents must be uploaded.");
      return;
    }
    if (editingId) {
      onUpdateTenant({ ...tenants.find(t => t.id === editingId)!, ...formData as Tenant });
    } else {
      const newId = `t-${Date.now()}`;
      const { id: _, ...tenantData } = formData;
      onAddTenant({ 
        ...tenantData as Tenant,
        id: newId, 
        paymentCode: `KS-${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: new Date().toISOString() 
      });
    }
    closeModal();
  };

  const closeModal = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', idNumber: '', phoneNumber: '', altPhoneNumber: '', email: '', nextOfKin: '', occupation: '', idCopyUrl: '', agreementUrl: '' });
  };

  const startEdit = (tenant: Tenant) => {
    setEditingId(tenant.id);
    setFormData({ ...tenant });
    setIsAdding(true);
  };

  const handleTenantClick = (tenantId: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) setViewingProfile(tenant);
  };

  const handleOpenDocPreview = (dataUrl: string, title: string) => {
    if (!dataUrl) return;
    const isPdf = dataUrl.toLowerCase().includes('application/pdf') || dataUrl.toLowerCase().includes('pdf');
    const safeUrl = isPdf ? getSafeDocumentUrl(dataUrl) : dataUrl;
    setPreviewDoc({ url: safeUrl, title, isPdf });
  };

  const closeDocPreview = () => {
    if (previewDoc?.url.startsWith('blob:')) {
      URL.revokeObjectURL(previewDoc.url);
    }
    setPreviewDoc(null);
  };

  const executeVacate = () => {
    if (vacatingTenant) {
      if (window.confirm(`CRITICAL: Confirm vacation for ${vacatingTenant.name}? Profile will move to Archives.`)) {
        onDeleteTenant(vacatingTenant.id, vacationNoticeFile || undefined);
        setVacatingTenant(null);
        setVacationNoticeFile(null);
      }
    }
  };

  const renderTenants = () => {
    if (!showTenantsList && !searchTerm) {
      return (
        <div className="py-24 md:py-40 bg-white rounded-[2.5rem] md:rounded-[3rem] border-2 border-dashed border-slate-100 text-center flex flex-col items-center justify-center animate-in fade-in duration-500 mx-4 md:mx-0">
           <i className="fas fa-users-viewfinder text-4xl text-slate-100 mb-6"></i>
           <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] px-6">Select property and click "Show Tenants" to view records</p>
        </div>
      );
    }
    if (filteredTenants.length === 0) {
      return <div className="py-24 text-center text-slate-300 font-black uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-[2.5rem] md:rounded-[3rem] mx-4 md:mx-0">No Resident Records Found</div>;
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8 animate-in fade-in duration-500 px-4 md:px-0">
        {filteredTenants.map((tenant) => (
          <div key={tenant.id} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all flex flex-col h-full group active:scale-[0.98]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4 md:space-x-5 overflow-hidden">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-[#0f172a] text-white rounded-2xl flex items-center justify-center text-xl md:text-2xl font-black shrink-0">{tenant.name?.charAt(0) || '?'}</div>
                <div className="overflow-hidden">
                   <h3 className="text-lg md:text-xl font-black text-slate-900 truncate tracking-tight">{tenant.name}</h3>
                   <div className="flex items-center space-x-2 mt-0.5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">ID: {tenant.idNumber}</p>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-black rounded uppercase border border-indigo-100 shrink-0">{tenant.paymentCode}</span>
                   </div>
                </div>
              </div>
              {!isLandlord && (
                <div className="flex space-x-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(tenant)} className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 flex items-center justify-center transition-all active:scale-90"><i className="fas fa-edit text-xs"></i></button>
                  <button onClick={() => setVacatingTenant(tenant)} className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all active:scale-90"><i className="fas fa-sign-out-alt text-xs"></i></button>
                </div>
              )}
            </div>
            <div className="space-y-4 mb-8">
               <div className="flex items-center text-sm font-medium text-slate-600 truncate"><i className="fas fa-phone mr-3 text-indigo-400 w-4"></i>{tenant.phoneNumber}</div>
               <div className="flex items-center text-sm font-medium text-slate-600 truncate"><i className="fas fa-envelope mr-3 text-indigo-400 w-4"></i>{tenant.email}</div>
            </div>
            <button onClick={() => setViewingProfile(tenant)} className="w-full py-4 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95">View Profile</button>
          </div>
        ))}
      </div>
    );
  };

  const renderLandlords = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 animate-in fade-in duration-500 px-4 md:px-0">
      {registeredLandlords.length === 0 ? (
        <div className="col-span-full py-24 text-center text-slate-300 font-black uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-[2.5rem] md:rounded-[3rem]">No Landlord Records Found</div>
      ) : registeredLandlords.map((lnd) => (
        <div key={lnd.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all flex flex-col h-full group active:scale-[0.98]">
          <div className="flex items-center space-x-5 mb-8">
            <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-2xl font-black shrink-0">{lnd.name.charAt(0)}</div>
            <div className="overflow-hidden">
               <h3 className="text-xl font-black text-slate-900 truncate tracking-tight">{lnd.name}</h3>
               <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-0.5">Verified Owner</p>
            </div>
          </div>
          <div className="space-y-4 mb-8 flex-1">
             <div className="flex items-center text-sm font-medium text-slate-600 truncate"><i className="fas fa-envelope mr-3 text-indigo-400 w-4"></i>{lnd.email}</div>
             <div className="flex items-center text-sm font-medium text-slate-600 truncate"><i className="fas fa-phone mr-3 text-indigo-400 w-4"></i>{lnd.phone || 'N/A'}</div>
             <div className="mt-4 pt-6 border-t border-slate-50">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Portfolio Summary</p>
               <p className="text-sm font-black text-slate-900">{properties.filter(p => p.ownerId === lnd.id && p.approvalStatus === 'APPROVED').length} Properties Managed</p>
             </div>
          </div>
          <button className="w-full py-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-sm active:scale-95">Manage Partner</button>
        </div>
      ))}
    </div>
  );

  const renderLandlordSplitView = () => (
    <div className="flex flex-col lg:flex-row gap-8 min-h-[600px] animate-in fade-in duration-500 px-4 md:px-0">
      <div className="w-full lg:w-72 space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">MANAGED PORTFOLIO</h3>
        <div className="space-y-2 md:max-h-[70vh] md:overflow-y-auto no-scrollbar">
          {landlordProperties.map(prop => (
            <button key={prop.id} onClick={() => setSelectedPropertyId(prop.id)} className={`w-full text-left p-6 rounded-[2rem] border transition-all group active:scale-[0.98] ${selectedPropertyId === prop.id ? 'bg-[#0f172a] border-[#0f172a] shadow-xl text-white' : 'bg-white border-slate-100 hover:border-indigo-200 text-slate-600'}`}>
              <div className="flex items-center space-x-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${selectedPropertyId === prop.id ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-400'}`}>{prop.name.charAt(0)}</div>
                <div className="overflow-hidden">
                  <p className="font-black text-sm truncate leading-tight">{prop.name}</p>
                  <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${selectedPropertyId === prop.id ? 'text-indigo-200' : 'text-slate-400'}`}>{prop.location}</p>
                </div>
              </div>
            </button>
          ))}
          {landlordProperties.length === 0 && <div className="px-4 py-20 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]"><p className="text-[10px] font-black text-slate-300 uppercase">NO DATA TO SHOW</p></div>}
        </div>
      </div>
      <div className="flex-1 bg-white rounded-[2.5rem] md:rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
        {selectedPropertyId ? <PropertyLedger propertyName={landlordProperties.find(p => p.id === selectedPropertyId)?.name || ''} propertyId={selectedPropertyId} totalUnits={landlordProperties.find(p => p.id === selectedPropertyId)?.totalUnits || 0} units={units.filter(u => u.propertyId === selectedPropertyId)} leases={leases} tenants={tenants} onUpdateUnit={() => {}} onTenantClick={handleTenantClick} onRequestAction={() => {}} readOnly={true} /> : <div className="h-full bg-slate-50/30 flex flex-col items-center justify-center p-20 text-center border-2 border-dashed border-slate-200 rounded-[3rem] m-4"><p className="text-slate-300 font-bold text-[11px] uppercase">SELECT AN ASSET TO VIEW RESIDENTS</p></div>}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 md:space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 px-4 md:px-0">
        <div className="overflow-hidden">
          <h1 className="text-3xl md:text-4xl font-black text-[#0f172a] tracking-tight uppercase truncate">{isLandlord ? 'OCCUPANCY' : activeSubTab === 'TENANTS' ? 'RESIDENT DIRECTORY' : 'LANDLORD DIRECTORY'}</h1>
          <p className="text-slate-500 mt-2 font-medium max-w-2xl text-sm md:text-base">{isLandlord ? 'Live audit of residents and utility assessments.' : activeSubTab === 'TENANTS' ? 'Manage occupant profiles and KYC documentation.' : 'Central registry of verified property owners.'}</p>
        </div>
        {isStaff && (
          <div className="bg-white p-1 rounded-2xl border border-slate-200 flex shadow-sm w-full lg:w-auto overflow-hidden">
            <button onClick={() => setActiveSubTab('TENANTS')} className={`flex-1 lg:flex-none px-6 md:px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${activeSubTab === 'TENANTS' ? 'bg-[#0f172a] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Tenants</button>
            <button onClick={() => setActiveSubTab('LANDLORDS')} className={`flex-1 lg:flex-none px-6 md:px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${activeSubTab === 'LANDLORDS' ? 'bg-[#0f172a] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Landlords</button>
          </div>
        )}
      </header>

      {activeSubTab === 'TENANTS' && !isLandlord && (
        <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm animate-in slide-in-from-top-4 duration-500 mx-4 md:mx-0">
           <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div className="md:col-span-3">
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Asset Registry Filter</label>
                 <select value={selectedViewPropertyId} onChange={(e) => { setSelectedViewPropertyId(e.target.value); setShowTenantsList(false); }} className="w-full px-6 md:px-8 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all">
                   <option value="all">All Managed Assets</option>
                   <option value="unassigned">Unassigned Residents (No Active Lease)</option>
                   {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                 </select>
              </div>
              <button onClick={() => setShowTenantsList(true)} className="w-full px-8 py-4 bg-[#0f172a] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all flex items-center justify-center space-x-3 active:scale-95"><i className="fas fa-eye text-[10px]"></i><span>Show Records</span></button>
           </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-4 w-full px-4 md:px-0">
         {!isLandlord && activeSubTab === 'TENANTS' && (
           <button onClick={() => setIsAdding(true)} className="w-full sm:w-auto px-10 py-4.5 bg-[#0f172a] text-white rounded-full font-black text-[10px] md:text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-600 flex items-center justify-center shrink-0 active:scale-95"><i className="fas fa-plus mr-2"></i> Register Tenant</button>
         )}
         <div className="relative flex-1 lg:w-64 w-full">
            <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
            <input type="text" placeholder={activeSubTab === 'TENANTS' ? "Search residents..." : "Search landlords..."} className="w-full pl-12 pr-6 py-4.5 rounded-full bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-xs shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
         </div>
      </div>

      <main className="overflow-hidden">{isLandlord ? renderLandlordSplitView() : activeSubTab === 'TENANTS' ? renderTenants() : renderLandlords()}</main>

      {/* VACATE MODAL */}
      {vacatingTenant && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#0f172a]/90 backdrop-blur-md" onClick={() => { setVacatingTenant(null); setVacationNoticeFile(null); }}></div>
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 p-8 md:p-12 overflow-hidden animate-in zoom-in-95">
             <h3 className="text-2xl font-black text-[#0f172a] mb-2 tracking-tight uppercase">Vacate Protocol</h3>
             <p className="text-slate-400 text-sm mb-10 font-medium">Finalizing exit for <span className="text-[#0f172a] font-black">{vacatingTenant.name}</span>. The profile will move to System Archives.</p>
             
             <div className="space-y-8">
                <div>
                   <div className="flex justify-between items-center mb-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Vacation Notice / Settlement</label>
                      <span className="text-[8px] font-black text-indigo-400 uppercase bg-indigo-50 px-2 py-0.5 rounded">Optional Activity</span>
                   </div>
                   <input type="file" accept="image/*,application/pdf" id="vacate-upload" className="hidden" onChange={(e) => handleFileChange(e, 'vacationNotice')} />
                   <label htmlFor="vacate-upload" className={`w-full h-32 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all ${vacationNoticeFile ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}>
                      <i className={`fas ${vacationNoticeFile ? 'fa-check-circle' : 'fa-file-upload'} text-2xl mb-2`}></i>
                      <span className="text-[10px] font-black uppercase tracking-widest">{vacationNoticeFile ? 'Document Attached' : 'Attach Proof of Vacation'}</span>
                   </label>
                </div>
                
                <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 flex items-start space-x-4">
                   <i className="fas fa-triangle-exclamation text-rose-500 mt-1"></i>
                   <p className="text-[11px] font-bold text-rose-700 leading-relaxed">System Archival is permanent. All active billing will be terminated and historical occupancy will be logged for 7 years.</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                   <button onClick={() => { setVacatingTenant(null); setVacationNoticeFile(null); }} className="py-5 bg-white border border-slate-200 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95">Cancel</button>
                   <button onClick={executeVacate} className="py-5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-100 hover:bg-rose-700 active:scale-95">Verify & Vacate</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {previewDoc && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#0f172a]/60 backdrop-blur-md" onClick={closeDocPreview}></div>
          <div className="bg-white w-full max-w-5xl rounded-[2.5rem] md:rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col h-[85vh] animate-in zoom-in-95 duration-300">
            <header className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h3 className="text-lg md:text-xl font-black text-[#0f172a] uppercase tracking-tight truncate mr-4">{previewDoc.title}</h3>
              <div className="flex items-center space-x-2 md:space-x-3 shrink-0">
                <button onClick={() => window.open(previewDoc.url, '_blank')} className="px-4 md:px-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all active:scale-95">
                  <i className="fas fa-external-link-alt mr-2"></i> <span className="hidden sm:inline">Open Original</span>
                </button>
                <button onClick={closeDocPreview} className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors active:scale-90">
                  <i className="fas fa-times text-lg"></i>
                </button>
              </div>
            </header>
            <div className="flex-1 bg-[#f1f5f9] p-4 md:p-8 flex flex-col items-center justify-center overflow-hidden">
              {previewDoc.isPdf ? (
                <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-white relative">
                  <object data={previewDoc.url} type="application/pdf" className="w-full h-full border-none rounded-2xl">
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 p-8 md:p-12 text-center animate-in fade-in duration-500">
                       <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center text-2xl md:text-3xl mb-6 shadow-sm">
                          <i className="fas fa-file-shield"></i>
                       </div>
                       <h4 className="text-lg md:text-xl font-black text-slate-900 mb-4 tracking-tight uppercase">Manual Review Required</h4>
                       <button onClick={() => window.open(previewDoc.url, '_blank')} className="px-8 md:px-10 py-5 bg-[#0f172a] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-600 transition-all active:scale-95">Open Document</button>
                    </div>
                  </object>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
                  <img src={previewDoc.url} className="max-w-full max-h-full shadow-2xl rounded-xl object-contain" alt="Document Preview" />
                </div>
              )}
            </div>
            <div className="p-5 bg-white border-t border-slate-100 text-center shrink-0">
               <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Authorized Portal Access Only</p>
            </div>
          </div>
        </div>
      )}

      {viewingProfile && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto">
          <div className="absolute inset-0 bg-[#0f172a]/60 backdrop-blur-sm" onClick={() => setViewingProfile(null)}></div>
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl relative z-10 p-8 md:p-14 overflow-hidden border border-slate-50 animate-in zoom-in-95 duration-300 my-auto">
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left space-y-6 sm:space-y-0 sm:space-x-6 mb-12">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-[#0f172a] text-white rounded-[1.5rem] md:rounded-[1.8rem] flex items-center justify-center text-3xl md:text-4xl font-black shadow-xl shadow-slate-200 shrink-0 uppercase">{viewingProfile.name?.charAt(0) || '?'}</div>
              <div className="overflow-hidden w-full">
                <h2 className="text-3xl md:text-4xl font-black text-[#0f172a] tracking-tight leading-tight truncate">{viewingProfile.name}</h2>
                <div className="flex flex-col sm:flex-row items-center sm:space-x-3 mt-3 gap-2">
                   <p className="text-indigo-600 font-black uppercase text-[9px] md:text-[10px] tracking-[0.2em] bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">RESIDENT PROFILE</p>
                   <span className="px-3 py-1 bg-indigo-600 text-white text-[9px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-indigo-100 shrink-0">{viewingProfile.paymentCode}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12 mb-12 md:mb-14 overflow-y-auto max-h-[40vh] px-1 custom-scrollbar">
              <ProfileDetail label="IDENTIFICATION" value={viewingProfile.idNumber} />
              <ProfileDetail label="API ROUTING" value={viewingProfile.paymentCode} />
              <ProfileDetail label="PHONE" value={viewingProfile.phoneNumber} />
              <ProfileDetail label="EMAIL" value={viewingProfile.email} />
              <ProfileDetail label="NEXT OF KIN" value={viewingProfile.nextOfKin || 'N/A'} />
              <ProfileDetail label="TENANCY BEGAN" value={viewingProfile.tenancyStartDate || viewingProfile.createdAt?.split('T')[0] || 'N/A'} />
            </div>
            <div className="flex flex-col gap-4 pt-10 border-t border-slate-100/50 shrink-0">
               <div className="flex flex-col sm:flex-row gap-4">
                  <button onClick={() => handleOpenDocPreview(viewingProfile.idCopyUrl!, `Identification`)} className="flex-1 py-4.5 bg-[#f8fafc] text-[#0f172a] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100 active:scale-95">VIEW ID</button>
                  <button onClick={() => handleOpenDocPreview(viewingProfile.agreementUrl!, `Lease Agreement`)} className="flex-1 py-4.5 bg-[#f8fafc] text-[#0f172a] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100 active:scale-95">VIEW LEASE</button>
               </div>
               <button onClick={() => setViewingProfile(null)} className="w-full py-5 bg-[#0f172a] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95">CLOSE PROFILE</button>
            </div>
          </div>
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-[#0f172a]/60 backdrop-blur-sm" onClick={closeModal}></div>
          <form onSubmit={handleSubmit} className="bg-white w-full max-w-3xl rounded-[2.5rem] md:rounded-[3rem] shadow-2xl relative z-10 p-8 md:p-12 overflow-hidden flex flex-col max-h-[90vh] my-auto">
            <header className="mb-10 flex justify-between items-start shrink-0">
               <div><h2 className="text-2xl md:text-3xl font-black text-[#0f172a] tracking-tight">{editingId ? 'Update Registry' : 'Onboarding'}</h2><p className="text-slate-400 text-[10px] md:text-xs font-bold mt-1 uppercase tracking-[0.2em]">KYC DATA PROTOCOL</p></div>
               <button type="button" onClick={closeModal} className="text-slate-300 hover:text-rose-500 active:scale-90 transition-transform"><i className="fas fa-times text-xl"></i></button>
            </header>
            <div className="flex-1 overflow-y-auto space-y-8 pr-2 md:pr-4 custom-scrollbar">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Legal Name *</label><input required type="text" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                  <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">ID / Passport *</label><input required type="text" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold transition-all" value={formData.idNumber} onChange={e => setFormData({...formData, idNumber: e.target.value})} /></div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Primary Phone *</label><input required type="tel" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold transition-all" value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} /></div>
                  <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Email *</label><input required type="email" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Next of Kin *</label><input required type="text" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold transition-all" value={formData.nextOfKin} onChange={e => setFormData({...formData, nextOfKin: e.target.value})} /></div>
                  <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Occupation</label><input type="text" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold transition-all" value={formData.occupation} onChange={e => setFormData({...formData, occupation: e.target.value})} /></div>
               </div>
               <div className="pt-8 border-t border-slate-50 space-y-6">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center">
                     <i className="fas fa-file-shield mr-2"></i> Document Verification
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                     <div className="relative"><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex justify-between">ID/Passport{formData.idCopyUrl && <span className="text-emerald-500"><i className="fas fa-check-circle"></i></span>}</label><input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, 'idCopyUrl')} className="hidden" id="id-upload" /><label htmlFor="id-upload" className="w-full h-28 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all group"><i className="fas fa-id-card text-xl text-slate-300 mb-2 group-hover:text-indigo-400"></i><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Attach File</span></label></div>
                     <div className="relative"><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex justify-between">Lease Agreement{formData.agreementUrl && <span className="text-emerald-500"><i className="fas fa-check-circle"></i></span>}</label><input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, 'agreementUrl')} className="hidden" id="agreement-upload" /><label htmlFor="agreement-upload" className="w-full h-28 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all group"><i className="fas fa-file-contract text-xl text-slate-300 mb-2 group-hover:text-indigo-400"></i><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Attach File</span></label></div>
                  </div>
               </div>
            </div>
            <footer className="mt-10 pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-4 shrink-0">
               <button type="button" onClick={closeModal} className="px-8 py-4.5 bg-white border border-slate-200 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform order-2 sm:order-1">Cancel</button>
               <button type="submit" disabled={!isFormValid} className="px-10 py-4.5 bg-[#0f172a] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-600 disabled:opacity-50 transition-all active:scale-95 order-1 sm:order-2">Commit Record</button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
};

const ProfileDetail: React.FC<{label: string, value: string}> = ({label, value}) => (
  <div className="flex flex-col space-y-1.5 md:space-y-2">
    <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    <p className="text-lg md:text-xl font-black text-[#0f172a] tracking-tight truncate">{value}</p>
  </div>
);

export default TenantManager;
