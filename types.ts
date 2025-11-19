export interface MemeTemplate {
  id: string;
  url: string;
  name: string;
}

export interface CaptionSuggestion {
  text: string;
}

export enum ViewState {
  GALLERY = 'GALLERY',
  EDITOR = 'EDITOR',
}

export enum EditorTab {
  CAPTIONS = 'CAPTIONS',
  EDIT = 'EDIT',
  ANALYZE = 'ANALYZE',
  STICKERS = 'STICKERS',
}

export interface AnalysisResult {
  description: string;
  detectedObjects: string[];
}

export interface Sticker {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}
