import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/lib/**/__tests__/**/*.test.ts',
      'src/app/api/chat/**/__tests__/**/*.test.ts',
      'src/app/servicios/messaging/whatsapp/modules/__tests__/**/*.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
