
import React, { useState, useEffect, useMemo } from 'react';
import { Property, User, RequestActionType, SystemRequest, PropertyCategory, UserRole, FinancialStatementEntry, PenaltyType, PenaltyAppliedOn } from '../types';
import { MOCK_UNITS, KENYAN_COUNTIES } from '../constants';

interface LandlordInvite {
  id: string;
  email: string;
  name: string;
  propertyName: string;
  propertyId: string;
  oneTimeLink: string;
}

interface PortfolioManagerProps {
  properties: Property[];
  allUsers: User[]; 
  landlordInvites: LandlordInvite[];
  currentUser: User;
  withdrawableBalance: number;
  onRequestAction: (type: RequestActionType, id: string, targetType: 'PROPERTY' | 'USER' | 'CUSTOMER_REQUEST', payload: any) => void;
  onViewUnits: (property: Property) => void;
  pendingRequests: SystemRequest[];
  onTenantClick: (tenantId: string) => void;
  autoOpenAdd?: boolean;
  onAddClose?: () => void;
  financialStatements: FinancialStatementEntry[];
}

const PortfolioManager: React.FC<PortfolioManagerProps> = ({ 
  properties, 
  allUsers,
  landlordInvites,
  currentUser,
  withdrawableBalance,
  onRequestAction, 
  onViewUnits, 
  pendingRequests,
  onTenantClick,
  autoOpenAdd,
  onAddClose,
  financialStatements
}) => {
  const [confirmingProperty, setConfirmingProperty] = useState<Property | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [landlordType, setLandlordType] = useState<'existing' | 'new'>('new');
  
  const [formData, setFormData] = useState({ 
    name: '', 
    location: 'Nairobi', 
    totalUnits: 0, 
    category: PropertyCategory.RENTAL,
    description: '',
    price: 0,
    landlordName: '',
    landlordEmail: '',
    existingLandlordId: '',
    defaultDueDateDay: 10,
    penaltyType: PenaltyType.NONE,
    penaltyValue: 0,
    penaltyAppliedOn: PenaltyAppliedOn.RENT
  });

  const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;
  const isLandlord = currentUser.role === UserRole.LANDLORD;

  const managedProps = useMemo(() => {
    return properties.filter(p => {
      if (!p.isManaged) return false;
      if (isLandlord && p.ownerId !== currentUser.id) return false;
      
      const searchLower = searchTerm.toLowerCase();
      return p.name.toLowerCase().includes(searchLower) || 
             p.location.toLowerCase().includes(searchLower);
    });
  }, [properties, isLandlord, currentUser.id, searchTerm]);

  const myStatements = financialStatements.filter(s => s.userId === currentUser.id);
  const existingLandlords = allUsers.filter(u => u.role === UserRole.LANDLORD);

  useEffect(() => {
    if (autoOpenAdd && !isLandlord) {
      setIsAdding(true);
      if (onAddClose) onAddClose();
    }
  }, [autoOpenAdd, onAddClose, isLandlord]);

  const handleOpenEdit = (prop: Property) => {
    setEditingProperty(prop);
    setFormData({
      name: prop.name,
      location: prop.location,
      totalUnits: prop.totalUnits,
      category: prop.category,
      description: prop.description || '',
      price: prop.price || 0,
      landlordName: '',
      landlordEmail: '',
      existingLandlordId: prop.ownerId || '',
      defaultDueDateDay: prop.defaultDueDateDay || 10,
      penaltyType: prop.penaltyType || PenaltyType.NONE,
      penaltyValue: prop.penaltyValue || 0,
      penaltyAppliedOn: prop.penaltyAppliedOn || PenaltyAppliedOn.RENT
    });
  };

  const handleConfirmRelease = () => {
    if (confirmingProperty) {
      onRequestAction('DELETE', confirmingProperty.id, 'PROPERTY', { name: confirmingProperty.name });
      setConfirmingProperty(null);
    }
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (landlordType === 'existing' && !formData.existingLandlordId && !editingProperty) {
      setError("Validation Error: Please select an existing landlord from the directory.");
      return;
    }

    const targetId = editingProperty ? editingProperty.id : 'p-' + Date.now();
    const action = editingProperty ? 'PROPERTY_UPDATE' : 'PROPERTY_ACTIVATE';
    
    const payload = {
      ...formData,
      isNew: !editingProperty,
      landlordType,
      ownerId: editingProperty ? editingProperty.ownerId : undefined
    };

    onRequestAction(action, targetId, 'PROPERTY', payload);
    setIsAdding(false);
    setEditingProperty(null);
    setFormData({ name: '', location: 'Nairobi', totalUnits: 0, category: PropertyCategory.RENTAL, description: '', price: 0, landlordName: '', landlordEmail: '', existingLandlordId: '', defaultDueDateDay: 10, penaltyType: PenaltyType.NONE, penaltyValue: 0, penaltyAppliedOn: PenaltyAppliedOn.RENT });
  };

  const handleWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount <= 0 || withdrawAmount > withdrawableBalance) {
      alert("Invalid withdrawal amount or exceeds withdrawable limit.");
      return;
    }
    onRequestAction('WITHDRAW_FUNDS', currentUser.id, 'USER', { amount: withdrawAmount });
    setIsWithdrawing(false);
    setWithdrawAmount(0);
    alert("Withdrawal request submitted for Super Admin approval.");
  };

  const copyOnboardingLink = (url: string) => {
    navigator.clipboard.writeText(url);
    alert("Onboarding link copied to clipboard. Share this with the property owner.");
  };

  return (
    <div className="space-y-8 md:space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex-1">
          <h1 className="text-3xl md:text-4xl font-black text-[#0f172a] tracking-tight uppercase">
            {isLandlord ? 'Asset Overview' : 'Active Portfolio'}
          </h1>
          <p className="text-slate-500 mt-2 font-medium text-sm md:text-base">
            {isLandlord ? 'Building assets and financial balance.' : 'Strategic asset tracking for all 47 Counties.'}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
           <div className="relative flex-1 sm:w-80">
              <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
              <input 
                type="text" 
                placeholder="Search properties..."
                className="w-full pl-12 pr-6 py-4 rounded-full bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-xs shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           {!isLandlord && (
             <button 
               onClick={() => {
                 setIsAdding(true);
                 setEditingProperty(null);
                 setError('');
               }}
               className="w-full sm:w-auto px-8 py-4 bg-[#0f172a] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-indigo-600 transition-all flex items-center justify-center space-x-3 active:scale-95 group shrink-0"
             >
                <i className="fas fa-plus group-hover:rotate-90 transition-transform"></i>
                <span>Add Property</span>
             </button>
           )}
        </div>
      </header>

      {isLandlord && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
           <div className="lg:col-span-1 bg-[#0f172a] p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-5 text-8xl md:text-9xl pointer-events-none"><i className="fas fa-wallet"></i></div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Withdrawable Balance</p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-8">KES {withdrawableBalance.toLocaleString()}</h2>
              
              <div className="space-y-4 pt-8 border-t border-white/10">
                 <button 
                  onClick={() => setIsWithdrawing(true)}
                  className="w-full py-5 bg-white text-[#0f172a] rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-400 transition-all shadow-xl active:scale-95"
                 >
                   Withdraw Funds
                 </button>
                 <p className="text-[9px] text-slate-500 text-center font-bold uppercase tracking-widest leading-relaxed">
                   Restricted funds (Deposits & Unallocated) <br/> are excluded from this balance.
                 </p>
              </div>
           </div>

           <div className="lg:col-span-2 bg-white p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-slate-100 shadow-sm flex flex-col h-full">
              <h3 className="text-xl font-black text-slate-900 mb-8 flex justify-between items-center">
                 Ledger History
                 <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Live Updates</span>
              </h3>
              <div className="flex-1 overflow-y-auto space-y-4 max-h-[300px] pr-2 custom-scrollbar">
                 {myStatements.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 italic py-10">
                       <i className="fas fa-receipt text-3xl mb-3 opacity-20"></i>
                       <p className="text-xs">No transactions recorded.</p>
                    </div>
                 ) : myStatements.sort((a,b) => b.date.localeCompare(a.date)).map(entry => (
                    <div key={entry.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group transition-all hover:bg-white">
                       <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${entry.type === 'CREDIT' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                             <i className={`fas ${entry.type === 'CREDIT' ? 'fa-arrow-down-left' : 'fa-arrow-up-right'} text-xs`}></i>
                          </div>
                          <div>
                             <p className="text-xs font-black text-slate-900">{entry.description}</p>
                             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(entry.date).toLocaleDateString()}</p>
                          </div>
                       </div>
                       <p className={`text-sm font-black ${entry.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {entry.type === 'CREDIT' ? '+' : '-'} {entry.amount.toLocaleString()}
                       </p>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {(isAdding || editingProperty) && !isLandlord && (
        <div className="bg-white p-6 md:p-12 rounded-[2.5rem] md:rounded-[3rem] border border-indigo-100 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
           <div className="flex justify-between items-start mb-8 md:mb-10">
              <div>
                 <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{editingProperty ? 'Update Asset Specs' : 'Activate Managed Asset'}</h2>
                 <p className="text-slate-400 font-medium text-[10px] mt-1 uppercase tracking-widest">{editingProperty ? 'Modify approved configurations' : 'Administrative Initiation'}</p>
              </div>
              <button onClick={() => { setIsAdding(false); setEditingProperty(null); }} className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors active:scale-90">
                 <i className="fas fa-times text-lg"></i>
              </button>
           </div>
           
           <form onSubmit={handleSubmitAdd} className="space-y-8 md:space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                <div className="md:col-span-2">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Building Name</label>
                   <input required type="text" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold" placeholder="e.g. Zinnia Residences" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Category</label>
                   <select className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white outline-none transition-all font-bold" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value as PropertyCategory})}>
                      <option value={PropertyCategory.RENTAL}>Rentals</option>
                      <option value={PropertyCategory.LEASE}>Leasehold</option>
                      <option value={PropertyCategory.SALE}>For Sale</option>
                   </select>
                </div>
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">County</label>
                   <select className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white outline-none transition-all font-bold" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})}>
                      {KENYAN_COUNTIES.map(county => <option key={county} value={county}>{county}</option>)}
                   </select>
                </div>
              </div>

              {!editingProperty && (
                <div className="pt-8 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-6">
                    <div>
                        <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">Ownership Attribution</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Select an existing partner or invite a new owner</p>
                    </div>
                    <div className="bg-slate-100 p-1 rounded-xl flex w-full sm:w-auto">
                        <button type="button" onClick={() => setLandlordType('existing')} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${landlordType === 'existing' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Existing</button>
                        <button type="button" onClick={() => setLandlordType('new')} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${landlordType === 'new' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Invite</button>
                    </div>
                  </div>
                  {landlordType === 'existing' ? (
                    <div className="animate-in slide-in-from-left-4 duration-300">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Landlord Directory</label>
                        <select required className="w-full px-6 py-4 rounded-2xl bg-indigo-50/30 border border-indigo-100 focus:bg-white outline-none transition-all font-bold" value={formData.existingLandlordId} onChange={(e) => setFormData({...formData, existingLandlordId: e.target.value})}>
                          <option value="">-- Choose a Landlord --</option>
                          {existingLandlords.map(l => (
                            <option key={l.id} value={l.id}>{l.name} ({l.email})</option>
                          ))}
                        </select>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 animate-in slide-in-from-right-4 duration-300">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Owner Legal Name *</label>
                          <input required type="text" className="w-full px-6 py-4 rounded-2xl bg-indigo-50/30 border border-indigo-100 focus:bg-white outline-none font-bold" placeholder="Full name" value={formData.landlordName} onChange={(e) => setFormData({...formData, landlordName: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Owner Email Address *</label>
                          <input required type="email" className="w-full px-6 py-4 rounded-2xl bg-indigo-50/30 border border-indigo-100 focus:bg-white outline-none font-bold" placeholder="email@example.com" value={formData.landlordEmail} onChange={(e) => setFormData({...formData, landlordEmail: e.target.value})} />
                        </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8 border-t border-slate-100">
                <div className="flex flex-col space-y-6 md:space-y-8">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Unit Inventory</label>
                        <input required type="number" min="0" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white outline-none font-bold" value={formData.totalUnits || ''} onChange={(e) => setFormData({...formData, totalUnits: parseInt(e.target.value) || 0})} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">Due Date Day</label>
                        <div className="flex items-center space-x-3">
                           <input 
                            required 
                            type="number" 
                            min="1" 
                            max="28" 
                            className="w-24 px-6 py-4 rounded-2xl bg-indigo-50/30 border border-indigo-100 focus:bg-white outline-none font-black text-indigo-600" 
                            value={formData.defaultDueDateDay} 
                            onChange={(e) => setFormData({...formData, defaultDueDateDay: Math.min(28, Math.max(1, parseInt(e.target.value) || 1))})} 
                           />
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Day of next month</p>
                        </div>
                    </div>
                </div>
                
                <div className="lg:col-span-2 space-y-6 md:space-y-8">
                    {(formData.category === PropertyCategory.SALE || formData.category === PropertyCategory.LEASE) && (
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Price / Premium (KES)</label>
                          <input required type="number" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white outline-none font-bold" placeholder="0" value={formData.price || ''} onChange={(e) => setFormData({...formData, price: parseInt(e.target.value) || 0})} />
                      </div>
                    )}
                    <div className="bg-slate-50 p-6 md:p-8 rounded-[2rem] border border-slate-200">
                       <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center">
                          <i className="fas fa-gavel mr-2 text-indigo-600"></i>
                          Penalty Rules
                       </h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                          <div>
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Calculation Mode</label>
                             <select 
                               className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 outline-none font-bold text-xs"
                               value={formData.penaltyType}
                               onChange={(e) => setFormData({...formData, penaltyType: e.target.value as PenaltyType})}
                             >
                                <option value={PenaltyType.NONE}>None</option>
                                <option value={PenaltyType.STATIC}>KES Static</option>
                                <option value={PenaltyType.PERCENTAGE}>% Percentage</option>
                             </select>
                          </div>
                          {formData.penaltyType !== PenaltyType.NONE && (
                            <div className="animate-in slide-in-from-top-2">
                               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                 {formData.penaltyType === PenaltyType.STATIC ? 'Fixed Fee' : 'Interest Rate'}
                               </label>
                               <input 
                                 type="number"
                                 className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 outline-none font-black text-indigo-600"
                                 value={formData.penaltyValue || ''}
                                 placeholder="0"
                                 onChange={(e) => setFormData({...formData, penaltyValue: parseFloat(e.target.value) || 0})}
                               />
                            </div>
                          )}
                       </div>
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Listing Highlights</label>
                       <textarea 
                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white outline-none font-medium text-xs resize-none h-32" 
                        placeholder="Public site display snippet..."
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                       />
                    </div>
                </div>
              </div>

              <div className="flex items-center justify-end pt-8 border-t border-slate-50">
                 <button type="submit" className="w-full sm:w-auto px-12 py-5 bg-[#0f172a] text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-600 shadow-xl transition-all active:scale-95">
                   {editingProperty ? 'Submit Update' : 'Initialize Asset'}
                 </button>
              </div>
              
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-black animate-in shake">
                  <i className="fas fa-exclamation-triangle mr-2"></i> {error}
                </div>
              )}
           </form>
        </div>
      )}

      {managedProps.length === 0 ? (
        <div className="py-32 md:py-40 border-2 border-dashed border-slate-200 rounded-[3rem] md:rounded-[4rem] text-center bg-white flex flex-col items-center shadow-sm mx-4 md:mx-0">
          <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-4xl text-slate-200 mb-8 shadow-inner">
             <i className="fas fa-building-circle-exclamation"></i>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">Portfolio Empty</h3>
          <p className="text-slate-400 font-medium px-8">No managed properties found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {managedProps.map(prop => {
            const isPendingUpdate = pendingRequests.some(r => r.targetId === prop.id && r.actionType === 'PROPERTY_UPDATE');
            const isPendingDelete = pendingRequests.some(r => r.targetId === prop.id && r.actionType === 'DELETE');
            const activeInvite = landlordInvites.find(inv => inv.propertyId === prop.id);

            return (
              <div key={prop.id} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all active:bg-slate-50/30">
                <div className="flex flex-col xl:flex-row gap-6 md:gap-8">
                  <div className="w-full xl:w-40 xl:h-40 aspect-square bg-slate-50 rounded-[2.5rem] shrink-0 flex items-center justify-center text-4xl md:text-5xl font-black text-indigo-100 border border-slate-100 group-hover:scale-105 transition-transform duration-500 shadow-inner">
                    {prop.name.charAt(0)}
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                       <div className="flex justify-between items-start mb-2">
                          <div className="overflow-hidden">
                             <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors truncate">{prop.name}</h3>
                             <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{prop.category}</span>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
                             <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest rounded-lg border border-emerald-100">Active</span>
                             {!isLandlord && (
                                <button onClick={() => handleOpenEdit(prop)} className="text-[10px] text-indigo-500 font-black uppercase hover:underline active:scale-95 transition-transform">
                                   <i className="fas fa-pen-to-square mr-1"></i> Edit
                                </button>
                             )}
                          </div>
                       </div>
                       <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4">
                          <div className="text-[10px] md:text-[11px] text-slate-400 font-black uppercase tracking-widest flex items-center flex-wrap">
                              <i className="fas fa-map-marker-alt mr-2 text-indigo-300"></i>
                              {prop.location}
                              <span className="mx-2 text-slate-200">|</span>
                              <i className="fas fa-calendar-check mr-1.5 text-indigo-400 opacity-60"></i>
                              {prop.defaultDueDateDay || 10}th
                          </div>
                       </div>
                       
                       {isSuperAdmin && activeInvite && (
                         <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl animate-in slide-in-from-bottom-2">
                           <div className="flex justify-between items-center mb-2">
                             <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">LANDLORD ONBOARDING PENDING</p>
                             <span className="text-[8px] font-bold text-indigo-400">Invite ID: {activeInvite.id.slice(-6)}</span>
                           </div>
                           <p className="text-[10px] text-slate-500 font-medium mb-3 italic">Link expires upon registration of owner.</p>
                           <button 
                            onClick={() => copyOnboardingLink(activeInvite.oneTimeLink)}
                            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 hover:bg-indigo-700 transition-all active:scale-95"
                           >
                             <i className="fas fa-copy"></i>
                             <span>COPY ONE-TIME LINK</span>
                           </button>
                         </div>
                       )}

                       <div className="mt-8 space-y-4">
                          <div className="flex justify-between items-end mb-1">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inventory Capacity</span>
                             <span className="text-sm font-black text-slate-900">{prop.totalUnits} Units</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                             <div className={`h-full rounded-full transition-all duration-1000 bg-indigo-500`} style={{ width: `${Math.min((prop.totalUnits / 50) * 100, 100)}%` }}></div>
                          </div>
                       </div>
                    </div>

                    <div className="flex justify-between items-center mt-10 pt-6 border-t border-slate-50">
                       <button 
                          onClick={() => onViewUnits(prop)} 
                          className="text-[11px] md:text-[12px] font-black uppercase tracking-[0.1em] text-indigo-600 hover:text-indigo-800 transition-colors flex items-center group/btn active:translate-x-1"
                       >
                        Property Ledger <i className="fas fa-arrow-right ml-2 group-hover/btn:translate-x-1 transition-transform"></i>
                       </button>
                       {!isLandlord && (
                         <button onClick={() => setConfirmingProperty(prop)} className="text-[11px] md:text-[12px] font-black uppercase tracking-[0.1em] text-slate-300 hover:text-rose-500 transition-colors active:scale-90">
                           <i className="fas fa-trash-can mr-2"></i> Release
                         </button>
                       )}
                    </div>
                  </div>
                </div>
                {isPendingUpdate && (
                    <div className="absolute top-0 left-0 right-0 bg-amber-50/90 text-amber-600 py-1 text-[8px] font-black uppercase tracking-widest text-center animate-pulse border-b border-amber-100">
                       Update Pending Approval
                    </div>
                 )}
                {isPendingDelete && (
                    <div className="absolute top-0 left-0 right-0 bg-rose-50/90 text-rose-600 py-1 text-[8px] font-black uppercase tracking-widest text-center animate-pulse border-b border-rose-100">
                       Release Request Pending
                    </div>
                 )}
              </div>
            );
          })}
        </div>
      )}

      {/* Release Confirmation Modal */}
      {confirmingProperty && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto">
           <div className="absolute inset-0 bg-[#0f172a]/95 backdrop-blur-sm" onClick={() => setConfirmingProperty(null)}></div>
           <div className="bg-white w-full max-w-lg rounded-[2.5rem] md:rounded-[3rem] shadow-2xl relative z-10 p-8 md:p-12 text-center flex flex-col items-center animate-in zoom-in-95 duration-300 border border-slate-100 my-auto">
              <div className="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center mb-10 text-rose-500 border border-rose-100 shadow-sm">
                 <i className="fas fa-trash-can text-4xl"></i>
              </div>
              <h3 className="text-3xl font-black text-[#0f172a] mb-6 tracking-tight uppercase">Authorize Release?</h3>
              <p className="text-slate-500 font-medium mb-12 leading-relaxed text-base">
                Releasing <span className="text-[#0f172a] font-black">{confirmingProperty.name}</span> will move all associated financial records and unit data to the <span className="text-indigo-600 font-bold">System Archive</span>.
                <br/><br/>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">Security Clearance Required</span>
              </p>

              <div className="flex flex-col space-y-4 w-full">
                 <button 
                   onClick={handleConfirmRelease}
                   className="w-full py-6 bg-rose-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-rose-100 hover:bg-rose-700 active:scale-95 transition-all"
                 >
                   Confirm & Queue Release
                 </button>
                 <button 
                   onClick={() => setConfirmingProperty(null)}
                   className="w-full py-4 text-[#94a3b8] font-black uppercase text-sm tracking-widest active:scale-90 transition-transform"
                 >
                   Return to Portfolio
                 </button>
              </div>
           </div>
        </div>
      )}

      {isWithdrawing && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto">
           <div className="absolute inset-0 bg-[#0f172a]/95 backdrop-blur-sm" onClick={() => setIsWithdrawing(false)}></div>
           <div className="bg-white w-full max-w-md rounded-[2.5rem] md:rounded-[3rem] shadow-2xl relative z-10 p-8 md:p-12 overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 my-auto">
              <h3 className="text-2xl md:text-3xl font-black text-[#0f172a] mb-2 tracking-tight">Withdraw Funds</h3>
              <p className="text-slate-400 text-sm mb-10 font-medium">Transfer to linked bank account.</p>
              
              <form onSubmit={handleWithdrawal} className="space-y-8">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center sm:text-left">Amount (KES)</label>
                    <input 
                      required 
                      type="number" 
                      min="1" 
                      max={withdrawableBalance}
                      className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-black text-2xl text-slate-900 text-center" 
                      value={withdrawAmount || ''} 
                      onChange={(e) => setWithdrawAmount(parseInt(e.target.value) || 0)} 
                      placeholder="0.00"
                    />
                    <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[10px] text-slate-400 font-bold flex justify-between uppercase tracking-widest mb-2">
                          <span>Withdrawable</span>
                          <span>{withdrawableBalance.toLocaleString()}</span>
                       </p>
                       <p className={`text-[10px] font-black flex justify-between uppercase tracking-widest ${withdrawAmount > withdrawableBalance ? 'text-rose-500' : 'text-emerald-500'}`}>
                          <span>Remaining</span>
                          <span>{(withdrawableBalance - withdrawAmount).toLocaleString()}</span>
                       </p>
                    </div>
                 </div>
                 
                 <div className="space-y-4">
                    <button type="submit" className="w-full py-6 bg-[#0f172a] text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl active:scale-95">
                       Verify & Submit
                    </button>
                    <button type="button" onClick={() => setIsWithdrawing(false)} className="w-full py-4 text-[#94a3b8] font-black text-sm uppercase tracking-widest active:scale-90 transition-transform">
                       Cancel
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioManager;
