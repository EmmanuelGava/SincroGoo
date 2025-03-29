'use client'

import React, { useState } from 'react'
import { useServerInsertedHTML } from 'next/navigation'
import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

export default function EmotionRegistry({
  children,
}: {
  children: React.ReactNode
}) {
  const [emotionCache] = useState(() => {
    const cache = createCache({ key: 'mui-style' })
    cache.compat = true
    return cache
  })

  useServerInsertedHTML(() => {
    return (
      <style
        data-emotion={`${emotionCache.key} ${Object.keys(emotionCache.inserted).join(' ')}`}
        dangerouslySetInnerHTML={{
          __html: Object.values(emotionCache.inserted).join(' '),
        }}
      />
    )
  })

  return (
    <CacheProvider value={emotionCache}>
      <CssBaseline />
      {children}
    </CacheProvider>
  )
} 