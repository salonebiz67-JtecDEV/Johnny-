export type ArchetypeId =
  | 'empathic_companion'
  | 'sharp_intellectual'
  | 'witty_banterer'
  | 'stoic_coach'
  | 'creative_muse';

export interface PersonaTraits {
  warmth: number;      // 0 - 100
  humor: number;       // 0 - 100
  curiosity: number;   // 0 - 100
  directness: number;  // 0 - 100
  intellect: number;   // 0 - 100
}

export interface EvolutionMilestone {
  id: string;
  timestamp: string;
  bondLevel: number;
  bondName: string;
  milestone: string;
  insight: string;
}

export interface PersonaState {
  name: string;
  archetype: ArchetypeId;
  archetypeName: string;
  traits: PersonaTraits;
  bondLevel: number; // 1 to 5
  bondName: string;
  affinityScore: number; // 0 to 100
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  voiceSpeed: number;
  customPrompt: string;
  lastEvolvedAt: string;
  totalInteractions: number;
  evolutionJournal: EvolutionMilestone[];
  currentMood: string;
}

export type MemoryCategory = 'Fact' | 'Preference' | 'Event' | 'Goal' | 'Emotion' | 'Milestone' | 'General';

export interface MemoryItem {
  id: string;
  text: string;
  category: MemoryCategory;
  confidence: number;
  createdAt: string;
  isPinned?: boolean;
  source: 'voice' | 'chat' | 'manual';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  audioBase64?: string;
  isVoiceInput?: boolean;
  memoryExtracted?: string;
  thought?: string;
  audioDuration?: number;
}

export interface TokenUsage {
  tokensUsed: number;
  tokensRemaining: number;
  totalQuota: number;
  modelRepliesCount: number;
  uptimePercent: number;
  lastUpdated: string;
}

export interface UserSession {
  userId: string;
  name: string;
  email: string;
  avatar: string;
  isAuthenticated: boolean;
  token: string;
  sessionStarted: string;
  pinHash?: string;
  isLocked: boolean;
  supabaseConnected: boolean;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  isPremium?: boolean;
}

export type VoiceAnimationStyle = 'jarvis' | 'aurora' | 'spectrum';

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  voiceEngine: 'gemini' | 'browser';
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  voiceStyle: string;
  autoSpeak: boolean;
  handsFreeListening: boolean;
  soundEffects: boolean;
  memoryRetention: boolean;
  language: string;
  voiceAnimationStyle: VoiceAnimationStyle;
}

export interface ConversationThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export type NavigationTab = 'home' | 'chat' | 'live' | 'profile' | 'settings';
