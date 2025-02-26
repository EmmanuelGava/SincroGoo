"use client"

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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <SiteHeader />

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-32 pb-24 text-center">
        <motion.div
          initial="initial"
          animate="animate"
          variants={fadeIn}
          className="space-y-6 max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white pb-2">
              Sincroniza tus precios entre 
              <span className="bg-gradient-to-r from-blue-400 via-green-400 to-orange-400 bg-clip-text text-transparent"> Google Sheets </span>
              y
              <span className="bg-gradient-to-r from-orange-400 via-red-400 to-violet-500 bg-clip-text text-transparent"> Slides</span>
            </h1>
          </motion.div>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Actualiza automáticamente los precios en tus presentaciones cuando cambien en tus hojas de cálculo
          </p>
          <div className="flex justify-center gap-4 pt-8">
            <Button 
              size="lg" 
              className="gap-2 text-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors"
              onClick={handleSignIn}
            >
              <FileSpreadsheet className="w-5 h-5" />
              Comienza ahora
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="gap-2 text-lg border-slate-200 dark:border-slate-600 bg-white/50 dark:bg-slate-800/50 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500"
            >
              Ver demo
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <motion.div
          initial="initial"
          animate="animate"
          variants={fadeIn}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
              className="bg-white dark:bg-slate-900/50 rounded-xl p-6 border border-slate-200 dark:border-slate-800 hover:border-violet-200 dark:hover:border-violet-500/30 transition-all duration-300"
            >
              <div className="flex items-center gap-4 mb-4">
                <feature.icon className="w-8 h-8 text-violet-500" />
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{feature.title}</h2>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mb-6">{feature.description}</p>
              <ul className="space-y-3">
                {feature.checks.map((check, i) => (
                  <li key={i} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <svg
                      className="w-5 h-5 text-green-500 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>{check}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How it Works Section */}
      <section className="container mx-auto px-4 py-16">
        <motion.div
          initial="initial"
          animate="animate"
          variants={fadeIn}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">
            ¿Cómo funciona?
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-300">
            Tres simples pasos para mantener tus presentaciones actualizadas
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-center"
          >
            <div className="bg-blue-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileSpreadsheet className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">1. Conecta tus documentos</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Selecciona las hojas de cálculo y presentaciones que deseas sincronizar
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <div className="bg-green-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">2. Configura los enlaces</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Define qué celdas se actualizarán en cada diapositiva
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center"
          >
            <div className="bg-orange-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">3. ¡Listo!</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Los cambios se sincronizarán automáticamente
            </p>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <motion.div
          initial="initial"
          animate="animate"
          variants={fadeIn}
          className="bg-white dark:bg-slate-900/50 rounded-2xl p-12 text-center max-w-4xl mx-auto border border-slate-200 dark:border-slate-800"
        >
          <h2 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">
            Comienza a sincronizar tus documentos hoy
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
            Mantén tus presentaciones siempre actualizadas con los últimos precios de forma automática
          </p>
          <Button 
            size="lg" 
            className="gap-2 text-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors"
            onClick={handleSignIn}
          >
            <Image src="/google.svg" alt="Google" width={24} height={24} className="rounded-full bg-white p-1" />
            Conectar con Google
          </Button>
        </motion.div>
      </section>
    </div>
  )
}

