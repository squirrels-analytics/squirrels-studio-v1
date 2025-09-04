import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/squirrels-studio-v1/',
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index.js',
        assetFileNames: (assetInfo) => {
          const isCss = assetInfo.originalFileNames.some((n) => typeof n === 'string' && /\.css$/i.test(n))
          if (isCss) {
            return 'assets/index.css'
          }
          return 'assets/[name][extname]'
        },
      },
    },
    // Force single bundle so all JS goes to index.js
    cssCodeSplit: false,
    modulePreload: false,
  },
})
