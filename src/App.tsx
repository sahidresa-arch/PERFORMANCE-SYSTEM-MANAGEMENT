import React, { useState, useEffect } from 'react';
import { User } from './types';
import { StorageService } from './lib/storage';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { LoginView } from './components/auth/LoginView';
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
import { SettingsModal } from './components/settings/SettingsModal';

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const stored = StorageService.getCurrentUser();
    if (stored) return stored;
    const isVisited = localStorage.getItem('cinema_xxi_visited');
    if (!isVisited) {
      localStorage.setItem('cinema_xxi_visited', 'true');
      const admin = StorageService.getUsersList()[0];
      if (admin) {
        StorageService.setCurrentUser(admin);
        return admin;
      }
    }
    return null;
  });
  const [selectedDate, setSelectedDate] = useState(() => getTodayDateString());
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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

  // Guard for cleaner role: redirect automatically to inspection form
  useEffect(() => {
    if (currentUser?.role === 'cleaner' && !activeMenu.startsWith('inspection_')) {
      setActiveMenu('inspection_form');
    }
  }, [currentUser, activeMenu]);

  // One-time cleanup of legacy dummy seed data jika belum pernah dibersihkan
  useEffect(() => {
    try {
      const isCleaned = localStorage.getItem('cinema_xxi_clean_v1');
      if (!isCleaned) {
        localStorage.removeItem('cinema_xxi_daily_sales');
        localStorage.removeItem('cinema_xxi_baking_sales');
        localStorage.removeItem('cinema_xxi_toilet_inspections');
        localStorage.removeItem('cinema_xxi_movies_history');
        // Bersihkan seluruh occupancy lama
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith('cinema_xxi_occupancy_')) {
            localStorage.removeItem(k);
          }
        });
        localStorage.setItem('cinema_xxi_clean_v1', 'true');
        StorageService.broadcastChange('all-reset');
      }
    } catch {
      // ignore
    }
  }, []);

  // Sync listener across windows / components & Supabase Realtime
  useEffect(() => {
    const handleStorageUpdate = (e: any) => {
      const type = e.detail?.type;
      if (type === 'auth' || type === 'all-reset') {
        setCurrentUser(StorageService.getCurrentUser());
      }
    };
    window.addEventListener('cinema-xxi-storage-update', handleStorageUpdate);

    let cleanupSupabase: (() => void) | null = null;
    import('./lib/supabase').then((m) => {
      cleanupSupabase = m.setupSupabaseRealtimeSync();
    });

    return () => {
      window.removeEventListener('cinema-xxi-storage-update', handleStorageUpdate);
      if (cleanupSupabase) cleanupSupabase();
    };
  }, []);

  const handleLogout = () => {
    StorageService.resetSession();
    setCurrentUser(null);
  };

  const handleMenuChange = (newMenu: string) => {
    setActiveMenu(newMenu);
    setSelectedDate(getTodayDateString());
  };

  // If not logged in, show Cinema XXI VIP Login Screen
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setSelectedDate(getTodayDateString());
          setActiveMenu('dashboard');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F8F9FC] text-[#374151] antialiased">
      {/* Top Header (tinggi 56px, border bawah #E5E7EB 1px) */}
      <Header
        currentUser={currentUser}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onLogout={handleLogout}
        onOpenSettings={() => setIsSettingsOpen(true)}
        collapsed={collapsed}
        onToggleSidebar={handleToggleCollapse}
      />

      {/* Main Body Shell */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar (fixed left 0 top 0 h-screen, width 260px / 72px) */}
        <Sidebar
          currentUser={currentUser}
          activeMenu={activeMenu}
          setActiveMenu={handleMenuChange}
          onOpenSettings={() => setIsSettingsOpen(true)}
          collapsed={collapsed}
          onToggleCollapse={handleToggleCollapse}
        />

        {/* Content Area: shifted by sidebar width (260px or 72px) with smooth transition */}
        <main
          className={`flex-1 min-w-0 overflow-y-auto p-3 sm:p-5 bg-[#F8F9FC] transition-[margin] duration-300 ease-in-out ${
            collapsed ? 'ml-[72px]' : 'ml-[260px]'
          }`}
        >
          <div className="w-full">
            {/* Dashboard */}
            {activeMenu === 'dashboard' && (
              <ExecutiveDashboard
                currentUser={currentUser}
                selectedDate={selectedDate}
                onNavigate={handleMenuChange}
              />
            )}

            {/* Sales System Submenus */}
            {activeMenu === 'sales_input' && (
              <InputDataSales
                currentUser={currentUser}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            )}

            {activeMenu === 'sales_rekap_daily' && (
              <TabelRekapDaily
                currentUser={currentUser}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            )}

            {activeMenu === 'sales_performance' && (
              <PerformanceDashboard
                currentUser={currentUser}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            )}

            {activeMenu === 'sales_baking' && (
              <PenjualanBaking
                currentUser={currentUser}
                selectedDate={selectedDate}
              />
            )}

            {activeMenu === 'sales_kpi_summary' && (
              <KPISummary
                currentUser={currentUser}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            )}

            {activeMenu === 'sales_google_slide' && (
              <GoogleSlideKPI
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            )}

            {/* Okupansi Rate Submenus */}
            {activeMenu === 'occupancy_rekap' && (
              <RekapOkupansi
                currentUser={currentUser}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            )}

            {activeMenu === 'occupancy_market_intel' && (
              <MarketIntelligence currentUser={currentUser} />
            )}

            {activeMenu === 'occupancy_movie_history' && (
              <HistoryRekapFilm currentUser={currentUser} />
            )}

            {/* Card Inspection Submenus */}
            {activeMenu === 'inspection_dashboard' && (
              <ToiletInspection
                currentUser={currentUser}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                initialMode="dashboard"
              />
            )}

            {activeMenu === 'inspection_form' && (
              <ToiletInspection
                currentUser={currentUser}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                initialMode="form"
              />
            )}

            {/* Accounting Submenus */}
            {activeMenu === 'accounting_bopo' && (
              <BopoView
                currentUser={currentUser}
                selectedDate={selectedDate}
              />
            )}

            {/* HC Area Submenus */}
            {activeMenu === 'hc_employees' && (
              <EmployeesView
                currentUser={currentUser}
                selectedDate={selectedDate}
              />
            )}

            {activeMenu === 'hc_kpi' && (
              <KpiKaryawanView
                currentUser={currentUser}
                selectedDate={selectedDate}
              />
            )}

            {activeMenu === 'lost_and_found' && (
              <LostAndFoundView
                currentUser={currentUser}
                selectedDate={selectedDate}
              />
            )}

            {/* Admin Management */}
            {activeMenu === 'admin_users_outlets' && (
              <UserOutletManagement
                currentUser={currentUser}
                onSessionReset={handleLogout}
              />
            )}
          </div>
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
