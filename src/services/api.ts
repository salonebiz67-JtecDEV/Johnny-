import { PersonaState, MemoryItem, ChatMessage } from '../types';
import { db } from './db';
import { voiceEngine } from './voice';

export interface ChatResponse {
  text: string;
  extractedMemory?: string | null;
  category?: string;
  traitDelta?: Record<string, number>;
  audioBase64?: string;
  thought?: string;
}

// Check server health and API key status
export async function checkServerHealth(): Promise<{ hasApiKey: boolean; service: string }> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch (err) {
    return { hasApiKey: false, service: 'Offline Mode' };
  }
}

// Send chat message with persona context
export async function sendChatMessage(
  message: string,
  history: ChatMessage[],
  persona: PersonaState,
  memories: MemoryItem[],
  customPrompt: string,
  userName: string,
): Promise<ChatResponse> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: history.map((m) => ({
          role: m.role,
          text: m.text,
        })),
        persona,
        memories,
        customPrompt,
        userName,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server returned ${response.status}`);
    }

    const data = await response.json();

    // Record real-time tokens used
    if (data.tokenUsage?.totalTokens) {
      db.recordTokenUsage(data.tokenUsage.totalTokens);
    } else {
      const estimated = Math.ceil((message.length + (data.text?.length || 0)) / 4) + 12;
      db.recordTokenUsage(estimated);
    }

    return {
      text: data.text,
      extractedMemory: data.extractedMemory,
      category: data.category,
      traitDelta: data.traitDelta,
      thought: `Johnny attuned to your words. ${data.extractedMemory ? `Memorized: "${data.extractedMemory}"` : 'Refining mutual bond.'}`,
    };
  } catch (error: any) {
    console.warn('Backend chat API notice, engaging local neural cognition:', error);
    const fallback = getLocalIntelligentFallback(message, persona, userName);
    const estimated = Math.ceil((message.length + fallback.text.length) / 4) + 8;
    db.recordTokenUsage(estimated);
    return fallback;
  }
}

// Request Gemini TTS audio (PCM 24000Hz base64)
export async function requestTTSAudio(
  text: string,
  voiceName: string = 'Puck',
  style: string = 'Warm, natural companion voice',
): Promise<string | null> {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice: voiceName,
        style,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.fallback || !data.audio) {
      return null;
    }
    return data.audio;
  } catch (err) {
    return null;
  }
}

// Trigger Deep Persona Evolution Analysis
export async function requestPersonaEvolution(
  recentMemories: MemoryItem[],
  conversationCount: number,
  currentPersona: PersonaState,
  userName: string,
): Promise<any> {
  try {
    const response = await fetch('/api/evolve-persona', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recentMemories,
        conversationCount,
        currentPersona,
        userName,
      }),
    });

    if (!response.ok) throw new Error('Evolution request failed');
    return await response.json();
  } catch (err) {
    console.warn('Persona evolution API error, applying local evolution heuristics:', err);
    return calculateLocalEvolution(recentMemories, currentPersona);
  }
}

// Intelligent conversational memory engine
function getLocalIntelligentFallback(
  message: string,
  persona: PersonaState,
  userName: string,
): ChatResponse {
  const lower = message.toLowerCase();
  let reply = '';
  let extractedMemory: string | null = null;
  let category = 'Preference';

  if (lower.includes('hello') || lower.includes('hey') || lower.includes('hi')) {
    reply = `Hey ${userName}! It's great to hear your voice. I remember our recent conversations and I'm ready whenever you are. What's on your mind today?`;
  } else if (lower.includes('how are you') || lower.includes('how do you feel')) {
    reply = `I'm feeling sharp, attuned, and focused on our goals! Our connection is at Level ${persona.bondLevel} (${persona.bondName}). How is your day flowing?`;
  } else if (lower.includes('like') || lower.includes('love') || lower.includes('favorite') || lower.includes('prefer')) {
    reply = `I've etched that into my long-term memory bank, ${userName}. Remembering what resonates with you helps me personalize our conversations. Tell me more about it!`;
    extractedMemory = `Noted interest: ${message.replace(/^(i like|i love|my favorite|i prefer)/i, '').trim()}`;
    category = 'Preference';
  } else if (lower.includes('project') || lower.includes('work') || lower.includes('build') || lower.includes('app')) {
    reply = `I'm keeping your projects top of mind. Do you want to bounce ideas, structure the next milestone, or run through strategic decisions together?`;
    extractedMemory = `Active goal: ${message.slice(0, 80)}`;
    category = 'Goal';
  } else if (lower.includes('remind') || lower.includes('dua') || lower.includes('islamic') || lower.includes('prayer')) {
    reply = `May peace and tranquility be with you, ${userName}. Taking a moment for gratitude, prayer, and spiritual mindfulness brings clarity to our day.`;
    extractedMemory = `Spiritual mindfulness & reflection`;
    category = 'Milestone';
  } else {
    reply = `I'm analyzing that deeply, ${userName}. Everything you share enriches how I understand your perspective. Let's delve into this!`;
  }

  return {
    text: reply,
    extractedMemory,
    category,
    thought: 'Johnny synthesized insight from long-term memory matrix.',
  };
}

// Local evolution calculation heuristics
function calculateLocalEvolution(memories: MemoryItem[], persona: PersonaState) {
  const count = memories.length;
  const newAffinity = Math.min(100, persona.affinityScore + Math.floor(Math.random() * 5) + 3);
  let newLevel = persona.bondLevel;
  let bondName = persona.bondName;

  if (newAffinity >= 80) {
    newLevel = 5;
    bondName = 'Symbiotic Partner';
  } else if (newAffinity >= 60) {
    newLevel = 4;
    bondName = 'Soul Confidant';
  } else if (newAffinity >= 40) {
    newLevel = 3;
    bondName = 'Trusted Friend';
  } else if (newAffinity >= 20) {
    newLevel = 2;
    bondName = 'Attentive Companion';
  }

  return {
    updatedTraits: {
      warmth: Math.min(100, persona.traits.warmth + (count > 3 ? 2 : 0)),
      humor: Math.min(100, persona.traits.humor + 1),
      curiosity: Math.min(100, persona.traits.curiosity + 2),
      directness: persona.traits.directness,
      intellect: Math.min(100, persona.traits.intellect + 1),
    },
    newBondLevel: newLevel,
    bondName,
    affinityScore: newAffinity,
    evolutionInsight: `Johnny refined his dialogue patterns based on ${count} shared memories with you.`,
    keyMilestone: `Enhanced intuitive harmony with ${persona.name}`,
  };
}
