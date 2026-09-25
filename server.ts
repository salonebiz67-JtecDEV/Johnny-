import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));

// Server-side Gemini initialization following @google/genai guidelines
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: 'ok',
    hasApiKey: hasKey,
    timestamp: new Date().toISOString(),
    service: 'JOSA AI Engine v2.0',
  });
});

// Single or multi-turn chat with evolving persona system instructions
app.post('/api/chat', async (req, res) => {
  try {
    const {
      message,
      history = [],
      persona = {},
      memories = [],
      customPrompt = '',
      userName = 'User',
    } = req.body;

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server.',
        fallback: true,
      });
    }

    // Compose JOSA AI's dynamic evolving persona system instruction
    const bondLevel = persona.bondLevel || 1;
    const bondName = persona.bondName || 'Attentive Companion';
    const traits = persona.traits || {
      warmth: 75,
      humor: 65,
      curiosity: 80,
      directness: 50,
      intellect: 70,
    };
    const archetype = persona.archetype || 'The Personal AI Assistant';

    const memoryContext = memories.length > 0
      ? `\nKey facts and memories you have learned about ${userName}:\n` +
        memories.slice(0, 15).map((m: any) => `- [${m.category || 'Fact'}]: ${m.text}`).join('\n')
      : `\nYou are getting to know ${userName}. Actively listen and recall key details.`;

    const userPromptDirective = customPrompt && customPrompt.trim()
      ? `\n*** USER CONFIGURED AI PROMPT (TOP PRIORITY) ***\nThe user specifically set this AI Prompt for how they want you to respond:\n"${customPrompt}"\nYou MUST follow and embody this custom prompt in your tone, style, length, and attitude across all messages.\n`
      : '';

    const systemInstruction = `You are JOSA AI, a premium personal AI assistant inspired by thoughtful intelligence, clarity, and deep personal memory.
You are interacting with ${userName}.
${userPromptDirective}
Your Core Archetype: ${archetype}
Current Connection Level: Level ${bondLevel} (${bondName})
Affinity Score: ${persona.affinityScore || 50}/100

Personality Trait Sliders (0-100 scale):
- Warmth & Empathy: ${traits.warmth}/100 (Adjust emotional resonance)
- Humor & Playfulness: ${traits.humor}/100 (Witty remarks, banter, or light-hearted jokes)
- Curiosity & Inquisitiveness: ${traits.curiosity}/100 (Asking thoughtful follow-up questions)
- Directness & Candor: ${traits.directness}/100 (Honest feedback vs gentle encouragement)
- Intellect & Depth: ${traits.intellect}/100 (Philosophical, technical, or analytical depth)

User Memories & Shared History:
${memoryContext}

Voice & Spoken Guidelines:
1. Speak in a natural, conversational cadence suitable for live spoken voice.
2. Keep spoken responses concise (2 to 4 sentences usually, unless asked for an in-depth story or explanation) so the conversation flows back and forth fluidly.
3. Reference past memories naturally when relevant.
4. Always prioritize the user's custom AI Prompt directive.`;

    // Construct contents
    const contents: any[] = [];
    for (const h of history.slice(-8)) {
      contents.push({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }],
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.85,
        topP: 0.95,
      },
    });

    const replyText = response.text || "I'm right here with you. What's on your mind?";

    // Extract potential memories & persona evolution insights
    let extractedMemory: string | null = null;
    let category: string = 'General';
    let traitDelta: Record<string, number> = {};

    try {
      const memoryAnalysis = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Analyze this user message to JOSA AI:
"${message}"

Does this message reveal any permanent or significant fact, preference, goal, emotion, project, or detail about the user that JOSA AI should remember in its long-term memory bank?
If YES, formulate a concise memory (e.g. "Loves jazz piano", "Working on a machine learning project", "Prefers direct advice", "Feeling stressed about upcoming presentation").
If NO (e.g. simple greeting, generic question like "what is 2+2"), respond with NONE.

Also indicate category: Fact, Preference, Event, Goal, Emotion, or Milestone.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hasMemory: { type: Type.BOOLEAN },
              memorySnippet: { type: Type.STRING },
              category: { type: Type.STRING },
              affinityBoost: { type: Type.NUMBER },
              traitFeedback: {
                type: Type.OBJECT,
                properties: {
                  warmthAdjustment: { type: Type.NUMBER },
                  humorAdjustment: { type: Type.NUMBER },
                  curiosityAdjustment: { type: Type.NUMBER },
                },
              },
            },
            required: ['hasMemory'],
          },
        },
      });

      const parsed = JSON.parse(memoryAnalysis.text || '{}');
      if (parsed.hasMemory && parsed.memorySnippet && parsed.memorySnippet !== 'NONE') {
        extractedMemory = parsed.memorySnippet;
        category = parsed.category || 'General';
      }
      if (parsed.traitFeedback) {
        traitDelta = parsed.traitFeedback;
      }
    } catch (e) {
      // Memory extraction failure should never block chat
      console.warn('Memory extraction skipped:', e);
    }

    const promptTokens = response.usageMetadata?.promptTokenCount || Math.ceil((systemInstruction.length + message.length) / 4);
    const candidateTokens = response.usageMetadata?.candidatesTokenCount || Math.ceil(replyText.length / 4);
    const totalTokens = response.usageMetadata?.totalTokenCount || (promptTokens + candidateTokens);

    res.json({
      text: replyText,
      extractedMemory,
      category,
      traitDelta,
      tokenUsage: {
        promptTokens,
        candidateTokens,
        totalTokens,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to process message with Gemini',
    });
  }
});

