import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { User } from '../../types';
import { Film, Sparkles, ShieldCheck, Clapperboard } from 'lucide-react';

interface SplashScreenProps {
  user: User;
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ user, onComplete }) => {
  const [stage, setStage] = useState<'loading' | 'curtain'>('loading');

  function getRoleTitle(u: User) {
    switch (u.role) {
      case 'admin':
        return 'Admin XXI • Executive Access';
      case 'area_manager':
        return 'Area Manager • Regional Access';
      case 'manager':
        return 'Manager Outlet • Cinema Access';
      case 'cleaner':
        return 'Cleaner Staff • Hygiene Access';
      default:
        return 'XXI VIP Member';
    }
  }

  useEffect(() => {
    const curtainTimer = setTimeout(() => {
      setStage('curtain');
    }, 2200);

    const finishTimer = setTimeout(() => {
      onComplete();
    }, 2800);

    return () => {
      clearTimeout(curtainTimer);
      clearTimeout(finishTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center overflow-hidden pointer-events-auto select-none">
      {/* Left Velvet Cinema Curtain */}
      <motion.div
        initial={{ x: '0%' }}
        animate={{ x: stage === 'curtain' ? '-102%' : '0%' }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-[#0f051d] via-[#1f0b3a] to-[#2e1052] border-r border-amber-400/30 shadow-2xl z-10"
      />

      {/* Right Velvet Cinema Curtain */}
      <motion.div
        initial={{ x: '0%' }}
        animate={{ x: stage === 'curtain' ? '102%' : '0%' }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-[#0f051d] via-[#1f0b3a] to-[#2e1052] border-l border-amber-400/30 shadow-2xl z-10"
      />

      {/* Center Stage Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: stage === 'curtain' ? 0 : 1,
          scale: stage === 'curtain' ? 1.08 : 1,
          filter: stage === 'curtain' ? 'blur(8px)' : 'blur(0px)',
        }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-20 flex flex-col items-center justify-center px-6 text-center max-w-lg w-full"
      >
        {/* Ambient Golden Spotlight Glow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 0.45, scale: 1.15 }}
          transition={{ duration: 1.8, ease: 'easeOut' }}
          className="absolute -top-24 w-96 h-96 rounded-full bg-amber-400/25 blur-3xl pointer-events-none"
        />

        {/* Animated Emblem */}
        <motion.div
          initial={{ y: -25, opacity: 0, rotate: -8 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
          className="relative mb-5"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 p-[2px] shadow-[0_0_40px_rgba(250,204,21,0.45)]">
            <div className="w-full h-full rounded-[22px] bg-[#1e0a38] flex items-center justify-center relative overflow-hidden">
              <Film className="w-10 h-10 text-amber-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]" />
              <motion.div
                initial={{ x: '-150%' }}
                animate={{ x: '150%' }}
                transition={{ duration: 1.4, delay: 0.3, ease: 'easeInOut' }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/30 to-transparent skew-x-12"
              />
            </div>
          </div>
        </motion.div>

        {/* Cinema XXI Brand Title */}
        <motion.div
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.55, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-baseline justify-center space-x-2.5 mb-2"
        >
          <span className="font-cinema-script text-5xl sm:text-6xl text-[#FEF08A] drop-shadow-[0_2px_16px_rgba(250,204,21,0.4)]">
            Cinema
          </span>
          <span className="font-cinema-serif text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#FFFBEB] via-[#FACC15] to-[#D97706] tracking-wider drop-shadow-sm">
            XXI
          </span>
        </motion.div>

        {/* Area Subtitle Pill */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.35 }}
          className="inline-flex items-center space-x-2 px-4 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 text-[11px] font-extrabold tracking-widest uppercase mb-7 shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>AREA BOGOR 1 & DEPOK — BOGOR 2</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        </motion.div>

        {/* VIP User Welcome Pass Card */}
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.55, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="w-full p-5 rounded-3xl bg-white/10 backdrop-blur-md border border-amber-300/30 shadow-2xl space-y-3"
        >
          <div className="flex items-center justify-center space-x-2 text-amber-300 text-[11px] font-black uppercase tracking-widest">
            <Clapperboard className="w-3.5 h-3.5" />
            <span>OTORISASI VIP BERHASIL</span>
          </div>

          <div>
            <p className="text-xs text-purple-200 font-medium">Selamat Datang,</p>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
              {user.name}
            </h2>
            <p className="text-xs font-bold text-amber-300 mt-1">
              {getRoleTitle(user)}
            </p>
          </div>

          {/* Animated Progress Bar */}
          <div className="pt-2 space-y-2">
            <div className="h-2 w-full rounded-full bg-purple-950/90 border border-purple-700/50 overflow-hidden p-0.5">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.75, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-400 shadow-[0_0_12px_rgba(250,204,21,0.8)]"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-purple-200/80 font-semibold px-1">
              <span className="flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Menyiapkan Dashboard Eksekutif...</span>
              </span>
              <button
                type="button"
                onClick={onComplete}
                className="text-amber-300 hover:text-amber-200 underline cursor-pointer font-bold"
              >
                Lewati &rarr;
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};
