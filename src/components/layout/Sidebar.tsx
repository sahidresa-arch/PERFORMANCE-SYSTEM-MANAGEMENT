import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
  Trophy,
  UserCheck,
  CupSoda,
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

  const getGroupForMenu = (menu: string): string | null => {
    if (isCleaner) return 'inspection';
    if (menu.startsWith('sales_')) return 'sales';
    if (menu.startsWith('sdm_')) return 'sdm';
    if (menu.startsWith('occupancy_')) return 'occupancy';
    if (menu.startsWith('inspection_')) return 'inspection';
    if (menu.startsWith('accounting_')) return 'accounting';
    if (menu.startsWith('hc_')) return 'hc';
    return null;
  };

  const [openGroup, setOpenGroup] = useState<string | null>(() => {
    return getGroupForMenu(activeMenu) ?? 'sales';
  });

  // Automatically open parent accordion smoothly when activeMenu changes externally
  useEffect(() => {
    const targetGroup = getGroupForMenu(activeMenu);
    if (targetGroup) {
      setOpenGroup(targetGroup);
    }
  }, [activeMenu, isCleaner]);

  const toggleGroup = (groupName: string) => {
    setOpenGroup((prev) => (prev === groupName ? null : groupName));
  };

  const isSalesActive = activeMenu.startsWith('sales_');
  const isSdmActive = activeMenu.startsWith('sdm_');
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

  const renderSubMenuItem = (
    menuKey: string,
    label: string,
    IconComponent: React.ElementType,
    index = 0
  ) => {
    const isActive = activeMenu === menuKey;
    return (
      <motion.button
        key={menuKey}
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setActiveMenu(menuKey)}
        transition={{ type: 'spring', stiffness: 400, damping: 25, delay: index * 0.02 }}
        className={`group relative w-full h-[38px] flex items-center justify-between px-3 rounded-xl text-left cursor-pointer text-[12px] transition-colors duration-200 ${
          isActive
            ? 'text-[#4A1D6A] font-extrabold'
            : 'text-[#4B5563] hover:text-[#581c87] hover:bg-[#F3E8FF]/50'
        }`}
      >
        {isActive && (
          <motion.div
            layoutId="sidebar-sub-active-bg"
            className="absolute inset-0 bg-gradient-to-r from-[#F3E8FF] via-[#FAF5FF] to-amber-50/80 border-l-[3.5px] border-[#7C3AED] rounded-xl shadow-sm ring-1 ring-purple-200/80"
            transition={{ type: 'spring', stiffness: 320, damping: 26, mass: 0.9 }}
          />
        )}
        <div className="relative z-10 flex items-center space-x-2.5 min-w-0 overflow-hidden">
          <IconComponent
            className={`w-3.5 h-3.5 shrink-0 transition-all duration-300 ${
              isActive
                ? 'text-[#7C3AED] scale-115 drop-shadow-2xs'
                : 'text-[#6B7280] group-hover:text-[#7C3AED] group-hover:scale-110'
            }`}
          />
          <span className="truncate">{label}</span>
        </div>

        {isActive && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            className="relative z-10 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-purple-600/30 shrink-0 ml-1"
          />
        )}
      </motion.button>
    );
  };

  const renderStandaloneMainButton = (
    menuKey: string,
    title: string,
    IconComponent: React.ElementType
  ) => {
    const isActive = activeMenu === menuKey;
    return (
      <motion.button
        whileHover={{ x: collapsed ? 0 : 3 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setActiveMenu(menuKey)}
        title={title}
        className={`group relative w-full h-[44px] px-3.5 flex items-center rounded-xl transition-colors duration-200 cursor-pointer text-left overflow-hidden ${
          collapsed ? 'justify-center px-0' : 'space-x-3'
        } ${
          isActive
            ? 'text-white font-bold'
            : 'text-[#374151] hover:bg-[#F3E8FF]/60 hover:text-[#4A1D6A]'
        }`}
      >
        {isActive && (
          <motion.div
            layoutId="sidebar-main-active-pill"
            className="absolute inset-0 bg-gradient-to-r from-[#3D1A5E] via-[#581c87] to-[#4c1d95] border-l-[4px] border-[#FACC15] rounded-xl shadow-md"
            transition={{ type: 'spring', stiffness: 300, damping: 26, mass: 0.95 }}
          />
        )}
        <IconComponent
          className={`relative z-10 w-4 h-4 shrink-0 transition-transform duration-300 ${
            isActive ? 'text-[#FACC15] scale-115' : 'group-hover:scale-110'
          }`}
        />
        {!collapsed && <span className="relative z-10 truncate">{title}</span>}
      </motion.button>
    );
  };

  const renderAccordionSection = (
    groupKey: string,
    title: string,
    IconComponent: React.ElementType,
    isGroupActive: boolean,
    children: React.ReactNode
  ) => {
    const isOpen = openGroup === groupKey && !collapsed;

    return (
      <div className="overflow-hidden">
        <motion.button
          whileHover={{ x: collapsed ? 0 : 3 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            if (collapsed) {
              onToggleCollapse();
              setOpenGroup(groupKey);
            } else {
              toggleGroup(groupKey);
            }
          }}
          title={title}
          className={`group relative w-full h-[44px] px-3.5 flex items-center justify-between rounded-xl transition-colors duration-200 cursor-pointer text-left overflow-hidden ${
            collapsed ? 'justify-center px-0' : ''
          } ${
            isGroupActive
              ? 'text-white font-bold'
              : isOpen
              ? 'bg-[#F3E8FF]/85 text-[#4A1D6A] font-bold'
              : 'text-[#374151] hover:bg-[#F3E8FF]/60 hover:text-[#4A1D6A]'
          }`}
        >
          {isGroupActive && (
            <motion.div
              layoutId="sidebar-main-active-pill"
              className="absolute inset-0 bg-gradient-to-r from-[#3D1A5E] via-[#581c87] to-[#4c1d95] border-l-[4px] border-[#FACC15] rounded-xl shadow-md"
              transition={{ type: 'spring', stiffness: 300, damping: 26, mass: 0.95 }}
            />
          )}
          <div className={`relative z-10 flex items-center ${collapsed ? '' : 'space-x-3'} overflow-hidden`}>
            <IconComponent
              className={`w-4 h-4 shrink-0 transition-transform duration-300 ${
                isGroupActive
                  ? 'text-[#FACC15] scale-115'
                  : 'group-hover:scale-110'
              }`}
            />
            {!collapsed && <span className="truncate">{title}</span>}
          </div>
          {!collapsed && (
            <ChevronDown
              className={`relative z-10 w-4 h-4 shrink-0 transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isOpen ? 'rotate-180' : 'rotate-0'
              } ${isGroupActive ? 'text-[#FACC15]' : ''}`}
            />
          )}
        </motion.button>

        {/* Dramatic CSS Grid 0fr -> 1fr + Slide/Scale Accordion Container */}
        {!collapsed && (
          <div
            className={`grid transition-[grid-template-rows,opacity,transform] duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isOpen
                ? 'grid-rows-[1fr] opacity-100 translate-y-0'
                : 'grid-rows-[0fr] opacity-0 -translate-y-2 pointer-events-none'
            }`}
          >
            <div className="overflow-hidden">
              <div className="pl-5 pr-1 py-1.5 space-y-1 border-l-2 border-purple-200 ml-4 mt-1">
                {children}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-40 bg-[#F8F9FC] text-[#374151] border-r border-[#E5E7EB] flex flex-col overflow-y-auto overflow-x-hidden select-none transition-[width] duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
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
              className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-purple-800/60 active:scale-90 transition-all duration-200 cursor-pointer shrink-0 ml-1"
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
              className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-purple-800/60 active:scale-90 transition-all duration-200 cursor-pointer"
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
      <nav className="p-2.5 space-y-1.5 text-[12px] font-medium flex-1 overflow-x-hidden">
        {/* If Cleaner: ONLY SHOW INSPECTION */}
        {isCleaner ? (
          <div className="space-y-1.5">
            {!collapsed && (
              <span className="px-3 text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                Akses Cleaner Toilet
              </span>
            )}
            <button
              onClick={() => setActiveMenu('inspection_form')}
              className={`group w-full h-[40px] flex items-center ${
                collapsed ? 'justify-center px-0' : 'space-x-3 px-3.5'
              } rounded-xl transition-all duration-200 ease-out active:scale-95 cursor-pointer text-left ${
                activeMenu === 'inspection_form'
                  ? 'bg-amber-600 text-white font-bold shadow-xs'
                  : 'text-slate-700 hover:bg-amber-50 hover:text-amber-900'
              }`}
            >
              <CheckSquare className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
              {!collapsed && <span className="truncate font-semibold">Form Inspeksi Toilet</span>}
            </button>

            <button
              onClick={() => setActiveMenu('inspection_dashboard')}
              className={`group w-full h-[40px] flex items-center ${
                collapsed ? 'justify-center px-0' : 'space-x-3 px-3.5'
              } rounded-xl transition-all duration-200 ease-out active:scale-95 cursor-pointer text-left ${
                activeMenu === 'inspection_dashboard'
                  ? 'bg-amber-600 text-white font-bold shadow-xs'
                  : 'text-slate-700 hover:bg-amber-50 hover:text-amber-900'
              }`}
            >
              <ClipboardCheck className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
              {!collapsed && <span className="truncate font-semibold">Dashboard Higienitas</span>}
            </button>
          </div>
        ) : (
          <>
            {/* Dashboard Utama */}
            {renderStandaloneMainButton('dashboard', 'Dashboard', LayoutDashboard)}

            {/* 1. SALES SYSTEM ACCORDION */}
            {renderAccordionSection('sales', 'Sales System', DollarSign, isSalesActive, (
              <>
                {renderSubMenuItem('sales_performance', 'Performance Dashboard', BarChart3, 0)}
                {renderSubMenuItem('sales_input', 'Input Data Sales', CalendarDays, 1)}
                {renderSubMenuItem('sales_rekap_daily', 'Tabel Rekap Daily', FileSpreadsheet, 2)}
                {renderSubMenuItem('sales_baking', 'Penjualan Baking', UtensilsCrossed, 3)}
                {renderSubMenuItem('sales_kpi_summary', 'KPI Summary', Target, 4)}
                {renderSubMenuItem('sales_google_slide', 'Google Slide KPI', Presentation, 5)}
              </>
            ))}

            {/* 2. PERFORMANCE SDM ACCORDION */}
            {renderAccordionSection('sdm', 'Performance SDM', Trophy, isSdmActive, (
              <>
                {renderSubMenuItem('sdm_input', 'Input Sales & Item Kasir', UserCheck, 0)}
                {renderSubMenuItem('sdm_leaderboard', 'Ranking & Leaderboard Kasir', Trophy, 1)}
                {renderSubMenuItem('sdm_beverage_category', 'Minuman Perkategori', CupSoda, 2)}
              </>
            ))}

            {/* 3. OKUPANSI RATE ACCORDION */}
            {renderAccordionSection('occupancy', 'Okupansi Rate', Film, isOccupancyActive, (
              <>
                {renderSubMenuItem('occupancy_rekap', 'Rekap Okupansi Outlet', FileSpreadsheet, 0)}
                {renderSubMenuItem('occupancy_market_intel', 'Market Intelligence', Compass, 1)}
                {renderSubMenuItem('occupancy_movie_history', 'History Rekap Film', History, 2)}
              </>
            ))}

            {/* 3. CARD INSPECTION ACCORDION */}
            {renderAccordionSection('inspection', 'Card Inspection', ClipboardCheck, isInspectionActive, (
              <>
                {renderSubMenuItem('inspection_dashboard', 'Dashboard Higienitas', LayoutDashboard, 0)}
                {renderSubMenuItem('inspection_form', 'Form Inspeksi Toilet', CheckSquare, 1)}
              </>
            ))}

            {/* 4. ACCOUNTING ACCORDION */}
            {renderAccordionSection('accounting', 'Accounting', Calculator, isAccountingActive, (
              <>
                {renderSubMenuItem('accounting_bopo', 'BOPO', DollarSign, 0)}
                {renderSubMenuItem('accounting_inventory', 'Stok Gudang & Opname', Boxes, 1)}
              </>
            ))}

            {/* 5. HC AREA ACCORDION */}
            {renderAccordionSection('hc', 'HC Area', Users, isHcActive, (
              <>
                {renderSubMenuItem('hc_employees', 'Data Karyawan', Users, 0)}
                {renderSubMenuItem('hc_kpi', 'KPI Karyawan', Target, 1)}
              </>
            ))}

            {/* 6. LOST N FOUND STANDALONE MENU */}
            <div>
              {renderStandaloneMainButton('lost_and_found', 'Lost N Found', PackageSearch)}
            </div>

            {/* Admin Management */}
            {isAdmin && (
              <div className="pt-2 border-t border-[#E5E7EB] mt-2">
                {!collapsed && (
                  <span className="px-3 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">
                    Admin Control
                  </span>
                )}
                {renderStandaloneMainButton('admin_users_outlets', 'Kelola User & Outlet', ShieldCheck)}
              </div>
            )}
          </>
        )}

        {/* Settings button - Admin only */}
        {isAdmin && (
          <div className="pt-1">
            <motion.button
              whileHover={{ x: collapsed ? 0 : 3 }}
              whileTap={{ scale: 0.96 }}
              onClick={onOpenSettings}
              title="Koneksi & OCR API"
              className={`group w-full h-[42px] px-3.5 flex items-center rounded-xl text-[#6B7280] hover:text-[#4A1D6A] hover:bg-[#F3E8FF]/60 transition-colors duration-200 cursor-pointer text-left ${
                collapsed ? 'justify-center px-0' : 'space-x-3'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0 transition-transform duration-500 group-hover:rotate-90" />
              {!collapsed && <span className="truncate">Koneksi & OCR API</span>}
            </motion.button>
          </div>
        )}
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
