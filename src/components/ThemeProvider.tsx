'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    // 초기 테마: localStorage 우선, 없으면 html 클래스 확인
    const stored = localStorage.getItem('theme') as Theme | null
    const initial = stored === 'light' ? 'light' : 'dark'
    setThemeState(initial)
    applyTheme(initial)
  }, [])

  function applyTheme(t: Theme) {
    if (t === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
  }

  async function setTheme(t: Theme) {
    setThemeState(t)
    applyTheme(t)
    localStorage.setItem('theme', t)

    // DB에도 저장
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    if (data.user) {
      await supabase.from('users').update({ theme: t }).eq('id', data.user.id)
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
