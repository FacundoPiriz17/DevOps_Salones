import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { env } from 'node:process'

// https://vite.dev/config/
export default defineConfig({
    server: {
        host: "0.0.0.0",
        port: 5173,
        strictPort: true,
        watch: {
            usePolling: env.CHOKIDAR_USEPOLLING === 'true',
            interval: 300,
        },
        proxy: {
            '/api': {
                target: env.API_PROXY_TARGET || 'http://127.0.0.1:5000',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
        },
    },
    plugins: [react(), tailwindcss()],
})
