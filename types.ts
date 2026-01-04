
export enum AppMode {
  UPLOAD = 'UPLOAD',
  DASHBOARD = 'DASHBOARD',
  QUIZ_CONFIG = 'QUIZ_CONFIG',
  QUIZ_PLAY = 'QUIZ_PLAY',
  QUIZ_REVIEW = 'QUIZ_REVIEW',
  CHAT = 'CHAT',
  PODCAST_CONFIG = 'PODCAST_CONFIG',
  PODCAST_PLAY = 'PODCAST_PLAY'
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
  sourcePage?: number; // Page number in PDF
  sourceContext?: string; // Snippet of text for confirmation
}

export interface QuizResult {
  questionId: string;
  selectedAnswerIndex: number; // -1 if skipped/timeout
  isCorrect: boolean;
  timeTaken: number;
}

export type VoiceAccent = 'US' | 'UK' | 'NG';
export type ContentTone = 'FUNNY' | 'PROFESSIONAL' | 'TEACHER' | 'FRIEND';

export interface PodcastSegment {
  startTime: number; // in seconds
  topic: string;
  speaker: string;
  text: string;
}

export interface PodcastSettings {
  tone: ContentTone;
  accent: VoiceAccent;
  durationMinutes: number;
  speakerCount: 'SINGLE' | 'DOUBLE';
  hostAName: string;
  hostBName?: string;
  selectedTopics: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isEditing?: boolean;
  feedback?: 'like' | 'dislike' | null;
  audioData?: string; // Base64 PCM data
}

export interface ChatSessionData {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastModified: number;
  settings: {
    accent: VoiceAccent;
    tone: ContentTone;
  };
}

export interface TopicStatus {
  name: string;
  isLocked: boolean;
  bestScore?: number;
}
