import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  base: mode === 'production' ? './' : '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
}))
