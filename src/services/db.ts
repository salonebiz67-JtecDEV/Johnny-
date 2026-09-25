import {
  PersonaState,
  MemoryItem,
  ChatMessage,
  UserSession,
  AppSettings,
  ArchetypeId,
  ConversationThread,
} from '../types';

const STORAGE_KEYS = {
  PERSONA: 'josa_persona_state',
  MEMORIES: 'josa_memory_bank',
  MESSAGES: 'josa_chat_history',
  SESSION: 'josa_user_session',
  SETTINGS: 'josa_app_settings',
  TOKEN_USAGE: 'josa_token_usage',
  THREADS: 'josa_conversation_threads',
  ACTIVE_THREAD_ID: 'josa_active_thread_id',
};

// Initial default token usage metrics (matches real-time profile counters)
export const DEFAULT_TOKEN_USAGE = {
  tokensUsed: 6866,
  tokensRemaining: 93134,
  totalQuota: 100000,
  modelRepliesCount: 319,
  uptimePercent: 99.31,
  lastUpdated: new Date().toISOString(),
};

// Initial default persona
export const DEFAULT_PERSONA: PersonaState = {
  name: 'JOSA AI',
  archetype: 'empathic_companion',
  archetypeName: 'Personal AI Companion',
  traits: {
    warmth: 85,
    humor: 70,
    curiosity: 88,
    directness: 55,
    intellect: 80,
  },
  bondLevel: 2,
  bondName: 'Attentive Companion',
  affinityScore: 42,
  voiceName: 'Puck',
  voiceSpeed: 1.0,
  customPrompt: 'Speak like an authentic, highly capable personal assistant who balances sharp intelligence with emotional clarity. Keep spoken answers concise, elegant, and actionable.',
  lastEvolvedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  totalInteractions: 14,
  currentMood: 'Curious & Attuned',
  evolutionJournal: [
    {
      id: 'evo-1',
      timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
      bondLevel: 1,
      bondName: 'Initial Connection',
      milestone: 'First Voice Connection',
      insight: 'JOSA AI attuned its initial speech cadence and acoustic responsiveness to your vocal rhythm.',
    },
    {
      id: 'evo-2',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      bondLevel: 2,
      bondName: 'Attentive Companion',
      milestone: 'Shared Goals Discovery',
      insight: 'JOSA AI adapted with higher context depth and proactive assistance after learning about your projects.',
    },
  ],
};

// Pre-seeded memories
export const DEFAULT_MEMORIES: MemoryItem[] = [
  {
    id: 'mem-1',
    text: 'Prefers concise, authentic voice responses over robotic textbook explanations',
    category: 'Preference',
    confidence: 0.95,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    isPinned: true,
    source: 'voice',
  },
  {
    id: 'mem-2',
    text: 'Building intelligent modern applications with cutting-edge tech',
    category: 'Goal',
    confidence: 0.9,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    isPinned: true,
    source: 'chat',
  },
  {
    id: 'mem-3',
    text: 'Enjoys conversational banter, quick humor, and thought-provoking philosophical angles',
    category: 'Preference',
    confidence: 0.88,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    isPinned: false,
    source: 'voice',
  },
  {
    id: 'mem-4',
    text: 'Often does focused work in evening hours and values low-friction voice check-ins',
    category: 'Fact',
    confidence: 0.85,
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    isPinned: false,
    source: 'voice',
  },
  {
    id: 'mem-5',
    text: 'Scheduled major product deployment and presentation this Friday',
    category: 'Event',
    confidence: 0.92,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    isPinned: true,
    source: 'voice',
  },
];

// Pre-seeded chat messages
// Initial messages: Empty for real authentic conversations
export const DEFAULT_MESSAGES: ChatMessage[] = [];

