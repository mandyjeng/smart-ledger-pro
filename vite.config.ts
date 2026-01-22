
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // 確保 process.env 在瀏覽器環境中可用
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
  },
  base: './', // 確保在 GitHub Pages 的子路徑下能正確讀取資源
});
