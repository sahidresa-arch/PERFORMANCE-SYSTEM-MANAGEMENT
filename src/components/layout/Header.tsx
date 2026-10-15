import React from 'react';
import { User } from '../../types';
import {
  Calendar,
  LogOut,
  Database,
} from 'lucide-react';

interface HeaderProps {
  currentUser: User | null;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  collapsed?: boolean;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  selectedDate,
  onDateChange,
  onLogout,
  onOpenSettings,
  collapsed = false,
  onToggleSidebar,
}) => {
  return (
    <header className="sticky top-0 z-30 min-h-[60px] px-3 sm:px-4 py-1.5 flex items-center justify-between bg-[#FFFFFF] border-b border-[#E5E7EB] shadow-2xs gap-2">
      {/* 1. Kiri: Logo Cinema XXI & Toggle Sidebar */}
      <div className={`flex items-center space-x-2 transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-[200px] xl:w-[230px]'} shrink-0`}>
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            type="button"
            title={collapsed ? "Buka Sidebar" : "Tutup Sidebar"}
            className="p-1.5 rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] hover:bg-[#F3E8FF] text-[#4A1D6A] transition cursor-pointer shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div className="flex items-center space-x-2 px-2.5 py-1 rounded-xl bg-[#581c87] text-white shadow-xs overflow-hidden shrink-0">
          <span className="text-xl shrink-0 leading-none select-none">🎬</span>
          {!collapsed && (
            <div className="flex items-baseline space-x-1 select-none whitespace-nowrap">
              <span className="font-cinema-script text-xl font-normal text-[#FEF08A] leading-none">
                Cinema
              </span>
              <span className="font-cinema-serif text-sm font-black text-[#FACC15] tracking-wider leading-none">
                XXI
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Tengah: Visi Cinema XXI & Three Pillars */}
      <div className="hidden lg:flex flex-col justify-center text-left mx-auto shrink min-w-0 overflow-hidden px-2">
        <div className="text-xs sm:text-[13px] leading-snug truncate">
          <span className="font-bold text-amber-500 mr-1.5">VISI:</span>
          <span className="font-medium text-[#1d4ed8]">
            Menjadi jejaring bioskop terbaik di dunia, dan menjadi kebanggaan Indonesia.
          </span>
        </div>
        <div className="text-[10px] sm:text-[11px] text-slate-500 font-semibold tracking-tight truncate flex items-center gap-1.5 mt-0.5">
          <span className="bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">Uncompromised Quality</span>
          <span>•</span>
          <span className="bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold">Affordable Entertainment</span>
          <span>•</span>
          <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">Forever Better</span>
        </div>
      </div>

      {/* 3. Kanan: Controls Group (Role Admin, Date Picker, Cloud & OCR, Logout) */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* Role Admin Badge */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full border border-[#E5E7EB] bg-[#F8F9FC] text-[#374151] text-xs shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <div className="leading-tight text-left">
            <span className="text-[8px] uppercase font-bold text-[#6D28D9] tracking-wider block">
              ROLE: {currentUser?.role?.toUpperCase() || 'ADMIN'}
            </span>
            <span className="text-[10px] font-bold text-[#111827] truncate max-w-[100px] block">
              {currentUser?.name || 'Administrator'}
            </span>
          </div>
        </div>

        {/* Date Picker Button & Quick Today Reset */}
        <div className="flex items-center space-x-1 px-2 py-1 rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] text-[#374151] text-xs shrink-0">
          <Calendar className="w-3.5 h-3.5 text-[#6D28D9] shrink-0" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-transparent text-[10px] font-medium cursor-pointer outline-hidden focus:ring-0 p-0 text-[#111827]"
          />
          <button
            onClick={() => {
              const now = new Date();
              const y = now.getFullYear();
              const m = String(now.getMonth() + 1).padStart(2, '0');
              const d = String(now.getDate()).padStart(2, '0');
              onDateChange(`${y}-${m}-${d}`);
            }}
            title="Kembali ke Tanggal Hari Ini"
            className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#F3E8FF] text-[#6D28D9] hover:bg-[#E9D5FF] transition cursor-pointer"
          >
            Today
          </button>
        </div>

        {/* Settings / Cloud DB Button */}
        {currentUser?.role === 'admin' && (
          <button
            onClick={onOpenSettings}
            title="Pengaturan Database Supabase & Mistral OCR"
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] hover:bg-[#F3E8FF] text-[#6D28D9] transition cursor-pointer text-xs font-semibold shrink-0"
          >
            <Database className="w-3.5 h-3.5 text-[#6D28D9]" />
            <span className="hidden md:inline text-[10px] text-[#4B5563]">Cloud &amp; OCR</span>
          </button>
        )}

        {/* Logout Button */}
        <button
          onClick={onLogout}
          title="Keluar dari Sistem"
          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition cursor-pointer shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[10px]">Keluar</span>
        </button>
      </div>
    </header>
  );
};
