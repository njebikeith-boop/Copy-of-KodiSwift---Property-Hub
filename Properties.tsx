
import React, { useState, useMemo } from 'react';
import { KENYAN_COUNTIES } from '../constants';
import { Property, PropertyCategory, RequestActionType, SystemRequest, PropertyMedia } from '../types';

interface PropertiesProps {
  properties: Property[];
  setProperties: React.Dispatch<React.SetStateAction<Property[]>>;
  permissions: {
    add: boolean;
    edit: boolean;
    delete: boolean;
  };
  onRequestAction: (type: RequestActionType, id: string, targetType: string, payload: any) => void;
  pendingRequests: SystemRequest[];
}

const Properties: React.FC<PropertiesProps> = ({ properties, setProperties, permissions, onRequestAction, pendingRequests }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ 
    selectedPropertyId: '',
    description: '',
    price: 0,
    media: [] as PropertyMedia[]
  });

  const unlistedPortfolio = useMemo(() => 
    properties.filter(p => p.isManaged && p.approvalStatus === 'APPROVED' && (!p.price || p.price === 0)),
  [properties]);

  const selectedProperty = useMemo(() => 
    properties.find(p => p.id === formData.selectedPropertyId),
  [properties, formData.selectedPropertyId]);

  const handleToggleManagement = (prop: Property) => {
    if (prop.isManaged) {
      onRequestAction('DELETE', prop.id, 'PROPERTY', { name: prop.name });
    } else {
      onRequestAction('PROPERTY_ACTIVATE', prop.id, 'PROPERTY', { 
        ...prop, 
        landlordType: 'existing', 
        existingLandlordId: prop.ownerId 
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: any) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const type: 'IMAGE' | 'VIDEO' = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
        const newMedia: PropertyMedia = {
          id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          url: reader.result as string,
          type
        };
        setFormData(prev => ({ ...prev, media: [...prev.media, newMedia] }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeMedia = (id: string) => {
    setFormData(prev => ({ ...prev, media: prev.media.filter(m => m.id !== id) }));
  };

  const handleSubmitListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;

    setProperties(prev => prev.map(p => 
      p.id === formData.selectedPropertyId 
      ? { 
          ...p, 
          description: formData.description, 
          price: formData.price, 
          media: formData.media,
          approvalStatus: 'APPROVED' 
        } 
      : p
    ));
    
    setIsAdding(false);
    setFormData({ selectedPropertyId: '', description: '', price: 0, media: [] });
    alert("Public listing post created successfully. It is now visible on the landing page inventory.");
  };

  const isPending = (id: string) => pendingRequests.some(r => r.targetId === id);

  return (
    <div className="space-y-12 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight uppercase">Inventory Listings</h1>
          <p className="text-slate-500 mt-2 font-medium max-w-xl">Central database of residential and commercial assets available for the public market.</p>
        </div>
        {!isAdding && permissions.add && (
          <button 
            onClick={() => setIsAdding(true)}
            className="w-full sm:w-auto px-10 py-5 bg-[#0f172a] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-indigo-600 transition-all flex items-center justify-center space-x-3 active:scale-95"
          >
            <i className="fas fa-plus"></i>
            <span>Create Public Post</span>
          </button>
        )}
      </header>

      {isAdding && (
        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-indigo-100 shadow-2xl animate-in zoom-in-95 duration-500">
           <div className="flex justify-between items-start mb-10">
              <div>
                 <h2 className="text-2xl font-black text-slate-900">Add Listing Protocol</h2>
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Market Configuration Form</p>
              </div>
              <button onClick={() => setIsAdding(false)} className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors">
                 <i className="fas fa-times text-xl"></i>
              </button>
           </div>

           <form onSubmit={handleSubmitListing} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">SELECT PORTFOLIO ASSET</label>
                    <select 
                      required 
                      className="w-full px-6 py-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold" 
                      value={formData.selectedPropertyId} 
                      onChange={e => setFormData({...formData, selectedPropertyId: e.target.value})}
                    >
                       <option value="">Choose.</option>
                       {unlistedPortfolio.map(p => <option key={p.id} value={p.id}>{p.name} ({p.location})</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">CATEGORIES</label>
                    <div className="px-6 py-4 rounded-xl bg-slate-100 border border-slate-200 font-black text-slate-500 text-sm uppercase tracking-widest">
                       {selectedProperty?.category || 'SELECT ASSET FIRST'}
                    </div>
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">MARKET PREMIUM (KES)</label>
                    <input required type="number" className="w-full px-6 py-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white outline-none font-black text-indigo-600" value={formData.price || ''} onChange={e => setFormData({...formData, price: parseInt(e.target.value) || 0})} placeholder="0" />
                 </div>
              </div>

              <div>
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Public Listing Description</label>
                 <textarea required className="w-full px-6 py-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white outline-none font-medium text-xs resize-none h-32" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Describe amenities, proximity to roads, security features etc..." />
              </div>

              <div className="space-y-6">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Display Gallery (JPGs & Short Videos)</label>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                   {formData.media.map((item) => (
                     <div key={item.id} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 group bg-slate-50">
                        {item.type === 'IMAGE' ? (
                          <img src={item.url} className="w-full h-full object-cover" alt="Preview" />
                        ) : (
                          <video src={item.url} className="w-full h-full object-cover" />
                        )}
                        <button 
                          type="button"
                          onClick={() => removeMedia(item.id)}
                          className="absolute top-2 right-2 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs shadow-lg opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
                        >
                           <i className="fas fa-times"></i>
                        </button>
                     </div>
                   ))}
                   <label className="aspect-square border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 transition-all group">
                      <i className="fas fa-cloud-arrow-up text-2xl text-slate-300 group-hover:text-indigo-500 mb-2"></i>
                      <span className="text-[9px] font-black text-slate-400 uppercase group-hover:text-indigo-600">Upload Files</span>
                      <input type="file" multiple accept="image/jpeg,image/png,video/mp4,video/quicktime" className="hidden" onChange={handleFileChange} />
                   </label>
                </div>
              </div>

              <div className="flex justify-end pt-8 border-t border-slate-50">
                 <button type="submit" disabled={!formData.selectedPropertyId} className="w-full sm:w-auto px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#0f172a] shadow-xl transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed">
                    Finalize & Commit Public Post
                 </button>
              </div>
           </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {properties.map((property) => (
          <div key={property.id} className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden hover:shadow-2xl transition-all group flex flex-col h-full relative">
            <div className="h-48 bg-slate-900 relative">
               <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/40 to-slate-900/90 group-hover:opacity-70 transition-opacity"></div>
               {property.media && property.media.length > 0 ? (
                 property.media[0].type === 'IMAGE' ? (
                   <img src={property.media[0].url} className="absolute inset-0 w-full h-full object-cover mix-blend-overlay" alt={property.name} />
                 ) : (
                   <video src={property.media[0].url} autoPlay muted loop className="absolute inset-0 w-full h-full object-cover mix-blend-overlay" />
                 )
               ) : null}
               <div className="absolute top-6 left-6 flex space-x-2">
                  <span className="px-4 py-2 bg-white/10 backdrop-blur-md text-white border border-white/20 font-black text-[9px] uppercase tracking-widest rounded-lg">{property.location}</span>
                  {(property.price && property.price > 0) && (
                    <span className="px-4 py-2 bg-emerald-500 text-white font-black text-[9px] uppercase tracking-widest rounded-lg shadow-lg">Public Post</span>
                  )}
               </div>
               <div className="absolute bottom-6 left-6 text-white">
                  <p className="text-[10px] font-black uppercase text-indigo-300 tracking-widest mb-1">{property.category}</p>
                  <h3 className="text-2xl font-black">{property.name}</h3>
               </div>
            </div>
            
            <div className="p-8 flex-1 flex flex-col">
              <div className="space-y-4 mb-8">
                 <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                    <span>Target Yield</span>
                    <span className="text-indigo-600">KES {property.price?.toLocaleString() || 'N/A'}</span>
                 </div>
                 <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                    <span>Available Capacity</span>
                    <span className="text-slate-900">{property.totalUnits} Units</span>
                 </div>
                 <p className="text-xs text-slate-500 italic line-clamp-2 leading-relaxed mt-4">"{property.description || 'Verified luxury residence awaiting management activation.'}"</p>
                 {property.media && property.media.length > 0 && (
                   <div className="flex -space-x-2 mt-4">
                      {property.media.slice(0, 4).map((m, idx) => (
                        <div key={m.id} className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-slate-100 shadow-sm">
                           {m.type === 'IMAGE' ? <img src={m.url} className="w-full h-full object-cover" /> : <i className="fas fa-play text-[8px] flex items-center justify-center h-full text-slate-400"></i>}
                        </div>
                      ))}
                      {property.media.length > 4 && (
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-900 text-white text-[8px] font-bold flex items-center justify-center shadow-sm">
                           +{property.media.length - 4}
                        </div>
                      )}
                   </div>
                 )}
              </div>

              <div className="mt-auto">
                 {isPending(property.id) ? (
                    <div className="w-full py-5 text-center bg-indigo-50 text-indigo-500 rounded-2xl text-[10px] font-black uppercase tracking-widest animate-pulse border border-indigo-100">
                       Management Req. Pending...
                    </div>
                 ) : (
                    <button 
                      onClick={() => handleToggleManagement(property)}
                      className={`w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-lg active:scale-95 ${property.isManaged ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-[#0f172a] text-white hover:bg-indigo-600 border-transparent'}`}
                    >
                      <i className={`fas ${property.isManaged ? 'fa-minus-circle' : 'fa-plus-circle'} mr-2`}></i>
                      {property.isManaged ? 'Deactivate Managed Asset' : 'Begin Management'}
                    </button>
                 )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Properties;
