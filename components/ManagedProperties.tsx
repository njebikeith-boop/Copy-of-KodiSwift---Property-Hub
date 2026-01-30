
import React, { useState, useEffect } from 'react';
import { Property, PropertyCategory } from '../types';
import { MOCK_UNITS } from '../constants';

interface ManagedPropertiesProps {
  properties: Property[];
  setProperties: React.Dispatch<React.SetStateAction<Property[]>>;
  onViewUnits?: (id: string, name: string) => void;
  autoOpen?: boolean;
  permissions?: {
    add: boolean;
    edit: boolean;
  };
}

const ManagedProperties: React.FC<ManagedPropertiesProps> = ({ properties, setProperties, onViewUnits, autoOpen, permissions }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingProp, setEditingProp] = useState<Property | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    location: 'Nairobi', 
    totalUnits: 0, 
    category: PropertyCategory.RENTAL,
    description: '',
    price: 0
  });

  const managedOnes = properties.filter(p => p.isManaged);

  const handleOpenAdd = () => {
    setFormData({ name: '', location: 'Nairobi', totalUnits: 0, category: PropertyCategory.RENTAL, description: '', price: 0 });
    setIsAdding(true);
    setEditingProp(null);
  };

  useEffect(() => {
    if (autoOpen && permissions?.add) {
      handleOpenAdd();
    }
  }, [autoOpen, permissions?.add]);

  const handleOpenEdit = (prop: Property) => {
    setFormData({ 
      name: prop.name, 
      location: prop.location, 
      totalUnits: prop.totalUnits, 
      category: prop.category,
      description: prop.description || '',
      price: prop.price || 0
    });
    setEditingProp(prop);
    setIsAdding(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm("Confirm property listing details?")) return;
    
    if (editingProp) {
      setProperties(prev => prev.map(p => p.id === editingProp.id ? { ...p, ...formData } : p));
    } else {
      const property: Property = {
        id: `p${Date.now()}`,
        ...formData,
        isManaged: true // Automatically managed if added from this tab
      };
      setProperties(prev => [...prev, property]);
    }
    setIsAdding(false);
  };

  const handleStopManagement = (id: string) => {
    if (window.confirm('CRITICAL ACTION: Are you sure you want to stop active management for this property? It will be moved back to Inventory Listings.')) {
      setProperties(prev => prev.map(p => p.id === id ? { ...p, isManaged: false } : p));
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Current Portfolio</h1>
          <p className="text-slate-500 mt-2 font-medium max-w-2xl">Properties under active day-to-day management. View occupancy rates, maintenance health, and operational performance.</p>
        </div>
        {permissions?.add && (
            <button 
                onClick={handleOpenAdd}
                className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-600 shadow-2xl shadow-slate-200 transition-all flex items-center group shrink-0"
            >
                <i className="fas fa-plus mr-3 text-xs group-hover:rotate-90 transition-transform"></i>
                Add Managed Property
            </button>
        )}
      </header>

      {isAdding && (
        <div className="bg-white p-10 rounded-[2.5rem] border border-indigo-100 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {editingProp ? 'Edit Managed Property' : 'Deploy New Managed Property'}
              </h3>
              <p className="text-slate-400 text-sm mt-1 font-medium">New properties added here will be immediately active in your management portfolio.</p>
            </div>
            <button onClick={() => setIsAdding(false)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors">
              <i className="fas fa-times"></i>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Property Name</label>
              <input 
                required
                type="text" 
                placeholder="e.g. Zinnia Phase II"
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-medium"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Category</label>
              <select 
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-bold"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value as PropertyCategory})}
              >
                <option value={PropertyCategory.RENTAL}>Rentals</option>
                <option value={PropertyCategory.LEASE}>Leases</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Location</label>
              <select 
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-bold"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
              >
                <option>Nairobi</option>
                <option>Kiambu</option>
                <option>Mombasa</option>
                <option>Kisumu</option>
                <option>Nakuru</option>
              </select>
            </div>
            
            <div className="md:col-span-4 flex items-center justify-between pt-6 border-t border-slate-50">
               <div className="flex-1 max-w-xs mr-8">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Total Units</label>
                  <input 
                    required
                    type="number" 
                    placeholder="0"
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-bold"
                    value={formData.totalUnits || ''}
                    onChange={(e) => setFormData({...formData, totalUnits: parseInt(e.target.value) || 0})}
                  />
               </div>
               <button type="submit" className="bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black text-lg hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all">
                {editingProp ? 'Update Property' : 'Confirm & Manage'}
              </button>
            </div>
          </form>
        </div>
      )}

      {managedOnes.length === 0 ? (
        <div className="p-32 border-2 border-dashed border-slate-200 rounded-[3rem] text-center bg-white flex flex-col items-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-3xl text-slate-300 mb-6">
            <i className="fas fa-house-chimney-crack"></i>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">No Active Properties</h3>
          <p className="text-slate-400 font-medium max-w-sm">Click "Add Managed Property" above or use the "Begin Management" toggle in Inventory Listings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {managedOnes.map(prop => {
            const units = MOCK_UNITS.filter(u => u.propertyId === prop.id);
            const occupied = units.filter(u => u.isOccupied).length;
            const occupancyRate = units.length > 0 ? (occupied / units.length) * 100 : 0;

            return (
              <div key={prop.id} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group flex flex-col md:flex-row gap-8 relative">
                 <div className="w-full md:w-48 h-48 bg-slate-100 rounded-3xl shrink-0 overflow-hidden relative">
                    <div className="absolute inset-0 bg-indigo-600 opacity-10"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-4xl text-indigo-600 opacity-40 font-black">
                       {prop.name.charAt(0)}
                    </div>
                 </div>
                 
                 <div className="flex-1 flex flex-col justify-between py-2">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight">{prop.name}</h3>
                        <div className="flex items-center space-x-2">
                           {permissions?.edit && (
                              <button onClick={() => handleOpenEdit(prop)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                                <i className="fas fa-edit text-xs"></i>
                              </button>
                           )}
                           <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100">Managed</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400 font-medium mb-6 flex items-center">
                         <i className="fas fa-map-marker-alt mr-2 text-indigo-400"></i>
                         {prop.location}
                      </p>
                      
                      <div className="space-y-6">
                        <div>
                          <div className="flex justify-between text-[11px] mb-2 font-black uppercase tracking-widest text-slate-400">
                             <span>Occupancy Rate</span>
                             <span className="text-slate-900">{occupancyRate.toFixed(0)}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
                             <div 
                               className={`h-full rounded-full transition-all duration-1000 ${occupancyRate > 80 ? 'bg-emerald-500' : occupancyRate > 50 ? 'bg-indigo-500' : 'bg-amber-500'}`}
                               style={{ width: `${occupancyRate}%` }}
                             ></div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-6">
                           <div className="flex items-center space-x-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>
                              <span className="text-xs font-bold text-slate-600">{occupied} Occupied</span>
                           </div>
                           <div className="flex items-center space-x-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                              <span className="text-xs font-bold text-slate-600">{prop.totalUnits - occupied} Vacant</span>
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-50">
                       <button 
                        onClick={() => onViewUnits?.(prop.id, prop.name)}
                        className="text-indigo-600 text-xs font-black uppercase tracking-widest hover:underline"
                       >
                          View Units <i className="fas fa-arrow-right ml-1"></i>
                       </button>
                       <button 
                        onClick={() => handleStopManagement(prop.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors text-xs font-bold"
                       >
                         Release from Management
                       </button>
                    </div>
                 </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ManagedProperties;
