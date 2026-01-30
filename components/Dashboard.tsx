
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Property, Unit, Invoice, Payment, InvoiceStatus } from '../types';

interface DashboardProps {
  userName: string;
  permissions: {
    export: boolean;
    add_property: boolean;
  };
  onAddProperty?: () => void;
  properties: Property[];
  units: Unit[];
  invoices: Invoice[];
  payments: Payment[];
}

const Dashboard: React.FC<DashboardProps> = ({ userName, permissions, onAddProperty, properties, units, invoices, payments }) => {
  // Financial KPIs calculated from live state
  const totalRent = invoices.reduce((acc, inv) => acc + inv.amount, 0);
  const collectedRent = invoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
  
  // Occupancy Logic: Only for properties marked as "Managed"
  const managedPropertyIds = properties.filter(p => p.isManaged).map(p => p.id);
  const managedUnits = units.filter(u => managedPropertyIds.includes(u.propertyId));
  const totalUnitsCount = managedUnits.length;
  const occupiedUnitsCount = managedUnits.filter(u => u.isOccupied).length;
  const occupancyRate = totalUnitsCount > 0 ? (occupiedUnitsCount / totalUnitsCount) * 100 : 0;
  
  const overdueCount = invoices.filter(i => i.status === InvoiceStatus.OVERDUE).length;

  // Real-time calculation of Collections over a 6-month span
  const collectionsTrendData = useMemo(() => {
    const trend = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = d.toLocaleString('default', { month: 'short' });
      const month = d.getMonth();
      const year = d.getFullYear();

      const monthlyCollections = payments
        .filter(p => p.status === 'Matched')
        .reduce((sum, p) => {
          const payDate = new Date(p.paidAt);
          if (payDate.getMonth() === month && payDate.getFullYear() === year) {
            return sum + p.amount;
          }
          return sum;
        }, 0);

      trend.push({ name: monthLabel, collections: monthlyCollections });
    }
    return trend;
  }, [payments]);

  const occupancyPie = [
    { name: 'Occupied', value: occupiedUnitsCount, color: '#4f46e5' },
    { name: 'Vacant', value: totalUnitsCount - occupiedUnitsCount, color: '#e2e8f0' },
  ];

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center space-x-5">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-indigo-100 shrink-0">
            {userName.charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Jambo, {userName}</h1>
            <p className="text-slate-500 text-sm md:text-base font-medium">Your portfolio is up to date.</p>
          </div>
        </div>
        <div className="flex space-x-3 w-full md:w-auto">
          {permissions.export && (
            <button className="flex-1 md:flex-none px-5 py-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95">
              <i className="fas fa-download mr-2 opacity-50"></i> Export
            </button>
          )}
          {permissions.add_property && (
            <button 
              onClick={onAddProperty}
              className="flex-1 md:flex-none px-5 py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
            >
              <i className="fas fa-plus mr-2"></i> New Property
            </button>
          )}
        </div>
      </header>

      {/* KPI Grid - Real figures linked to state */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card title="Expected Rent" value={`KES ${totalRent.toLocaleString()}`} icon="fa-wallet" color="text-emerald-600" bg="bg-emerald-50" />
        <Card title="Rent Collected" value={`KES ${collectedRent.toLocaleString()}`} icon="fa-coins" color="text-blue-600" bg="bg-blue-50" />
        <Card title="Occupancy" value={`${occupancyRate.toFixed(1)}%`} icon="fa-door-open" color="text-indigo-600" bg="bg-indigo-50" />
        <Card title="Overdue" value={overdueCount.toString()} icon="fa-clock" color="text-rose-600" bg="bg-rose-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collections Trend */}
        <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <h3 className="text-lg font-bold mb-8 text-slate-900 flex items-center">
            <i className="fas fa-chart-line mr-3 text-indigo-500"></i>
            Collections Trend
          </h3>
          <div className="h-64 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={collectionsTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} tickFormatter={(val) => `Ksh ${val/1000}k`} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
                  formatter={(value: any) => [`KES ${value.toLocaleString()}`, 'Collections']}
                />
                <Bar dataKey="collections" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Occupancy Chart */}
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-8 text-slate-900 flex items-center">
            <i className="fas fa-chart-pie mr-3 text-emerald-500"></i>
            Managed Units
          </h3>
          <div className="h-64 md:h-72 flex flex-col items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={occupancyPie}
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {occupancyPie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
             </ResponsiveContainer>
             <div className="mt-4 flex flex-col space-y-2 w-full px-4">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                    <span>Occupied</span>
                  </div>
                  <span className="text-slate-900">{occupiedUnitsCount} Units</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                    <span>Vacant</span>
                  </div>
                  <span className="text-slate-900">{totalUnitsCount - occupiedUnitsCount} Units</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Card: React.FC<{title: string, value: string, icon: string, color: string, bg: string}> = ({title, value, icon, color, bg}) => (
  <div className="bg-white p-6 md:p-7 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between group hover:border-indigo-100 transition-all active:scale-95">
    <div className="overflow-hidden">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 truncate">{title}</p>
      <h4 className="text-xl md:text-2xl font-black text-slate-900 truncate">{value}</h4>
    </div>
    <div className={`w-12 h-12 md:w-14 md:h-14 ${bg} ${color} rounded-2xl flex items-center justify-center text-lg md:text-xl transition-transform group-hover:scale-110 shrink-0 ml-4`}>
      <i className={`fas ${icon}`}></i>
    </div>
  </div>
);

export default Dashboard;
