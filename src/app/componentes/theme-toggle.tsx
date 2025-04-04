"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { IconButton, Menu, MenuItem } from "@mui/material"

export function ThemeToggle() {
  const { setTheme } = useTheme()
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  return (
    <>
      <IconButton
        onClick={handleClick}
        size="small"
        sx={{ 
          position: 'relative',
          width: 40,
          height: 40
        }}
      >
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Cambiar tema</span>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem 
          onClick={() => {
            setTheme("light")
            handleClose()
          }}
        >
          Claro
        </MenuItem>
        <MenuItem 
          onClick={() => {
            setTheme("dark")
            handleClose()
          }}
        >
          Oscuro
        </MenuItem>
        <MenuItem 
          onClick={() => {
            setTheme("system")
            handleClose()
          }}
        >
          Sistema
        </MenuItem>
      </Menu>
    </>
  )
} 