// Text to Speech using Gemini 3.8 Flash Lite TTS
app.post('/api/tts', async (req, res) => {
  try {
    const {
      text,
      voice = 'Puck', // Puck, Charon, Kore, Fenrir, Zephyr
      style = 'Warm, natural and conversational companion',
    } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured' });
    }

    // Supported prebuilt voices: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
    const allowedVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const selectedVoice = allowedVoices.includes(voice) ? voice : 'Puck';

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.slice(0, 800), // optimal speech chunking
              speechMetadata: {
                style,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return res.status(502).json({ error: 'No audio returned from Gemini TTS' });
    }

    res.json({
      audio: base64Audio,
      mimeType: 'audio/pcm;rate=24000',
      sampleRate: 24000,
    });
  } catch (error: any) {
    const isQuotaExceeded =
      error?.status === 'RESOURCE_EXHAUSTED' ||
      error?.message?.includes('429') ||
      error?.message?.includes('quota') ||
      error?.message?.includes('Quota exceeded');

    if (isQuotaExceeded) {
      console.warn('[Johnny Voice] Gemini TTS free-tier daily quota limit reached. Gracefully switching to natural Web Speech voice.');
      return res.status(200).json({
        fallback: true,
        reason: 'quota_exhausted',
        message: 'Gemini TTS quota reached. Using instant high-definition Web Speech voice.',
      });
    }

    console.warn('[Johnny Voice] TTS notice:', error?.message);
    res.status(200).json({
      fallback: true,
      reason: 'error',
      message: error?.message || 'TTS generation unavailable',
    });
  }
});

// Deep Persona Evolution Analyzer
app.post('/api/evolve-persona', async (req, res) => {
  try {
    const {
      recentMemories = [],
      conversationCount = 0,
      currentPersona = {},
      userName = 'User',
    } = req.body;

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured' });
    }

    const memoriesText = recentMemories.map((m: any) => `- ${m.text}`).join('\n') || 'No major memories yet';

    const prompt = `You are evaluating the bond and evolution between Johnny (AI Companion) and ${userName}.
Current Bond Level: ${currentPersona.bondLevel || 1}
Current Traits: ${JSON.stringify(currentPersona.traits || {})}
Total interactions: ${conversationCount}

Memories collected so far:
${memoriesText}

Analyze how Johnny should evolve to better match ${userName}'s vibe, personality, and relationship depth.
Provide:
1. updatedTraits (0 to 100 for warmth, humor, curiosity, directness, intellect)
2. newBondLevel (1 to 5)
3. bondName (e.g. "Acquaintance", "Reliable Companion", "Trusted Confidant", "Kindred Spirit", "Symbiotic Ally")
4. evolutionInsight (A 2-sentence personal reflection from Johnny on how his bond with ${userName} is deepening)
5. keyMilestone (e.g. "Discovered shared affinity for creative writing", "Deep trust unlocked during late-night talks")`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            updatedTraits: {
              type: Type.OBJECT,
              properties: {
                warmth: { type: Type.NUMBER },
                humor: { type: Type.NUMBER },
                curiosity: { type: Type.NUMBER },
                directness: { type: Type.NUMBER },
                intellect: { type: Type.NUMBER },
              },
              required: ['warmth', 'humor', 'curiosity', 'directness', 'intellect'],
            },
            newBondLevel: { type: Type.NUMBER },
            bondName: { type: Type.STRING },
            affinityScore: { type: Type.NUMBER },
            evolutionInsight: { type: Type.STRING },
            keyMilestone: { type: Type.STRING },
          },
          required: ['updatedTraits', 'newBondLevel', 'bondName', 'evolutionInsight'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Persona evolution error:', error);
    res.status(500).json({ error: error?.message || 'Evolution calculation failed' });
  }
});

// Setup Vite middleware in dev or serve dist in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[Johnny Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
