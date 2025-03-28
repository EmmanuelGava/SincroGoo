import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { supabase, authService } from '@/servicios/supabase/globales/auth-service'

export async function GET() {
  try {
    // Obtener la sesión de NextAuth
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No hay sesión de usuario' },
        { status: 401 }
      )
    }
    
    // Sincronizar el usuario con Supabase
    const usuario = await authService.sincronizarUsuario(session.user)
    
    if (!usuario) {
      return NextResponse.json(
        { error: 'Error al sincronizar usuario con Supabase' },
        { status: 500 }
      )
    }
    
    // Verificar si hay una sesión en Supabase
    const { data: { session: supabaseSession }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      return NextResponse.json(
        { error: 'Error al verificar sesión de Supabase', details: sessionError },
        { status: 500 }
      )
    }
    
    // Devolver información sobre la sincronización
    return NextResponse.json({
      success: true,
      usuario,
      supabaseSession: !!supabaseSession,
      message: 'Usuario sincronizado correctamente'
    })
  } catch (error) {
    console.error('Error en API de sincronización:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    // Obtener la sesión de NextAuth
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No hay sesión de usuario' },
        { status: 401 }
      )
    }
    
    // Sincronizar el usuario con Supabase
    const usuario = await authService.sincronizarUsuario(session.user)
    
    if (!usuario) {
      return NextResponse.json(
        { error: 'Error al sincronizar usuario con Supabase' },
        { status: 500 }
      )
    }
    
    // Devolver información sobre la sincronización
    return NextResponse.json({
      success: true,
      usuario,
      message: 'Usuario sincronizado correctamente'
    })
  } catch (error) {
    console.error('Error en API de sincronización:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error },
      { status: 500 }
    )
  }
} 