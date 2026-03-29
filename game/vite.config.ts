import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'
import { openAiCompatProxyPlugin } from './vite-plugins/openaiCompatProxy'

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')) as { version: string }

export default defineConfig(({ mode }) => ({
  plugins: [react(), openAiCompatProxyPlugin()],
  server: { port: 5173, strictPort: true },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  base: mode === 'production' ? './' : '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
}))
