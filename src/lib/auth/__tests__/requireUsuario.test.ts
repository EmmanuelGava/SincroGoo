import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  getUsuarioIdFromSession: vi.fn(),
}))

import { AuthError, jsonAuthError, requireUsuarioId } from '../requireUsuario'
import { getUsuarioIdFromSession } from '@/lib/supabase/client'

const mockGetUsuarioIdFromSession = vi.mocked(getUsuarioIdFromSession)

describe('requireUsuarioId', () => {
  beforeEach(() => {
    mockGetUsuarioIdFromSession.mockReset()
  })

  it('devuelve el UUID de usuarios, no el Google sub', async () => {
    const usuarioUuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    mockGetUsuarioIdFromSession.mockResolvedValue(usuarioUuid)

    await expect(requireUsuarioId()).resolves.toBe(usuarioUuid)
  })

  it('lanza AuthError 401 si no hay sesión o fila en usuarios', async () => {
    mockGetUsuarioIdFromSession.mockResolvedValue(null)

    await expect(requireUsuarioId()).rejects.toMatchObject({
      name: 'AuthError',
      status: 401,
      message: 'No autenticado',
    })
  })
})

describe('jsonAuthError', () => {
  it('mapea AuthError a body + status', () => {
    const error = new AuthError(401, 'No autenticado')
    expect(jsonAuthError(error)).toEqual({
      body: { error: 'No autenticado' },
      status: 401,
    })
  })

  it('devuelve null para errores que no son AuthError', () => {
    expect(jsonAuthError(new Error('boom'))).toBeNull()
  })
})
