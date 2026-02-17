export interface Question {
  id: number;
  type?: 'multiple_choice' | 'text_only'; // New field to distinguish items
  text: string;
  options: string[]; // Should have exactly 4 options (ignored for text_only)
  correctAnswerIndex: number; // 0-3 (ignored for text_only)
  explanation: string;
  imageUrl?: string;
  imageWidth?: number; // New field for storing custom image width
  imageHeight?: number; // New field for storing custom image height
  svgCode?: string; // New field for AI generated diagrams
  visualDescription?: string; // New field for storing AI generated image description
  validationError?: string;
}

export interface WatermarkSettings {
  opacity: number;
  rotation: number;
  scale: number;
  // Replaced simple isRepeated with placement mode
  placement: 'center' | 'grid' | 'question'; 
  gridSize?: string; // '3x4', etc. (For Global Grid)
  questionWmarkCount?: number; // Count per question box (For Question mode)
  isOverlay: boolean;
}

// Unified Border Style for all sections
export type CommonBorderStyle = 'none' | 'simple' | 'double' | 'dashed' | 'frame' | 'modern_right' | 'modern_bottom' | '3d_rect';

export interface DesignSettings {
  // Page Settings
  pageBorder: CommonBorderStyle;
  pageBorderColor: string; 
  pageBorderWidth: number; 
  pagePadding: number; // Space between Border and Content
  pageMargin: number; // Space between Paper Edge and Border
  pageBgColor: string; 
  pageBgImage?: string; 

  // Header Settings
  headerBorder: CommonBorderStyle;
  headerBgColor: string;
  headerBorderColor: string;
  headerBorderWidth: number;
  headerBorderRadius: number; // Border radius for header
  headerPadding: number;
  headerMargin: number; // Bottom margin usually
  headerImageRight?: string;
  headerImageLeft?: string;
  headerImageRightWidth?: number;
  headerImageLeftWidth?: number;

  // Question Box Settings
  questionBorder: CommonBorderStyle;
  questionBgColor: string;
  questionBorderColor: string;
  questionBorderWidth: number;
  questionPadding: number;
  questionMargin: number; // Space between questions
  questionBorderRadius: number; 
}

export interface AppSettings {
  // Gemini API Settings
  apiKey?: string;
  geminiApiKey?: string;
  useGemini?: boolean;
  
  // OpenAI API Settings
  openaiApiKey?: string;
  useOpenAI?: boolean;
  
  // UI Settings
  titleFont: string;
  titleColor: string;
  questionFont: string;
  questionColor: string;
  optionFont: string;
  optionColor: string;
}

export interface ExamData {
  lessonTitle: string;
  questions: Question[];
  watermark?: string;
  watermarkSettings?: WatermarkSettings;
  designSettings?: DesignSettings;
}

export interface GenerationParams {
  lessonTitle: string;
  questionCount: number;
  difficulty: number; // 1-10
  instructions?: string;
  image?: string; // Base64 string for exam context
  includeDiagrams?: boolean; // New field
}

// AI Service Types
export type GeminiModel = 
  | 'gemini-2.5-pro' 
  | 'gemini-3-flash-preview' 
  | 'gemini-2.5-flash' 
  | 'gemini-2.5-flash-lite';

export type OpenAIModel = 
  | 'gpt-4o' 
  | 'gpt-4o-mini' 
  | 'gpt-3.5-turbo';

export type TaskComplexity = 'high' | 'ultra' | 'balanced' | 'lite';

export interface ServiceContinuityState {
  isOpen: boolean;
  provider: 'gemini' | 'openai' | null;
  message: string;
  onRetry: () => void;
  onUsePrivateKey: () => void;
  countdownSeconds: number;
}

export interface AIModelConfig {
  name: string;
  displayName: string;
  description: string;
  rpm: number;
  tpm: number;
}

// Augment window for MathJax
declare global {
  interface Window {
    MathJax: any;
    ImageKit: any;
  }
}
