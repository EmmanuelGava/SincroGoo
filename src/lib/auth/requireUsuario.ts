import { getUsuarioIdFromSession } from '@/lib/supabase/client'

export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export async function requireUsuarioId(): Promise<string> {
  const usuarioId = await getUsuarioIdFromSession()
  if (!usuarioId) {
    throw new AuthError(401, 'No autenticado')
  }
  return usuarioId
}

export function jsonAuthError(error: unknown) {
  if (error instanceof AuthError) {
    return { body: { error: error.message }, status: error.status }
  }
  return null
}
