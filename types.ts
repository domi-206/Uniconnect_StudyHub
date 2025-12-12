export enum AppMode {
  UPLOAD = 'UPLOAD',
  DASHBOARD = 'DASHBOARD',
  QUIZ_CONFIG = 'QUIZ_CONFIG',
  QUIZ_PLAY = 'QUIZ_PLAY',
  QUIZ_REVIEW = 'QUIZ_REVIEW',
  CHAT = 'CHAT'
}

export interface UploadedFile {
  name: string;
  type: string;
  data: string; // Base64 string
}

export interface QuizSettings {
  questionCount: number; // 10 - 100
  timePerQuestion: number; // 10 - 60 seconds
  totalTimeLimit: number; // 10 - 90 minutes (0 for unlimited)
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface QuizResult {
  questionId: string;
  selectedAnswerIndex: number; // -1 if skipped/timeout
  isCorrect: boolean;
  timeTaken: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isEditing?: boolean;
  timestamp: number;
}

export interface TopicStatus {
  name: string;
  isLocked: boolean;
  bestScore?: number;
}