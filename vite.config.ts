import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || '.'),
      },
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || ''),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || ''),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
        process.env.VITE_SUPABASE_URL && !process.env.VITE_SUPABASE_URL.includes('ctwzvxjjorrczwtcbote')
          ? process.env.VITE_SUPABASE_URL.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '')
          : 'https://mggjtgoucufzftkszqqo.supabase.co'
      ),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
        process.env.VITE_SUPABASE_ANON_KEY && !process.env.VITE_SUPABASE_ANON_KEY.includes('2UV0MOXUy0C5NqWsXaxhtg')
          ? process.env.VITE_SUPABASE_ANON_KEY.trim()
          : 'sb_publishable_8hN55FEmasxtjZRfMM4M4Q_gsvSmk6q'
      ),
      'import.meta.env.VITE_MISTRAL_API_KEY': JSON.stringify(process.env.VITE_MISTRAL_API_KEY || 'mstrl_AtUyYnNPgt6tVyUqo0TjtDXPwG8RyyS8_3oxmaZ'),
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
