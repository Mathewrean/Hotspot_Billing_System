'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Force light theme - no dark mode switching for captive portal consistency
  return <NextThemesProvider defaultTheme="light" forcedTheme="light" {...props}>{children}</NextThemesProvider>
}
