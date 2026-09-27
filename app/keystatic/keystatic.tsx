// app/keystatic/keystatic.tsx: Keystatic's UI is client-only and its bundle carries no 'use client' of its own
'use client'

import { makePage } from '@keystatic/next/ui/app'
import config from '@/keystatic.config'

export default makePage(config)
