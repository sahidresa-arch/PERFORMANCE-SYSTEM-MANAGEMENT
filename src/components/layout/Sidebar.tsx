import React, { useState } from 'react';
import { User } from '../../types';
import {
  LayoutDashboard,
  DollarSign,
  BarChart3,
  CalendarDays,
  FileSpreadsheet,
  UtensilsCrossed,
  Target,
  Presentation,
  Film,
  Compass,
  History,
  ClipboardCheck,
  CheckSquare,
  ShieldCheck,
  Settings,
  Calculator,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Users,
  PackageSearch,
  Boxes,
} from 'lucide-react';

interface SidebarProps {
  currentUser: User | null;
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  onOpenSettings: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeMenu,
  setActiveMenu,
  onOpenSettings,
  collapsed,
  onToggleCollapse,
}) => {
  const isCleaner = currentUser?.role === 'cleaner';
  const isAdmin = currentUser?.role === 'admin';

  const getInitialOpenMenu = () => {
    if (isCleaner) return 'inspection';
    if (activeMenu.startsWith('sales_')) return 'sales';
    if (activeMenu.startsWith('occupancy_')) return 'occupancy';
    if (activeMenu.startsWith('inspection_')) return 'inspection';
    if (activeMenu.startsWith('accounting_')) return 'accounting';
    if (activeMenu.startsWith('hc_')) return 'hc';
    return 'sales';
  };

  const [openGroup, setOpenGroup] = useState<string | null>(getInitialOpenMenu);

  const toggleGroup = (groupName: string) => {
    setOpenGroup((prev) => (prev === groupName ? null : groupName));
  };

  const isSalesActive = activeMenu.startsWith('sales_');
  const isOccupancyActive = activeMenu.startsWith('occupancy_');
  const isInspectionActive = activeMenu.startsWith('inspection_');
  const isAccountingActive = activeMenu.startsWith('accounting_');
  const isHcActive = activeMenu.startsWith('hc_');

  function getRoleTitle(user: User | null) {
    if (!user) return 'Administrator';
    switch (user.role) {
      case 'admin':
        return 'Admin XXI';
      case 'area_manager':
        return 'Area Manager';
      case 'manager':
        return 'Manager Outlet';
      case 'cleaner':
        return 'Cleaner Staff';
      default:
        return 'XXI User';
    }
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-40 bg-[#F8F9FC] text-[#374151] border-r border-[#E5E7EB] flex flex-col overflow-y-auto overflow-x-hidden select-none transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      {/* Brand Header */}
      <div className="h-[56px] px-3.5 flex items-center justify-between bg-[#581c87] border-b border-[#4c1d95] text-white shrink-0 shadow-xs">
        {!collapsed ? (
          <>
            <div className="flex items-center space-x-2.5 min-w-0 overflow-hidden">
              <div className="text-2xl shrink-0 leading-none select-none filter drop-shadow-xs">
                🎬
              </div>
              <div className="flex items-baseline space-x-1.5 select-none whitespace-nowrap">
                <span className="font-cinema-script text-3xl font-normal text-[#FEF08A] drop-shadow-xs leading-none">
                  Cinema
                </span>
                <span className="font-cinema-serif text-xl font-black text-[#FACC15] tracking-wider leading-none">
                  XXI
                </span>
              </div>
            </div>
            <button
              onClick={onToggleCollapse}
              type="button"
              title="Collapse Sidebar"
              className="p-1 rounded-md text-purple-200 hover:text-white hover:bg-purple-800/60 transition cursor-pointer shrink-0 ml-1"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="w-full flex items-center justify-center">
            <button
              onClick={onToggleCollapse}
              type="button"
              title="Expand Sidebar"
              className="p-1.5 rounded-md text-purple-200 hover:text-white hover:bg-purple-800/60 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* User Info Strip */}
      {!collapsed ? (
        <div className="p-3 border-b border-[#E5E7EB] bg-[#F8F9FC] shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4A1D6A] to-[#5E2B97] flex items-center justify-center text-[#FFD700] font-bold text-xs shadow-xs shrink-0 uppercase">
              {currentUser?.name?.charAt(0) || 'A'}
            </div>
            <div className="overflow-hidden min-w-0">
              <div className="text-[12px] font-bold text-[#111827] truncate leading-tight">
                {currentUser?.name || 'Administrator'}
              </div>
              <div className="text-[10px] text-[#6D28D9] font-bold leading-tight truncate">
                {getRoleTitle(currentUser)} &bull; {currentUser?.username}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-2 border-b border-[#E5E7EB] flex justify-center shrink-0">
          <div
            title={`${currentUser?.name || 'Admin'} (${getRoleTitle(currentUser)})`}
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4A1D6A] to-[#5E2B97] flex items-center justify-center text-[#FFD700] font-bold text-xs shadow-xs uppercase"
          >
            {currentUser?.name?.charAt(0) || 'A'}
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="p-2 space-y-1 text-[12px] font-medium flex-1 overflow-x-hidden">
        {/* If Cleaner: ONLY SHOW INSPECTION */}
        {isCleaner ? (
          <div className="space-y-1">
            {!collapsed && (
              <span className="px-3 text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                Akses Cleaner Toilet
              </span>
            )}
            <button
              onClick={() => setActiveMenu('inspection_form')}
              className={`w-full h-[40px] flex items-center ${
                collapsed ? 'justify-center px-0' : 'space-x-3 px-3.5'
              } rounded-lg transition-colors cursor-pointer text-left ${
                activeMenu === 'inspection_form'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'text-slate-700 hover:bg-amber-50 hover:text-amber-900'
              }`}
            >
              <CheckSquare className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate font-semibold">Form Inspeksi Toilet</span>}
            </button>

            <button
              onClick={() => setActiveMenu('inspection_dashboard')}
              className={`w-full h-[40px] flex items-center ${
                collapsed ? 'justify-center px-0' : 'space-x-3 px-3.5'
              } rounded-lg transition-colors cursor-pointer text-left ${
                activeMenu === 'inspection_dashboard'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'text-slate-700 hover:bg-amber-50 hover:text-amber-900'
              }`}
            >
              <ClipboardCheck className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate font-semibold">Dashboard Higienitas</span>}
            </button>
          </div>
        ) : (
          <>
            {/* Dashboard Utama */}
            <button
              onClick={() => setActiveMenu('dashboard')}
              title="Dashboard"
              className={`w-full h-[42px] px-3.5 flex items-center rounded-lg transition-colors cursor-pointer text-left ${
                collapsed ? 'justify-center px-0' : 'space-x-3'
              } ${
                activeMenu === 'dashboard'
                  ? 'bg-[#3D1A5E] text-white border-l-[3px] border-[#FACC15] font-semibold'
                  : 'text-[#374151] hover:bg-[#F3E8FF]/60 hover:text-[#4A1D6A]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">Dashboard</span>}
            </button>

            {/* 1. SALES SYSTEM ACCORDION */}
            <div className="overflow-hidden">
              <button
                onClick={() => {
                  if (collapsed) {
                    onToggleCollapse();
                    setOpenGroup('sales');
                  } else {
                    toggleGroup('sales');
                  }
                }}
                title="Sales System"
                className={`w-full h-[42px] px-3.5 flex items-center justify-between rounded-lg transition-colors cursor-pointer text-left ${
                  collapsed ? 'justify-center px-0' : ''
                } ${
                  isSalesActive
                    ? 'bg-[#3D1A5E] text-white border-l-[3px] border-[#FACC15] font-semibold'
                    : 'text-[#374151] hover:bg-[#F3E8FF]/60 hover:text-[#4A1D6A]'
                }`}
              >
                <div className={`flex items-center ${collapsed ? '' : 'space-x-3'} overflow-hidden`}>
                  <DollarSign className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">Sales System</span>}
                </div>
                {!collapsed && (
                  <ChevronDown
                    className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                      openGroup === 'sales' ? 'rotate-180' : 'rotate-0'
                    }`}
                  />
                )}
              </button>

              {!collapsed && (
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    maxHeight: openGroup === 'sales' ? '400px' : '0px',
                    opacity: openGroup === 'sales' ? 1 : 0,
                  }}
                >
                  <div className="pl-6 pr-1 py-1 space-y-0.5 border-l-2 border-[#E5E7EB] ml-4 mt-0.5">
                    <button
                      onClick={() => setActiveMenu('sales_performance')}
                      className={`w-full h-[36px] flex items-center space-x-2.5 px-3 rounded-lg text-left transition-colors cursor-pointer text-[12px] ${
                        activeMenu === 'sales_performance'
                          ? 'bg-[#F3E8FF] text-[#6D28D9] border-l-[2px] border-[#7C3AED] font-semibold'
                          : 'text-[#374151] hover:bg-[#F3E8FF]/50 hover:text-[#6D28D9]'
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Performance Dashboard</span>
                    </button>

                    <button
                      onClick={() => setActiveMenu('sales_input')}
                      className={`w-full h-[36px] flex items-center space-x-2.5 px-3 rounded-lg text-left transition-colors cursor-pointer text-[12px] ${
                        activeMenu === 'sales_input'
                          ? 'bg-[#F3E8FF] text-[#6D28D9] border-l-[2px] border-[#7C3AED] font-semibold'
                          : 'text-[#374151] hover:bg-[#F3E8FF]/50 hover:text-[#6D28D9]'
                      }`}
                    >
                      <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Input Data Sales</span>
                    </button>

                    <button
                      onClick={() => setActiveMenu('sales_rekap_daily')}
                      className={`w-full h-[36px] flex items-center space-x-2.5 px-3 rounded-lg text-left transition-colors cursor-pointer text-[12px] ${
                        activeMenu === 'sales_rekap_daily'
                          ? 'bg-[#F3E8FF] text-[#6D28D9] border-l-[2px] border-[#7C3AED] font-semibold'
                          : 'text-[#374151] hover:bg-[#F3E8FF]/50 hover:text-[#6D28D9]'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Tabel Rekap Daily</span>
                    </button>

                    <button
                      onClick={() => setActiveMenu('sales_baking')}
                      className={`w-full h-[36px] flex items-center space-x-2.5 px-3 rounded-lg text-left transition-colors cursor-pointer text-[12px] ${
                        activeMenu === 'sales_baking'
                          ? 'bg-[#F3E8FF] text-[#6D28D9] border-l-[2px] border-[#7C3AED] font-semibold'
                          : 'text-[#374151] hover:bg-[#F3E8FF]/50 hover:text-[#6D28D9]'
                      }`}
                    >
                      <UtensilsCrossed className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Penjualan Baking</span>
                    </button>

                    <button
                      onClick={() => setActiveMenu('sales_kpi_summary')}
                      className={`w-full h-[36px] flex items-center space-x-2.5 px-3 rounded-lg text-left transition-colors cursor-pointer text-[12px] ${
                        activeMenu === 'sales_kpi_summary'
                          ? 'bg-[#F3E8FF] text-[#6D28D9] border-l-[2px] border-[#7C3AED] font-semibold'
                          : 'text-[#374151] hover:bg-[#F3E8FF]/50 hover:text-[#6D28D9]'
                      }`}
                    >
                      <Target className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">KPI Summary</span>
                    </button>

                    <button
                      onClick={() => setActiveMenu('sales_google_slide')}
                      className={`w-full h-[36px] flex items-center space-x-2.5 px-3 rounded-lg text-left transition-colors cursor-pointer text-[12px] ${
                        activeMenu === 'sales_google_slide'
                          ? 'bg-[#F3E8FF] text-[#6D28D9] border-l-[2px] border-[#7C3AED] font-semibold'
                          : 'text-[#374151] hover:bg-[#F3E8FF]/50 hover:text-[#6D28D9]'
                      }`}
                    >
                      <Presentation className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Google Slide KPI</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. OKUPANSI RATE ACCORDION */}
            <div className="overflow-hidden">
              <button
                onClick={() => {
                  if (collapsed) {
                    onToggleCollapse();
                    setOpenGroup('occupancy');
                  } else {
                    toggleGroup('occupancy');
                  }
                }}
                title="Okupansi Rate"
                className={`w-full h-[42px] px-3.5 flex items-center justify-between rounded-lg transition-colors cursor-pointer text-left ${
                  collapsed ? 'justify-center px-0' : ''
                } ${
                  isOccupancyActive
                    ? 'bg-[#3D1A5E] text-white border-l-[3px] border-[#FACC15] font-semibold'
                    : 'text-[#374151] hover:bg-[#F3E8FF]/60 hover:text-[#4A1D6A]'
                }`}
              >
                <div className={`flex items-center ${collapsed ? '' : 'space-x-3'} overflow-hidden`}>
                  <Film className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">Okupansi Rate</span>}
                </div>
                {!collapsed && (
                  <ChevronDown
                    className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                      openGroup === 'occupancy' ? 'rotate-180' : 'rotate-0'
                    }`}
                  />
                )}
              </button>

              {!collapsed && (
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    maxHeight: openGroup === 'occupancy' ? '250px' : '0px',
                    opacity: openGroup === 'occupancy' ? 1 : 0,
                  }}
                >
                  <div className="pl-6 pr-1 py-1 space-y-0.5 border-l-2 border-[#E5E7EB] ml-4 mt-0.5">
                    <button
                      onClick={() => setActiveMenu('occupancy_rekap')}
                      className={`w-full h-[36px] flex items-center space-x-2.5 px-3 rounded-lg text-left transition-colors cursor-pointer text-[12px] ${
                        activeMenu === 'occupancy_rekap'
                          ? 'bg-[#F3E8FF] text-[#6D28D9] border-l-[2px] border-[#7C3AED] font-semibold'
                          : 'text-[#374151] hover:bg-[#F3E8FF]/50 hover:text-[#6D28D9]'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Rekap Okupansi Outlet</span>
                    </button>

                    <button
                      onClick={() => setActiveMenu('occupancy_market_intel')}
                      className={`w-full h-[36px] flex items-center space-x-2.5 px-3 rounded-lg text-left transition-colors cursor-pointer text-[12px] ${
                        activeMenu === 'occupancy_market_intel'
                          ? 'bg-[#F3E8FF] text-[#6D28D9] border-l-[2px] border-[#7C3AED] font-semibold'
                          : 'text-[#374151] hover:bg-[#F3E8FF]/50 hover:text-[#6D28D9]'
                      }`}
                    >
                      <Compass className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Market Intelligence</span>
                    </button>

                    <button
                      onClick={() => setActiveMenu('occupancy_movie_history')}
                      className={`w-full h-[36px] flex items-center space-x-2.5 px-3 rounded-lg text-left transition-colors cursor-pointer text-[12px] ${
                        activeMenu === 'occupancy_movie_history'
                          ? 'bg-[#F3E8FF] text-[#6D28D9] border-l-[2px] border-[#7C3AED] font-semibold'
                          : 'text-[#374151] hover:bg-[#F3E8FF]/50 hover:text-[#6D28D9]'
                      }`}
                    >
                      <History className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">History Rekap Film</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. CARD INSPECTION ACCORDION */}
            <div className="overflow-hidden">
              <button
                onClick={() => {
                  if (collapsed) {
                    onToggleCollapse();
                    setOpenGroup('inspection');
                  } else {
                    toggleGroup('inspection');
                  }
                }}
                title="Card Inspection"
                className={`w-full h-[42px] px-3.5 flex items-center justify-between rounded-lg transition-colors cursor-pointer text-left ${
                  collapsed ? 'justify-center px-0' : ''
                } ${
                  isInspectionActive
                    ? 'bg-[#3D1A5E] text-white border-l-[3px] border-[#FACC15] font-semibold'
                    : 'text-[#374151] hover:bg-[#F3E8FF]/60 hover:text-[#4A1D6A]'
                }`}
              >
                <div className={`flex items-center ${collapsed ? '' : 'space-x-3'} overflow-hidden`}>
                  <ClipboardCheck className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">Card Inspection</span>}
                </div>
                {!collapsed && (
                  <ChevronDown
                    className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                      openGroup === 'inspection' ? 'rotate-180' : 'rotate-0'
                    }`}
                  />
                )}
              </button>

              {!collapsed && (
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    maxHeight: openGroup === 'inspection' ? '200px' : '0px',
                    opacity: openGroup === 'inspection' ? 1 : 0,
                  }}
                >
                  <div className="pl-6 pr-1 py-1 space-y-0.5 border-l-2 border-[#E5E7EB] ml-4 mt-0.5">
                    <button
                      onClick={() => setActiveMenu('inspection_dashboard')}
                      className={`w-full h-[36px] flex items-center space-x-2.5 px-3 rounded-lg text-left transition-colors cursor-pointer text-[12px] ${
                        activeMenu === 'inspection_dashboard'
                          ? 'bg-[#F3E8FF] text-[#6D28D9] border-l-[2px] border-[#7C3AED] font-semibold'
                          : 'text-[#374151] hover:bg-[#F3E8FF]/50 hover:text-[#6D28D9]'
                      }`}
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Dashboard Higienitas</span>
                    </button>

                    <button
                      onClick={() => setActiveMenu('inspection_form')}
                      className={`w-full h-[36px] flex items-center space-x-2.5 px-3 rounded-lg text-left transition-colors cursor-pointer text-[12px] ${
                        activeMenu === 'inspection_form'
                          ? 'bg-[#F3E8FF] text-[#6D28D9] border-l-[2px] border-[#7C3AED] font-semibold'
                          : 'text-[#374151] hover:bg-[#F3E8FF]/50 hover:text-[#6D28D9]'
                      }`}
                    >
                      <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Form Inspeksi Toilet</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. ACCOUNTING ACCORDION */}
            <div className="overflow-hidden">
              <button
                onClick={() => {
                  if (collapsed) {
                    onToggleCollapse();
                    setOpenGroup('accounting');
                  } else {
                    toggleGroup('accounting');
                  }
                }}
                title="Accounting"
                className={`w-full h-[42px] px-3.5 flex items-center justify-between rounded-lg transition-colors cursor-pointer text-left ${
                  collapsed ? 'justify-center px-0' : ''
                } ${
                  isAccountingActive
                    ? 'bg-[#3D1A5E] text-white border-l-[3px] border-[#FACC15] font-semibold'
                    : 'text-[#374151] hover:bg-[#F3E8FF]/60 hover:text-[#4A1D6A]'
                }`}
              >
                <div className={`flex items-center ${collapsed ? '' : 'space-x-3'} overflow-hidden`}>
                  <Calculator className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">Accounting</span>}
                </div>
                {!collapsed && (
                  <ChevronDown
                    className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                      openGroup === 'accounting' ? 'rotate-180' : 'rotate-0'
                    }`}
                  />
                )}
              </button>

              {!collapsed && (
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    maxHeight: openGroup === 'accounting' ? '200px' : '0px',
                    opacity: openGroup === 'accounting' ? 1 : 0,
                  }}
                >
                  <div className="pl-6 pr-1 py-1 space-y-0.5 border-l-2 border-[#E5E7EB] ml-4 mt-0.5">
                    <button
                      onClick={() => setActiveMenu('accounting_bopo')}
                      className={`w-full h-[36px] flex items-center space-x-2.5 px-3 rounded-lg text-left transition-colors cursor-pointer text-[12px] ${
                        activeMenu === 'accounting_bopo'
                          ? 'bg-[#F3E8FF] text-[#6D28D9] border-l-[2px] border-[#7C3AED] font-semibold'
                          : 'text-[#374151] hover:bg-[#F3E8FF]/50 hover:text-[#6D28D9]'
                      }`}
                    >
                      <DollarSign className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">BOPO</span>
                    </button>

                    <button
                      onClick={() => setActiveMenu('accounting_inventory')}
                      className={`w-full h-[36px] flex items-center space-x-2.5 px-3 rounded-lg text-left transition-colors cursor-pointer text-[12px] ${
                        activeMenu === 'accounting_inventory'
                          ? 'bg-[#F3E8FF] text-[#6D28D9] border-l-[2px] border-[#7C3AED] font-semibold'
                          : 'text-[#374151] hover:bg-[#F3E8FF]/50 hover:text-[#6D28D9]'
                      }`}
                    >
                      <Boxes className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Stok Gudang &amp; Opname</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 5. HC AREA ACCORDION */}
            <div className="overflow-hidden">
              <button
                onClick={() => {
                  if (collapsed) {
                    onToggleCollapse();
                    setOpenGroup('hc');
                  } else {
                    toggleGroup('hc');
                  }
                }}
                title="HC Area"
                className={`w-full h-[42px] px-3.5 flex items-center justify-between rounded-lg transition-colors cursor-pointer text-left ${
                  collapsed ? 'justify-center px-0' : ''
                } ${
                  isHcActive
                    ? 'bg-[#3D1A5E] text-white border-l-[3px] border-[#FACC15] font-semibold'
                    : 'text-[#374151] hover:bg-[#F3E8FF]/60 hover:text-[#4A1D6A]'
                }`}
              >
                <div className={`flex items-center ${collapsed ? '' : 'space-x-3'} overflow-hidden`}>
                  <Users className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">HC Area</span>}
                </div>
                {!collapsed && (
                  <ChevronDown
                    className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                      openGroup === 'hc' ? 'rotate-180' : 'rotate-0'
                    }`}
                  />
                )}
              </button>

              {!collapsed && (
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    maxHeight: openGroup === 'hc' ? '200px' : '0px',
                    opacity: openGroup === 'hc' ? 1 : 0,
                  }}
                >
                  <div className="pl-6 pr-1 py-1 space-y-0.5 border-l-2 border-[#E5E7EB] ml-4 mt-0.5">
                    <button
                      onClick={() => setActiveMenu('hc_employees')}
                      className={`w-full h-[36px] flex items-center space-x-2.5 px-3 rounded-lg text-left transition-colors cursor-pointer text-[12px] ${
                        activeMenu === 'hc_employees'
                          ? 'bg-[#F3E8FF] text-[#6D28D9] border-l-[2px] border-[#7C3AED] font-semibold'
                          : 'text-[#374151] hover:bg-[#F3E8FF]/50 hover:text-[#6D28D9]'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Data Karyawan</span>
                    </button>

                    <button
                      onClick={() => setActiveMenu('hc_kpi')}
                      className={`w-full h-[36px] flex items-center space-x-2.5 px-3 rounded-lg text-left transition-colors cursor-pointer text-[12px] ${
                        activeMenu === 'hc_kpi'
                          ? 'bg-[#F3E8FF] text-[#6D28D9] border-l-[2px] border-[#7C3AED] font-semibold'
                          : 'text-[#374151] hover:bg-[#F3E8FF]/50 hover:text-[#6D28D9]'
                      }`}
                    >
                      <Target className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">KPI Karyawan</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 6. LOST N FOUND STANDALONE MENU */}
            <div>
              <button
                onClick={() => setActiveMenu('lost_and_found')}
                title="Lost N Found"
                className={`w-full h-[42px] px-3.5 flex items-center rounded-lg transition-colors cursor-pointer text-left ${
                  collapsed ? 'justify-center px-0' : 'space-x-3'
                } ${
                  activeMenu === 'lost_and_found'
                    ? 'bg-[#3D1A5E] text-white border-l-[3px] border-[#FACC15] font-semibold'
                    : 'text-[#374151] hover:bg-[#F3E8FF]/60 hover:text-[#4A1D6A]'
                }`}
              >
                <PackageSearch className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">Lost N Found</span>}
              </button>
            </div>

            {/* Admin Management */}
            {isAdmin && (
              <div className="pt-2 border-t border-[#E5E7EB] mt-2">
                {!collapsed && (
                  <span className="px-3 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">
                    Admin Control
                  </span>
                )}
                <button
                  onClick={() => setActiveMenu('admin_users_outlets')}
                  title="Kelola User & Outlet"
                  className={`w-full h-[42px] px-3.5 flex items-center rounded-lg transition-colors cursor-pointer text-left ${
                    collapsed ? 'justify-center px-0' : 'space-x-3'
                  } ${
                    activeMenu === 'admin_users_outlets'
                      ? 'bg-[#3D1A5E] text-white border-l-[3px] border-[#FACC15] font-semibold'
                      : 'text-[#374151] hover:bg-[#F3E8FF]/60 hover:text-[#4A1D6A]'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">Kelola User & Outlet</span>}
                </button>
              </div>
            )}
          </>
        )}

        {/* Settings button */}
        <div className="pt-1">
          <button
            onClick={onOpenSettings}
            title="Koneksi & OCR API"
            className={`w-full h-[42px] px-3.5 flex items-center rounded-lg text-[#6B7280] hover:text-[#4A1D6A] hover:bg-[#F3E8FF]/60 transition-colors cursor-pointer text-left ${
              collapsed ? 'justify-center px-0' : 'space-x-3'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="truncate">Koneksi & OCR API</span>}
          </button>
        </div>
      </nav>

      {/* Footer */}
      {!collapsed ? (
        <div className="p-3 border-t border-[#E5E7EB] text-[10px] text-center text-[#9CA3AF] bg-[#FFFFFF] shrink-0">
          <p className="font-semibold text-[#6B7280]">Cloudflare Pages &bull; Realtime</p>
          <p className="text-[#9CA3AF]">Cinema XXI Bogor 1 & 2</p>
        </div>
      ) : (
        <div className="p-2 border-t border-[#E5E7EB] text-[9px] text-center text-[#9CA3AF] bg-[#FFFFFF] shrink-0">
          XXI
        </div>
      )}
    </aside>
  );
};
