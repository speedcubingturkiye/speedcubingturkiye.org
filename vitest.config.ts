// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // mirrors tsconfig paths { "@/*": ["./*"] }
  resolve: { alias: { '@': import.meta.dirname } },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
})
