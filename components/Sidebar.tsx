
import React from 'react';
import { UserRole, User, RoleBlueprint } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  onLogout: () => void;
  onGoPublic: () => void;
  pendingCount?: number;
  engineeredRoles: RoleBlueprint[];
  isMailRelayActive: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, currentUser, onLogout, pendingCount = 0, engineeredRoles, isMailRelayActive }) => {
  const role = currentUser.role;
  const isLandlord = role === UserRole.LANDLORD;
  const isSuperAdmin = role === UserRole.SUPER_ADMIN;
  
  const getMenuForUser = () => {
    if (isLandlord) {
      return [
        { id: 'properties', label: 'Portfolio', icon: 'fa-building' },
        { id: 'tenants', label: 'Occupants', icon: 'fa-users-user' },
        { id: 'reports', label: 'Financials', icon: 'fa-file-chart-column' },
        { id: 'analytics', label: 'Insights', icon: 'fa-chart-mixed' },
        { id: 'archive_folder', label: 'Archives', icon: 'fa-box-archive' },
      ];
    }

    const fullStaffMenu = [
      { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line' },
      { id: 'properties', label: 'Portfolio', icon: 'fa-house-circle-check' },
      { id: 'listings', label: 'Inventory', icon: 'fa-building-list' },
      { id: 'tenants', label: 'Tenants', icon: 'fa-users-viewfinder' },
      { id: 'payments_hub', label: 'Billing', icon: 'fa-sack-dollar' },
      { id: 'reports', label: 'Audit', icon: 'fa-file-chart-column' },
      { id: 'analytics', label: 'Advisory', icon: 'fa-brain' },
      { id: 'customer_requests', label: 'Queries', icon: 'fa-inbox' },
      { id: 'archive_folder', label: 'Archives', icon: 'fa-box-archive' },
    ];

    if (isSuperAdmin) {
        return [...fullStaffMenu, { id: 'mail_log', label: 'Relay', icon: 'fa-envelope-circle-check' }];
    }

    const userRoleBlueprint = engineeredRoles.find(r => r.jobDescription === currentUser.jobDescription);
    if (!userRoleBlueprint) return [{ id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line' }];

    const activeModuleIds = userRoleBlueprint.selectedModules
      .filter(m => m.status === 'ACTIVE')
      .map(m => m.moduleId);

    return fullStaffMenu.filter(item => activeModuleIds.includes(item.id));
  };

  const activeMenu = getMenuForUser();
  
  return (
    <>
      {/* MOBILE HUD: Redesigned for multi-device visibility */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-[#051937] text-white z-[150] shadow-2xl border-b border-white/10">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center font-black text-xs shadow-lg shadow-emerald-500/20">K</div>
            <span className="font-black text-[10px] uppercase tracking-widest text-emerald-500">KodiSwift Gateway</span>
          </div>
          <button onClick={onLogout} className="text-rose-400 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 bg-rose-500/10 rounded-lg border border-rose-500/20">Exit</button>
        </div>
        
        {/* Responsive Flex Strip: Wrap logic for smaller phones */}
        <div className="flex overflow-x-auto no-scrollbar space-x-2 px-5 pb-5 touch-pan-x items-center">
          {activeMenu.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex-shrink-0 min-w-max px-4 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${
                  activeTab === item.id 
                    ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/30' 
                    : 'bg-white/5 text-white/40 border border-white/5'
                }`}
              >
                {item.label}
              </button>
          ))}
          {isSuperAdmin && (
             <button 
              onClick={() => setActiveTab('system_approvals')} 
              className={`flex-shrink-0 min-w-max px-4 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'system_approvals' 
                  ? 'bg-amber-600 text-white shadow-xl shadow-amber-600/30' 
                  : 'bg-amber-500/10 text-amber-500/70 border border-amber-500/20'
              }`}
             >
                Queue {pendingCount > 0 ? `(${pendingCount})` : ''}
             </button>
          )}
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 bg-[#051937] text-slate-300 h-screen flex-col fixed left-0 top-0 border-r border-white/5 shadow-2xl z-40">
        <div className="p-8 flex items-center space-x-4 bg-[#041226] shrink-0 border-b border-white/5">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white text-xl font-black shadow-lg shadow-emerald-500/20">K</div>
          <div className="flex flex-col">
            <span className="text-xl font-black text-white tracking-tight leading-none uppercase">KodiSwift</span>
            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.3em] mt-1">Property Hub</span>
          </div>
        </div>
        
        <div className="flex-1 px-4 py-8 overflow-y-auto space-y-10 sidebar-scroll">
          <section>
            <h5 className="text-[10px] font-black text-blue-300/40 uppercase tracking-[0.3em] mb-5 px-4">Core Directory</h5>
            <nav className="space-y-1">
              {activeMenu.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-5 py-4 rounded-xl transition-all group ${
                    activeTab === item.id 
                      ? 'bg-emerald-600 text-white shadow-2xl shadow-emerald-600/20 translate-x-1' 
                      : 'hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <i className={`fas ${item.icon} w-5 text-sm ${activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-emerald-400'}`}></i>
                    <span className="font-black text-xs uppercase tracking-widest">{item.label}</span>
                  </div>
                  {item.id === 'mail_log' && isMailRelayActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>}
                </button>
              ))}
            </nav>
          </section>

          {isSuperAdmin && (
            <section className="pt-2 border-t border-white/5">
              <h5 className="text-[10px] font-black text-amber-500/40 uppercase tracking-[0.3em] mb-5 px-4">Authority Hub</h5>
              <nav className="space-y-1">
                <button onClick={() => setActiveTab('user-active')} className={`w-full flex items-center space-x-3 px-5 py-4 rounded-xl transition-all ${activeTab === 'user-active' ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'}`}><i className={`fas fa-user-shield w-5 text-sm ${activeTab === 'user-active' ? 'text-emerald-400' : 'text-slate-500'}`}></i><span className="font-black text-xs uppercase tracking-widest">Registry</span></button>
                <button onClick={() => setActiveTab('rights-roles')} className={`w-full flex items-center space-x-3 px-5 py-4 rounded-xl transition-all ${activeTab === 'rights-roles' ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'}`}><i className={`fas fa-key w-5 text-sm ${activeTab === 'rights-roles' ? 'text-amber-400' : 'text-slate-500'}`}></i><span className="font-black text-xs uppercase tracking-widest">Architect</span></button>
                <button onClick={() => setActiveTab('system_approvals')} className={`w-full flex items-center justify-between px-5 py-4 rounded-xl transition-all ${activeTab === 'system_approvals' ? 'bg-amber-600 text-white shadow-xl shadow-amber-600/20' : 'hover:bg-white/5 hover:text-white'}`}><div className="flex items-center space-x-3"><i className={`fas fa-shield-check w-5 text-sm ${activeTab === 'system_approvals' ? 'text-white' : 'text-slate-500'}`}></i><span className="font-black text-xs uppercase tracking-widest">Approvals</span></div>{pendingCount > 0 && <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg">{pendingCount}</span>}</button>
              </nav>
            </section>
          )}
        </div>

        <div className="p-5 bg-[#030d1c] border-t border-white/5">
          <button onClick={onLogout} className="w-full flex items-center space-x-4 px-5 py-4 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all font-black text-[10px] uppercase tracking-[0.2em] border border-transparent hover:border-rose-500/20 group">
            <i className="fas fa-power-off text-xs group-hover:rotate-90 transition-transform duration-500"></i>
            <span>System Exit</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
