// Tipos comunes
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string | Error;
  timestamp: Date;
}

// Tipos para Google Sheets
export interface SheetConfig {
  spreadsheetId: string;
  range: string;
  headerRow: number;
  columns: ColumnConfig[];
}

export interface ColumnConfig {
  key: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'price' | 'formula' | 'select';
  index: number;
  format?: ColumnFormat;
}

export interface ColumnFormat {
  type: 'currency' | 'percentage' | 'number' | 'date' | 'text';
  prefix?: string;
  suffix?: string;
  decimals?: number;
  locale?: string;
  pattern?: string;
}

export interface DataRow {
  id: string;
  values: { [key: string]: any };
  lastUpdate: Date;
  slideLocation?: string;
  slidePreview?: string;
  slideElement?: string;
  rowNumber: number;
  slideUpdates?: ElementUpdate[];
}

// Tipos para Google Slides
export interface SlidePreview {
  id: string;
  title: string;
  imageUrl: string;
}

export interface SlideElement {
  id: string;
  slideId: string;
  content: string;
}

export interface SlideUpdate {
  slideId: string;
  replacements: SlideReplacement[];
}

export interface SlideReplacement {
  searchText: string;
  replaceText: string;
}

export interface ElementUpdate {
  elementId: string;
  value: string;
}

export interface CellData {
  cellRef: string;
  value: string | number;
  isPrice: boolean;
  header?: string;
}

export interface SlideElementUpdate {
  elementId: string;
  cellRef: string;
}

export interface EditingValues {
  cells: CellData[];
  slideLocation?: string;
  slideElements: SlideElementUpdate[];
  slidePreview?: string;
}

export interface ChangeHistoryEntry {
  timestamp: Date;
  rowNumber: number;
  previousValues: { [key: string]: any };
  newValues: { [key: string]: any };
  slideUpdates?: SlideUpdate[];
}

export interface ChangeHistory {
  entries: ChangeHistoryEntry[];
  currentIndex: number; // Para saber dónde estamos en el historial
}

export interface ScheduledUpdate {
  id: string;
  rowNumber: number;
  newValues: { [key: string]: any };
  slideUpdates?: SlideUpdate[];
  scheduledFor: Date;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
}

export interface VersionComparison {
  current: {
    values: { [key: string]: any };
    slideContent?: { [elementId: string]: string };
  };
  scheduled?: {
    values: { [key: string]: any };
    slideContent?: { [elementId: string]: string };
    scheduledFor: Date;
  };
  previous?: {
    values: { [key: string]: any };
    slideContent?: { [elementId: string]: string };
    timestamp: Date;
  };
} 