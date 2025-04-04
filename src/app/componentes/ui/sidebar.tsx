"use client"

import * as React from "react"
import { 
  Drawer, 
  Box, 
  IconButton, 
  useTheme,
  useMediaQuery,
  styled
} from "@mui/material"
import { ChevronLeft as ChevronLeftIcon } from "@mui/icons-material"
import { cn } from "@/app/lib/utils"

const DRAWER_WIDTH = 256
const DRAWER_WIDTH_MOBILE = 288
const DRAWER_WIDTH_ICON = 48

interface SidebarContextType {
  open: boolean
  setOpen: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextType | null>(null)

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

interface SidebarProviderProps {
  children: React.ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SidebarProvider({
  children,
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
}: SidebarProviderProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  
  const [_open, _setOpen] = React.useState(defaultOpen)
  const open = openProp ?? _open
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value
      if (setOpenProp) {
        setOpenProp(openState)
      } else {
        _setOpen(openState)
      }
    },
    [setOpenProp, open]
  )

  const toggleSidebar = React.useCallback(() => {
    setOpen((open) => !open)
  }, [setOpen])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "b" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        toggleSidebar()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleSidebar])

  const contextValue = React.useMemo(
    () => ({
      open,
      setOpen,
      isMobile,
      toggleSidebar,
    }),
    [open, setOpen, isMobile, toggleSidebar]
  )

  return (
    <SidebarContext.Provider value={contextValue}>
      {children}
    </SidebarContext.Provider>
  )
}

interface SidebarProps {
  children: React.ReactNode
  className?: string
  variant?: "permanent" | "temporary" | "persistent"
  anchor?: "left" | "right"
}

export function Sidebar({
  children,
  className,
  variant = "permanent",
  anchor = "left",
}: SidebarProps) {
  const { open, isMobile, toggleSidebar } = useSidebar()
  const theme = useTheme()

  const StyledDrawer = styled(Drawer)(({ theme }) => ({
    width: DRAWER_WIDTH,
    flexShrink: 0,
    '& .MuiDrawer-paper': {
      width: DRAWER_WIDTH,
      boxSizing: 'border-box',
      backgroundColor: theme.palette.background.paper,
      borderRight: `1px solid ${theme.palette.divider}`,
      ...(isMobile && {
        width: DRAWER_WIDTH_MOBILE,
      }),
      ...(open === false && !isMobile && {
        width: DRAWER_WIDTH_ICON,
      }),
    },
  }))

  return (
    <StyledDrawer
      variant={isMobile ? "temporary" : variant}
      anchor={anchor}
      open={isMobile ? open : true}
      onClose={toggleSidebar}
      className={cn(className)}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          p: 1,
        }}
      >
        <IconButton onClick={toggleSidebar}>
          <ChevronLeftIcon />
        </IconButton>
      </Box>
      {children}
    </StyledDrawer>
  )
}

export const SidebarContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  padding: theme.spacing(2),
}))

export const SidebarHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
}))

export const SidebarFooter = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  marginTop: 'auto',
}))

export const SidebarGroup = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  padding: theme.spacing(2),
}))

export const SidebarGroupLabel = styled(Box)(({ theme }) => ({
  fontSize: theme.typography.caption.fontSize,
  fontWeight: theme.typography.fontWeightMedium,
  color: theme.palette.text.secondary,
  padding: theme.spacing(1),
}))

export const SidebarMenu = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
}))

export const SidebarMenuItem = styled(Box)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(1),
}))

export const SidebarMenuButton = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '&[data-active="true"]': {
    backgroundColor: theme.palette.action.selected,
  },
}))

export const SidebarMenuAction = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  right: theme.spacing(1),
  top: '50%',
  transform: 'translateY(-50%)',
  opacity: 0,
  transition: theme.transitions.create('opacity'),
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '.MuiMenuItem-root:hover &': {
    opacity: 1,
  },
}))

