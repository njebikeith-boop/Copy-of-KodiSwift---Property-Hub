
import React, { useState, useMemo } from 'react';
import { User, UserRole, UserPermissions, RoleBlueprint } from '../types';

interface RightsManagementProps {
  roles: RoleBlueprint[];
  setRoles: React.Dispatch<React.SetStateAction<RoleBlueprint[]>>;
  users: User[];
  onUpdateUser: (updatedUser: User) => void;
}

interface ModuleDefinition {
  id: string;
  label: string;
  description: string;
}

const DASHBOARD_OPTIONS: ModuleDefinition[] = [
  { id: 'dashboard', label: 'Dashboard', description: 'Access to financial KPIs, occupancy trends, and collection metrics.' },
  { id: 'properties', label: 'Active Portfolio', description: 'Management of building assets, units, and inventory configuration.' },
  { id: 'listings', label: 'Inventory Listings', description: 'Management of public property listings and market posts.' },
  { id: 'tenants', label: 'Tenants & Landlords', description: 'Access to tenant profiles, KYC documents, and lease histories.' },
  { id: 'payments_hub', label: 'Payments & Billing', description: 'Handling of invoices, M-Pesa reconciliation, and receipts.' },
  { id: 'reports', label: 'Reports', description: 'Access to security deposits, service ledgers, and financial auditing.' },
  { id: 'analytics', label: 'Advisory Insights', description: 'Performance data, yield analysis, and Gemini-powered market comparison.' },
  { id: 'customer_requests', label: 'Web Queries', description: 'Direct feed of tour requests and general property inquiries.' },
  { id: 'archive_folder', label: 'Archive Folder', description: 'Historical data, former staff, and deleted asset records.' }
];

