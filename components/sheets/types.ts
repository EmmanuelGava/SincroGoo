import { SlideElement, SlidePreview } from '@/lib/types'

export interface SelectedRow {
  id: string
  [key: string]: any
}

export interface SheetSlidersProps {
  token: string
  selectedSlide?: SlidePreview
  slideElements: SlideElement[]
  selectedElements: string[]
  onSelectSlide: (slideId: string, elementId: string | null) => Promise<void>
  onUpdateElements: (elements: SlideElement[]) => Promise<void>
  onUpdateSlideElements: (elements: SlideElement[]) => void
  selectedRow?: SelectedRow
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  className?: string
} 