// Default session
export const DEFAULT_SESSION: UserSession = {
  userId: 'usr_john_fatorma',
  name: 'John Fatorma',
  email: 'fatormajohn64@gmail.com',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  isAuthenticated: true,
  token: 'jhn_sec_' + Math.random().toString(36).substring(2, 12),
  sessionStarted: new Date().toISOString(),
  isLocked: false,
  pinHash: '', // unset by default
  supabaseConnected: false,
};

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  voiceEngine: 'gemini',
  voiceName: 'Puck',
  voiceStyle: 'Warm, natural, articulate AI companion',
  autoSpeak: false,
  handsFreeListening: true,
  soundEffects: true,
  memoryRetention: true,
  language: 'en-US',
  voiceAnimationStyle: 'jarvis',
};

// Cryptographic hash helper using Web Crypto API
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode('johnny_salt_' + pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Rapid Database Client with In-Memory Cache + LocalStorage Sync
class RapidDatabase {
  private persona: PersonaState;
  private memories: MemoryItem[];
  private messages: ChatMessage[];
  private session: UserSession;
  private settings: AppSettings;
  private tokenUsage: typeof DEFAULT_TOKEN_USAGE;
  private threads: ConversationThread[];
  private activeThreadId: string;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.persona = this.load(STORAGE_KEYS.PERSONA, DEFAULT_PERSONA);
    this.memories = this.load(STORAGE_KEYS.MEMORIES, DEFAULT_MEMORIES);
    this.messages = this.load(STORAGE_KEYS.MESSAGES, DEFAULT_MESSAGES);
    this.session = this.load(STORAGE_KEYS.SESSION, DEFAULT_SESSION);
    this.settings = this.load(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    this.tokenUsage = this.load(STORAGE_KEYS.TOKEN_USAGE, DEFAULT_TOKEN_USAGE);
    this.threads = this.load(STORAGE_KEYS.THREADS, []);
    this.activeThreadId = this.load(STORAGE_KEYS.ACTIVE_THREAD_ID, 'current-session');

    // If active thread exists, sync messages
    const current = this.threads.find((t) => t.id === this.activeThreadId);
    if (current) {
      this.messages = [...current.messages];
    }
  }

  private load<T>(key: string, fallback: T): T {
    try {
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(`Error loading key ${key}:`, e);
    }
    return fallback;
  }

  private save(key: string, data: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      this.notify();
    } catch (e) {
      console.warn(`Error writing key ${key}:`, e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Database subscriber error:', err);
      }
    });
  }

  // Persona Methods
  public getPersona(): PersonaState {
    return { ...this.persona };
  }

  public updatePersona(partial: Partial<PersonaState>): PersonaState {
    this.persona = { ...this.persona, ...partial };
    this.save(STORAGE_KEYS.PERSONA, this.persona);
    return this.getPersona();
  }

  public setArchetype(archetype: ArchetypeId, name: string, traits: Partial<PersonaState['traits']>): void {
    this.updatePersona({
      archetype,
      archetypeName: name,
      traits: { ...this.persona.traits, ...traits },
    });
  }

  public boostAffinity(amount: number = 2): void {
    const current = this.persona.affinityScore;
    const newScore = Math.min(100, current + amount);
    let newLevel = this.persona.bondLevel;
    let newBondName = this.persona.bondName;

    if (newScore >= 80) {
      newLevel = 5;
      newBondName = 'Symbiotic Partner';
    } else if (newScore >= 60) {
      newLevel = 4;
      newBondName = 'Soul Confidant';
    } else if (newScore >= 40) {
      newLevel = 3;
      newBondName = 'Trusted Friend';
    } else if (newScore >= 20) {
      newLevel = 2;
      newBondName = 'Attentive Companion';
    } else {
      newLevel = 1;
      newBondName = 'New Acquaintance';
    }

    const journal = [...this.persona.evolutionJournal];
    if (newLevel > this.persona.bondLevel) {
      journal.unshift({
        id: 'evo-' + Date.now(),
        timestamp: new Date().toISOString(),
        bondLevel: newLevel,
        bondName: newBondName,
        milestone: `Bond upgraded to ${newBondName}`,
        insight: `Johnny's connection with you reached a new plateau of mutual understanding and intuitive dialogue.`,
      });
    }

    this.updatePersona({
      affinityScore: newScore,
      bondLevel: newLevel,
      bondName: newBondName,
      evolutionJournal: journal,
      totalInteractions: this.persona.totalInteractions + 1,
    });
  }

  // Memory Methods
  public getMemories(): MemoryItem[] {
    return [...this.memories];
  }

  public addMemory(text: string, category: MemoryItem['category'] = 'Fact', source: MemoryItem['source'] = 'voice'): MemoryItem {
    // Avoid exact duplicate memories
    const existing = this.memories.find((m) => m.text.toLowerCase().trim() === text.toLowerCase().trim());
    if (existing) {
      existing.confidence = Math.min(1.0, existing.confidence + 0.1);
      this.save(STORAGE_KEYS.MEMORIES, this.memories);
      return existing;
    }

    const newMemory: MemoryItem = {
      id: 'mem-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      text: text.trim(),
      category,
      confidence: 0.9,
      createdAt: new Date().toISOString(),
      isPinned: false,
      source,
    };

    this.memories.unshift(newMemory);
    this.save(STORAGE_KEYS.MEMORIES, this.memories);
    this.boostAffinity(3);
    return newMemory;
  }

  public updateMemory(id: string, updates: Partial<MemoryItem>): void {
    this.memories = this.memories.map((m) => (m.id === id ? { ...m, ...updates } : m));
    this.save(STORAGE_KEYS.MEMORIES, this.memories);
  }

  public deleteMemory(id: string): void {
    this.memories = this.memories.filter((m) => m.id !== id);
    this.save(STORAGE_KEYS.MEMORIES, this.memories);
  }

  public clearAllMemories(): void {
    this.memories = [];
    this.save(STORAGE_KEYS.MEMORIES, this.memories);
  }

  // Messages Methods
  public getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  public addMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const fullMessage: ChatMessage = {
      ...msg,
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
    };
    this.messages.push(fullMessage);
    // Keep max 200 messages for rapid rendering
    if (this.messages.length > 200) {
      this.messages = this.messages.slice(-200);
    }
    this.save(STORAGE_KEYS.MESSAGES, this.messages);

    // Sync active conversation thread
    let thread = this.threads.find((t) => t.id === this.activeThreadId);
    if (!thread) {
      const generatedTitle =
        msg.role === 'user'
          ? msg.text.slice(0, 36) + (msg.text.length > 36 ? '...' : '')
          : 'Conversation';
      thread = {
        id: this.activeThreadId || ('thread-' + Date.now()),
        title: generatedTitle,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [...this.messages],
      };
      this.threads.unshift(thread);
    } else {
      thread.messages = [...this.messages];
      thread.updatedAt = new Date().toISOString();
      if ((thread.title === 'New Conversation' || thread.title === 'Current Conversation') && msg.role === 'user') {
        thread.title = msg.text.slice(0, 36) + (msg.text.length > 36 ? '...' : '');
      }
    }
    this.save(STORAGE_KEYS.THREADS, this.threads);
    return fullMessage;
  }

  public clearMessages(): void {
    this.messages = [];
    this.save(STORAGE_KEYS.MESSAGES, this.messages);
    const thread = this.threads.find((t) => t.id === this.activeThreadId);
    if (thread) {
      thread.messages = [];
      thread.updatedAt = new Date().toISOString();
      this.save(STORAGE_KEYS.THREADS, this.threads);
    }
  }

  // Conversation Threads Methods
  public getThreads(): ConversationThread[] {
    return [...this.threads];
  }

  public getActiveThreadId(): string {
    return this.activeThreadId;
  }

  public switchThread(id: string): ConversationThread | null {
    const thread = this.threads.find((t) => t.id === id);
    if (!thread) return null;
    this.activeThreadId = id;
    this.messages = [...thread.messages];
    this.save(STORAGE_KEYS.ACTIVE_THREAD_ID, id);
    this.save(STORAGE_KEYS.MESSAGES, this.messages);
    return { ...thread };
  }

  public createNewThread(initialTitle: string = 'New Conversation'): ConversationThread {
    const newThread: ConversationThread = {
      id: 'thread-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      title: initialTitle,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    this.threads.unshift(newThread);
    this.activeThreadId = newThread.id;
    this.messages = [];
    this.save(STORAGE_KEYS.THREADS, this.threads);
    this.save(STORAGE_KEYS.ACTIVE_THREAD_ID, newThread.id);
    this.save(STORAGE_KEYS.MESSAGES, this.messages);
    return newThread;
  }

  public updateThreadTitle(id: string, title: string): void {
    this.threads = this.threads.map((t) =>
      t.id === id ? { ...t, title, updatedAt: new Date().toISOString() } : t,
    );
    this.save(STORAGE_KEYS.THREADS, this.threads);
  }

  public deleteThread(id: string): void {
    this.threads = this.threads.filter((t) => t.id !== id);
    if (this.activeThreadId === id) {
      if (this.threads.length > 0) {
        this.activeThreadId = this.threads[0].id;
        this.messages = [...this.threads[0].messages];
      } else {
        const fresh = this.createNewThread();
        this.activeThreadId = fresh.id;
        this.messages = [];
      }
    }
    this.save(STORAGE_KEYS.THREADS, this.threads);
    this.save(STORAGE_KEYS.ACTIVE_THREAD_ID, this.activeThreadId);
    this.save(STORAGE_KEYS.MESSAGES, this.messages);
  }

  public clearAllThreads(): void {
    this.threads = [];
    this.messages = [];
    const fresh = this.createNewThread();
    this.activeThreadId = fresh.id;
    this.save(STORAGE_KEYS.THREADS, this.threads);
    this.save(STORAGE_KEYS.ACTIVE_THREAD_ID, this.activeThreadId);
    this.save(STORAGE_KEYS.MESSAGES, this.messages);
  }

  // Session Methods
  public getSession(): UserSession {
    return { ...this.session };
  }

  public updateSession(partial: Partial<UserSession>): UserSession {
    this.session = { ...this.session, ...partial };
    this.save(STORAGE_KEYS.SESSION, this.session);
    return this.getSession();
  }

  public async setPinLock(pin: string): Promise<void> {
    const hash = await hashPin(pin);
    this.updateSession({
      pinHash: hash,
      isLocked: false,
    });
  }

  public async unlockWithPin(pin: string): Promise<boolean> {
    if (!this.session.pinHash) return true;
    const testHash = await hashPin(pin);
    if (testHash === this.session.pinHash) {
      this.updateSession({ isLocked: false });
      return true;
    }
    return false;
  }

  public lockSession(): void {
    this.updateSession({ isLocked: true });
  }

  // Token Usage Methods
  public getTokenUsage(): typeof DEFAULT_TOKEN_USAGE {
    return { ...this.tokenUsage };
  }

  public recordTokenUsage(tokens: number): typeof DEFAULT_TOKEN_USAGE {
    const newUsed = this.tokenUsage.tokensUsed + tokens;
    const newRemaining = Math.max(0, this.tokenUsage.totalQuota - newUsed);
    this.tokenUsage = {
      ...this.tokenUsage,
      tokensUsed: newUsed,
      tokensRemaining: newRemaining,
      modelRepliesCount: this.tokenUsage.modelRepliesCount + 1,
      lastUpdated: new Date().toISOString(),
    };
    this.save(STORAGE_KEYS.TOKEN_USAGE, this.tokenUsage);
    return this.getTokenUsage();
  }

  // Settings Methods
  public getSettings(): AppSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<AppSettings>): AppSettings {
    this.settings = { ...this.settings, ...partial };
    this.save(STORAGE_KEYS.SETTINGS, this.settings);
    return this.getSettings();
  }

  // Full backup & restore
  public exportData(): string {
    return JSON.stringify(
      {
        persona: this.persona,
        memories: this.memories,
        settings: this.settings,
        exportDate: new Date().toISOString(),
      },
      null,
      2,
    );
  }

  public importData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.persona) this.updatePersona(data.persona);
      if (Array.isArray(data.memories)) {
        this.memories = data.memories;
        this.save(STORAGE_KEYS.MEMORIES, this.memories);
      }
      if (data.settings) this.updateSettings(data.settings);
      return true;
    } catch (e) {
      console.error('Failed to import JSON data:', e);
      return false;
    }
  }
}

export const db = new RapidDatabase();
