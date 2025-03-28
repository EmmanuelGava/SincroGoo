import { ServiceResult } from './types';
import { getSession } from "next-auth/react"

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  try {
    const session = await getSession()
    if (!session?.accessToken) {
      throw new Error("No se encontró el token de acceso")
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${session.accessToken}`,
      },
    })

    return response
  } catch (error) {
    console.error("Error en fetchWithAuth:", error)
    throw error
  }
}

export class ApiService {
  protected token: string;
  protected baseUrl: string;

  constructor(token: string) {
    this.token = token;
    this.baseUrl = "https://slides.googleapis.com/v1"
  }

  protected async fetchWithAuth<T>(url: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${this.token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Error HTTP! estado: ${response.status}, mensaje: ${await response.text()}`)
      }

      return response.json()
    } catch (error) {
      console.error("Error en fetchWithAuth:", error)
      throw error
    }
  }

  protected createSuccessResult<T>(data: T): ServiceResult<T> {
    return {
      success: true,
      data,
      error: undefined,
      timestamp: new Date()
    };
  }

  protected createErrorResult<T>(error: Error | string): ServiceResult<T> {
    return {
      success: false,
      data: undefined,
      error: error instanceof Error ? error.message : error,
      timestamp: new Date()
    };
  }
} 