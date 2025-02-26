import { fetchWithAuth } from "./api-service"

export class SheetService {
  async verifyDocument(sheetId: string) {
    try {
      const response = await fetchWithAuth(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=spreadsheetId,properties.title`,
        {
          method: "GET",
        }
      )

      if (!response.ok) {
        console.error("Error verificando hoja de cálculo:", await response.text())
        return { success: false }
      }

      const data = await response.json()
      return { 
        success: true, 
        data: {
          id: data.spreadsheetId,
          name: data.properties.title
        }
      }
    } catch (error) {
      console.error("Error en verifyDocument:", error)
      return { success: false }
    }
  }
} 