import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import eslintPlugin from 'vite-plugin-eslint'

// The dev server only serves the UI; data lives on the backend. Proxy the API
// and the SSE stream so the dev server behaves like the built app on :3008.
const backend = 'http://localhost:3008'

export default defineConfig({
    plugins: [vue(), eslintPlugin()],
    server: {
        port: 3000,
        proxy: {
            '/api': backend,
            '/subscribe': backend,
        },
    },
})
