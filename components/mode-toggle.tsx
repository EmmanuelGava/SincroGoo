"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Evitar hidratación incorrecta
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 text-slate-900 dark:text-white transition-all" />
      ) : (
        <Moon className="h-5 w-5 text-slate-900 dark:text-white transition-all" />
      )}
      <span className="sr-only">Cambiar tema</span>
    </Button>
  )
} 