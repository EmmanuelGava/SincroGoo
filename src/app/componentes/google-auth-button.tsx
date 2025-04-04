"use client"

import { useState } from 'react';
import { Button } from "@/componentes/ui";
import { Google } from '@mui/icons-material';
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function GoogleAuthButton() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter()

  const handleClick = async () => {
    try {
      setIsLoading(true);
      const result = await signIn("google", {
        redirect: true,
        callbackUrl: "/dashboard"
      });
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      toast.error("Error al iniciar sesión con Google")
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outlined"
      size="large"
      startIcon={<Google />}
      onClick={handleClick}
      disabled={isLoading}
      fullWidth
    >
      {isLoading ? 'Iniciando sesión...' : 'Continuar con Google'}
    </Button>
  );
}
