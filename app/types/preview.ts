export interface PreviewChange {
  slideIndex: number
  oldPrice: string
  newPrice: string
  elementId: string
  thumbnail?: string
  position?: {
    x: number
    y: number
  }
} 