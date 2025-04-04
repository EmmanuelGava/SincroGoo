import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import authService from '@/lib/supabase/services/auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'

export async function GET() {
  try {
    // Obtener la sesión de NextAuth
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No hay sesión de usuario' },
        { status: 401 }
      )
    }
    
    // Sincronizar el usuario con Supabase usando el nuevo método
    const usuario = await authService.sincronizarUsuario({
      email: session.user.email,
      name: session.user.name || '',
      image: session.user.image || ''
    });
    
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
    console.error('❌ [Sync] Error en endpoint:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    // Obtener la sesión de NextAuth
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No hay sesión de usuario' },
        { status: 401 }
      )
    }
    
    // Sincronizar el usuario con Supabase usando el nuevo método
    const usuario = await authService.sincronizarUsuario({
      email: session.user.email,
      name: session.user.name || '',
      image: session.user.image || ''
    });
    
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
    console.error('❌ [Sync] Error en endpoint:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 