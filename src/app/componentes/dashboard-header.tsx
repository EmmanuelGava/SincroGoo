"use client"

import { AppBar, Toolbar, Typography, Button, Box, Avatar } from '@mui/material';
import { LogoutOutlined, PersonOutline } from '@mui/icons-material';
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { toast } from "sonner"

interface DashboardHeaderProps {
  userName: string
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false })
      toast.success("Sesión cerrada correctamente")
      router.push("/")
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
      toast.error("Error al cerrar sesión")
    }
  }

  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ mb: 4 }}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Dashboard
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonOutline fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              Bienvenido, {userName}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            onClick={handleLogout}
            startIcon={<LogoutOutlined />}
          >
            Cerrar sesión
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  )
}

