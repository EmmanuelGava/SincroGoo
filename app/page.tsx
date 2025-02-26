"use client"

import React from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { FileSpreadsheet, PresentationIcon, ShieldCheck, Clock, Eye, Zap } from "lucide-react"
import { signIn, useSession } from "next-auth/react"
import Image from "next/image"
import { SiteHeader } from "@/components/site-header"

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
}

const features = [
  {
    title: "Acceso seguro",
    description: "Autoriza el acceso solo a los documentos que necesites",
    icon: ShieldCheck,
    checks: [
      "Sin almacenamiento de credenciales",
      "Control total de permisos",
      "Acceso temporal y revocable"
    ]
  },
  {
    title: "Edita con facilidad",
    description: "Interfaz intuitiva para actualizar tus precios",
    icon: Eye,
    checks: [
      "Editor visual de precios",
      "Vista previa de cambios",
      "Historial de actualizaciones"
    ]
  },
  {
    title: "Sincronización automática",
    description: "Mantén tus documentos actualizados",
    icon: Zap,
    checks: [
      "Actualización en tiempo real",
      "Sin configuración compleja",
      "Control de cambios"
    ]
  }
]

export default function Home() {
  const { data: session } = useSession()

  const handleSignIn = async () => {
    try {
      await signIn("google", {
        callbackUrl: "/dashboard",
      })
    } catch (error) {
      console.error("Error al iniciar sesión:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <SiteHeader />

      <main className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Bienvenido a SinCroGoo
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Tu plataforma para gestionar tareas y proyectos de manera eficiente
          </p>

          <div className="max-w-2xl mx-auto">
            <p className="text-gray-700 mb-6">
              SinCroGoo es una aplicación que te ayuda a organizar tus tareas y proyectos
              de manera simple y efectiva. Con nuestra plataforma, podrás:
            </p>

            <ul className="text-left list-disc list-inside mb-8 space-y-2">
              <li>Crear y gestionar tareas fácilmente</li>
              <li>Organizar proyectos y equipos</li>
              <li>Hacer seguimiento de tu progreso</li>
              <li>Colaborar con otros usuarios</li>
            </ul>
          </div>

          <div className="flex justify-center space-x-4">
            <Link 
              href="/auth/login"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link 
              href="/auth/register"
              className="bg-white text-blue-600 px-6 py-3 rounded-lg border border-blue-600 hover:bg-blue-50 transition-colors"
            >
              Registrarse
            </Link>
          </div>

          <div className="mt-12 text-sm text-gray-600">
            <p>Al usar nuestro servicio, aceptas nuestros</p>
            <div className="space-x-2">
              <Link href="/terms-of-service" className="text-blue-600 hover:underline">
                Términos de Servicio
              </Link>
              <span>y</span>
              <Link href="/privacy-policy" className="text-blue-600 hover:underline">
                Política de Privacidad
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

