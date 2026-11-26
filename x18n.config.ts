import { defineConfig } from '@x18n/core'

export default defineConfig({
  sourceLocale: 'en',
  locales: ['en', 'zh', 'ja'],
  resources: [
    { pattern: 'src/i18n/locales/{locale}/{namespace}.json' },
  ],
})
