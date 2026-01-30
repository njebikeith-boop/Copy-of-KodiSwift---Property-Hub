
import React, { useState, useMemo, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { InvoiceStatus, Property, Unit, Lease, Tenant, Invoice, Payment, UserRole, User, PenaltyType, PenaltyAppliedOn } from '../types';

interface InvoiceCenterProps {
  permissions: {
    auto_generate: boolean;
    print: boolean;
    sms: boolean;
  };
  properties: Property[];
  units: Unit[];
  leases: Lease[];
  tenants: Tenant[];
  invoices: Invoice[];
  onSaveInvoice: (inv: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
  payments: Payment[];
  onSavePayment: (pay: Payment) => void;
  onDeletePayment: (id: string) => void;
  currentUser: User;
  setManagedProps: React.Dispatch<React.SetStateAction<Property[]>>;
}

type BillingMode = 'EXISTING' | 'CREATE_NEW';
type PreviewType = 'INVOICE' | 'RECEIPT';

const InvoiceCenter: React.FC<InvoiceCenterProps> = ({ 
  permissions, 
  properties, 
  units, 
  leases, 
  tenants,
  invoices,
  onSaveInvoice,
  onDeleteInvoice,
  payments,
  onSavePayment,
  onDeletePayment,
  currentUser,
  setManagedProps
}) => {
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [billingMode, setBillingMode] = useState('EXISTING');
  const [showRecords, setShowRecords] = useState(false);
  const [newBillReadings, setNewBillReadings] = useState<Record<string, number>>({});
  const [manualAdjustments, setManualAdjustments] = useState<Record<string, number>>({});
  const [utilityRate, setUtilityRate] = useState<number>(150); 
  
  const [previewType, setPreviewType] = useState<PreviewType>('INVOICE');
  const [activeReceiptTrxId, setActiveReceiptTrxId] = useState<string | null>(null);

  const [managingPaymentsInvoiceId, setManagingPaymentsInvoiceId] = useState<string | null>(null);
  const [isEditingPayment, setIsEditingPayment] = useState<Partial<Payment> | null>(null);
  const [isApiSimulating, setIsApiSimulating] = useState(false);
  const [apiLogs, setApiLogs] = useState<{msg: string, type: 'info' | 'success' | 'err'}[]>([]);

  const currentMonthYear = useMemo(() => new Date().toLocaleDateString('en-KE', { 
    month: 'long', 
    year: 'numeric'
  }), []);

  const [selectedPeriod, setSelectedPeriod] = useState<string>(currentMonthYear);

  const filteredProperties = useMemo(() => properties.filter(p => p.isManaged), [properties]);
  const activeProperty = useMemo(() => properties.find(p => p.id === selectedPropertyId), [selectedPropertyId, properties]);
  const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;

  const canModifyPayments = activeProperty?.isPaymentChangeEnabled === true;

  const creationData = useMemo(() => {
    if (!selectedPropertyId) return [];
    const propertyUnits = units.filter(u => u.propertyId === selectedPropertyId && u.isOccupied);
    return propertyUnits.map(unit => {
      const lease = leases.find(l => l.unitId === unit.id && l.status === 'Active');
      const tenant = tenants.find(t => t.id === lease?.tenantId);
      const leaseInvoices = invoices.filter(inv => inv.leaseId === lease?.id);
      const sortedInv = [...leaseInvoices].sort((a,b) => b.dueDate.localeCompare(a.dueDate));
      const lastInvoice = sortedInv[0];
      const balanceForward = lastInvoice ? (lastInvoice.amount - lastInvoice.paidAmount) : 0;
      
      let autoPenalty = 0;
      if (balanceForward > 0 && activeProperty?.penaltyType && activeProperty?.penaltyType !== PenaltyType.NONE) {
        if (activeProperty.penaltyType === PenaltyType.STATIC) {
          autoPenalty = activeProperty.penaltyValue || 0;
        } else if (activeProperty.penaltyType === PenaltyType.PERCENTAGE) {
          const principal = activeProperty.penaltyAppliedOn === PenaltyAppliedOn.RENT ? (lease?.rentAmount || 0) : (lastInvoice?.amount || 0);
          autoPenalty = principal * ((activeProperty.penaltyValue || 0) / 100);
        }
      }

      return { unit, lease, tenant, balanceForward, autoPenalty };
    });
  }, [selectedPropertyId, units, leases, tenants, invoices, activeProperty]);

  const groupedInvoices = useMemo(() => {
    if (!selectedPropertyId) return {};
    const propertyUnits = units.filter(u => u.propertyId === selectedPropertyId);
    const unitIds = propertyUnits.map(u => u.id);
    const propertyLeases = leases.filter(l => unitIds.includes(l.unitId));
    const leaseIds = propertyLeases.map(l => l.id);
    const propertyInvoices = invoices.filter(inv => leaseIds.includes(inv.leaseId));

    const groups: Record<string, Invoice[]> = {};
    propertyInvoices.forEach(inv => {
      if (!groups[inv.period]) groups[inv.period] = [];
      groups[inv.period].push(inv);
    });
    
    return groups;
  }, [selectedPropertyId, units, leases, invoices]);

  const sortedPeriodKeys = useMemo(() => {
    return Object.keys(groupedInvoices).sort((a, b) => {
      const dateA = new Date(a).getTime();
      const dateB = new Date(b).getTime();
      return dateB - dateA;
    });
  }, [groupedInvoices]);

  useEffect(() => {
    if (sortedPeriodKeys.length > 0) {
      setSelectedPeriod(sortedPeriodKeys[0]);
    } else {
      setSelectedPeriod(currentMonthYear);
    }
  }, [selectedPropertyId, sortedPeriodKeys, currentMonthYear]);

  const handleBatchGenerate = () => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const dueDay = activeProperty?.defaultDueDateDay || 10;
    const dueDateStr = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), dueDay).toISOString().split('T')[0];

    creationData.forEach(item => {
      const prevReading = item.unit.currentReading || 0;
      const currReading = newBillReadings[item.unit.id] || prevReading;
      const utilityBill = Math.max(0, currReading - prevReading) * utilityRate;
      
      const rent = item.lease?.rentAmount || 0;
      const penalty = item.autoPenalty;
      const balanceForward = manualAdjustments[item.unit.id] ?? item.balanceForward;
      const totalDue = rent + utilityBill + balanceForward + penalty;
      const status = totalDue <= 0 ? InvoiceStatus.PAID : InvoiceStatus.DUE;

      const newInv: Invoice = {
        id: `INV-${Date.now()}-${item.unit.id}`,
        leaseId: item.lease?.id || '',
        amount: totalDue,
        rentAmount: rent,
        utilityAmount: utilityBill,
        overdueAmount: balanceForward,
        penaltyAmount: penalty,
        paidAmount: totalDue < 0 ? Math.abs(totalDue) : 0, 
        dueDate: dueDateStr,
        period: currentMonthYear,
        status: status
      };
      onSaveInvoice(newInv);
    });

    alert(`Audit Complete: Ledgers synchronized for ${currentMonthYear}.`);
    setBillingMode('EXISTING');
    setSelectedPeriod(currentMonthYear);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditingPayment || !isEditingPayment.reference) {
      alert("A transaction reference number is required.");
      return;
    }

    const newPay: Payment = {
      id: isEditingPayment.id || `PAY-${Date.now()}`,
      invoiceId: managingPaymentsInvoiceId!,
      amount: isEditingPayment.amount || 0,
      method: isEditingPayment.method || 'Cash',
      reference: isEditingPayment.reference,
      paidAt: isEditingPayment.paidAt || new Date().toISOString().split('T')[0],
      status: 'Matched',
      isHeld: false
    };
    onSavePayment(newPay);
    setIsEditingPayment(null);
  };

  /**
   * AUTOMATED MPESA API SIMULATION
   * Demonstrates how the system identifies payments via the tenant's paymentCode (Account No).
   */
  const handleSimulateApiPayment = async () => {
    if (!managingPaymentsInvoiceId) return;
    const inv = invoices.find(i => i.id === managingPaymentsInvoiceId);
    if (!inv) return;
    const lease = leases.find(l => l.id === inv.leaseId);
    const tenant = tenants.find(t => t.id === lease?.tenantId);
    const unit = units.find(u => u.id === lease?.unitId);
    if (!tenant) return;

    setIsApiSimulating(true);
    setApiLogs([{ msg: `Incoming Webhook: Initiating Safaricom C2B Hook...`, type: 'info' }]);
    
    await new Promise(res => setTimeout(res, 800));
    setApiLogs(prev => [...prev, { msg: `[IDENTIFIED] Account No: ${tenant.paymentCode} matched to House: ${unit?.unitNumber}`, type: 'info' }]);
    
    await new Promise(res => setTimeout(res, 1200));
    setApiLogs(prev => [...prev, { msg: `[RESOLVED] Resident: ${tenant.name}. verifying invoice status...`, type: 'info' }]);

    const amount = Math.max(0, inv.amount - inv.paidAmount);
    if (amount <= 0 && inv.amount > 0) {
      setApiLogs(prev => [...prev, { msg: `Simulation Aborted: Linked invoice already settled.`, type: 'err' }]);
      setIsApiSimulating(false);
      return;
    }

    const ref = `KS${Math.floor(1000 + Math.random() * 9000)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(100 + Math.random() * 900)}`;
    
    const newPay: Payment = {
      id: `PAY-API-${Date.now()}`,
      invoiceId: managingPaymentsInvoiceId,
      amount: amount || 1000,
      method: 'M-Pesa API',
      reference: ref,
      paidAt: new Date().toISOString().split('T')[0],
      status: 'Matched',
      isHeld: false
    };

    onSavePayment(newPay);
    setApiLogs(prev => [...prev, { msg: `[SUCCESS] Ref: ${ref} matched to House ${unit?.unitNumber}.`, type: 'success' }]);
    setApiLogs(prev => [...prev, { msg: `[YIELD ENGINE] Automated transfer to Landlord balance complete.`, type: 'success' }]);
    setIsApiSimulating(false);
  };

  const toggleHoldPayment = (payId: string) => {
    if (!canModifyPayments) return;
    const pay = payments.find(p => p.id === payId);
    if (!pay) return;
    
    const newHeldStatus = !pay.isHeld;
    let reason = pay.holdReason;
    if (newHeldStatus) {
       reason = window.prompt("Reason for administrative hold:") || 'Administrative Hold';
    }
    onSavePayment({ ...pay, isHeld: newHeldStatus, holdReason: reason });
  };

  const handleDeletePaymentBtn = (payId: string) => {
    if (!canModifyPayments) return;
    if (window.confirm("Permanently delete this payment record?")) {
      onDeletePayment(payId);
    }
  };

  const formatCurrency = (val: number) => {
    if (val < 0) return `(KES ${Math.abs(val).toLocaleString()}) CR`;
    return `KES ${val.toLocaleString()}`;
  };

  const getStatusColor = (status: InvoiceStatus) => {
    switch(status) {
      case InvoiceStatus.PAID: return 'bg-emerald-100 text-emerald-700';
      case InvoiceStatus.OVERDUE: return 'bg-rose-100 text-rose-700';
      case InvoiceStatus.PARTIAL: return 'bg-amber-100 text-amber-700';
      case InvoiceStatus.DUE: return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const handleDownload = () => {
    if (!selectedInvoice) return;
    const isInvoice = previewType === 'INVOICE';
    
    let total = selectedInvoice.amount;
    let paid = selectedInvoice.paidAmount || 0;
    
    let receiptAmount = total;
    let referenceLabel = isInvoice ? 'Invoice No:' : 'Receipt Reference:';
    let referenceValue = isInvoice ? selectedInvoice.id : (activeReceiptTrxId || 'N/A');
    let paymentMethod = 'N/A';
    let paymentDate = selectedInvoice.dueDate;
    let activeSplits = null;

    if (!isInvoice && activeReceiptTrxId) {
       const p = payments.find(pay => pay.id === activeReceiptTrxId);
       if (p) {
          receiptAmount = p.amount;
          referenceValue = p.reference;
          paymentMethod = p.method;
          paymentDate = p.paidAt;
          activeSplits = p.splits;
       }
    }

    const doc = new jsPDF();
    const documentTitle = isInvoice ? 'OFFICIAL INVOICE' : 'OFFICIAL PAYMENT RECEIPT';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('KODISWIFT PROPERTY HUB', 20, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Delta Corner, Westlands, Nairobi, Kenya', 20, 32);
    doc.line(20, 45, 190, 45);
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(documentTitle, 20, 58);
    
    doc.setFontSize(10);
    doc.text(`${referenceLabel} ${referenceValue.toUpperCase()}`, 20, 65);
    doc.text(`Date: ${paymentDate}`, 20, 70);
    doc.text(`Period: ${selectedInvoice.period}`, 20, 75);

    doc.text('RESIDENT DETAILS:', 20, 90);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${selectedInvoice.tenant?.name || 'N/A'}`, 20, 96);
    doc.text(`Unit: ${selectedInvoice.lease?.unitId || 'N/A'}`, 20, 102);

    if (isInvoice) {
      doc.setFont('helvetica', 'bold');
      doc.text('Description', 25, 120);
      doc.text('Amount (KES)', 185, 120, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text('Monthly Rent Charges', 25, 130);
      doc.text((selectedInvoice.rentAmount || 0).toLocaleString(), 185, 130, { align: 'right' });
      doc.text('Utility Bills (Water/Electricity)', 25, 140);
      doc.text((selectedInvoice.utilityAmount || 0).toLocaleString(), 185, 140, { align: 'right' });
      doc.text('Balance Forward (Arrears/Credit)', 25, 150);
      doc.text((selectedInvoice.overdueAmount || 0).toLocaleString(), 185, 150, { align: 'right' });
      doc.text('Late Payment Penalty', 25, 160);
      doc.text((selectedInvoice.penaltyAmount || 0).toLocaleString(), 185, 160, { align: 'right' });
      
      doc.setFont('helvetica', 'bold');
      doc.text('Total Net Amount Due:', 100, 180);
      doc.text(formatCurrency(total), 185, 180, { align: 'right' });
      doc.text('Outstanding Remaining:', 100, 190);
      doc.text(formatCurrency(total - paid), 185, 190, { align: 'right' });
    } else {
      doc.setFont('helvetica', 'bold');
      doc.text('PAYMENT DETAILS:', 20, 120);
      doc.setFont('helvetica', 'normal');
      doc.text(`Payment for Invoice: ${selectedInvoice.id}`, 20, 130);
      doc.text(`Payment Method: ${paymentMethod}`, 20, 140);
      doc.text(`Reference: ${referenceValue}`, 20, 150);
      
      if (activeSplits && activeSplits.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Audit Split Information:', 20, 165);
        doc.setFont('helvetica', 'normal');
        let currentY = 172;
        activeSplits.forEach(s => {
          doc.text(`${s.category}:`, 25, currentY);
          doc.text(`KES ${s.amount.toLocaleString()}`, 185, currentY, { align: 'right' });
          currentY += 7;
        });
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`AMOUNT RECEIVED: KES ${receiptAmount.toLocaleString()}`, 20, activeSplits ? 200 : 170);
      
      doc.setFontSize(10);
      doc.text(`Remaining Invoice Balance: ${formatCurrency(total - paid)}`, 20, activeSplits ? 210 : 180);
    }

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('Thank you for choosing KodiSwift. This is a computer generated document.', 20, 260);
    doc.save(`${previewType.toLowerCase()}_${referenceValue}.pdf`);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Ledger & Billing</h1>
          <p className="text-slate-500 text-sm md:text-base font-medium">Auto-liquidation of credit balances enabled</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          {selectedPropertyId && isSuperAdmin && (
             <div className="flex items-center justify-between sm:justify-start space-x-3 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm w-full sm:w-auto">
                <span className="text-[9px] font-black uppercase text-slate-400">Ledger Auth:</span>
                <button 
                  onClick={() => setManagedProps(prev => prev.map(p => p.id === selectedPropertyId ? { ...p, isPaymentChangeEnabled: !p.isPaymentChangeEnabled } : p))}
                  className={`w-10 h-5 rounded-full relative transition-all ${activeProperty?.isPaymentChangeEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${activeProperty?.isPaymentChangeEnabled ? 'left-5.5' : 'left-0.5'}`}></div>
                </button>
             </div>
          )}
          <select 
            className="w-full sm:w-auto px-6 py-4 bg-white border border-slate-200 rounded-2xl text-xs font-black outline-none min-w-[200px]"
            value={selectedPropertyId}
            onChange={(e) => { setSelectedPropertyId(e.target.value); setShowRecords(false); }}
          >
            <option value="">-- Select Asset --</option>
            {filteredProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-full sm:w-auto">
            <button onClick={() => { setBillingMode('EXISTING'); setShowRecords(true); }} className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${billingMode === 'EXISTING' && showRecords ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>History</button>
            <button onClick={() => { setBillingMode('CREATE_NEW'); setShowRecords(true); }} className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${billingMode === 'CREATE_NEW' && showRecords ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Process Bills</button>
          </div>
        </div>
      </header>

      {showRecords && billingMode === 'EXISTING' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm gap-6">
             <div><h3 className="text-xl font-black text-slate-900 tracking-tight">Statement Ledger</h3><p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Accounting for Overpayments and Arrears</p></div>
             <div className="flex items-center space-x-4 w-full md:w-auto">
                <label className="hidden sm:block text-[10px] font-black text-slate-400 uppercase tracking-widest">Period Filter:</label>
                <select className="flex-1 md:flex-none px-8 py-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-w-[180px]" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
                  {sortedPeriodKeys.length === 0 && <option value={currentMonthYear}>{currentMonthYear}</option>}
                  {sortedPeriodKeys.map(pk => <option key={pk} value={pk}>{pk}</option>)}
                </select>
             </div>
          </div>
          <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
             <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                   <tr>
                      <th className="py-6 px-8">Resident Info</th>
                      <th className="py-6 px-8 text-center">Bal. Forward</th>
                      <th className="py-6 px-8 text-center">Current Monthly Net</th>
                      <th className="py-6 px-8 text-center">Paid (Click for Receipts)</th>
                      <th className="py-6 px-8 text-center">Bal. Brought Down</th>
                      <th className="py-6 px-8 text-center">Status</th>
                      <th className="py-6 px-8 text-right">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {(!groupedInvoices[selectedPeriod] || groupedInvoices[selectedPeriod].length === 0) ? (
                     <tr><td colSpan={7} className="py-20 text-center text-slate-300 font-bold uppercase text-xs">No records available</td></tr>
                   ) : groupedInvoices[selectedPeriod].map(inv => {
                     const lease = leases.find(l => l.id === inv.leaseId);
                     const tenant = tenants.find(t => t.id === lease?.tenantId);
                     const isEditable = selectedPeriod === currentMonthYear;
                     const closingBalance = inv.amount - inv.paidAmount;

                     return (
                       <tr key={inv.id} className="hover:bg-slate-50/50">
                          <td className="py-6 px-8">
                             <p className="font-black text-slate-900">{tenant?.name}</p>
                             <p className="text-[9px] text-slate-400 font-bold uppercase">Unit {lease?.unitId} • {tenant?.paymentCode}</p>
                          </td>
                          <td className="py-6 px-8 text-center">
                             <span className={`font-black text-xs ${inv.overdueAmount! < 0 ? 'text-emerald-600' : inv.overdueAmount! > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                                {formatCurrency(inv.overdueAmount || 0)}
                             </span>
                          </td>
                          <td className="py-6 px-8 text-center">
                             <p className="font-black text-slate-900">{formatCurrency(inv.amount)}</p>
                             <p className="text-[8px] text-slate-400 font-bold uppercase">Incl. Rent & Utils</p>
                          </td>
                          <td className="py-6 px-8 text-center">
                             <button onClick={() => { setManagingPaymentsInvoiceId(inv.id); setApiLogs([]); }} className="px-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-sm hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center justify-center space-x-2 mx-auto">
                                <i className="fas fa-receipt text-[10px]"></i>
                                <span>{inv.paidAmount.toLocaleString()}</span>
                             </button>
                             <p className="text-[7px] text-indigo-400 font-bold uppercase mt-1">Manage Receipts</p>
                          </td>
                          <td className="py-6 px-8 text-center">
                             <span className={`font-black text-xs ${closingBalance < 0 ? 'text-emerald-600' : closingBalance > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                                {formatCurrency(closingBalance)}
                             </span>
                          </td>
                          <td className="py-6 px-8 text-center">
                             <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${getStatusColor(inv.status)} shadow-sm`}>{inv.status}</span>
                          </td>
                          <td className="py-6 px-8 text-right">
                             <button onClick={() => { setSelectedInvoice({...inv, tenant, lease}); setPreviewType('INVOICE'); setActiveReceiptTrxId(null); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><i className="fas fa-file-invoice"></i></button>
                             {isEditable && <button onClick={() => onDeleteInvoice(inv.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg ml-2"><i className="fas fa-trash-alt"></i></button>}
                          </td>
                       </tr>
                     );
                   })}
                </tbody>
             </table>
          </div>
        </div>
      )}

      {showRecords && billingMode === 'CREATE_NEW' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
           <div className="bg-[#0f172a] rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-10 opacity-5 text-9xl pointer-events-none -translate-y-10 translate-x-10"><i className="fas fa-calculator"></i></div>
               <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-end">
                  <div className="space-y-4">
                     <h2 className="text-3xl font-black tracking-tight uppercase">Batch Assessment: {currentMonthYear}</h2>
                     <p className="text-slate-400 text-sm font-medium">Automatic credit carry-forward logic active. Adjust balances for new tenants as needed.</p>
                     <div className="flex items-center space-x-6">
                        <div className="flex-1">
                           <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-2">Utility Rate (KES/U)</label>
                           <input type="number" className="w-full px-5 py-3.5 bg-slate-800 border border-slate-700 rounded-xl outline-none font-black text-white text-sm" value={utilityRate} onChange={(e) => setUtilityRate(parseInt(e.target.value) || 0)} />
                        </div>
                     </div>
                  </div>
                  <button onClick={handleBatchGenerate} className="w-full py-6 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl transition-all">Generate Property Ledgers</button>
               </div>
            </div>
            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
               <table className="w-full min-w-[1000px] text-left">
                  <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                     <tr>
                        <th className="py-6 px-10">Unit/Tenant</th>
                        <th className="py-6 px-10 text-center">Meter Update</th>
                        <th className="py-6 px-10 text-center">Bal. Forward (Adj)</th>
                        <th className="py-6 px-10 text-right">Preview Net Due</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {creationData.map(item => {
                        const balForward = manualAdjustments[item.unit.id] ?? item.balanceForward;
                        const prevReading = item.unit.currentReading || 0;
                        const currReading = newBillReadings[item.unit.id] || prevReading;
                        const utils = (currReading - prevReading) * utilityRate;
                        const total = (item.lease?.rentAmount || 0) + utils + balForward + item.autoPenalty;

                        return (
                           <tr key={item.unit.id} className="hover:bg-slate-50/50">
                              <td className="py-6 px-10">
                                 <p className="font-black text-slate-900">{item.unit.unitNumber}</p>
                                 <p className="text-[10px] text-slate-400 font-bold">{item.tenant?.name || 'Vacant'}</p>
                              </td>
                              <td className="py-6 px-10 text-center">
                                 <div className="flex flex-col items-center">
                                    <input type="number" className="w-24 text-center py-2 px-3 bg-indigo-50/50 border border-indigo-100 rounded-lg font-black text-xs" value={newBillReadings[item.unit.id] ?? ''} placeholder={prevReading.toString()} onChange={e => setNewBillReadings(prev => ({...prev, [item.unit.id]: parseInt(e.target.value) || 0}))} />
                                    <span className="text-[7px] text-slate-300 font-black uppercase mt-1">Prev: {prevReading}</span>
                                 </div>
                              </td>
                              <td className="py-6 px-10 text-center">
                                 <div className="flex flex-col items-center">
                                    <input type="number" className={`w-24 text-center py-2 px-3 border rounded-lg font-black text-xs ${balForward < 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`} value={manualAdjustments[item.unit.id] ?? item.balanceForward} onChange={e => setManualAdjustments(prev => ({...prev, [item.unit.id]: parseInt(e.target.value) || 0}))} />
                                    <span className="text-[7px] text-slate-300 font-black uppercase mt-1">Manual Adj. Allowed</span>
                                 </div>
                              </td>
                              <td className="py-6 px-10 text-right">
                                 <p className={`font-black text-sm ${total < 0 ? 'text-emerald-600' : 'text-slate-900'}`}>{formatCurrency(total)}</p>
                                 <p className="text-[7px] text-slate-400 uppercase font-bold">Standard Accounting Net</p>
                              </td>
                           </tr>
                        );
                     })}
                  </tbody>
               </table>
            </div>
        </div>
      )}

      {managingPaymentsInvoiceId && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-[#0f172a]/90 backdrop-blur-sm" onClick={() => setManagingPaymentsInvoiceId(null)}></div>
           <div className="bg-white w-full max-w-4xl rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-10 relative shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 shrink-0">
                 <div>
                    <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight">M-Pesa API Automation</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Simulated webhook routing and yield transfer</p>
                 </div>
                 <button 
                  onClick={handleSimulateApiPayment}
                  disabled={isApiSimulating}
                  className={`w-full md:w-auto px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all flex items-center justify-center space-x-3 ${isApiSimulating ? 'bg-indigo-100 text-indigo-400' : 'bg-indigo-600 text-white hover:bg-emerald-600'}`}
                 >
                    <i className={`fas ${isApiSimulating ? 'fa-spinner fa-spin' : 'fa-robot'}`}></i>
                    <span>{isApiSimulating ? 'Processing Webhook...' : 'Simulate Paybill API'}</span>
                 </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-y-auto custom-scrollbar flex-1 pr-1">
                 <div className="lg:col-span-2 space-y-6">
                    {canModifyPayments && (
                      <form onSubmit={handleSavePayment} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner">
                         <div className="md:col-span-1">
                           <label className="block text-[8px] font-black text-slate-400 uppercase mb-2">Amount</label>
                           <input required type="number" className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={isEditingPayment?.amount || ''} onChange={e => setIsEditingPayment({...isEditingPayment, amount: parseInt(e.target.value) || 0})} />
                         </div>
                         <div className="md:col-span-1">
                           <label className="block text-[8px] font-black text-slate-400 uppercase mb-2">Ref</label>
                           <input required type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={isEditingPayment?.reference || ''} onChange={e => setIsEditingPayment({...isEditingPayment, reference: e.target.value})} />
                         </div>
                         <div className="md:col-span-1">
                           <label className="block text-[8px] font-black text-slate-400 uppercase mb-2">Date</label>
                           <input required type="date" className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-xs focus:ring-2 focus:ring-indigo-500 outline-none" value={isEditingPayment?.paidAt || ''} onChange={e => setIsEditingPayment({...isEditingPayment, paidAt: e.target.value})} />
                         </div>
                         <div className="flex items-end">
                           <button type="submit" className="w-full bg-[#0f172a] text-white py-3.5 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-indigo-600 transition-all active:scale-95">Save</button>
                         </div>
                      </form>
                    )}
                    <div className="space-y-3">
                      {payments.filter(p => p.invoiceId === managingPaymentsInvoiceId).map(pay => {
                         const inv = invoices.find(i => i.id === managingPaymentsInvoiceId);
                         const lease = leases.find(l => l.id === inv?.leaseId);
                         const tenant = tenants.find(t => t.id === lease?.tenantId);
                         return (
                            <div key={pay.id} className={`p-5 border rounded-2xl flex justify-between items-center transition-all ${pay.isHeld ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-100 shadow-sm'}`}>
                               <div className="flex items-center space-x-4">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pay.isHeld ? 'bg-amber-100 text-amber-600' : pay.method.includes('API') ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                     <i className={`fas ${pay.isHeld ? 'fa-lock' : pay.method.includes('API') ? 'fa-microchip' : 'fa-receipt'} text-xs`}></i>
                                  </div>
                                  <div>
                                     <p className="font-black text-slate-900 text-sm flex items-center">
                                       {pay.reference}
                                       {pay.method.includes('API') && <span className="ml-2 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[7px] font-black rounded border border-indigo-100 uppercase hidden sm:inline">AUTOMATED</span>}
                                     </p>
                                     <p className="text-[10px] text-slate-400 font-bold uppercase">{pay.paidAt} • {pay.method}</p>
                                  </div>
                               </div>
                               <div className="flex items-center space-x-3">
                                  <span className={`font-black text-sm md:text-base ${pay.isHeld ? 'text-amber-600' : 'text-emerald-600'}`}>{pay.amount.toLocaleString()}</span>
                                  <div className="flex space-x-1">
                                     <button 
                                      onClick={() => { setSelectedInvoice({...inv, tenant, lease}); setActiveReceiptTrxId(pay.id); setPreviewType('RECEIPT'); }} 
                                      className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                      title="Generate Payment Receipt"
                                     >
                                        <i className="fas fa-file-invoice-dollar text-xs"></i>
                                     </button>
                                     {canModifyPayments && (
                                       <>
                                          <button onClick={() => toggleHoldPayment(pay.id)} className={`p-2 rounded-lg transition-all ${pay.isHeld ? 'bg-amber-600 text-white' : 'text-slate-300 hover:text-amber-500'}`}>
                                             <i className="fas fa-hand-holding-dollar text-xs"></i>
                                          </button>
                                          <button onClick={() => handleDeletePaymentBtn(pay.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><i className="fas fa-trash-alt text-xs"></i></button>
                                       </>
                                     )}
                                  </div>
                               </div>
                            </div>
                         );
                      })}
                      {payments.filter(p => p.invoiceId === managingPaymentsInvoiceId).length === 0 && !isApiSimulating && (
                        <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                           <p className="text-xs font-bold text-slate-300 uppercase tracking-widest italic">No payments matched</p>
                        </div>
                      )}
                    </div>
                 </div>

                 <div className="bg-slate-900 rounded-[2rem] p-8 text-white space-y-6 h-fit lg:sticky lg:top-0">
                    <div className="flex items-center space-x-3 mb-4">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                       <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400">Yield Engine Monitor</h4>
                    </div>
                    <div className="space-y-4 font-mono text-[10px]">
                       <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
                          <p className="text-slate-500 uppercase font-bold text-[8px] tracking-widest">Incoming Routing Context</p>
                          <p className="flex items-start"><span className="text-indigo-400 mr-2">&gt;</span> Account No: {tenants.find(t => t.id === leases.find(l => l.id === invoices.find(i => i.id === managingPaymentsInvoiceId)?.leaseId)?.tenantId)?.paymentCode || 'LISTENING...'}</p>
                          <p className="flex items-start"><span className="text-emerald-400 mr-2">&gt;</span> Status: Port 8080 Active</p>
                       </div>
                       
                       <div className="space-y-2 mt-4">
                          {apiLogs.map((log, i) => (
                            <p key={i} className={`flex items-start animate-in slide-in-from-left-2 duration-300 ${log.type === 'success' ? 'text-emerald-400' : log.type === 'err' ? 'text-rose-400' : 'text-slate-400 opacity-70'}`}>
                               <span className="mr-2">&gt;</span> {log.msg}
                            </p>
                          ))}
                       </div>
                    </div>
                    <div className="pt-6 border-t border-white/10">
                       <p className="text-[9px] font-black uppercase text-slate-500 mb-4 tracking-widest">Workflow Integrity</p>
                       <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                          <p className="text-[10px] font-bold text-emerald-300 leading-relaxed italic">
                             Incoming funds are automatically pushed to the Landlord's verified pool. This maintains financial synchronicity across the portal.
                          </p>
                       </div>
                    </div>
                 </div>
              </div>

              <button onClick={() => setManagingPaymentsInvoiceId(null)} className="mt-8 w-full py-5 border border-slate-100 text-slate-300 font-black uppercase text-[11px] tracking-widest rounded-2xl hover:text-slate-600 transition-colors shrink-0">Return to Billing Ledger</button>
           </div>
        </div>
      )}

      {selectedInvoice && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0f172a]/95 backdrop-blur-md" onClick={() => setSelectedInvoice(null)}></div>
          <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 relative shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-black text-[#0f172a] mb-6 uppercase tracking-tight">{previewType === 'INVOICE' ? 'Ledger Artifact' : 'Payment Artifact'}</h3>
            <div className="bg-slate-50 p-6 rounded-2xl space-y-4 mb-8">
               <div className="flex justify-between text-xs font-bold uppercase"><span className="text-slate-400">Status</span><span className={getStatusColor(selectedInvoice.status)}>{selectedInvoice.status}</span></div>
               <div className="flex justify-between text-xs font-bold uppercase"><span className="text-slate-400">Carried Balance</span><span className={selectedInvoice.overdueAmount < 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatCurrency(selectedInvoice.overdueAmount || 0)}</span></div>
               <div className="flex justify-between text-xs font-bold uppercase border-t border-slate-200 pt-4"><span className="text-slate-900">Total Net Assessment</span><span className="text-slate-900 font-black">{formatCurrency(selectedInvoice.amount)}</span></div>
               {previewType === 'RECEIPT' && activeReceiptTrxId && (
                  <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <p className="text-[8px] font-black text-emerald-600 uppercase mb-1">Specific Payment Reference</p>
                    <p className="text-sm font-black text-slate-900">{payments.find(p => p.id === activeReceiptTrxId)?.reference}</p>
                    <p className="text-xs font-bold text-slate-500 mt-1">Amount: KES {payments.find(p => p.id === activeReceiptTrxId)?.amount.toLocaleString()}</p>
                  </div>
               )}
            </div>
            <button onClick={handleDownload} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-sm uppercase shadow-2xl flex items-center justify-center space-x-3 hover:bg-indigo-700 transition-all active:scale-95 mb-4">
               <i className="fas fa-file-download"></i><span>DOWNLOAD PDF {previewType}</span>
            </button>
            <button onClick={() => setSelectedInvoice(null)} className="w-full py-5 bg-[#0f172a] text-white rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 shadow-xl">Close Preview</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceCenter;
