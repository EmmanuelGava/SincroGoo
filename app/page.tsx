"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, ShieldCheck, Eye, Zap } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { motion } from "framer-motion"

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

const testimonials = [
  {
    name: "María González",
    role: "Gerente de Marketing",
    content: "SinCroGoo ha simplificado enormemente nuestro proceso de actualización de precios. Ahora puedo mantener todas nuestras presentaciones actualizadas sin esfuerzo."
  },
  {
    name: "Carlos Rodríguez",
    role: "Director Comercial",
    content: "Una herramienta indispensable para nuestro equipo de ventas. La sincronización automática nos ahorra horas de trabajo manual."
  },
  {
    name: "Ana Martínez",
    role: "Coordinadora de Proyectos",
    content: "La interfaz es intuitiva y fácil de usar. La configuración inicial fue rápida y ahora todo funciona de manera automática."
  }
]

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  },
  hover: { 
    scale: 1.02,
    y: -5,
    transition: {
      duration: 0.2,
      ease: "easeInOut"
    }
  }
}

const buttonVariants = {
  hover: { 
    scale: 1.05,
    transition: {
      duration: 0.2,
      ease: "easeInOut"
    }
  },
  tap: { 
    scale: 0.95,
    transition: {
      duration: 0.1
    }
  }
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <SiteHeader />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-32 pb-24">
        <div className="text-center max-w-3xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white pb-2"
          >
            Sincroniza tus precios entre{" "}
            <span className="bg-gradient-to-r from-blue-400 via-green-400 to-orange-400 bg-clip-text text-transparent">
              Google Sheets
            </span>{" "}
            y{" "}
            <span className="bg-gradient-to-r from-orange-400 via-red-400 to-violet-500 bg-clip-text text-transparent">
              Slides
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 text-xl text-slate-600 dark:text-slate-300"
          >
            Actualiza automáticamente los precios en tus presentaciones cuando cambien en tus hojas de cálculo
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-10 flex justify-center"
          >
            <motion.div
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <Link href="/auth/login">
                <Button 
                  size="lg" 
                  className="gap-2 text-lg bg-violet-600 hover:bg-violet-700 text-white transition-all duration-300 transform hover:shadow-lg px-8"
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  Comenzar ahora
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover="hover"
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-slate-900/50 rounded-xl p-6 border border-slate-200 dark:border-slate-800 hover:border-violet-200 dark:hover:border-violet-500/30 transition-all duration-300 hover:shadow-xl"
            >
              <div className="flex items-center gap-4 mb-4">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  <feature.icon className="w-8 h-8 text-violet-500" />
                </motion.div>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{feature.title}</h2>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mb-6">{feature.description}</p>
              <ul className="space-y-3">
                {feature.checks.map((check, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 + i * 0.1 }}
                    className="flex items-center gap-2 text-slate-700 dark:text-slate-300"
                  >
                    <motion.svg
                      whileHover={{ scale: 1.2 }}
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
                    </motion.svg>
                    <span>{check}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Testimonials Section */}
      <section className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
            Lo que dicen nuestros usuarios
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-300">
            Descubre cómo SinCroGoo está ayudando a empresas como la tuya
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover="hover"
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-slate-900/50 rounded-xl p-6 border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300"
            >
              <p className="text-slate-600 dark:text-slate-300 mb-6">"{testimonial.content}"</p>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{testimonial.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{testimonial.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          <p>Al usar nuestro servicio, aceptas nuestros</p>
          <div className="space-x-2">
            <Link href="/terms-of-service" className="text-blue-600 hover:underline dark:text-blue-400">
              Términos de Servicio
            </Link>
            <span>y</span>
            <Link href="/privacy-policy" className="text-blue-600 hover:underline dark:text-blue-400">
              Política de Privacidad
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}