import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// Configuración de OAuth2
export const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NEXTAUTH_URL
);

// Configuración de servicios
export const sheets = google.sheets('v4');
export const slides = google.slides('v1');
export const drive = google.drive('v3');

// Función auxiliar para configurar el token
export const configurarToken = (accessToken: string) => {
  oauth2Client.setCredentials({ access_token: accessToken });
  return oauth2Client;
};

// Tipos comunes
export interface GoogleApiError extends Error {
  code?: number;
  status?: string;
}

// Constantes
export const SCOPES = {
  SHEETS: 'https://www.googleapis.com/auth/spreadsheets',
  SLIDES: 'https://www.googleapis.com/auth/presentations',
  DRIVE: 'https://www.googleapis.com/auth/drive.file'
};

// Funciones de utilidad
export const handleGoogleApiError = (error: any): GoogleApiError => {
  const apiError: GoogleApiError = new Error(
    error.message || 'Error en la API de Google'
  );
  apiError.code = error.code;
  apiError.status = error.status;
  return apiError;
}; 