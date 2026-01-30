
import React, { useState, useMemo } from 'react';
import { User, UserRole, RoleBlueprint } from '../types';

interface UserManagementProps {
  users: User[];
  engineeredRoles: RoleBlueprint[];
  onUpdateUser: (updatedUser: User) => void;
  onDeleteUser: (userId: string) => void;
  currentUserId: string;
  setActiveTab: (tabId: string) => void;
  view: 'active' | 'new' | 'archive';
}

const UserManagement: React.FC<UserManagementProps> = ({ users, engineeredRoles, onUpdateUser, onDeleteUser, currentUserId, setActiveTab, view }) => {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedPositionId, setSelectedPositionId] = useState<string>('');

  const filteredUsers = useMemo(() => {
    // Strictly filter out Landlords - this page is for Staff and Admin members only
    const nonLandlordUsers = users.filter(u => u.role !== UserRole.LANDLORD);

    return nonLandlordUsers.filter(user => {
      // FIX: Staff who are relieved of duties (role === null) but still VERIFIED 
      // must remain visible in the 'active' tab so they can be archived.
      if (view === 'active') return user.status === 'VERIFIED';
      if (view === 'new') return user.status === 'PENDING';
      if (view === 'archive') return user.status === 'TRASHED';
      return false;
    }).sort((a, b) => b.id.localeCompare(a.id));
  }, [users, view]);

  const pendingCount = useMemo(() => users.filter(u => u.status === 'PENDING' && u.role !== UserRole.LANDLORD).length, [users]);

  const handleToggleLock = (user: User) => {
    if (user.id === currentUserId) return;
    onUpdateUser({ ...user, isLocked: !user.isLocked });
  };

  const startEditing = (user: User) => {
    setEditingUserId(user.id);
    const matchingRole = engineeredRoles.find(r => r.jobDescription === user.jobDescription);
    setSelectedPositionId(matchingRole?.id || (user.role === UserRole.SUPER_ADMIN ? 'SYSTEM_SUPER_ADMIN' : ''));
  };

  const handleSaveEdit = (user: User) => {
    if (!selectedPositionId) {
      alert("System Protocol: You must assign an engineered role or reassign the user from their current position before proceeding.");
      return;
    }

    if (selectedPositionId === 'REASSIGN_DISCHARGE') {
      if (user.id === currentUserId) {
        alert("Security Protocol: You cannot reassign or discharge your own Super Admin role.");
        return;
      }
      if (window.confirm(`STAFF LEAVING: Are you sure you want to DISCHARGE ${user.name} from their duties? This strips all system access and role-based permissions.`)) {
        onUpdateUser({ 
          ...user, 
          role: null, 
          jobDescription: 'Relieved of all system duties.', 
          permissions: {},
          status: 'VERIFIED',
          isLocked: false
        });
        setEditingUserId(null);
        alert(`${user.name} has been discharged. You can now move the record to the archive via the box icon.`);
      }
      return;
    }

    if (selectedPositionId === 'SYSTEM_SUPER_ADMIN') {
      onUpdateUser({
        ...user,
        role: UserRole.SUPER_ADMIN,
        jobDescription: 'System owner with total security clearance.',
        status: 'VERIFIED',
        isLocked: false
      });
      setEditingUserId(null);
      return;
    }

    const pickedRole = engineeredRoles.find(r => r.id === selectedPositionId);
    if (pickedRole) {
      onUpdateUser({ 
        ...user, 
        role: UserRole.PROPERTY_MANAGER,
        jobDescription: pickedRole.jobDescription,
        status: 'VERIFIED',
        isLocked: false
      });
      setEditingUserId(null);
    }
  };

  const handleDeleteSignUp = (user: User) => {
    if (window.confirm(`REJECT REQUEST: Move ${user.name} to the Staff Archive? Access will be permanently denied.`)) {
      onUpdateUser({ 
        ...user, 
        status: 'TRASHED', 
        isLocked: true, 
        role: null,
        jobDescription: 'Registration rejected by Super Admin.' 
      });
    }
  };

  const handleArchive = (user: User) => {
    if (user.id === currentUserId) return;
    if (user.role) {
      alert(`Action Denied: According to the "Staff Leaving" protocol, ${user.name} must first be DISCHARGED from their duties via the Positioning dropdown before they can be archived.`);
      return;
    }
    if (window.confirm(`Moving ${user.name} to Staff Archive. They will lose all portal access immediately. Proceed?`)) {
      onUpdateUser({ ...user, status: 'TRASHED', isLocked: true });
    }
  };

  const handleRestore = (user: User) => {
    if (window.confirm(`Restore ${user.name} to Active Directory?`)) {
      onUpdateUser({ ...user, status: 'VERIFIED', isLocked: false });
    }
  };

  const handlePermanentDelete = (userId: string) => {
    if (window.confirm("CRITICAL ACTION: This will permanently purge this record from the database. This cannot be undone. Proceed?")) {
      onDeleteUser(userId);
    }
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
        <div>
          <div className="flex items-center space-x-3 text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] mb-3">
             <i className="fas fa-shield-halved"></i>
             <span>RELATIONSHIPS / {view === 'active' ? 'STAFF DIRECTORY' : view === 'new' ? 'PENDING ACCESS' : 'STAFF ARCHIVE'}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center flex-wrap gap-4">
            {view === 'active' ? 'Role Assigned' : view === 'new' ? 'New Requests' : 'Staff Archive'}
            {view === 'new' && pendingCount > 0 && (
              <span className="px-3 py-1 bg-indigo-600 text-white text-xs font-black rounded-full shadow-lg shadow-indigo-100">{pendingCount}</span>
            )}
          </h1>
          <p className="text-slate-500 font-medium max-w-lg mt-2 text-sm md:text-base">
            {view === 'active' ? 'Verified staff members. To archive a leaving member, they must first be discharged via reassign options.' : 
             view === 'new' ? `Review and approve pending staff. Job descriptions must be selected from engineered roles.` :
             'Historical records of former staff accounts or rejected registration requests.'}
          </p>
        </div>
        
        <div className="bg-white p-1 rounded-2xl border border-slate-200 flex overflow-x-auto no-scrollbar space-x-0.5 shadow-sm w-full xl:w-auto max-w-full">
           <button 
             onClick={() => setActiveTab('user-active')}
             className={`shrink-0 px-6 md:px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${view === 'active' ? 'bg-[#0f172a] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
           >
             Role Assigned
           </button>
           <button 
             onClick={() => setActiveTab('user-new')}
             className={`shrink-0 px-6 md:px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${view === 'new' ? 'bg-[#0f172a] text-white shadow-lg relative' : 'text-slate-400 hover:text-slate-600'}`}
           >
             New Requests
             {pendingCount > 0 && view !== 'new' && (
               <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full"></span>
             )}
           </button>
           <button 
             onClick={() => setActiveTab('archive_folder')}
             className={`shrink-0 px-6 md:px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${view === 'archive' ? 'bg-[#0f172a] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
           >
             Staff Archive
           </button>
        </div>
      </header>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50/30 border-b border-slate-50 text-left">
            <tr>
              <th className="py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee Info</th>
              <th className="py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Assigned Role</th>
              <th className="py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Security Status</th>
              <th className="py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs italic">
                  No staff records found in this directory.
                </td>
              </tr>
            ) : filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="py-6 px-10">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black transition-all ${user.status === 'TRASHED' ? 'bg-slate-100 text-slate-400' : user.isLocked ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-600'}`}>
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className={`font-black text-slate-900 ${user.isLocked ? 'opacity-40' : ''}`}>{user.name}</p>
                      <p className="text-xs text-slate-400 font-medium">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-6 px-10 text-center">
                  <div className="flex flex-col items-center">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-lg border uppercase tracking-widest ${user.role ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse'}`}>
                      {user.role === UserRole.SUPER_ADMIN ? 'SUPER ADMIN' : (engineeredRoles.find(r => r.jobDescription === user.jobDescription)?.roleName || (user.status === 'VERIFIED' && !user.role ? 'RELIEVED OF DUTIES' : 'PENDING ROLE'))}
                    </span>
                    {user.jobDescription && <span className="text-[9px] text-slate-400 font-medium max-w-[150px] truncate mt-1" title={user.jobDescription}>{user.jobDescription}</span>}
                  </div>
                </td>
                <td className="py-6 px-10 text-center">
                  {view === 'active' ? (
                     <button onClick={() => handleToggleLock(user)} disabled={user.id === currentUserId} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${user.id === currentUserId ? 'opacity-20 cursor-not-allowed' : user.isLocked ? 'bg-rose-500 text-white border-rose-600 shadow-lg' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                        <i className={`fas ${user.isLocked ? 'fa-lock' : 'fa-lock-open'} mr-2`}></i>
                        {user.isLocked ? 'Locked' : 'Active'}
                     </button>
                  ) : (
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${user.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-600' : user.status === 'PENDING' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                      {user.status}
                    </span>
                  )}
                </td>
                <td className="py-6 px-10 text-center">
                  <div className="flex justify-center space-x-2">
                    {view === 'active' && (
                      <div className="flex items-center space-x-2">
                        {user.role ? (
                          <button 
                            onClick={() => startEditing(user)}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                          >
                             Edit Positioning
                          </button>
                        ) : (
                          <div className="flex items-center space-x-2">
                             <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest mr-2 animate-pulse">Discharged</span>
                             <button 
                               onClick={() => handleArchive(user)} 
                               className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                               title="Archive Staff"
                             >
                                <i className="fas fa-box-archive text-xs"></i>
                             </button>
                          </div>
                        )}
                      </div>
                    )}
                    {view === 'new' && (
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => startEditing(user)} 
                          className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all active:scale-95"
                        >
                           Approve
                        </button>
                        <button 
                          onClick={() => handleDeleteSignUp(user)}
                          className="px-6 py-2.5 bg-white border border-slate-200 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:text-rose-500 hover:border-rose-100 transition-all active:scale-95"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {view === 'archive' && (
                      <>
                        <button onClick={() => handleRestore(user)} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><i className="fas fa-rotate-left text-xs"></i></button>
                        <button onClick={() => handlePermanentDelete(user.id)} className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"><i className="fas fa-trash-can text-xs"></i></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Editing Modal */}
      {editingUserId && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0f172a]/90 backdrop-blur-sm" onClick={() => setEditingUserId(null)}></div>
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 relative shadow-2xl animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-start mb-8">
                <div>
                   <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Protocol Assignment</h3>
                   <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Staff Access Verification</p>
                </div>
                <button onClick={() => setEditingUserId(null)} className="text-slate-300 hover:text-rose-500 transition-colors">
                   <i className="fas fa-times text-lg"></i>
                </button>
             </div>
             
             <div className="space-y-6">
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Engineered Role Specification</label>
                   <select 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-xs focus:ring-4 focus:ring-indigo-500/10 transition-all"
                      value={selectedPositionId}
                      onChange={(e) => setSelectedPositionId(e.target.value)}
                   >
                      <option value="">-- Choose Position --</option>
                      <option value="SYSTEM_SUPER_ADMIN">System Super Admin (Level 5)</option>
                      {engineeredRoles.map(role => (
                        <option key={role.id} value={role.id}>{role.roleName}</option>
                      ))}
                      <option value="REASSIGN_DISCHARGE" className="text-rose-500 font-bold">--- REASSIGN & DISCHARGE ---</option>
                   </select>
                </div>
                
                <div className={`p-4 rounded-2xl border transition-colors ${selectedPositionId === 'REASSIGN_DISCHARGE' ? 'bg-rose-50 border-rose-100' : 'bg-indigo-50 border-indigo-100'}`}>
                   <p className={`text-[10px] font-bold leading-relaxed ${selectedPositionId === 'REASSIGN_DISCHARGE' ? 'text-rose-700' : 'text-indigo-700'}`}>
                      {selectedPositionId === 'REASSIGN_DISCHARGE' 
                        ? 'CRITICAL PROTOCOL: Proceeding will strip all current duties. The user will lose dashboard access but remain in directory for archival.'
                        : 'Security Protocol: Assigning a role authorizes the user to access specific system modules as defined in the Role Architect.'}
                   </p>
                </div>

                <button 
                  onClick={() => handleSaveEdit(users.find(u => u.id === editingUserId)!)}
                  className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 ${selectedPositionId === 'REASSIGN_DISCHARGE' ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-[#0f172a] text-white hover:bg-emerald-600'}`}
                >
                  {selectedPositionId === 'REASSIGN_DISCHARGE' ? 'Discharge from Duties' : 'Commit Authorization'}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
