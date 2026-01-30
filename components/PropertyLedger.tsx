import React, { useState } from 'react';
import { Unit, Lease, Tenant, RequestActionType } from '../types';

interface PropertyLedgerProps {
  propertyName: string;
  propertyId: string;
  totalUnits: number;
  units: Unit[];
  leases: Lease[];
  tenants: Tenant[];
  onUpdateUnit: (unit: Unit) => void;
  onTenantClick: (tenantId: string) => void;
  onRequestAction: (type: RequestActionType, id: string, targetType: string, payload: any) => void;
  onClose?: () => void;
  readOnly?: boolean;
}

type LedgerAction = 'SAVE' | 'FINALIZE' | null;

const PropertyLedger: React.FC<PropertyLedgerProps> = ({ 
  propertyName, 
  propertyId,
  totalUnits,
  units, 
  leases, 
  tenants, 
  onUpdateUnit, 
  onTenantClick,
  onRequestAction,
  onClose,
  readOnly = false
}) => {
  const ASSESSMENT_DATE = '26th January 2026';
  
  const [localUnits, setLocalUnits] = useState<Unit[]>(() => {
    if (units.length > 0) return units;
    return Array.from({ length: totalUnits }, (_, i) => ({
      id: `setup-u-${Date.now()}-${i}`,
      propertyId: propertyId,
      unitNumber: '',
      type: 'Standard',
      isOccupied: false,
      currentReading: 0,
      rentAmount: 0
    }));
  });

  const [localLeases, setLocalLeases] = useState<Lease[]>(leases);
  const [assigningUnitId, setAssigningUnitId] = useState<string | null>(null);
  const [confirmingAction, setConfirmingAction] = useState<LedgerAction>(null);

  const assignedTenantIds = localLeases.filter(l => l.status === 'Active').map(l => l.tenantId);
  const availableTenants = tenants.filter(t => !assignedTenantIds.includes(t.id));

  const handleToggleOccupancy = (unitId: string) => {
    if (readOnly) return;
    const unit = localUnits.find(u => u.id === unitId);
    if (!unit) return;

    if (unit.isOccupied) {
      setLocalUnits(prev => prev.map(u => u.id === unitId ? { ...u, isOccupied: false } : u));
      setLocalLeases(prev => prev.map(l => (l.unitId === unitId && l.status === 'Active') ? { ...l, status: 'Terminated' } : l));
    } else {
      setAssigningUnitId(unitId);
    }
  };

  const handleAssignTenant = (unitId: string, tenantId: string) => {
    if (!tenantId) {
      setAssigningUnitId(null);
      return;
    }
    setLocalUnits(prev => prev.map(u => u.id === unitId ? { ...u, isOccupied: true } : u));
    setLocalLeases(prev => {
      const cleanedLeases = prev.filter(l => !(l.unitId === unitId && l.status === 'Active'));
      const newLease: Lease = {
        id: `local-l-${Date.now()}`,
        unitId,
        tenantId,
        rentAmount: localUnits.find(u => u.id === unitId)?.rentAmount || 0,
        depositAmount: 0,
        startDate: new Date().toISOString().split('T')[0],
        status: 'Active'
      };
      return [...cleanedLeases, newLease];
    });
    setAssigningUnitId(null);
  };

  const executeCommit = () => {
    if (!confirmingAction) return;

    // Validation: Current reading cannot be less than original reading
    const invalidMeterUnits = localUnits.filter(localUnit => {
      const originalUnit = units.find(u => u.id === localUnit.id);
      if (!originalUnit) return false;
      return (localUnit.currentReading ?? 0) < (originalUnit.currentReading ?? 0);
    });

    if (invalidMeterUnits.length > 0) {
       alert(`Audit Error: ${invalidMeterUnits.length} units have meter readings lower than the previous record. Adjust the progressive readings to proceed.`);
       return;
    }

    // Calculate detailed change logs for the audit queue
    const changes: string[] = [];
    localUnits.forEach(localUnit => {
      const originalUnit = units.find(u => u.id === localUnit.id);
      const unitIdent = localUnit.unitNumber || originalUnit?.unitNumber || `Unit (ID: ${localUnit.id.slice(-4)})`;

      if (!originalUnit) {
        changes.push(`Initialized ${unitIdent} into the property ledger.`);
        return;
      }

      // Track occupancy and tenant changes
      if (originalUnit.isOccupied !== localUnit.isOccupied) {
        if (localUnit.isOccupied) {
          const lease = localLeases.find(l => l.unitId === localUnit.id && l.status === 'Active');
          const tenant = tenants.find(t => t.id === lease?.tenantId);
          changes.push(`${unitIdent} status changed from Vacant to Occupied (Assigned to ${tenant?.name || 'Unknown Tenant'}).`);
        } else {
          changes.push(`${unitIdent} status changed from Occupied to Vacant.`);
        }
      }

      // Track meter changes
      if (originalUnit.currentReading !== localUnit.currentReading) {
        changes.push(`${unitIdent} meter reading updated from ${originalUnit.currentReading || 0} to ${localUnit.currentReading ?? 0}.`);
      }

      // Track rent changes
      if (originalUnit.rentAmount !== localUnit.rentAmount) {
        changes.push(`${unitIdent} rent adjusted from KES ${originalUnit.rentAmount?.toLocaleString() || 0} to KES ${localUnit.rentAmount?.toLocaleString()}.`);
      }
    });

    onRequestAction('PROPERTY_UPDATE', propertyId, 'PROPERTY', {
      units: localUnits,
      leases: localLeases,
      propertyName,
      totalUnits,
      isFinal: confirmingAction === 'FINALIZE',
      changeLogs: changes
    });
    
    setConfirmingAction(null);
    if (onClose) onClose();
  };

  return (
    <div className={`flex flex-col h-full bg-white font-sans ${readOnly ? '' : 'rounded-[3rem] overflow-hidden'}`}>
      <header className="p-10 border-b border-slate-100 flex justify-between items-start bg-white">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">{propertyName} - Asset Ledger</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-3">MANAGE UNIT STATUS, RENT, AND UTILITY ASSESSMENTS</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-300 hover:text-rose-500 shadow-sm border border-slate-100 transition-all">
            <i className="fas fa-times text-lg"></i>
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-10 bg-white">
        <div className="rounded-[2rem] border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-white">
              <tr>
                <th className="py-8 px-10 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-50">UNIT ID</th>
                <th className="py-8 px-10 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-50">OCCUPANCY</th>
                <th className="py-8 px-10 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-50">RESIDENT</th>
                <th className="py-8 px-10 text-center bg-indigo-50/10 border-b border-slate-50">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">WATER METER (PREV / CURR)</span>
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest italic">{ASSESSMENT_DATE}</span>
                  </div>
                </th>
                <th className="py-8 px-10 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-50">RENT (KES)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {localUnits.map((unit) => {
                const activeLease = localLeases.find(l => l.unitId === unit.id && l.status === 'Active');
                const tenant = unit.isOccupied && activeLease ? tenants.find(t => t.id === activeLease.tenantId) : null;
                const originalUnit = units.find(u => u.id === unit.id);
                const prevReading = originalUnit?.currentReading || 0;
                const isInvalidReading = (unit.currentReading ?? 0) < prevReading;

                return (
                  <tr key={unit.id} className="hover:bg-slate-50/30 transition-all group">
                    <td className="py-6 px-10 text-center">
                      <input 
                        type="text"
                        placeholder="Unit No."
                        disabled={readOnly}
                        className="w-28 px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 text-center outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        value={unit.unitNumber}
                        onChange={(e) => setLocalUnits(prev => prev.map(u => u.id === unit.id ? { ...u, unitNumber: e.target.value } : u))}
                      />
                    </td>
                    <td className="py-6 px-10 text-center">
                      {!readOnly && assigningUnitId === unit.id ? (
                        <select 
                          autoFocus
                          className="px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 border-indigo-500 outline-none bg-indigo-50 text-indigo-700 animate-in zoom-in-95"
                          defaultValue=""
                          onChange={(e) => handleAssignTenant(unit.id, e.target.value)}
                          onBlur={() => setAssigningUnitId(null)}
                        >
                          <option value="" disabled>Choose</option>
                          {availableTenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          <option value="">Cancel</option>
                        </select>
                      ) : (
                        <button 
                          disabled={readOnly}
                          onClick={() => handleToggleOccupancy(unit.id)}
                          className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${unit.isOccupied ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}
                        >
                          {unit.isOccupied ? 'Occupied' : 'Vacant'}
                        </button>
                      )}
                    </td>
                    <td className="py-6 px-10 text-center">
                      {unit.isOccupied && tenant ? (
                        <button 
                          onClick={() => onTenantClick(tenant.id)}
                          className="text-xs font-black text-slate-700 underline decoration-indigo-200 underline-offset-4 decoration-2 hover:text-indigo-600 transition-colors"
                        >
                          {tenant.name}
                        </button>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-200">No data to show</span>
                      )}
                    </td>
                    <td className="py-6 px-10 bg-indigo-50/5 text-center">
                      <input 
                        type="number"
                        min={prevReading}
                        disabled={readOnly}
                        className={`w-24 text-center font-black text-sm px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all ${
                          isInvalidReading 
                          ? 'bg-rose-50 border-rose-500 text-rose-600' 
                          : 'bg-white border-slate-200 text-slate-900'
                        }`}
                        value={unit.currentReading ?? 0}
                        onChange={(e) => setLocalUnits(prev => prev.map(u => u.id === unit.id ? { ...u, currentReading: parseInt(e.target.value) || 0 } : u))}
                      />
                    </td>
                    <td className="py-6 px-10 text-center">
                      <input 
                        type="number"
                        disabled={readOnly}
                        className="w-24 px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-black text-center outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        value={unit.rentAmount || 0}
                        onChange={(e) => setLocalUnits(prev => prev.map(u => u.id === unit.id ? { ...u, rentAmount: parseInt(e.target.value) || 0 } : u))}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {!readOnly && (
        <footer className="p-10 border-t border-slate-50 bg-white flex justify-between items-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            SHOWING {localUnits.length} INVENTORY UNITS
          </p>
          <div className="flex space-x-4">
            <button 
              onClick={() => setConfirmingAction('SAVE')} 
              className="px-10 py-4 bg-white border border-slate-200 text-slate-400 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:text-indigo-600 transition-all hover:border-indigo-100"
            >
              Save Changes
            </button>
            <button 
              onClick={() => setConfirmingAction('FINALIZE')} 
              className="px-12 py-4 bg-[#0f172a] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl hover:bg-indigo-900 transition-all flex items-center"
            >
              FINALIZE ASSESSMENT
            </button>
          </div>
        </footer>
      )}

      {/* Administrative Confirmation Modal */}
      {confirmingAction && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-[#0f172a]/95 backdrop-blur-md" onClick={() => setConfirmingAction(null)}></div>
           <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
              <div className="p-14 text-center flex flex-col items-center">
                 <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-sm border ${confirmingAction === 'SAVE' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                    <i className={`fas ${confirmingAction === 'SAVE' ? 'fa-shield-halved' : 'fa-check-double'} text-4xl`}></i>
                 </div>
                 <h3 className="text-4xl font-black text-[#0f172a] mb-6 tracking-tight">
                    {confirmingAction === 'SAVE' ? 'Queue Updates?' : 'Finalize Audit?'}
                 </h3>
                 <p className="text-slate-500 font-medium mb-12 max-w-sm leading-relaxed text-base">
                   {confirmingAction === 'SAVE' 
                    ? `Submit current ledger modifications for ${propertyName} to the System Approval Queue?`
                    : `Commit the full utility and rent assessment for ${propertyName}. This action will be permanently logged for Super Admin verification.`}
                   <br/><br/>
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Administrative Protocol Active</span>
                 </p>

                 <div className="flex flex-col space-y-4 w-full">
                    <button 
                      onClick={executeCommit}
                      className={`w-full py-6 rounded-2xl font-black text-[14px] uppercase tracking-[0.15em] shadow-xl transition-all ${confirmingAction === 'SAVE' ? 'bg-[#0f172a] text-white hover:bg-indigo-600 shadow-indigo-100' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100'}`}
                    >
                      Authorize & Queue
                    </button>
                    <button 
                      onClick={() => setConfirmingAction(null)}
                      className="w-full py-6 bg-white text-slate-400 rounded-2xl font-black text-[14px] uppercase tracking-[0.15em] hover:text-slate-900 transition-all"
                    >
                      Return to Ledger
                    </button>
                 </div>
              </div>
              <div className="bg-[#0f172a] py-5 text-center">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em]">KodiSwift Security Gateway</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default PropertyLedger;
