
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // 增加預設值防止 process.env.API_KEY 為 undefined 時導致的語法錯誤
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
  },
  base: '/smart-ledger-pro/',
  // build: {
  //   outDir: 'dist',
  //   sourcemap: false,
  // }
});
