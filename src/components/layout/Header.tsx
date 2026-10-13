import React from 'react';
import { User } from '../../types';
import {
  Calendar,
  LogOut,
  Film,
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
    <header className="sticky top-0 z-30 h-[56px] px-4 flex items-center justify-between bg-[#FFFFFF] border-b border-[#E5E7EB]">
      {/* Kiri: Posisi logo di pojok kiri atas dengan gradient #4A1D6A ke #5E2B97 */}
      <div className={`flex items-center space-x-2.5 transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-[250px]'} shrink-0`}>
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
        <div className="flex items-center space-x-2 px-3 py-1 rounded-xl bg-[#581c87] text-white shadow-xs overflow-hidden">
          <span className="text-xl shrink-0 leading-none select-none">🎬</span>
          {!collapsed && (
            <div className="flex items-baseline space-x-1.5 select-none whitespace-nowrap">
              <span className="font-cinema-script text-2xl font-normal text-[#FEF08A] leading-none">
                Cinema
              </span>
              <span className="font-cinema-serif text-base font-black text-[#FACC15] tracking-wider leading-none">
                XXI
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tengah: Header visi di tengah top bar */}
      <div className="hidden lg:flex flex-col text-center px-4 py-1">
        <p className="text-[11px] font-semibold text-[#374151] leading-tight">
          <span className="font-bold text-[#4A1D6A]">Visi Cinema XXI:</span> Menjadi jejaring bioskop terbaik di dunia, dan menjadi kebanggaan Indonesia.
        </p>
        <p className="text-[9px] tracking-widest uppercase font-semibold text-[#6B7280] mt-0.5">
          UNCOMPROMISED QUALITY, AFFORDABLE ENTERTAINMENT, FOREVER BETTER
        </p>
      </div>

      {/* Kanan: Role admin di kanan atas & controls */}
      <div className="flex items-center space-x-2.5">
        {/* Role Admin Badge */}
        <div className="flex items-center space-x-2 px-2.5 py-1 rounded-full border border-[#E5E7EB] bg-[#F8F9FC] text-[#374151] text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <div className="leading-tight text-left">
            <span className="text-[9px] uppercase font-bold text-[#6D28D9] tracking-wider block">
              ROLE: {currentUser?.role?.toUpperCase() || 'ADMIN'}
            </span>
            <span className="text-[11px] font-bold text-[#111827] truncate max-w-[120px] block">
              {currentUser?.name || 'Administrator'}
            </span>
          </div>
        </div>

        {/* Date Picker Button & Quick Today Reset */}
        <div className="flex items-center space-x-1.5 px-2 py-1 rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] text-[#374151] text-xs">
          <Calendar className="w-3.5 h-3.5 text-[#6D28D9] shrink-0" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-transparent text-[11px] font-medium cursor-pointer outline-hidden focus:ring-0 p-0 text-[#111827]"
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
            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F3E8FF] text-[#6D28D9] hover:bg-[#E9D5FF] transition cursor-pointer"
          >
            Today
          </button>
        </div>

        {/* Settings / Cloud DB Button */}
        <button
          onClick={onOpenSettings}
          title="Pengaturan Database Supabase & Mistral OCR"
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] hover:bg-[#F3E8FF] text-[#6D28D9] transition cursor-pointer text-xs font-semibold"
        >
          <Database className="w-3.5 h-3.5 text-[#6D28D9]" />
          <span className="hidden md:inline text-[11px] text-[#4B5563]">Cloud &amp; OCR</span>
        </button>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          title="Keluar dari Sistem"
          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px]">Keluar</span>
        </button>
      </div>
    </header>
  );
};