const RightsManagement: React.FC<RightsManagementProps> = ({ roles, setRoles, users, onUpdateUser }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  // Form State for new/editing role
  const [tempName, setTempName] = useState('');
  const [tempModules, setTempModules] = useState<RoleBlueprint['selectedModules']>([]);

  const startNewRole = () => {
    setTempName('');
    setTempModules([]);
    setStep(1);
    setIsCreating(true);
    setEditingRoleId(null);
  };

  const handleSaveName = () => {
    if (!tempName.trim()) return;
    setStep(2);
  };

  const toggleModuleSelection = (moduleId: string) => {
    setTempModules(prev => {
      const exists = prev.find(m => m.moduleId === moduleId);
      if (exists) {
        // If it was null, make it active. If it was active, make it null.
        return prev.map(m => m.moduleId === moduleId ? { ...m, status: m.status === 'ACTIVE' ? 'NULL' : 'ACTIVE' } as const : m);
      }
      return [...prev, { moduleId, access: 'READ_ONLY', status: 'ACTIVE' }];
    });
  };

  const setAccessLevel = (moduleId: string, level: 'READ_ONLY' | 'EDITING') => {
    setTempModules(prev => prev.map(m => m.moduleId === moduleId ? { ...m, access: level } : m));
  };

  const generateJobDescription = (name: string, modules: RoleBlueprint['selectedModules']) => {
    const activeOnes = modules.filter(m => m.status === 'ACTIVE');
    if (activeOnes.length === 0) return `Authorized ${name} with no active operational rights.`;
    const summary = activeOnes.map(m => {
      const label = DASHBOARD_OPTIONS.find(d => d.id === m.moduleId)?.label;
      return `${label} [${m.access.replace('_', ' ')}]`;
    }).join(', ');
    return `Authorized ${name} position. Ultimate Determination: Final access granted for ${summary}. This record is the final determiner of user rights.`;
  };

  const commitRole = () => {
    const finalDesc = generateJobDescription(tempName, tempModules);
    const newRole: RoleBlueprint = {
      id: editingRoleId || `role-${Date.now()}`,
      roleName: tempName,
      selectedModules: tempModules,
      jobDescription: finalDesc
    };

    if (editingRoleId) {
      setRoles(prev => prev.map(r => r.id === editingRoleId ? newRole : r));
    } else {
      setRoles(prev => [...prev, newRole]);
    }

    setIsCreating(false);
    setEditingRoleId(null);
  };

  const editExistingRole = (role: RoleBlueprint) => {
    setEditingRoleId(role.id);
    setTempName(role.roleName);
    setTempModules(role.selectedModules);
    setStep(2);
    setIsCreating(true);
  };

  const unassignedOptions = DASHBOARD_OPTIONS.filter(opt => 
    !tempModules.some(tm => tm.moduleId === opt.id && tm.status === 'ACTIVE')
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Role Architect</h1>
          <p className="text-slate-500 mt-2 font-medium">Engineer manual roles and job descriptions to define platform authorization.</p>
        </div>
        {!isCreating && (
          <button 
            onClick={startNewRole}
            className="px-10 py-5 bg-[#0f172a] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-indigo-600 transition-all active:scale-95 flex items-center space-x-3"
          >
            <i className="fas fa-plus"></i>
            <span>Create New Role</span>
          </button>
        )}
      </header>

      <main>
        {isCreating ? (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* Step 1: Naming */}
            <section className={`bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm transition-opacity ${step > 1 ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black">1</div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Role Designation</h3>
              </div>
              <div className="flex gap-4">
                <input 
                  type="text" 
                  placeholder="e.g. Senior Auditor, Portfolio Lead" 
                  className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl py-4 px-8 font-black text-lg outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                />
                <button 
                  onClick={handleSaveName}
                  disabled={!tempName.trim()}
                  className="px-10 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-30 transition-all"
                >
                  Save Name
                </button>
              </div>
            </section>

            {/* Step 2: Module Selection */}
            {step >= 2 && (
              <section className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black">2</div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Assign Dashboard Options</h3>
                </div>

                <div className="space-y-4">
                  {tempModules.map(m => {
                    const opt = DASHBOARD_OPTIONS.find(d => d.id === m.moduleId);
                    if (m.status === 'NULL') return (
                      <div key={m.moduleId} className="p-6 bg-rose-50/30 border border-rose-100 rounded-2xl flex items-center justify-between opacity-60 grayscale">
                        <div className="flex items-center space-x-4">
                           <span className="text-[8px] font-black bg-rose-500 text-white px-2 py-0.5 rounded uppercase">Nullified</span>
                           <p className="text-sm font-black text-rose-400 line-through uppercase tracking-widest">{opt?.label}</p>
                        </div>
                        <button onClick={() => toggleModuleSelection(m.moduleId)} className="text-xs font-black text-rose-500 hover:underline">RESTORE</button>
                      </div>
                    );
                    return (
                      <div key={m.moduleId} className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] animate-in zoom-in-95">
                        <div className="flex flex-col md:flex-row justify-between gap-6">
                           <div className="flex items-start space-x-6">
                              <button onClick={() => toggleModuleSelection(m.moduleId)} className="w-10 h-10 rounded-xl bg-white border border-rose-100 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all">
                                <i className="fas fa-trash-alt text-xs"></i>
                              </button>
                              <div>
                                 <h4 className="text-lg font-black text-slate-900">{opt?.label}</h4>
                                 <p className="text-xs text-slate-400 font-medium max-w-md mt-1">{opt?.description}</p>
                              </div>
                           </div>
                           
                           <div className="bg-white p-1 rounded-2xl border border-slate-200 flex shadow-inner shrink-0 self-start md:self-center">
                              <button 
                                onClick={() => setAccessLevel(m.moduleId, 'READ_ONLY')}
                                className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${m.access === 'READ_ONLY' ? 'bg-[#0f172a] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                              >
                                Read Only
                              </button>
                              <button 
                                onClick={() => setAccessLevel(m.moduleId, 'EDITING')}
                                className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${m.access === 'EDITING' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-indigo-600'}`}
                              >
                                Editing Rights
                              </button>
                           </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Unassigned Options Pool */}
                <div className="mt-12 pt-10 border-t border-slate-50">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Unassigned Operational Rights</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {unassignedOptions.map(opt => (
                      <button 
                        key={opt.id}
                        onClick={() => toggleModuleSelection(opt.id)}
                        className="p-5 border-2 border-dashed border-slate-200 rounded-2xl text-left hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group flex justify-between items-center"
                      >
                        <div>
                           <p className="text-slate-900 font-black text-xs uppercase tracking-tight">{opt.label}</p>
                           <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Available for Provisioning</p>
                        </div>
                        <i className="fas fa-plus text-slate-300 group-hover:text-indigo-500 transition-colors"></i>
                      </button>
                    ))}
                    {unassignedOptions.length === 0 && (
                      <div className="col-span-full py-10 text-center bg-emerald-50 rounded-3xl border border-emerald-100">
                         <p className="text-emerald-600 font-black text-[10px] uppercase tracking-[0.4em]">Full Authorization spectrum active</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-12 flex justify-end space-x-4">
                   <button onClick={() => setIsCreating(false)} className="px-10 py-5 text-slate-400 font-black text-xs uppercase tracking-widest">Discard</button>
                   <button 
                    onClick={commitRole}
                    className="px-12 py-5 bg-[#0f172a] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-emerald-600 transition-all active:scale-95"
                   >
                     Submit Job Description
                   </button>
                </div>
              </section>
            )}

            {/* Synthesized Job Description Preview */}
            {tempModules.length > 0 && (
              <div className="p-8 bg-indigo-50 rounded-[3rem] border border-indigo-100 relative overflow-hidden animate-in slide-in-from-bottom-2">
                 <div className="absolute top-0 right-0 p-8 opacity-10 text-6xl pointer-events-none"><i className="fas fa-file-contract"></i></div>
                 <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4">Synthesized Determination (Preview)</h4>
                 <p className="text-slate-700 font-bold leading-relaxed text-sm italic">
                    "{generateJobDescription(tempName, tempModules)}"
                 </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
             {roles.length === 0 ? (
               <div className="h-[600px] border-2 border-dashed border-slate-200 rounded-[4rem] bg-white flex flex-col items-center justify-center p-20 text-center">
                  <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] shadow-sm flex items-center justify-center text-slate-200 text-4xl mb-8">
                     <i className="fas fa-drafting-compass"></i>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">No Roles Engineered</h3>
                  <p className="text-slate-400 font-medium max-w-sm">Initiate the architecture flow to create manual positions and synthesize job descriptions.</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 gap-6">
                  {roles.map(role => (
                    <div key={role.id} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-10 group hover:shadow-xl transition-all">
                       <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-4">
                             <h4 className="text-3xl font-black text-[#0f172a] tracking-tight">{role.roleName}</h4>
                             <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-lg border border-indigo-100 uppercase tracking-widest">Determined</span>
                          </div>
                          <p className="text-slate-500 font-bold text-sm italic leading-relaxed">"{role.jobDescription}"</p>
                          <div className="flex flex-wrap gap-2 mt-6">
                             {role.selectedModules.filter(m => m.status === 'ACTIVE').map(m => (
                               <span key={m.moduleId} className="px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                 {DASHBOARD_OPTIONS.find(d => d.id === m.moduleId)?.label}
                               </span>
                             ))}
                          </div>
                       </div>
                       <div className="shrink-0">
                          <button 
                            onClick={() => editExistingRole(role)}
                            className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all active:scale-90 shadow-sm"
                          >
                            <i className="fas fa-pen-nib"></i>
                          </button>
                       </div>
                    </div>
                  ))}
               </div>
             )}
          </div>
        )}
      </main>
    </div>
  );
};

export default RightsManagement;
