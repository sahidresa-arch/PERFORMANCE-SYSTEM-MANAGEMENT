import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from './types';
import { StorageService } from './lib/storage';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { LoginView } from './components/auth/LoginView';
import { SplashScreen } from './components/auth/SplashScreen';
import { ExecutiveDashboard } from './components/dashboard/ExecutiveDashboard';
import { InputDataSales } from './components/sales/InputDataSales';
import { TabelRekapDaily } from './components/sales/TabelRekapDaily';
import { PerformanceDashboard } from './components/sales/PerformanceDashboard';
import { PenjualanBaking } from './components/sales/PenjualanBaking';
import { KPISummary } from './components/sales/KPISummary';
import { GoogleSlideKPI } from './components/sales/GoogleSlideKPI';
import { RekapOkupansi } from './components/occupancy/RekapOkupansi';
import { MarketIntelligence } from './components/occupancy/MarketIntelligence';
import { HistoryRekapFilm } from './components/occupancy/HistoryRekapFilm';
import { ToiletInspection } from './components/inspection/ToiletInspection';
import { BopoView } from './components/accounting/BopoView';
import { UserOutletManagement } from './components/admin/UserOutletManagement';
import { EmployeesView } from './components/hc/EmployeesView';
import { KpiKaryawanView } from './components/hc/KpiKaryawanView';
import { LostAndFoundView } from './components/lost_found/LostAndFoundView';
import { CashierPerformanceInput } from './components/sdm/CashierPerformanceInput';
import { CashierLeaderboard } from './components/sdm/CashierLeaderboard';
import { CashierBeverageCategoryView } from './components/sdm/CashierBeverageCategoryView';
import { MaintenanceScheduleView } from './components/maintenance/MaintenanceScheduleView';
import { GoogleReviewView } from './components/reviews/GoogleReviewView';
import { MonitoringSuhuView } from './components/iot/MonitoringSuhuView';
import { SettingsModal } from './components/settings/SettingsModal';

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultMenuForRole(role?: User['role']): string {
  if (role === 'cleaner') return 'inspection_form';
  if (role === 'quality_control') return 'inspection_dashboard';
  return 'dashboard';
}

