import { BaseEntity, UUID, Timestamp, Metadata } from './common';

// Información del usuario
export interface User extends BaseEntity {
  email: string;
  nombre?: string;
  apellido?: string;
  rol?: string;
  avatar_url?: string;
  created_at: Timestamp;
  last_signin?: Timestamp;
  provider?: string;
}

// Datos de solicitud de registro
export interface SignUpRequest {
  email: string;
  password: string;
  nombre?: string;
  apellido?: string;
}

// Datos de solicitud de inicio de sesión
export interface SignInRequest {
  email: string;
  password: string;
}

// Respuesta de autenticación
export interface AuthResponse {
  user: User | null;
  session: {
    access_token: string;
    refresh_token?: string;
    expires_at?: number;
  } | null;
  error?: string;
}

// Perfil de usuario extendido
export interface UserProfile extends User {
  preferencias?: {
    tema?: 'claro' | 'oscuro' | 'sistema';
    idioma?: string;
    notificaciones?: boolean;
  };
  metadatos?: Metadata;
}

// Parámetros para crear usuario
export interface UserCreateParams {
  email: string;
  nombre: string;
  avatar_url?: string;
  provider?: string;
  auth_id: string;
}

// Parámetros para actualizar usuario
export interface UserUpdateParams {
  nombre?: string;
  avatar_url?: string;
  ultimo_acceso?: Timestamp;
  fecha_actualizacion?: Timestamp;
} 