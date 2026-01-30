
import React, { useState } from 'react';
import { CustomerRequest, Property, PropertyMedia } from '../types';

interface LandingPageProps {
  onEnterGateway: () => void;
  isLoggedIn?: boolean;
  onAddRequest?: (request: Omit<CustomerRequest, 'id' | 'status' | 'createdAt'>) => void;
  properties?: Property[];
}

type PageView = 'home' | 'listings' | 'queries' | 'privacy' | 'terms';

const LandingPage: React.FC<LandingPageProps> = ({ onEnterGateway, isLoggedIn, onAddRequest, properties = [] }) => {
  const [activeTab, setActiveTab] = useState<PageView>('home');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  // Tour Request State
  const [selectedTourProperty, setSelectedTourProperty] = useState<string | null>(null);
  const [tourFormData, setTourFormData] = useState({ name: '', phone: '', date: '', time: '' });
  const [tourSuccess, setTourSuccess] = useState(false);

  // Active Media Index state for gallery navigation
  const [activeMediaIndexes, setActiveMediaIndexes] = useState<Record<string, number>>({});

  // Display all inventory properties that aren't archived or pending deletion
  const marketListings = properties.filter(p => p.approvalStatus !== 'ARCHIVED' && p.approvalStatus !== 'PENDING_DELETE');

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAddRequest) {
      onAddRequest({
        type: 'QUERY',
        name: formData.name,
        email: formData.email,
        message: formData.message
      });
    }
    setFormSubmitted(true);
    setFormData({ name: '', email: '', message: '' });
    setTimeout(() => setFormSubmitted(false), 5000);
  };

  const handleTourSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAddRequest && selectedTourProperty) {
      const appointmentDetails = `Visitor scheduled a visit for ${tourFormData.date} at ${tourFormData.time}.`;
      
      onAddRequest({
        type: 'TOUR',
        name: tourFormData.name,
        email: 'visitor.lead@kodiswift.ke',
        phone: tourFormData.phone,
        propertyName: selectedTourProperty,
        message: appointmentDetails
      });
      setTourSuccess(true);
      setTourFormData({ name: '', phone: '', date: '', time: '' });
    }
  };

  const setMediaIndex = (propertyId: string, index: number) => {
    setActiveMediaIndexes(prev => ({ ...prev, [propertyId]: index }));
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 flex flex-col">
      {/* Premium Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-xl border-b border-slate-100 z-[100] transition-all duration-300">
        <div className="max-w-[1400px] mx-auto px-8 h-24 flex justify-between items-center">
          <div className="flex items-center space-x-4 cursor-pointer group" onClick={() => setActiveTab('home')}>
            <div className="w-12 h-12 bg-[#051937] rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-blue-100 group-hover:scale-110 transition-transform">K</div>
            <div className="flex flex-col">
              <span className="text-2xl font-black text-[#051937] tracking-tight leading-none">KodiSwift</span>
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-1">Property Hub</span>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-12">
            <NavBtn label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
            <NavBtn label="Listings" active={activeTab === 'listings'} onClick={() => setActiveTab('listings')} />
            <NavBtn label="Inquiries" active={activeTab === 'queries'} onClick={() => setActiveTab('queries')} />
          </div>

          <div className="flex items-center space-x-4">
          </div>
        </div>
      </nav>

      <main className="pt-24 flex-grow overflow-hidden">
        {activeTab === 'home' && (
          <div className="animate-in fade-in duration-1000">
            {/* Split Hero Section */}
            <section className="relative min-h-[90vh] flex items-center px-8 overflow-hidden">
              <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center w-full">
                <div className="relative z-10 space-y-12">
                  <h1 className="text-7xl md:text-[100px] font-black text-[#051937] leading-[0.95] tracking-tighter">
                    Elegance in <br/> <span className="text-emerald-600">Every Square</span> <br/> Foot.
                  </h1>
                  <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-lg">
                    Experience the future of Kenyan property management. Seamless living, automated billing, and premium spaces across Nairobi and beyond.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-6 pt-6">
                     <button 
                      onClick={() => setActiveTab('listings')}
                      className="w-full sm:w-auto px-12 py-6 bg-[#051937] text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-emerald-600 hover:scale-105 transition-all shadow-2xl shadow-blue-100"
                     >
                       Explore Inventory
                     </button>
                     <button 
                      onClick={() => setActiveTab('queries')}
                      className="w-full sm:w-auto group flex items-center space-x-4 text-sm font-black text-[#051937] uppercase tracking-widest"
                     >
                        <span>Get in Touch</span>
                        <div className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                           <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform group-hover:text-emerald-600"></i>
                        </div>
                     </button>
                  </div>
                </div>

                <div className="relative h-full hidden lg:block">
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-50 rounded-full blur-[120px] opacity-40 -z-10"></div>
                   <div className="relative bg-slate-100 rounded-[5rem] overflow-hidden aspect-[4/5] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border-[12px] border-white">
                      <img 
                        src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1200" 
                        className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000" 
                        alt="High-end Residence" 
                      />
                      <div className="absolute bottom-10 left-10 right-10 p-10 bg-white/90 backdrop-blur-md rounded-[3rem] shadow-2xl">
                         <div className="flex items-center justify-between">
                            <div>
                               <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Star Asset</p>
                               <h4 className="text-xl font-black text-[#051937]">The Platinum Heights</h4>
                            </div>
                            <div className="text-right">
                               <p className="text-2xl font-black text-[#051937]">KES 85M</p>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Runda, Nairobi</p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            </section>

            {/* Value Props Section */}
            <section className="py-40 bg-[#051937] text-white">
               <div className="max-w-[1400px] mx-auto px-8">
                  <header className="max-w-3xl mb-32">
                     <h2 className="text-5xl md:text-6xl font-black tracking-tight mb-8 text-white">Evolving the Science <br/> of <span className="text-emerald-400">Landlordship</span>.</h2>
                     <p className="text-lg text-blue-200/60 font-medium">KodiSwift isn't just a management tool; it's a financial engine designed for the next generation of property investors.</p>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
                     <ValueCard 
                        icon="fa-fingerprint" 
                        title="Identity Verified" 
                        desc="Every resident undergoes a rigorous KYC protocol with automated background and financial health checks."
                     />
                     <ValueCard 
                        icon="fa-microchip" 
                        title="Automated Ledger" 
                        desc="M-Pesa reconciliation happens in real-time. No manual matching. No spreadsheet errors. Just pure data."
                     />
                     <ValueCard 
                        icon="fa-globe-africa" 
                        title="Pan-Kenyan Reach" 
                        desc="Strategic asset tracking across all 47 counties, optimized for local market dynamics and yield potential."
                     />
                  </div>
               </div>
            </section>
          </div>
        )}

        {activeTab === 'listings' && (
          <section className="py-24 max-w-[1400px] mx-auto px-8 animate-in slide-in-from-bottom-8 duration-700">
            <header className="mb-32 flex flex-col md:flex-row justify-between items-end gap-10">
              <div className="max-w-2xl">
                <h2 className="text-6xl font-black text-[#051937] mb-6 tracking-tighter">Current Inventory</h2>
                <p className="text-xl text-slate-500 font-medium">Browse our exclusively managed residences, meticulously audited for luxury and security standards.</p>
              </div>
              <div className="flex bg-slate-100 p-2 rounded-2xl">
                 <button className="px-8 py-3 bg-white rounded-xl shadow-sm text-[11px] font-black uppercase tracking-widest text-[#051937]">All Assets</button>
                 <button className="px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-[#051937] transition-colors">Rentals</button>
                 <button className="px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-[#051937] transition-colors">For Sale</button>
              </div>
            </header>
            
            {marketListings.length === 0 ? (
              <div className="py-60 bg-blue-50/20 rounded-[5rem] border-2 border-dashed border-blue-100 text-center flex flex-col items-center justify-center">
                 <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center text-3xl text-blue-100 mb-8 shadow-inner">
                    <i className="fas fa-building-circle-exclamation"></i>
                 </div>
                 <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-xs">Inventory listings are currently undergoing audit</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
                {marketListings.map(prop => {
                  const media = prop.media || [{ id: 'default', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1200', type: 'IMAGE' }] as PropertyMedia[];
                  const activeIndex = activeMediaIndexes[prop.id] || 0;
                  const currentMedia = media[activeIndex];

                  return (
                    <div key={prop.id} className="group relative flex flex-col h-full animate-in fade-in duration-500">
                      <div className="relative aspect-[4/5] bg-slate-100 rounded-[3.5rem] overflow-hidden mb-10 shadow-2xl shadow-blue-50 border-[8px] border-white group-hover:border-emerald-50 transition-all duration-500">
                         {currentMedia.type === 'IMAGE' ? (
                           <img 
                            src={currentMedia.url} 
                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000" 
                            alt={prop.name} 
                           />
                         ) : (
                           <video 
                            src={currentMedia.url} 
                            autoPlay 
                            muted 
                            loop 
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-1000" 
                           />
                         )}
                         
                         {/* Gallery Navigation */}
                         {media.length > 1 && (
                           <div className="absolute inset-0 flex items-center justify-between px-6 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setMediaIndex(prop.id, (activeIndex - 1 + media.length) % media.length); }}
                                className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-all"
                              >
                                <i className="fas fa-chevron-left"></i>
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setMediaIndex(prop.id, (activeIndex + 1) % media.length); }}
                                className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-all"
                              >
                                <i className="fas fa-chevron-right"></i>
                              </button>
                           </div>
                         )}

                         {/* Mini Thumbnail Strip */}
                         {media.length > 1 && (
                           <div className="absolute bottom-16 left-0 right-0 flex justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {media.map((m, idx) => (
                                <button 
                                  key={m.id} 
                                  onClick={(e) => { e.stopPropagation(); setMediaIndex(prop.id, idx); }}
                                  className={`w-2 h-2 rounded-full transition-all ${idx === activeIndex ? 'bg-white scale-125' : 'bg-white/40'}`}
                                />
                              ))}
                           </div>
                         )}

                         <div className="absolute top-10 left-10">
                            <span className="px-6 py-3 bg-white/90 backdrop-blur-md text-[#051937] text-[10px] font-black rounded-full uppercase tracking-widest shadow-xl">{prop.location}</span>
                         </div>
                         {prop.price && (
                           <div className="absolute bottom-10 right-10">
                             <span className="px-8 py-4 bg-[#051937] text-white text-lg font-black rounded-[1.5rem] shadow-2xl">KES {prop.price.toLocaleString()}</span>
                           </div>
                         )}
                      </div>
                      <div className="px-6 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <h3 className="text-4xl font-black text-[#051937] tracking-tight mb-2 group-hover:text-emerald-600 transition-colors">{prop.name}</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{prop.category}</p>
                          </div>
                        </div>
                        <p className="text-slate-500 text-lg font-medium leading-relaxed italic line-clamp-2 mb-10">"{prop.description || 'Verified luxury residence with modern architectural finishes and 24/7 security oversight.'}"</p>
                        <button 
                          onClick={() => { setSelectedTourProperty(prop.name); setTourSuccess(false); }} 
                          className="mt-auto w-full py-6 bg-white border-2 border-slate-100 text-[#051937] rounded-[2rem] font-black text-[12px] uppercase tracking-widest hover:bg-[#051937] hover:text-white hover:border-[#051937] transition-all duration-300 shadow-sm"
                        >
                          Schedule Private Tour
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === 'queries' && (
          <section className="py-32 max-w-[1400px] mx-auto px-8 animate-in slide-in-from-right-8 duration-700">
             <div className="grid grid-cols-1 lg:grid-cols-5 gap-20 items-start">
                <div className="lg:col-span-2 space-y-12">
                   <h2 className="text-6xl font-black text-[#051937] tracking-tighter leading-[0.95]">Global <br/> Inquiries <br/> Desk.</h2>
                   <p className="text-xl text-slate-500 font-medium leading-relaxed">Direct communication channel for potential partners, investors, and prospective residents.</p>
                   
                   <div className="space-y-10 pt-10">
                      <ContactInfo icon="fa-headset" title="Direct Support" info="+254 711 000 000" />
                      <ContactInfo icon="fa-envelope-open" title="Official Correspondence" info="concierge@kodiswift.ke" />
                      <ContactInfo icon="fa-location-dot" title="Headquarters" info="Delta Corner, Westlands, Nairobi" />
                   </div>
                </div>

                <div className="lg:col-span-3">
                   <div className="bg-white p-12 md:p-20 rounded-[5rem] shadow-[0_80px_160px_-40px_rgba(0,0,0,0.1)] border border-slate-50 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 opacity-60"></div>
                      
                      {formSubmitted ? (
                        <div className="py-20 text-center animate-in zoom-in-95 duration-500">
                          <div className="w-32 h-32 bg-emerald-50 text-emerald-500 rounded-[2.5rem] flex items-center justify-center text-5xl mx-auto mb-10 shadow-sm border border-emerald-100">
                             <i className="fas fa-check"></i>
                          </div>
                          <h4 className="text-3xl font-black text-[#051937] mb-4 tracking-tight uppercase">Message Dispatched</h4>
                          <p className="text-slate-400 font-medium text-lg">A certified KodiSwift agent will finalize your request <br/> within the next 2 business hours.</p>
                        </div>
                      ) : (
                        <form onSubmit={handleContactSubmit} className="space-y-10 relative z-10">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                             <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Legal Representative Name</label>
                                <input required type="text" className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none focus:bg-white focus:ring-4 focus:ring-emerald-50/50 transition-all font-black text-[#051937]" placeholder="e.g. Samuel Maina" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                             </div>
                             <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Secured Email Address</label>
                                <input required type="email" className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none focus:bg-white focus:ring-4 focus:ring-emerald-50/50 transition-all font-black text-[#051937]" placeholder="email@corp.ke" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                             </div>
                          </div>
                          <div>
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Inquiry Specifics</label>
                             <textarea required className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none focus:bg-white focus:ring-4 focus:ring-emerald-50/50 transition-all font-medium text-[#051937] resize-none" rows={6} placeholder="Detailed brief for our management team..." value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
                          </div>
                          <button type="submit" className="w-full py-8 bg-[#051937] text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-blue-100 hover:bg-emerald-600 hover:scale-[1.02] active:scale-95 transition-all">Submit Inbound Request</button>
                        </form>
                      )}
                   </div>
                </div>
             </div>
          </section>
        )}

        {activeTab === 'privacy' && <LegalContent title="Security & Privacy Policy" date="January 2026" items={PRIVACY_ITEMS} />}
        {activeTab === 'terms' && <LegalContent title="Management Terms of Service" date="January 2026" items={TERMS_ITEMS} />}
      </main>

      {/* Tour Request Modal */}
      {selectedTourProperty && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-[#051937]/60 backdrop-blur-md" 
            onClick={() => setSelectedTourProperty(null)}
          ></div>
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
            {tourSuccess ? (
              <div className="p-12 md:p-16 text-center">
                <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2.5rem] flex items-center justify-center text-5xl mx-auto mb-10 shadow-sm border border-emerald-100">
                  <i className="fas fa-check"></i>
                </div>
                <h3 className="text-3xl font-black text-[#051937] mb-6 tracking-tighter">THANK YOU!</h3>
                <p className="text-slate-500 font-medium text-lg leading-relaxed mb-10">
                  Your tour request for <span className="text-[#051937] font-black">{selectedTourProperty}</span> has been logged. An agent will get in touch for further coordination.
                </p>
                <button 
                  onClick={() => setSelectedTourProperty(null)}
                  className="w-full py-6 bg-[#051937] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-blue-100 active:scale-95"
                >
                  Close Notification
                </button>
              </div>
            ) : (
              <div className="p-10 md:p-14">
                <header className="mb-10 flex justify-between items-start">
                   <div>
                      <h3 className="text-3xl font-black text-[#051937] tracking-tighter uppercase">Private Tour</h3>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Property: {selectedTourProperty}</p>
                   </div>
                   <button onClick={() => setSelectedTourProperty(null)} className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors active:scale-90">
                      <i className="fas fa-times text-xl"></i>
                   </button>
                </header>
                <form onSubmit={handleTourSubmit} className="space-y-6">
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Visitor Name</label>
                      <input 
                        required 
                        type="text" 
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-emerald-50/50 transition-all font-black text-[#051937]" 
                        placeholder="e.g. Samuel Maina" 
                        value={tourFormData.name} 
                        onChange={e => setTourFormData({...tourFormData, name: e.target.value})} 
                      />
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Phone Number</label>
                      <input 
                        required 
                        type="tel" 
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-emerald-50/50 transition-all font-black text-[#051937]" 
                        placeholder="0711 000 000" 
                        value={tourFormData.phone} 
                        onChange={e => setTourFormData({...tourFormData, phone: e.target.value})} 
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Visit Date</label>
                        <input 
                          required 
                          type="date" 
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-emerald-50/50 transition-all font-black text-[#051937] text-xs" 
                          value={tourFormData.date} 
                          onChange={e => setTourFormData({...tourFormData, date: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Preferred Time</label>
                        <input 
                          required 
                          type="time" 
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-emerald-50/50 transition-all font-black text-[#051937] text-xs" 
                          value={tourFormData.time} 
                          onChange={e => setTourFormData({...tourFormData, time: e.target.value})} 
                        />
                      </div>
                   </div>
                   <button 
                    type="submit" 
                    className="w-full py-6 mt-6 bg-[#051937] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-100 hover:bg-emerald-600 transition-all active:scale-95"
                   >
                     Submit Tour Request
                   </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* High-End Footer */}
      <footer className="py-32 px-8 border-t border-slate-100 bg-blue-50/30">
        <div className="max-w-[1400px] mx-auto">
           <div className="grid grid-cols-1 lg:grid-cols-4 gap-20 mb-24">
              <div className="lg:col-span-2 space-y-10">
                <div className="flex items-center space-x-4 cursor-pointer" onClick={() => setActiveTab('home')}>
                  <div className="w-10 h-10 bg-[#051937] rounded-xl flex items-center justify-center text-white font-black text-xl">K</div>
                  <span className="text-2xl font-black text-[#051937] tracking-tight">KodiSwift</span>
                </div>
                <p className="text-xl text-slate-500 font-medium max-w-sm leading-relaxed">Pioneering the future of real estate yield management in East Africa.</p>
                <div className="flex items-center space-x-8 text-slate-400">
                  <FooterSocial icon="fa-x-twitter" />
                  <FooterSocial icon="fa-linkedin-in" />
                  <FooterSocial icon="fa-instagram" />
                </div>
              </div>

              <div className="space-y-10">
                 <h5 className="text-[11px] font-black text-[#051937] uppercase tracking-[0.3em]">Governance</h5>
                 <ul className="space-y-5">
                    <FooterLink label="Privacy Protocol" onClick={() => setActiveTab('privacy')} />
                    <FooterLink label="Operating Terms" onClick={() => setActiveTab('terms')} />
                    <FooterLink label="Compliance Dashboard" onClick={() => {}} />
                 </ul>
              </div>

              <div className="space-y-10">
                 <h5 className="text-[11px] font-black text-[#051937] uppercase tracking-[0.3em]">Access Gateway</h5>
                 <button 
                  onClick={onEnterGateway}
                  className="group flex items-center space-x-5 p-6 bg-white rounded-[2rem] border border-blue-100 shadow-sm hover:shadow-xl transition-all w-full text-left"
                 >
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                       <i className="fas fa-key text-sm"></i>
                    </div>
                    <div>
                       <p className="text-xs font-black text-[#051937] uppercase tracking-widest mb-0.5">Partner Portal</p>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Authorized Login Required</p>
                    </div>
                 </button>
              </div>
           </div>

           <div className="pt-20 border-t border-blue-100 flex flex-col md:flex-row justify-between items-center gap-8">
              <p className="text-blue-300 text-[10px] font-black uppercase tracking-[0.4em] text-center md:text-left">© 2026 KodiSwift Global Assets Management. All Rights Reserved.</p>
              <div className="flex items-center space-x-10">
                 <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/M-PESA_logo.svg/1200px-M-PESA_logo.svg.png" className="h-4 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all cursor-help" alt="MPesa Integrated" title="MPesa Reconciliation Engine Active" />
              </div>
           </div>
        </div>
      </footer>
    </div>
  );
};

// UI Components
const NavBtn: React.FC<{label: string, active: boolean, onClick: () => void}> = ({label, active, onClick}) => (
  <button 
    onClick={onClick}
    className={`text-[11px] font-black uppercase tracking-[0.3em] transition-all relative py-2 ${active ? 'text-[#051937]' : 'text-slate-400 hover:text-[#051937]'}`}
  >
    {label}
    {active && <span className="absolute bottom-0 left-0 w-full h-1 bg-emerald-600 rounded-full animate-in slide-in-from-left-2"></span>}
  </button>
);

const ValueCard: React.FC<{icon: string, title: string, desc: string}> = ({icon, title, desc}) => (
  <div className="space-y-8 group">
    <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-[2rem] flex items-center justify-center text-3xl text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white group-hover:scale-110 transition-all duration-500">
       <i className={`fas ${icon}`}></i>
    </div>
    <div className="space-y-4">
       <h3 className="text-3xl font-black tracking-tight">{title}</h3>
       <p className="text-blue-100/60 font-medium leading-relaxed text-lg">{desc}</p>
    </div>
  </div>
);

const ContactInfo: React.FC<{icon: string, title: string, info: string}> = ({icon, title, info}) => (
  <div className="flex items-center space-x-6">
     <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-lg shadow-sm border border-emerald-100/50">
        <i className={`fas ${icon}`}></i>
     </div>
     <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{title}</p>
        <p className="text-lg font-black text-[#051937]">{info}</p>
     </div>
  </div>
);

const FooterLink: React.FC<{label: string, onClick: () => void}> = ({label, onClick}) => (
  <li>
    <button onClick={onClick} className="text-slate-500 hover:text-emerald-600 font-bold text-sm transition-colors uppercase tracking-widest text-[11px]">{label}</button>
  </li>
);

const FooterSocial: React.FC<{icon: string}> = ({icon}) => (
  <button className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-[#051937] hover:text-white transition-all">
    <i className={`fab ${icon} text-sm`}></i>
  </button>
);

const LegalContent: React.FC<{title: string, date: string, items: {h: string, p: string}[]}> = ({title, date, items}) => (
  <section className="py-24 max-w-4xl mx-auto px-8 animate-in fade-in duration-700">
    <header className="mb-20">
       <div className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-lg mb-4">Official Documentation</div>
       <h1 className="text-6xl font-black text-[#051937] tracking-tighter mb-4">{title}</h1>
       <p className="text-slate-400 font-bold text-sm italic">Version Control: Effective {date}</p>
    </header>
    <div className="space-y-16">
       {items.map((item, i) => (
         <div key={i} className="group">
           <h3 className="text-xl font-black text-[#051937] mb-4 uppercase tracking-widest text-xs flex items-center">
              <span className="w-8 h-px bg-emerald-200 mr-4 group-hover:w-12 transition-all"></span>
              {item.h}
           </h3>
           <p className="text-slate-500 font-medium leading-relaxed text-lg pl-12">{item.p}</p>
         </div>
       ))}
    </div>
  </section>
);

const PRIVACY_ITEMS = [
  { h: "1. Data Acquisition Protocols", p: "KodiSwift leverages encrypted endpoints for the acquisition of resident identifiers and financial reference codes. Data is sourced strictly for the purpose of operational auditing and lease verification." },
  { h: "2. Retention Standards", p: "In alignment with the Data Protection Act (Kenya), core transaction records are preserved for a statutory duration of 84 months. Post-retention, all digital footprints are systematically sanitized via cryptographic erasure." },
  { h: "3. Third-Party Governance", p: "Financial data is exchanged solely with licensed payment aggregators (e.g., Safaricom). We do not permit lateral data movement for marketing or advertising purposes." },
  { h: "4. Algorithmic Processing", p: "Our Performance Insights utilize non-PII (Personally Identifiable Information) data streams to derive predictive yield models, ensuring occupant privacy remains decoupled from market analysis." }
];

const TERMS_ITEMS = [
  { h: "1. Scope of Authorization", p: "Access to the management gateway constitutes a binding agreement to adhere to KodiSwift security protocols. Authorization is granted exclusively to verified asset owners and designated administrative staff." },
  { h: "2. Accuracy of Ledger", p: "The property owner assumes full responsibility for the veracity of unit specs and initial meter readings. KodiSwift automated reconciliation relies on the integrity of baseline data entered during onboarding." },
  { h: "3. Financial Liability", p: "While KodiSwift provides the infrastructure for M-Pesa reconciliation, we do not act as a financial fiduciary. All net funds are transferred directly to the owner's nominated collection account." },
  { h: "4. Service Availability", p: "We maintain a 99.9% uptime target. Scheduled maintenance windows will be communicated via the system dashboard 48 hours prior to initiation." }
];

export default LandingPage;
