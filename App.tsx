
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PaymentCenter from './components/PaymentCenter';
import AdvisoryInsights from './components/AdvisoryInsights';
import PortfolioManager from './components/PortfolioManager';
import Properties from './components/Properties';
import TenantManager from './components/TenantManager';
import UserManagement from './components/UserManagement';
import RightsManagement from './components/RightsManagement';
import ArchiveFolder from './components/ArchiveFolder';
import SystemRequests from './components/SystemRequests';
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import PropertyLedger from './components/PropertyLedger';
import CustomerRequests from './components/CustomerRequests';
import { api, saveToLocalMirror, loadFromLocalMirror, clearLocalMirror } from './db';
import { MOCK_PROPERTIES, CURRENT_USER } from './constants';
import { User, Property, SystemRequest, Unit, Tenant, Lease, Payment, Invoice, RequestActionType, RoleBlueprint, UserStatus } from './types';

const App: React.FC = () => {
  const [initialData] = useState(() => loadFromLocalMirror());
  const [viewMode, setViewMode] = useState<'PUBLIC' | 'PORTAL'>(() => 
    localStorage.getItem('ks_session') ? 'PORTAL' : 'PUBLIC' as any
  );
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTabState] = useState(() => localStorage.getItem('ks_active_tab') || 'dashboard');
  const setActiveTab = (tab: string) => {
    localStorage.setItem('ks_active_tab', tab);
    setActiveTabState(tab);
  };

  const lastWriteTimestamp = useRef<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPropertyUnits, setSelectedPropertyUnits] = useState<Property | null>(null);

  // Core Hydrated State
  const [managedProps, setManagedProps] = useState<Property[]>(initialData?.properties || MOCK_PROPERTIES);
  const [units, setUnits] = useState<Unit[]>(initialData?.units || []);
  const [leases, setLeases] = useState<Lease[]>(initialData?.leases || []);
  const [tenants, setTenants] = useState<Tenant[]>(initialData?.tenants || []);
  const [invoices, setInvoices] = useState<Invoice[]>(initialData?.invoices || []);
  const [payments, setPayments] = useState<Payment[]>(initialData?.payments || []);
  const [systemRequests, setSystemRequests] = useState<SystemRequest[]>(initialData?.systemRequests || []);
  const [engineeredRoles, setEngineeredRoles] = useState<RoleBlueprint[]>(initialData?.roles || []);
  const [allUsers, setAllUsers] = useState<User[]>(initialData?.users || [{ ...CURRENT_USER, status: 'VERIFIED' }]);

  // Persistence Helper: Synchronizes current memory state to localStorage
  const syncMirror = useCallback(() => {
    saveToLocalMirror({
      properties: managedProps,
      units,
      leases,
      tenants,
      invoices,
      payments,
      systemRequests,
      roles: engineeredRoles,
      users: allUsers
    });
  }, [managedProps, units, leases, tenants, invoices, payments, systemRequests, engineeredRoles, allUsers]);

  const refreshAppData = useCallback(async (silent = false) => {
    // If a write just happened, wait for the cloud to process before polling
    if (Date.now() - lastWriteTimestamp.current < 5000) return;
    
    if (!silent) setIsLoading(true);
    try {
      const cloud = await api.fetchEverything();
      if (cloud) {
        if (cloud.properties) setManagedProps(cloud.properties);
        if (cloud.tenants) setTenants(cloud.tenants);
        if (cloud.invoices) setInvoices(cloud.invoices);
        if (cloud.payments) setPayments(cloud.payments);
        if (cloud.systemRequests) setSystemRequests(cloud.systemRequests);
        if (cloud.users) setAllUsers(cloud.users);
        if (cloud.roles) setEngineeredRoles(cloud.roles);
        if (cloud.units) setUnits(cloud.units);
        if (cloud.leases) setLeases(cloud.leases);
        saveToLocalMirror(cloud); 
      }
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    refreshAppData(false);
    const poller = setInterval(() => refreshAppData(true), 30000);
    return () => clearInterval(poller);
  }, [refreshAppData]);

  // Wrap all state-changing actions to update mirror immediately
  const wrapWrite = (fn: () => void) => {
    lastWriteTimestamp.current = Date.now();
    fn();
    // Use a small timeout to ensure the state updates from the callback are reflected in syncMirror
    setTimeout(syncMirror, 50);
  };

  // Atomic Logic Handlers
  const handleSaveInvoice = (inv: Invoice) => wrapWrite(() => {
    setInvoices(p => p.some(i => i.id === inv.id) ? p.map(i => i.id === inv.id ? inv : i) : [...p, inv]);
    api.saveInvoice(inv);
  });

  const handleRequestAction = (type: RequestActionType, id: string, targetType: string, payload: any) => wrapWrite(() => {
    const newReq: SystemRequest = { 
      id: `req-${Date.now()}`, actionType: type, requestedByUserId: currentUser?.id || 'sys', 
      requestedByUserName: currentUser?.name || 'Guest', targetId: id, targetType, payload, createdAt: new Date().toISOString() 
    };
    setSystemRequests(p => [...p, newReq]);
    api.saveRequest(newReq);
  });

  const handleApproveRequest = async (req: SystemRequest) => wrapWrite(async () => {
    const { actionType, payload, targetId } = req;
    
    if (actionType === 'PROPERTY_ACTIVATE') {
      const newProp = { ...payload, id: targetId, isManaged: true, approvalStatus: 'APPROVED' };
      setManagedProps(prev => [...prev, newProp]);
      await api.saveProperty(newProp);
    } else if (actionType === 'PROPERTY_UPDATE') {
      if (payload.units) {
        setUnits(prev => [...prev.filter(u => u.propertyId !== targetId), ...payload.units]);
        for (const unit of payload.units) { await api.saveUnit(unit); }
      }
      if (payload.leases) {
        setLeases(prev => [...prev.filter(l => !payload.leases.some((newL: Lease) => newL.id === l.id)), ...payload.leases]);
        for (const lease of payload.leases) { await api.saveLease(lease); }
      }
      const existing = managedProps.find(p => p.id === targetId);
      if (existing) {
        const updated = { ...existing, ...payload };
        delete updated.units; delete updated.leases; 
        setManagedProps(prev => prev.map(p => p.id === targetId ? updated : p));
        await api.saveProperty(updated);
      }
    } else if (actionType === 'DELETE' && req.targetType === 'PROPERTY') {
      setManagedProps(prev => prev.filter(p => p.id !== targetId));
      await api.deleteProperty(targetId);
      await api.deleteUnit(targetId); 
    }

    setSystemRequests(prev => prev.filter(r => r.id !== req.id));
    await api.deleteRequest(req.id);
  });

  const handleLogin = (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === CURRENT_USER.email.toLowerCase()) {
      localStorage.setItem('ks_session', cleanEmail);
      setCurrentUser({ ...CURRENT_USER, status: 'VERIFIED' });
      setViewMode('PORTAL');
      return null;
    }
    const user = allUsers.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) return "Unauthorized: Account not found.";
    localStorage.setItem('ks_session', cleanEmail);
    setCurrentUser(user);
    setViewMode('PORTAL');
    return null;
  };

  const renderContent = () => {
    if (!currentUser) return null;
    switch (activeTab) {
      case 'dashboard': return <Dashboard userName={currentUser.name} properties={managedProps} units={units} invoices={invoices} payments={payments} permissions={{export: true, add_property: true}} />;
      case 'properties': return <PortfolioManager properties={managedProps} allUsers={allUsers} landlordInvites={[]} currentUser={currentUser} withdrawableBalance={currentUser.balance || 0} onRequestAction={handleRequestAction} onViewUnits={(p) => setSelectedPropertyUnits(p)} pendingRequests={systemRequests} onTenantClick={() => setActiveTab('tenants')} financialStatements={[]} />;
      case 'tenants': return <TenantManager highlightId={null} allUsers={allUsers} currentUser={currentUser} tenants={tenants} properties={managedProps} units={units} leases={leases} onAddTenant={(t) => wrapWrite(() => {setTenants(p=>[...p, t]); api.saveTenant(t);})} onUpdateTenant={(t) => wrapWrite(() => {setTenants(p=>p.map(o=>o.id===t.id?t:o)); api.saveTenant(t);})} onDeleteTenant={(id) => wrapWrite(() => {setTenants(p=>p.filter(x=>x.id!==id)); api.deleteProperty(id);})} />;
      case 'payments_hub': return <PaymentCenter properties={managedProps} units={units} leases={leases} tenants={tenants} invoices={invoices} onSaveInvoice={handleSaveInvoice} onDeleteInvoice={(id)=>wrapWrite(()=>{setInvoices(p=>p.filter(x=>x.id!==id)); api.deleteInvoice(id);})} payments={payments} onSavePayment={(p)=>wrapWrite(()=>{setPayments(x=>[...x, p]); api.savePayment(p);})} onDeletePayment={(id)=>wrapWrite(()=>{setPayments(p=>p.filter(x=>x.id!==id)); api.deletePayment(id);})} currentUser={currentUser} setManagedProps={setManagedProps} permissions={{auto_generate: true, print: true, sms: true}} />;
      case 'analytics': return <AdvisoryInsights properties={managedProps} units={units} leases={leases} invoices={invoices} permissions={{refresh: true}} />;
      case 'user-active': return <UserManagement users={allUsers} engineeredRoles={engineeredRoles} currentUserId={currentUser.id} setActiveTab={setActiveTab} view="active" onUpdateUser={(u)=>wrapWrite(()=>{setAllUsers(p=>p.map(o=>o.id===u.id?u:o)); api.saveUser(u);})} onDeleteUser={(id)=>wrapWrite(()=>{setAllUsers(p=>p.filter(x=>x.id!==id)); api.deleteUser(id);})} />;
      case 'rights-roles': return <RightsManagement roles={engineeredRoles} setRoles={(roles) => wrapWrite(() => { setEngineeredRoles(roles as any); (roles as RoleBlueprint[]).forEach(r => api.saveRole(r)); })} users={allUsers} onUpdateUser={()=>{}} />;
      case 'system_approvals': return <SystemRequests requests={systemRequests} users={allUsers} onApprove={handleApproveRequest} onApproveBatch={(ids) => ids.forEach(id => { const r = systemRequests.find(x => x.id === id); if(r) handleApproveRequest(r); })} onDecline={(id) => wrapWrite(() => { setSystemRequests(p => p.filter(x => x.id !== id)); api.deleteRequest(id); })} />;
      case 'archive_folder': return <ArchiveFolder users={allUsers} properties={managedProps} leases={leases} tenants={tenants} units={units} currentUser={currentUser} onRestoreUser={()=>{}} onRestoreProperty={()=>{}} onRestoreLease={()=>{}} />;
      case 'customer_requests': return <CustomerRequests requests={[]} onUpdateStatus={()=>{}} onDeleteRequest={()=>{}} />;
      default: return <div className="p-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest italic">Activating Module Protocol...</div>;
    }
  };

  if (viewMode === 'PUBLIC') return <LandingPage onEnterGateway={() => setViewMode('PORTAL')} properties={managedProps} />;
  
  return (
    <div className="flex min-h-screen bg-slate-50">
      {currentUser ? (
        <>
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} onLogout={() => {clearLocalMirror(); setViewMode('PUBLIC');}} onGoPublic={() => setViewMode('PUBLIC')} pendingCount={systemRequests.length} engineeredRoles={engineeredRoles} isMailRelayActive={false} />
          <main className="flex-1 ml-0 md:ml-64 p-4 md:p-10 pt-44 md:pt-10 transition-all duration-500 overflow-x-hidden">
            {isLoading && <div className="fixed top-40 md:top-10 right-10 z-[200] bg-emerald-600 text-white px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse flex items-center space-x-2"><i className="fas fa-database"></i><span>Verified Protocol Active</span></div>}
            {renderContent()}
          </main>
        </>
      ) : (
        <Login onLogin={handleLogin} onSignup={()=>{}} onBackToPublic={() => setViewMode('PUBLIC')} />
      )}
      {selectedPropertyUnits && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-md" onClick={() => setSelectedPropertyUnits(null)}></div>
          <div className="bg-white w-full max-w-6xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden h-[90vh]">
            <PropertyLedger propertyName={selectedPropertyUnits.name} propertyId={selectedPropertyUnits.id} totalUnits={selectedPropertyUnits.totalUnits} units={units.filter(u => u.propertyId === selectedPropertyUnits.id)} leases={leases} tenants={tenants} onUpdateUnit={() => {}} onTenantClick={(id) => { setActiveTab('tenants'); setSelectedPropertyUnits(null); }} onRequestAction={handleRequestAction} onClose={() => setSelectedPropertyUnits(null)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
