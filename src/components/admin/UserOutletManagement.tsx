import React, { useState, useEffect } from 'react';
import { Area, Outlet, User } from '../../types';
import { StorageService } from '../../lib/storage';
import * as XLSX from 'xlsx';
import {
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Save,
  Check,
  UserPlus,
  RotateCcw,
  Building,
  Target,
  KeyRound,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Filter,
  UserCheck,
  AlertTriangle,
  FileSpreadsheet,
  Download,
} from 'lucide-react';

interface UserOutletManagementProps {
  currentUser: User | null;
  onSessionReset: () => void;
}

export const UserOutletManagement: React.FC<UserOutletManagementProps> = ({
  currentUser,
  onSessionReset,
}) => {
  const [areas, setAreas] = useState<Area[]>(() => StorageService.getAreas());
  const [outlets, setOutlets] = useState<Outlet[]>(() => StorageService.getOutlets());
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsersList());

  useEffect(() => {
    const handleStorageUpdate = (e: any) => {
      const type = e?.detail?.type;
      if (!type || type === 'outlets' || type === 'areas' || type === 'users' || type === 'all-reset') {
        setAreas(StorageService.getAreas());
        setOutlets(StorageService.getOutlets());
        setUsers(StorageService.getUsersList());
      }
    };
    window.addEventListener('cinema-xxi-storage-update', handleStorageUpdate);
    return () => window.removeEventListener('cinema-xxi-storage-update', handleStorageUpdate);
  }, []);

  // Edit Target Head and UMR state
  const [editingOutletId, setEditingOutletId] = useState<string | null>(null);
  const [tempTargetHead, setTempTargetHead] = useState<number>(0);
  const [tempUmr, setTempUmr] = useState<number>(4800000);

  // New Outlet Form
  const [newOutletName, setNewOutletName] = useState('');
  const [newOutletAreaId, setNewOutletAreaId] = useState(areas[0]?.id || '');
  const [newOutletTargetHead, setNewOutletTargetHead] = useState<number>(25000);
  const [newOutletUmr, setNewOutletUmr] = useState<number>(4800000);

  // New Area Form
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaTarget, setNewAreaTarget] = useState<number>(25000);

  // New User Form (Multi-role: admin, area_manager, manager, cleaner)
  const [newUsername, setNewUsername] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'area_manager' | 'manager' | 'cleaner'>('manager');
  const [newUserOutletId, setNewUserOutletId] = useState(outlets[0]?.id || '');
  const [newUserAreaId, setNewUserAreaId] = useState(areas[0]?.id || '');
  const [newUserAreaIds, setNewUserAreaIds] = useState<string[]>(() => areas.map((a) => a.id));
  const [newUserPassword, setNewUserPassword] = useState('admin123');

  // User Role Filter State
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'admin' | 'area_manager' | 'manager' | 'cleaner'>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Reset Password State
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('admin123');

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'area_manager' | 'manager' | 'cleaner'>('manager');
  const [editOutletId, setEditOutletId] = useState('');
  const [editAreaId, setEditAreaId] = useState('');
  const [editAreaIds, setEditAreaIds] = useState<string[]>([]);
  const [editPassword, setEditPassword] = useState('');

  // Delete User Modal State
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Reset to Default Users Modal State
  const [showResetUsersModal, setShowResetUsersModal] = useState(false);

  const [notification, setNotification] = useState('');

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  // Handle Edit Target Head
  const handleStartEditTarget = (outlet: Outlet) => {
    setEditingOutletId(outlet.id);
    setTempTargetHead(outlet.targetHead);
    setTempUmr(outlet.umr || 4800000);
  };

  const handleSaveTargetHead = (outlet: Outlet) => {
    const updated: Outlet = {
      ...outlet,
      targetHead: tempTargetHead,
      umr: tempUmr,
    };
    const newList = StorageService.saveOutlet(updated);
    setOutlets(newList);
    setEditingOutletId(null);
    showToast(`Target & UMR ${outlet.name} berhasil diperbarui!`);
  };

  // Handle Add Outlet
  const handleAddOutlet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOutletName.trim()) return;

    const id = newOutletName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-xxi';
    const newOutlet: Outlet = {
      id,
      name: newOutletName.toUpperCase().includes('XXI')
        ? newOutletName.toUpperCase()
        : `${newOutletName.toUpperCase()} XXI`,
      areaId: newOutletAreaId,
      targetHead: Number(newOutletTargetHead) || 0,
      umr: Number(newOutletUmr) || 4800000,
      class: 'B',
      studios: [
        { name: 'Studio 1', capacity: 200 },
        { name: 'Studio 2', capacity: 180 },
        { name: 'Studio 3', capacity: 150 },
      ],
    };

    const updated = StorageService.saveOutlet(newOutlet);
    setOutlets(updated);
    setNewOutletName('');
    showToast(`Outlet baru ${newOutlet.name} berhasil ditambahkan!`);
  };

  // Handle Add Area
  const handleAddArea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;

    const id = 'area-' + newAreaName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newArea: Area = {
      id,
      name: newAreaName.toUpperCase(),
      targetArea: Number(newAreaTarget) || 25000,
    };

    const updated = StorageService.saveArea(newArea);
    setAreas(updated);
    setNewAreaName('');
    showToast(`Wilayah ${newArea.name} berhasil ditambahkan!`);
  };

  // Handle Add User
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    const targetOutlet = outlets.find((o) => o.id === newUserOutletId);
    const targetArea = areas.find((a) => a.id === newUserAreaId);

    let assignedOutletId: string | undefined = undefined;
    let assignedAreaId: string | undefined = undefined;
    let assignedAreasList: string[] | undefined = undefined;

    if (newUserRole === 'manager' || newUserRole === 'cleaner') {
      assignedOutletId = newUserOutletId;
      assignedAreaId = targetOutlet?.areaId;
    } else if (newUserRole === 'area_manager') {
      assignedAreasList = newUserAreaIds.length > 0 ? newUserAreaIds : [areas[0]?.id].filter(Boolean);
      assignedAreaId = assignedAreasList[0];
    }

    const newUser: User = {
      id: `user-${newUsername.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      username: newUsername.toLowerCase().trim(),
      name: newUserName.trim() || `${getRoleLabel(newUserRole)} ${targetOutlet?.name || targetArea?.name || ''}`,
      role: newUserRole,
      outletId: assignedOutletId,
      areaId: assignedAreaId,
      assignedAreas: assignedAreasList,
      password: newUserPassword.trim() || 'admin123',
      isActive: true,
    };

    const updated = StorageService.saveUser(newUser);
    setUsers(updated);
    setNewUsername('');
    setNewUserName('');
    setNewUserPassword('admin123');
    showToast(`Akun ${getRoleLabel(newUserRole)} (${newUser.username}) berhasil dibuat!`);
  };

  // Open Edit User Modal
  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditName(user.name);
    setEditRole(user.role);
    setEditOutletId(user.outletId || outlets[0]?.id || '');
    setEditAreaId(user.areaId || areas[0]?.id || '');
    setEditAreaIds(
      user.assignedAreas && user.assignedAreas.length > 0
        ? user.assignedAreas
        : user.areaId
        ? [user.areaId]
        : areas.map((a) => a.id)
    );
    setEditPassword(user.password || '');
  };

  // Handle Save Edit User
  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editUsername.trim()) return;

    const targetOutlet = outlets.find((o) => o.id === editOutletId);
    const targetArea = areas.find((a) => a.id === editAreaId);

    let assignedOutletId: string | undefined = undefined;
    let assignedAreaId: string | undefined = undefined;
    let assignedAreasList: string[] | undefined = undefined;

    if (editRole === 'manager' || editRole === 'cleaner') {
      assignedOutletId = editOutletId;
      assignedAreaId = targetOutlet?.areaId;
    } else if (editRole === 'area_manager') {
      assignedAreasList = editAreaIds.length > 0 ? editAreaIds : [areas[0]?.id].filter(Boolean);
      assignedAreaId = assignedAreasList[0];
    }

    const updatedUser: User = {
      ...editingUser,
      username: editUsername.toLowerCase().trim(),
      name: editName.trim(),
      role: editRole,
      outletId: assignedOutletId,
      areaId: assignedAreaId,
      assignedAreas: assignedAreasList,
      password: editPassword.trim() ? editPassword.trim() : editingUser.password,
    };

    const updatedList = StorageService.saveUser(updatedUser);
    setUsers(updatedList);
    setEditingUser(null);
    showToast(`Data user "${updatedUser.username}" berhasil diperbarui!`);
  };

  // Handle Reset User Password
  const handleSaveResetPassword = (user: User) => {
    const updatedUser: User = {
      ...user,
      password: newPasswordVal || 'admin123',
    };
    const updatedList = StorageService.saveUser(updatedUser);
    setUsers(updatedList);
    setResettingUserId(null);
    showToast(`Password untuk user ${user.username} berhasil direset!`);
  };

  // Handle Confirm Delete User
  const handleConfirmDeleteUser = () => {
    if (!deletingUser) return;
    if (deletingUser.username === 'admin' || deletingUser.id === currentUser?.id) {
      showToast('Tidak dapat menghapus akun admin utama atau akun sendiri!');
      setDeletingUser(null);
      return;
    }
    const updatedList = StorageService.deleteUser(deletingUser.id);
    setUsers(updatedList);
    showToast(`User "${deletingUser.username}" berhasil dihapus dari sistem.`);
    setDeletingUser(null);
  };

  // Handle Reset / Sync to Standard Users (48 Users, No Duplicates)
  const handleResetToDefaultUsers = () => {
    const cleanList = StorageService.resetUsersToDefault();
    setUsers(cleanList);
    setShowResetUsersModal(false);
    showToast('Berhasil disinkronkan! Daftar 48 akun pengguna standar telah diperbarui tanpa duplikat.');
  };

  // Handle Export Users to XLSX
  const handleExportUsersToXlsx = (roleType?: 'manager' | 'cleaner' | 'all') => {
    let targetList = users;
    if (roleType === 'manager') {
      targetList = users.filter((u) => u.role === 'manager');
    } else if (roleType === 'cleaner') {
      targetList = users.filter((u) => u.role === 'cleaner');
    }

    if (targetList.length === 0) {
      showToast('Tidak ada data user untuk di-export.');
      return;
    }

    // Format data for sheet
    const dataToExport = targetList.map((u, idx) => {
      const assignedOutlet = outlets.find((o) => o.id === u.outletId);
      const assignedArea = areas.find((a) => a.id === u.areaId);

      let scopeText = 'Semua Outlet & Area (Full Admin)';
      let areaText = '-';

      if (u.role === 'area_manager') {
        const uAreas = u.assignedAreas && u.assignedAreas.length > 0
          ? u.assignedAreas
          : (u.areaId ? [u.areaId] : []);
        const areaNames = uAreas.map((id) => areas.find((a) => a.id === id)?.name || id);
        scopeText = areaNames.length > 0 ? areaNames.join(' + ') : 'Seluruh Area';
        areaText = areaNames.length > 0 ? areaNames.join(', ') : 'Seluruh Area';
      } else if (u.role === 'manager' || u.role === 'cleaner') {
        scopeText = assignedOutlet?.name || u.outletId || '-';
        areaText = assignedArea?.name || '-';
      }

      return {
        'NO': idx + 1,
        'USERNAME (LOGIN)': u.username,
        'NAMA PENGGUNA': u.name,
        'ROLE / PERAN': getRoleLabel(u.role),
        'OUTLET PENUGASAN': scopeText,
        'AREA WILAYAH': areaText,
        'KATA SANDI / PASSWORD': u.password || 'admin123',
        'STATUS AKUN': u.isActive ? 'Aktif' : 'Non-Aktif',
      };
    });

    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 6 },  // NO
      { wch: 32 }, // USERNAME
      { wch: 40 }, // NAMA PENGGUNA
      { wch: 22 }, // ROLE
      { wch: 42 }, // OUTLET
      { wch: 30 }, // AREA
      { wch: 22 }, // PASSWORD
      { wch: 12 }, // STATUS
    ];

    const workbook = XLSX.utils.book_new();
    const sheetTitle = roleType === 'manager' ? 'User Manager' : roleType === 'cleaner' ? 'User Cleaner' : 'Daftar User XXI';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle);

    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `Cinema_XXI_User_List_${roleType ? roleType.toUpperCase() : 'SEMUA'}_${timestamp}.xlsx`;

    XLSX.writeFile(workbook, fileName);
    showToast(`File Excel ${fileName} berhasil diunduh!`);
  };

  function getRoleLabel(role: string) {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'area_manager':
        return 'Area Manager';
      case 'manager':
        return 'Manager Outlet';
      case 'cleaner':
        return 'Cleaner (Toilet)';
      default:
        return role;
    }
  }

  function getRoleBadgeClass(role: string) {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'area_manager':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'manager':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'cleaner':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  }

  // Filter users by role and search query
  const filteredUsers = users.filter((u) => {
    const matchesRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;
    const matchesQuery =
      u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearchQuery.toLowerCase());
    return matchesRole && matchesQuery;
  });

  // Count per role
  const countAdmin = users.filter((u) => u.role === 'admin').length;
  const countAreaManager = users.filter((u) => u.role === 'area_manager').length;
  const countManager = users.filter((u) => u.role === 'manager').length;
  const countCleaner = users.filter((u) => u.role === 'cleaner').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl border border-amber-200/90 bg-white text-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold uppercase tracking-tight text-slate-900">
              Kelola User, Access Control &amp; Outlet XXI
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Hak akses penuh Administrator Cinema XXI — Atur role Area Manager, Manager Outlet, dan Cleaner, edit akun &amp; kata sandi, dan kelola target cabang.
          </p>
        </div>

        <button
          onClick={onSessionReset}
          className="px-4 py-2 rounded-xl text-xs font-bold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 flex items-center space-x-1.5 transition cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset Session Login</span>
        </button>
      </div>

      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{notification}</span>
        </div>
      )}

      {/* Grid: Add Area, Add Outlet, Add User */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Tambah Area */}
        <div className="p-5 rounded-3xl border border-slate-200/90 bg-white shadow-xs">
          <h3 className="font-extrabold text-sm uppercase text-amber-800 flex items-center space-x-2 mb-3">
            <Building className="w-4 h-4 text-amber-600" />
            <span>Tambah Area Baru</span>
          </h3>

          <form onSubmit={handleAddArea} className="space-y-3 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                NAMA AREA WILAYAH
              </label>
              <input
                type="text"
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                placeholder="Contoh: AREA BOGOR 3"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#faf9f6] text-slate-800 font-semibold focus:border-amber-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                TARGET SPH AREA (RP)
              </label>
              <input
                type="number"
                value={newAreaTarget}
                onChange={(e) => setNewAreaTarget(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#faf9f6] text-slate-800 font-semibold focus:border-amber-400 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center space-x-1.5 transition mt-2 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Simpan Area</span>
            </button>
          </form>
        </div>

        {/* Card 2: Tambah Outlet */}
        <div className="p-5 rounded-3xl border border-slate-200/90 bg-white shadow-xs">
          <h3 className="font-extrabold text-sm uppercase text-emerald-800 flex items-center space-x-2 mb-3">
            <Building className="w-4 h-4 text-emerald-600" />
            <span>Tambah Outlet Baru</span>
          </h3>

          <form onSubmit={handleAddOutlet} className="space-y-3 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                NAMA OUTLET BIOSKOP
              </label>
              <input
                type="text"
                value={newOutletName}
                onChange={(e) => setNewOutletName(e.target.value)}
                placeholder="Contoh: CAFE BOGOR VALLEY XXI"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#faf9f6] text-slate-800 font-semibold focus:border-amber-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                AREA WILAYAH
              </label>
              <select
                value={newOutletAreaId}
                onChange={(e) => setNewOutletAreaId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#faf9f6] text-slate-800 font-semibold focus:border-amber-400 focus:bg-white"
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                TARGET SPH / HEAD (RP)
              </label>
              <input
                type="number"
                value={newOutletTargetHead}
                onChange={(e) => setNewOutletTargetHead(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#faf9f6] text-slate-800 font-semibold focus:border-amber-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                DATABASE UMR OUTLET (RP)
              </label>
              <input
                type="number"
                value={newOutletUmr}
                onChange={(e) => setNewOutletUmr(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#faf9f6] text-slate-800 font-semibold focus:border-amber-400 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center space-x-1.5 transition mt-2 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Simpan Outlet</span>
            </button>
          </form>
        </div>

        {/* Card 3: Tambah User */}
        <div className="p-5 rounded-3xl border border-slate-200/90 bg-white shadow-xs">
          <h3 className="font-extrabold text-sm uppercase text-slate-800 flex items-center space-x-2 mb-3">
            <UserPlus className="w-4 h-4 text-purple-600" />
            <span>Tambah User &amp; Hak Akses</span>
          </h3>

          <form onSubmit={handleAddUser} className="space-y-3 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                ROLE / PERAN AKSES
              </label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#faf9f6] text-slate-800 font-semibold focus:border-purple-500 focus:bg-white"
              >
                <option value="manager">Manager (Akses Per Outlet)</option>
                <option value="area_manager">Area Manager (Akses Per Area)</option>
                <option value="cleaner">Cleaner (Akses Card Inspection)</option>
                <option value="admin">Administrator (Akses Penuh System)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                USERNAME (LOGIN)
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Contoh: am_bogor1 / cleaner_margo"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#faf9f6] text-slate-800 font-semibold focus:border-purple-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                NAMA LENGKAP PENGGUNA
              </label>
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Contoh: Ahmad Subagja (AM)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#faf9f6] text-slate-800 font-semibold focus:border-purple-500 focus:bg-white"
              />
            </div>

            {/* Scope selection depends on Role */}
            {newUserRole === 'area_manager' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-blue-700 uppercase">
                    AREA WILAYAH PENUGASAN (PILIH BANYAK)
                  </label>
                  <div className="flex items-center space-x-1.5 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setNewUserAreaIds(areas.map((a) => a.id))}
                      className="text-blue-600 hover:underline cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setNewUserAreaIds([])}
                      className="text-slate-500 hover:underline cursor-pointer"
                    >
                      Hapus Semua
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5 p-2.5 rounded-xl border border-blue-200 bg-blue-50/40 max-h-40 overflow-y-auto">
                  {areas.map((a) => {
                    const isChecked = newUserAreaIds.includes(a.id);
                    return (
                      <label
                        key={a.id}
                        className="flex items-center space-x-2 text-xs font-bold text-blue-900 cursor-pointer select-none hover:bg-blue-100/50 p-1 rounded-lg transition"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewUserAreaIds([...newUserAreaIds, a.id]);
                            } else {
                              setNewUserAreaIds(newUserAreaIds.filter((id) => id !== a.id));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded border-blue-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span>{a.name}</span>
                      </label>
                    );
                  })}
                </div>
                {newUserAreaIds.length === 0 && (
                  <p className="text-[10px] text-amber-600 font-bold mt-1">
                    ⚠️ Pilih minimal 1 wilayah penugasan
                  </p>
                )}
              </div>
            )}

            {(newUserRole === 'manager' || newUserRole === 'cleaner') && (
              <div>
                <label className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">
                  OUTLET PENUGASAN
                </label>
                <select
                  value={newUserOutletId}
                  onChange={(e) => setNewUserOutletId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50/50 text-emerald-900 font-bold focus:border-emerald-500 focus:bg-white"
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                KATA SANDI / PASSWORD
              </label>
              <input
                type="text"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Default: admin123"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#faf9f6] text-slate-800 font-semibold focus:border-purple-500 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl font-bold bg-purple-700 hover:bg-purple-600 text-white flex items-center justify-center space-x-1.5 transition mt-2 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Akun User</span>
            </button>
          </form>
        </div>
      </div>

      {/* Users Management Table */}
      <div className="p-6 rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
              <Users className="w-4 h-4" />
            </span>
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
              Daftar Pengguna Sistem &amp; Hak Akses
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* EXCEL DOWNLOAD BUTTONS */}
            <div className="flex items-center gap-1.5 bg-emerald-50/80 p-1 rounded-2xl border border-emerald-200">
              <button
                onClick={() => handleExportUsersToXlsx('all')}
                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
                title="Download seluruh data user ke file Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export XLS (Semua)</span>
              </button>
              
              <button
                onClick={() => handleExportUsersToXlsx('manager')}
                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center space-x-1 transition cursor-pointer"
                title="Download khusus User Manager ke Excel (.xlsx)"
              >
                <Download className="w-3 h-3 text-emerald-700" />
                <span>XLS Manager</span>
              </button>

              <button
                onClick={() => handleExportUsersToXlsx('cleaner')}
                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center space-x-1 transition cursor-pointer"
                title="Download khusus User Cleaner ke Excel (.xlsx)"
              >
                <Download className="w-3 h-3 text-amber-700" />
                <span>XLS Cleaner</span>
              </button>
            </div>

            {/* SINKRONKAN / BERSIHKAN DUPLIKAT BUTTON */}
            <button
              onClick={() => setShowResetUsersModal(true)}
              className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
              title="Sinkronkan daftar 48 user standar sesuai gambar (bersihkan semua duplikat)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Sinkronkan User Standar</span>
            </button>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Cari user / nama..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs font-medium focus:bg-white focus:border-purple-400"
              />
            </div>
            <span className="text-xs font-bold text-purple-900 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-full whitespace-nowrap">
              Total: {filteredUsers.length} / {users.length} Akun
            </span>
          </div>
        </div>

        {/* ROLE FILTER TABS */}
        <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" /> Filter Role:
          </span>

          <button
            onClick={() => setSelectedRoleFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              selectedRoleFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>Semua Role</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedRoleFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedRoleFilter('admin')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              selectedRoleFilter === 'admin'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
            }`}
          >
            <span>Administrator</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedRoleFilter === 'admin' ? 'bg-purple-900 text-white' : 'bg-purple-200 text-purple-900'}`}>
              {countAdmin}
            </span>
          </button>

          <button
            onClick={() => setSelectedRoleFilter('area_manager')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              selectedRoleFilter === 'area_manager'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
            }`}
          >
            <span>Area Manager</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedRoleFilter === 'area_manager' ? 'bg-blue-800 text-white' : 'bg-blue-200 text-blue-900'}`}>
              {countAreaManager}
            </span>
          </button>

          <button
            onClick={() => setSelectedRoleFilter('manager')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              selectedRoleFilter === 'manager'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <span>Manager Outlet</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedRoleFilter === 'manager' ? 'bg-emerald-800 text-white' : 'bg-emerald-200 text-emerald-900'}`}>
              {countManager}
            </span>
          </button>

          <button
            onClick={() => setSelectedRoleFilter('cleaner')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              selectedRoleFilter === 'cleaner'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <span>Cleaner (Inspection)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedRoleFilter === 'cleaner' ? 'bg-amber-800 text-white' : 'bg-amber-200 text-amber-900'}`}>
              {countCleaner}
            </span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="uppercase text-[10px] font-extrabold bg-purple-50/60 border-b border-purple-200/70 text-slate-700">
              <tr>
                <th className="py-3 px-3">NO</th>
                <th className="py-3 px-3">USERNAME</th>
                <th className="py-3 px-3">NAMA PENGGUNA</th>
                <th className="py-3 px-3">ROLE / PERAN</th>
                <th className="py-3 px-3">AKSES PENUGASAN</th>
                <th className="py-3 px-3 text-center">KATA SANDI</th>
                <th className="py-3 px-3 text-center">STATUS</th>
                <th className="py-3 px-3 text-center">AKSI AKUN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                    Tidak ditemukan user untuk filter role / pencarian ini.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, index) => {
                  const assignedOutlet = outlets.find((o) => o.id === u.outletId);
                  const assignedArea = areas.find((a) => a.id === u.areaId);
                  const isResetting = resettingUserId === u.id;

                  let scopeText = 'Semua Outlet & Area (Full)';
                  if (u.role === 'area_manager') {
                    const uAreas = u.assignedAreas && u.assignedAreas.length > 0
                      ? u.assignedAreas
                      : (u.areaId ? [u.areaId] : []);
                    const areaNames = uAreas.map((id) => areas.find((a) => a.id === id)?.name || id);
                    if (areaNames.length === 0) {
                      scopeText = 'Seluruh Area';
                    } else if (areaNames.length === areas.length) {
                      scopeText = `Seluruh Wilayah (${areas.length} Area)`;
                    } else {
                      scopeText = `Area (${areaNames.length}): ${areaNames.join(' + ')}`;
                    }
                  } else if (u.role === 'manager' || u.role === 'cleaner') {
                    scopeText = `Outlet: ${assignedOutlet?.name || u.outletId || '-'}`;
                  }

                  return (
                    <tr key={u.id} className="hover:bg-purple-50/20 transition text-slate-800">
                      <td className="py-3 px-3 font-bold text-slate-400">{index + 1}</td>
                      <td className="py-3 px-3 font-bold text-purple-950 font-mono">{u.username}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{u.name}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getRoleBadgeClass(
                            u.role
                          )}`}
                        >
                          {getRoleLabel(u.role)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-semibold">{scopeText}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-md font-mono font-bold text-[11px] bg-purple-50 text-purple-900 border border-purple-200">
                          {u.password || 'admin123'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Aktif</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isResetting ? (
                          <div className="flex items-center justify-center space-x-1.5">
                            <input
                              type="text"
                              value={newPasswordVal}
                              onChange={(e) => setNewPasswordVal(e.target.value)}
                              placeholder="Pass Baru"
                              className="w-24 px-2 py-1 rounded-lg border border-purple-400 text-xs font-bold bg-white"
                            />
                            <button
                              onClick={() => handleSaveResetPassword(u)}
                              className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                              title="Simpan Password"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setResettingUserId(null)}
                              className="p-1.5 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
                              title="Batal"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* Edit User Button */}
                            <button
                              onClick={() => handleOpenEditUser(u)}
                              className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold inline-flex items-center space-x-1 transition cursor-pointer"
                              title="Edit Username, Role & Password"
                            >
                              <Edit2 className="w-3 h-3 text-amber-600" />
                              <span>Edit</span>
                            </button>

                            {/* Reset Password Quick Button */}
                            <button
                              onClick={() => {
                                setResettingUserId(u.id);
                                setNewPasswordVal('admin123');
                              }}
                              className="px-2 py-1 rounded-lg border border-purple-200 bg-purple-50 text-purple-900 hover:bg-purple-100 text-[11px] font-bold inline-flex items-center space-x-1 transition cursor-pointer"
                              title="Reset Password Cepat"
                            >
                              <KeyRound className="w-3 h-3 text-purple-700" />
                              <span>Reset Pass</span>
                            </button>

                            {u.username !== 'admin' && u.id !== currentUser?.id && (
                              <button
                                onClick={() => setDeletingUser(u)}
                                className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                                title="Hapus Akun User"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDIT USER */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-slate-800 relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
                  <UserCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm uppercase text-slate-900">
                    Edit Akun Pengguna
                  </h3>
                  <p className="text-[11px] text-slate-500">ID: {editingUser.id}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  USERNAME (LOGIN)
                </label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#faf9f6] text-slate-900 font-bold focus:border-purple-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  NAMA LENGKAP PENGGUNA
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#faf9f6] text-slate-900 font-semibold focus:border-purple-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  ROLE / PERAN AKSES
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#faf9f6] text-slate-900 font-bold focus:border-purple-500 focus:bg-white"
                >
                  <option value="manager">Manager (Akses Per Outlet)</option>
                  <option value="area_manager">Area Manager (Akses Per Area)</option>
                  <option value="cleaner">Cleaner (Akses Card Inspection)</option>
                  <option value="admin">Administrator (Akses Penuh System)</option>
                </select>
              </div>

              {editRole === 'area_manager' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-blue-700 uppercase">
                      AREA WILAYAH PENUGASAN (PILIH BANYAK)
                    </label>
                    <div className="flex items-center space-x-1.5 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setEditAreaIds(areas.map((a) => a.id))}
                        className="text-blue-600 hover:underline cursor-pointer"
                      >
                        Pilih Semua
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setEditAreaIds([])}
                        className="text-slate-500 hover:underline cursor-pointer"
                      >
                        Hapus Semua
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5 p-2.5 rounded-xl border border-blue-200 bg-blue-50/40 max-h-40 overflow-y-auto">
                    {areas.map((a) => {
                      const isChecked = editAreaIds.includes(a.id);
                      return (
                        <label
                          key={a.id}
                          className="flex items-center space-x-2 text-xs font-bold text-blue-900 cursor-pointer select-none hover:bg-blue-100/50 p-1 rounded-lg transition"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditAreaIds([...editAreaIds, a.id]);
                              } else {
                                setEditAreaIds(editAreaIds.filter((id) => id !== a.id));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded border-blue-300 focus:ring-blue-500 cursor-pointer"
                          />
                          <span>{a.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  {editAreaIds.length === 0 && (
                    <p className="text-[10px] text-amber-600 font-bold mt-1">
                      ⚠️ Pilih minimal 1 wilayah penugasan
                    </p>
                  )}
                </div>
              )}

              {(editRole === 'manager' || editRole === 'cleaner') && (
                <div>
                  <label className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">
                    OUTLET PENUGASAN
                  </label>
                  <select
                    value={editOutletId}
                    onChange={(e) => setEditOutletId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50/50 text-emerald-900 font-bold focus:border-emerald-500 focus:bg-white"
                  >
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  KATA SANDI / PASSWORD BARU
                </label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Ketik password baru (atau biarkan jika tidak diubah)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#faf9f6] text-slate-900 font-mono text-xs focus:border-purple-500 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-700 hover:bg-purple-600 text-white flex items-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS USER */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-rose-100 shadow-2xl max-w-md w-full p-6 text-slate-800 relative space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
              <span className="p-2.5 rounded-2xl bg-rose-100 text-rose-700 border border-rose-200">
                <AlertTriangle className="w-6 h-6" />
              </span>
              <div>
                <h3 className="font-extrabold text-base uppercase text-rose-950">
                  Konfirmasi Hapus User
                </h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="space-y-2 text-xs bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
              <p className="text-slate-700 font-medium">
                Apakah Anda yakin ingin menghapus akun pengguna berikut?
              </p>
              <div className="font-mono bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                <div><span className="text-slate-400 font-sans">Username:</span> <strong className="text-rose-950 font-black">{deletingUser.username}</strong></div>
                <div><span className="text-slate-400 font-sans">Nama:</span> <strong className="text-slate-900">{deletingUser.name}</strong></div>
                <div><span className="text-slate-400 font-sans">Role:</span> <strong className="text-purple-900">{getRoleLabel(deletingUser.role)}</strong></div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Akun Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SYNC / RESET USERS TO STANDARD (NO DUPLICATES) */}
      {showResetUsersModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-purple-200 animate-in zoom-in-95 space-y-4">
            <div className="flex items-center space-x-3 text-purple-800">
              <span className="p-2.5 rounded-2xl bg-purple-100 text-purple-700 border border-purple-300">
                <Users className="w-6 h-6" />
              </span>
              <div>
                <h3 className="font-extrabold text-base uppercase text-slate-900">
                  Sinkronkan Daftar Pengguna Standar
                </h3>
                <p className="text-xs text-slate-500">
                  Format Resmi Cinema XXI (Total 48 Akun Pengguna Unik)
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs text-purple-950 space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-purple-900">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Fitur ini akan menyelaraskan seluruh daftar user sesuai gambar:</span>
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                <li><strong>1 Master Administrator</strong> (admin)</li>
                <li><strong>2 Area Manager</strong> (area_bogor1 &amp; area_bogor2)</li>
                <li><strong>23 Manager Outlet</strong> (sesuai seluruh cabang bioskop)</li>
                <li><strong>22 Cleaner Outlet</strong> (sesuai seluruh cabang bioskop)</li>
                <li><strong className="text-emerald-700">Pembersihan Duplikat:</strong> Menghapus semua user ganda (*double user*), ID ganda, dan memperbaiki struktur akun.</li>
              </ul>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowResetUsersModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetToDefaultUsers}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-purple-700 hover:bg-purple-600 text-white flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Ya, Sinkronkan Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outlets & Target Head Table */}
      <div className="p-6 rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
              <Target className="w-4 h-4" />
            </span>
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
              Daftar 24 Outlet &amp; Penyesuaian Target Head &amp; UMR
            </h3>
          </div>
          <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
            Total: {outlets.length} Cabang Terdaftar
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="uppercase text-[10px] font-extrabold bg-amber-50/60 border-b border-amber-200/70 text-slate-700">
              <tr>
                <th className="py-3 px-3">NO</th>
                <th className="py-3 px-3">NAMA OUTLET BIOSKOP</th>
                <th className="py-3 px-3">AREA WILAYAH</th>
                <th className="py-3 px-3 text-right">TARGET SPH / HEAD</th>
                <th className="py-3 px-3 text-right">UMR (DATABASE)</th>
                <th className="py-3 px-3 text-center">AKSI TARGET</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {outlets.map((outlet, index) => {
                const areaObj = areas.find((a) => a.id === outlet.areaId);
                const isEditing = editingOutletId === outlet.id;

                return (
                  <tr
                    key={outlet.id}
                    className="hover:bg-amber-50/30 transition text-slate-800"
                  >
                    <td className="py-3 px-3 font-bold text-slate-400">{index + 1}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{outlet.name}</td>
                    <td className="py-3 px-3 text-slate-600 font-semibold">
                      {areaObj?.name || outlet.areaId}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-amber-900">
                      {isEditing ? (
                        <div className="flex items-center justify-end space-x-1.5">
                          <input
                            type="number"
                            value={tempTargetHead}
                            onChange={(e) => setTempTargetHead(Number(e.target.value))}
                            className="w-28 px-2 py-1 rounded-lg border border-amber-400 bg-white text-amber-900 font-black text-xs"
                          />
                        </div>
                      ) : (
                        <span>Rp {outlet.targetHead.toLocaleString('id-ID')}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900">
                      {isEditing ? (
                        <div className="flex items-center justify-end space-x-1.5">
                          <input
                            type="number"
                            value={tempUmr}
                            onChange={(e) => setTempUmr(Number(e.target.value))}
                            className="w-28 px-2 py-1 rounded-lg border border-amber-400 bg-white text-slate-900 font-black text-xs"
                          />
                        </div>
                      ) : (
                        <span>Rp {(outlet.umr || 4800000).toLocaleString('id-ID')}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => handleSaveTargetHead(outlet)}
                            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer"
                            title="Simpan"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingOutletId(null)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                            title="Batal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEditTarget(outlet)}
                          className="px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 text-xs font-bold inline-flex items-center space-x-1 transition cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3 text-amber-700" />
                          <span>Ubah Target</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
