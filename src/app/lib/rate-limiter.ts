const REQUEST_WINDOW = 60000 // 1 minuto
const MAX_REQUESTS = 50 // Máximo de solicitudes por minuto
const requests: number[] = []

export const canMakeRequest = (): boolean => {
  const now = Date.now()
  // Limpiar solicitudes antiguas
  while (requests.length > 0 && requests[0] < now - REQUEST_WINDOW) {
    requests.shift()
  }
  return requests.length < MAX_REQUESTS
}

export const recordRequest = (): void => {
  requests.push(Date.now())
}

export const waitForRateLimit = async (): Promise<void> => {
  if (canMakeRequest()) {
    recordRequest()
    return
  }

  // Esperar hasta que podamos hacer la siguiente solicitud
  const oldestRequest = requests[0]
  const waitTime = REQUEST_WINDOW - (Date.now() - oldestRequest)
  await new Promise(resolve => setTimeout(resolve, waitTime))
  requests.shift() // Eliminar la solicitud más antigua
  recordRequest() // Registrar la nueva solicitud
} 