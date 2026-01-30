import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        host: true,
        proxy: {
            '/api-zmk': {
                target: 'https://app.structura-most.ru',
                changeOrigin: true,
                secure: true,
            },
            '/api': {
                target: 'https://api.structura-most.ru',
                changeOrigin: true,
                secure: true,
                rewrite: (path) => path.replace(/^\/api/, '')
            }
        }
    }
})