function isMenuAllowedForUser(user: User | null, menu: string): boolean {
  if (!user) return false;
  if (user.role === 'cleaner') return menu.startsWith('inspection_');
  if (user.role === 'quality_control') {
    return menu.startsWith('inspection_') || menu.startsWith('maintenance_');
  }
  return true;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return StorageService.getCurrentUser();
  });
  const [showSplash, setShowSplash] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => getTodayDateString());
  const [activeMenu, setActiveMenu] = useState(() =>
    getDefaultMenuForRole(StorageService.getCurrentUser()?.role)
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMapsQuotaExceeded, setIsMapsQuotaExceeded] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cinema_xxi_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('cinema_xxi_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Auto-collapse sidebar on smaller or zoomed viewports (< 1024px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Guard for restricted roles (cleaner & quality_control)
  useEffect(() => {
    if (currentUser && !isMenuAllowedForUser(currentUser, activeMenu)) {
      setActiveMenu(getDefaultMenuForRole(currentUser.role));
    }
  }, [currentUser, activeMenu]);

  // Auto-rollover tanggal aktif (selectedDate) jika tab browser HP dibiarkan terbuka melewati tengah malam (pergantian hari)
  const lastKnownTodayRef = React.useRef<string>(getTodayDateString());
  useEffect(() => {
    const checkDateRollover = () => {
      const currentToday = getTodayDateString();
      const prevToday = lastKnownTodayRef.current;
      if (currentToday !== prevToday) {
        lastKnownTodayRef.current = currentToday;
        setSelectedDate((prevSelected) => {
          if (prevSelected === prevToday || currentUser?.role === 'cleaner') {
            return currentToday;
          }
          return prevSelected;
        });
      }
    };

    const interval = setInterval(checkDateRollover, 30000);
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkDateRollover();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [currentUser?.role]);

  // Safe initialization
  useEffect(() => {
    try {
      localStorage.setItem('cinema_xxi_clean_v1', 'true');
    } catch {
      // ignore
    }
  }, []);

  const [, setGlobalSyncTick] = useState(0);

  // Sync listener across windows / components & Supabase Realtime
  useEffect(() => {
    const handleStorageUpdate = (e: any) => {
      const type = e?.detail?.type;
      if (type === 'auth' || type === 'all-reset') {
        setCurrentUser(StorageService.getCurrentUser());
      }
      setGlobalSyncTick((t) => t + 1);
    };
    window.addEventListener('cinema-xxi-storage-update', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    let cleanupSupabase: (() => void) | null = null;
    import('./lib/supabase').then((m) => {
      cleanupSupabase = m.setupSupabaseRealtimeSync();
    });

    return () => {
      window.removeEventListener('cinema-xxi-storage-update', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
      if (cleanupSupabase) cleanupSupabase();
    };
  }, []);

  useEffect(() => {
    const handleQuotaExceeded = () => setIsMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  const handleLogout = () => {
    StorageService.resetSession();
    setShowSplash(false);
    setCurrentUser(null);
  };

  const handleMenuChange = (newMenu: string) => {
    if (currentUser && !isMenuAllowedForUser(currentUser, newMenu)) {
      return;
    }
    setActiveMenu(newMenu);
    setSelectedDate(getTodayDateString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If not logged in, show Cinema XXI VIP Login Screen
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setSelectedDate(getTodayDateString());
          setActiveMenu(getDefaultMenuForRole(user.role));
          setShowSplash(true);
        }}
      />
    );
  }

  const handleOpenSettings = () => {
    if (currentUser?.role === 'admin') {
      setIsSettingsOpen(true);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col font-sans bg-[#F8F9FC] text-[#374151] antialiased">
      {/* Cinema XXI VIP Premiere Splash Screen after Login */}
      {showSplash && (
        <SplashScreen
          user={currentUser}
          onComplete={() => setShowSplash(false)}
        />
      )}

      {/* Google Maps Platform Case A Quota Exceeded Banner */}
      {isMapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Top Header */}
      <Header
        currentUser={currentUser}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onLogout={handleLogout}
        onOpenSettings={handleOpenSettings}
        collapsed={collapsed}
        onToggleSidebar={handleToggleCollapse}
      />

      {/* Main Body Shell */}
      <div className="flex-1 w-full flex min-h-0 min-w-0">
        {/* Sidebar */}
        <Sidebar
          currentUser={currentUser}
          activeMenu={activeMenu}
          setActiveMenu={handleMenuChange}
          onOpenSettings={handleOpenSettings}
          collapsed={collapsed}
          onToggleCollapse={handleToggleCollapse}
        />

        {/* Content Area */}
        <main
          className={`relative flex-1 w-full max-w-full min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-4 bg-[#F8F9FC] transition-[margin] duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            collapsed ? 'ml-[72px]' : 'ml-[260px]'
          }`}
        >
          {/* Dramatic Cinema XXI Golden Spotlight Sweep Bar on Menu Switch */}
          <motion.div
            key={`sweep-${activeMenu}`}
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: 1, opacity: 0 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none fixed top-[56px] left-0 right-0 h-[3px] origin-left z-50 bg-gradient-to-r from-[#581c87] via-[#FACC15] to-[#f59e0b] shadow-[0_0_12px_rgba(250,204,21,0.8)]"
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={activeMenu}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.25,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="w-full max-w-full"
            >
              {/* Dashboard */}
              {activeMenu === 'dashboard' && isMenuAllowedForUser(currentUser, 'dashboard') && (
                <ExecutiveDashboard
                  currentUser={currentUser}
                  selectedDate={selectedDate}
                  onNavigate={handleMenuChange}
                  onDateChange={setSelectedDate}
                />
              )}

              {/* Sales System Submenus */}
              {activeMenu === 'sales_input' && isMenuAllowedForUser(currentUser, 'sales_input') && (
                <InputDataSales
                  currentUser={currentUser}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                />
              )}

              {activeMenu === 'sales_rekap_daily' && isMenuAllowedForUser(currentUser, 'sales_rekap_daily') && (
                <TabelRekapDaily
                  currentUser={currentUser}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                />
              )}

              {activeMenu === 'sales_performance' && isMenuAllowedForUser(currentUser, 'sales_performance') && (
                <PerformanceDashboard
                  currentUser={currentUser}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                />
              )}

              {activeMenu === 'sales_baking' && isMenuAllowedForUser(currentUser, 'sales_baking') && (
                <PenjualanBaking
                  currentUser={currentUser}
                  selectedDate={selectedDate}
                />
              )}

              {activeMenu === 'sales_kpi_summary' && isMenuAllowedForUser(currentUser, 'sales_kpi_summary') && (
                <KPISummary
                  currentUser={currentUser}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                />
              )}

              {activeMenu === 'sales_google_slide' && isMenuAllowedForUser(currentUser, 'sales_google_slide') && (
                <GoogleSlideKPI
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                />
              )}

              {/* Performance SDM Submenus */}
              {activeMenu === 'sdm_input' && isMenuAllowedForUser(currentUser, 'sdm_input') && (
                <CashierPerformanceInput
                  currentUser={currentUser}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  onNavigateToLeaderboard={() => handleMenuChange('sdm_leaderboard')}
                />
              )}

              {activeMenu === 'sdm_leaderboard' && isMenuAllowedForUser(currentUser, 'sdm_leaderboard') && (
                <CashierLeaderboard
                  currentUser={currentUser}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  onNavigateToInput={() => handleMenuChange('sdm_input')}
                />
              )}

              {activeMenu === 'sdm_beverage_category' && isMenuAllowedForUser(currentUser, 'sdm_beverage_category') && (
                <CashierBeverageCategoryView
                  currentUser={currentUser}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  onNavigateToInput={() => handleMenuChange('sdm_input')}
                />
              )}

              {/* Okupansi Rate Submenus */}
              {activeMenu === 'occupancy_rekap' && isMenuAllowedForUser(currentUser, 'occupancy_rekap') && (
                <RekapOkupansi
                  currentUser={currentUser}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                />
              )}

              {activeMenu === 'occupancy_market_intel' && isMenuAllowedForUser(currentUser, 'occupancy_market_intel') && (
                <MarketIntelligence currentUser={currentUser} />
              )}

              {activeMenu === 'occupancy_movie_history' && isMenuAllowedForUser(currentUser, 'occupancy_movie_history') && (
                <HistoryRekapFilm currentUser={currentUser} />
              )}

              {/* Card Inspection Submenus */}
              {activeMenu === 'inspection_dashboard' && isMenuAllowedForUser(currentUser, 'inspection_dashboard') && (
                <ToiletInspection
                  currentUser={currentUser}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  initialMode="dashboard"
                />
              )}

              {activeMenu === 'inspection_form' && isMenuAllowedForUser(currentUser, 'inspection_form') && (
                <ToiletInspection
                  currentUser={currentUser}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  initialMode="form"
                />
              )}

              {/* Accounting Submenus */}
              {activeMenu === 'accounting_bopo' && isMenuAllowedForUser(currentUser, 'accounting_bopo') && (
                <BopoView
                  currentUser={currentUser}
                  selectedDate={selectedDate}
                />
              )}

              {/* HC Area Submenus */}
              {activeMenu === 'hc_employees' && isMenuAllowedForUser(currentUser, 'hc_employees') && (
                <EmployeesView
                  currentUser={currentUser}
                  selectedDate={selectedDate}
                />
              )}

              {activeMenu === 'hc_kpi' && isMenuAllowedForUser(currentUser, 'hc_kpi') && (
                <KpiKaryawanView
                  currentUser={currentUser}
                  selectedDate={selectedDate}
                />
              )}

              {/* Maintenance Submenus */}
              {activeMenu.startsWith('maintenance_') && isMenuAllowedForUser(currentUser, activeMenu) && (
                <MaintenanceScheduleView
                  currentUser={currentUser}
                  activeMenu={activeMenu}
                />
              )}

              {activeMenu === 'iot_monitoring' && isMenuAllowedForUser(currentUser, 'iot_monitoring') && (
                <MonitoringSuhuView
                  currentUser={currentUser}
                  selectedDate={selectedDate}
                />
              )}

              {activeMenu === 'lost_and_found' && isMenuAllowedForUser(currentUser, 'lost_and_found') && (
                <LostAndFoundView
                  currentUser={currentUser}
                  selectedDate={selectedDate}
                />
              )}

              {activeMenu === 'google_review' && isMenuAllowedForUser(currentUser, 'google_review') && (
                <GoogleReviewView currentUser={currentUser} />
              )}

              {/* Admin Management */}
              {activeMenu === 'admin_users_outlets' && isMenuAllowedForUser(currentUser, 'admin_users_outlets') && (
                <UserOutletManagement
                  currentUser={currentUser}
                  onSessionReset={handleLogout}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Cloud DB & OCR Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
