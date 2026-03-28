import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync } from 'fs';
var pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
export default defineConfig(function (_a) {
    var mode = _a.mode;
    return ({
        plugins: [react()],
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
    });
});
