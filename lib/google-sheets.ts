import { SheetUpdate } from './sheet-editor'

export async function loadSheetData(spreadsheetId: string, range: string) {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
      {
        headers: {
          Authorization: `Bearer ${await getAccessToken()}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Error al cargar los datos de la hoja')
    }

    const data = await response.json()
    return data.values
  } catch (error) {
    console.error('Error loading sheet data:', error)
    throw error
  }
}

export async function updateSheetData(
  spreadsheetId: string,
  updates: SheetUpdate[]
) {
  try {
    const requests = updates.map(update => ({
      range: update.range,
      values: update.values
    }))

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await getAccessToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: requests
        })
      }
    )

    if (!response.ok) {
      throw new Error('Error al actualizar los datos de la hoja')
    }

    return await response.json()
  } catch (error) {
    console.error('Error updating sheet data:', error)
    throw error
  }
}

async function getAccessToken(): Promise<string> {
  // Aquí deberías implementar la lógica para obtener el token de acceso
  // Puede ser desde una sesión, un contexto de autenticación, etc.
  const session = await fetch('/api/auth/session')
  const data = await session.json()
  return data.accessToken
} 