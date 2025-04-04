export const GOOGLE_API_CONFIG = {
  API_VERSION: {
    SLIDES: 'v1',
    SHEETS: 'v4'
  },
  SCOPES: {
    SLIDES: [
      'https://www.googleapis.com/auth/presentations',
      'https://www.googleapis.com/auth/drive'
    ],
    SHEETS: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ]
  },
  RATE_LIMITS: {
    SLIDES: {
      maxRequests: 100,
      timeWindow: 60000 // 1 minuto
    },
    SHEETS: {
      maxRequests: 100,
      timeWindow: 60000 // 1 minuto
    }
  },
  CACHE_TTL: {
    SLIDES: 5 * 60 * 1000, // 5 minutos
    SHEETS: 5 * 60 * 1000  // 5 minutos
  },
  ENDPOINTS: {
    SLIDES: 'https://slides.googleapis.com',
    SHEETS: 'https://sheets.googleapis.com'
  }
}; 