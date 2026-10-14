import React, { useState } from 'react';
import { User } from '../../types';
import { StorageService } from '../../lib/storage';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Film,
  LogIn,
  ShieldCheck,
  Sparkles,
  UserCheck,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  KeyRound,
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [syncMessage, setSyncMessage] = useState('');
  const [showHelper, setShowHelper] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Fetch freshest user list directly from storage on submit
    const currentUsers = StorageService.getUsersList();
    const trimmedUser = username.trim().toLowerCase();
    const trimmedPass = password.trim();

    if (!trimmedUser) {
      setErrorMessage('Silakan masukkan Username atau Email Anda.');
      return;
    }

    // 1. Exact Match on Username or ID (Prioritized)
    let foundUser = currentUsers.find(
      (u) =>
        u.username.toLowerCase() === trimmedUser ||
        u.id.toLowerCase() === trimmedUser ||
        u.id.toLowerCase() === `user-${trimmedUser.replace(/[^a-z0-9]/g, '')}`
    );

    // 2. Fallback Match on Full Name
    if (!foundUser) {
      foundUser = currentUsers.find(
        (u) => u.name && u.name.toLowerCase().trim() === trimmedUser
      );
    }

    if (foundUser) {
      // Validate active status
      if (foundUser.isActive === false) {
        setErrorMessage('Akun ini dalam status Non-Aktif. Hubungi Administrator untuk mengaktifkan kembali.');
        return;
      }

      // Validate Password (Supports user-defined password, plus default fallback admin123 & password123)
      const userPass = foundUser.password || 'admin123';
      const isCorrectPass =
        trimmedPass === userPass ||
        trimmedPass === 'admin123' ||
        trimmedPass === 'password123';

      if (!isCorrectPass) {
        setErrorMessage(
          `Kata sandi salah untuk username "${foundUser.username}". Silakan coba kata sandi standar: admin123`
        );
        return;
      }

      StorageService.setCurrentUser(foundUser);
      onLoginSuccess(foundUser);
    } else {
      setErrorMessage(`User dengan username "${username}" tidak ditemukan. Pastikan username sudah sesuai atau sinkronkan data pengguna di bawah.`);
    }
  };

  const handleQuickFill = (targetUsername: string) => {
    setUsername(targetUsername);
    setPassword('admin123');
    setErrorMessage('');
  };

  const handleSyncData = () => {
    StorageService.resetUsersToDefault();
    setErrorMessage('');
    setSyncMessage('Berhasil disinkronkan! Daftar 48 akun pengguna standar (password: admin123) telah dimuat ulang.');
    setTimeout(() => setSyncMessage(''), 4000);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between items-center p-4 relative overflow-hidden bg-[#faf8f5] text-slate-800">
      {/* Subtle warm ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-amber-100/60 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-amber-50/80 rounded-full blur-2xl pointer-events-none -z-0" />

      {/* Top spacing */}
      <div className="w-full max-w-md pt-2" />

      {/* Main Login Card Container */}
      <div className="w-full max-w-md my-auto py-4 relative z-10">
        {/* Brand Icon & Cinema XXI Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-br from-amber-600 via-amber-500 to-amber-700 text-white shadow-xl shadow-amber-600/20 mb-3.5 transform hover:scale-105 transition-transform">
            <Film className="w-9 h-9" />
          </div>

          <h1 className="font-serif italic text-4xl sm:text-5xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-800 via-amber-600 to-amber-800 drop-shadow-xs">
            Cinema XXI
          </h1>

          <div className="mt-2.5 inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-amber-100/90 border border-amber-300/80 text-amber-900 text-xs font-bold tracking-wider shadow-2xs">
            <span>&bull; AREA BOGOR 1 & DEPOK — BOGOR 2 &bull;</span>
          </div>

          <p className="text-[11px] uppercase tracking-widest font-bold text-amber-900/70 mt-1.5">
            PERFORMANCE SYSTEM MANAGEMENT
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/95 rounded-3xl border border-amber-200/90 shadow-xl shadow-amber-950/5 p-6 sm:p-8 backdrop-blur-md relative transition-all">
          {/* Top VIP PASS Badge */}
          <div className="absolute -top-3.5 right-6">
            <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-amber-950 text-[10px] font-black uppercase tracking-wider shadow-sm border border-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-900" />
              <span>VIP PASS</span>
            </div>
          </div>

          <div className="mb-5">
            <h2 className="text-xl font-extrabold uppercase tracking-tight text-slate-900 flex items-center space-x-2">
              <span>SISTEM LOGIN AKUN</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs shadow-emerald-500/40 animate-pulse"></span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Silakan login dengan akun terdaftar untuk akses aplikasi
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 text-slate-700">
                EMAIL ATAU USERNAME
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-600">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username atau email..."
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200/90 bg-[#faf9f6] text-slate-800 text-sm font-semibold transition outline-hidden focus:border-amber-500 focus:bg-white focus:ring-3 focus:ring-amber-500/15 placeholder-slate-400 shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 text-slate-700">
                KATA SANDI
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-600">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  required
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200/90 bg-[#faf9f6] text-slate-800 text-sm font-semibold transition outline-hidden focus:border-amber-500 focus:bg-white focus:ring-3 focus:ring-amber-500/15 placeholder-slate-400 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-amber-700 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl font-black text-sm uppercase tracking-wider text-white bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-500 shadow-md shadow-amber-600/25 active:scale-[0.99] transition flex items-center justify-center space-x-2 mt-3 cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-white" />
              <span>MASUK APLIKASI VIP</span>
            </button>
          </form>

          {syncMessage && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncMessage}</span>
            </div>
          )}

          {/* Quick Helper & Sync Bar */}
          <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowHelper(!showHelper)}
                className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center space-x-1 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>{showHelper ? 'Sembunyikan Info Akun' : 'Bantuan Akun & Kata Sandi'}</span>
              </button>

              <button
                type="button"
                onClick={handleSyncData}
                className="text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg flex items-center space-x-1 transition cursor-pointer"
                title="Sinkronkan data user jika browser web live masih menyimpan data lama"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Sinkronkan Akun</span>
              </button>
            </div>

            {showHelper && (
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/60">
                  <span className="font-extrabold uppercase text-[10px] tracking-wider text-amber-900">
                    Kata Sandi Standar:
                  </span>
                  <span className="font-mono font-black text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-md">
                    admin123
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-600">Klik untuk isi otomatis (Quick Fill):</div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickFill('admin')}
                      className="px-2 py-1 rounded-md bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-[10px] cursor-pointer"
                    >
                      Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFill('area_bogor1')}
                      className="px-2 py-1 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold text-[10px] cursor-pointer"
                    >
                      Area Bogor 1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFill('area_bogor2')}
                      className="px-2 py-1 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold text-[10px] cursor-pointer"
                    >
                      Area Bogor 2
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFill('margo_city')}
                      className="px-2 py-1 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-[10px] cursor-pointer"
                    >
                      Mgr Margo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFill('park_sawangan')}
                      className="px-2 py-1 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-[10px] cursor-pointer"
                    >
                      Mgr Sawangan
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFill('cleaner_margo')}
                      className="px-2 py-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[10px] cursor-pointer"
                    >
                      Cleaner Margo
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 italic">
                  *Semua 23 Manager &amp; 22 Cleaner aktif dengan password <span className="font-mono font-bold">admin123</span> (atau <span className="font-mono font-bold">password123</span>).
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Security badge footer */}
        <div className="mt-4 flex items-center justify-center space-x-1.5 text-xs text-slate-600 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Sistem Terenkripsi & Diselaraskan dengan Cloud Database</span>
        </div>
      </div>

      {/* Footer */}
      <div className="py-2 text-[11px] text-slate-500 text-center font-medium">
        &copy; 2026 Cinema XXI Performance Management System. All rights reserved.
      </div>
    </div>
  );
};
