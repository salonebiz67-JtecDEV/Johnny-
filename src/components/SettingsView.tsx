import React, { useState } from 'react';
import {
  Volume2,
  Globe,
  Sliders,
  Check,
  Play,
  Brain,
  SlidersHorizontal,
  Flame,
  Settings as SettingsIcon,
  Sparkles,
  Shield,
  Palette,
  Bell,
  Trash2,
  Lock,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { PersonaState, AppSettings, UserSession, NavigationTab } from '../types';
import { db } from '../services/db';
import { voiceEngine } from '../services/voice';
import { requestTTSAudio } from '../services/api';

interface SettingsViewProps {
  persona: PersonaState;
  settings: AppSettings;
  session: UserSession;
  onNavigate?: (tab: NavigationTab) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  persona,
  settings,
  session,
  onNavigate,
}) => {
  const [selectedVoice, setSelectedVoice] = useState(persona.voiceName);
  const [voiceSpeed, setVoiceSpeed] = useState<number>(persona.voiceSpeed || 1.0);
  const [voiceStyle, setVoiceStyle] = useState<string>(settings.voiceStyle || 'Natural');
  const [isPlayingTestVoice, setIsPlayingTestVoice] = useState(false);
  const [customPrompt, setCustomPrompt] = useState(persona.customPrompt);
  const [isSavedPrompt, setIsSavedPrompt] = useState(false);
  const [memoryEnabled, setMemoryEnabled] = useState(settings.memoryRetention ?? true);

  const voices: { name: PersonaState['voiceName']; label: string; desc: string }[] = [
    { name: 'Puck', label: 'JOSA Warm', desc: 'Warm, natural, charismatic & engaging' },
    { name: 'Zephyr', label: 'JOSA Zephyr', desc: 'Smooth, relaxed, thoughtful & crisp' },
    { name: 'Charon', label: 'JOSA Deep', desc: 'Grounded, resonant & calming' },
    { name: 'Fenrir', label: 'JOSA Confident', desc: 'Direct, articulate & assertive' },
    { name: 'Kore', label: 'JOSA Melodic', desc: 'Gentle, bright & soothing' },
  ];

  const handleVoiceSelect = (v: PersonaState['voiceName']) => {
    setSelectedVoice(v);
    db.updatePersona({ voiceName: v });
    db.updateSettings({ voiceName: v });
    voiceEngine.playCue('pop');
  };

  const handleSpeedChange = (val: number) => {
    setVoiceSpeed(val);
    db.updatePersona({ voiceSpeed: val });
  };

  const testVoiceSample = async () => {
    setIsPlayingTestVoice(true);
    voiceEngine.playCue('chime');
    const sampleText = `Hello John. I am JOSA AI, your personal assistant. How does this vocal cadence sound for our sessions?`;

    try {
      if (settings.voiceEngine === 'gemini') {
        const audio = await requestTTSAudio(sampleText, selectedVoice);
        if (audio) {
          await voiceEngine.playGeminiPCM(audio, 24000);
          setIsPlayingTestVoice(false);
          return;
        }
      }
      await voiceEngine.playWebSpeech(sampleText, selectedVoice);
    } catch (e) {
      console.warn('Voice preview error:', e);
    } finally {
      setIsPlayingTestVoice(false);
    }
  };

  const handleSavePrompt = () => {
    db.updatePersona({ customPrompt });
    setIsSavedPrompt(true);
    voiceEngine.playCue('success');
    setTimeout(() => setIsSavedPrompt(false), 2200);
  };

  const handleTraitChange = (key: keyof PersonaState['traits'], val: number) => {
    db.updatePersona({
      traits: {
        ...persona.traits,
        [key]: val,
      },
    });
  };

  const handleClearAllData = () => {
    if (confirm('Reset JOSA AI to initial state? (All memories and conversations will be cleared).')) {
      localStorage.clear();
      voiceEngine.playCue('alert');
      window.location.reload();
    }
  };

  return (
    <div className="pb-28 md:pb-12 pt-4 px-4 sm:px-6 max-w-3xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <header className="flex items-center justify-between py-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F5F5F5]">Settings</h1>
          <p className="text-xs text-[#929292]">Preferences, voice acoustics, and AI configuration</p>
        </div>
      </header>

      {/* ========================================================
          1. AI PROMPT & PERSONALIZATION SETTING (USER REQUEST)
      ======================================================== */}
      <section className="p-5 rounded-2xl bg-[#151515] border border-[#D6B15E]/30 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1f1e1b] border border-[#D6B15E]/40 flex items-center justify-center text-[#D6B15E]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F5F5F5] flex items-center gap-2">
                <span>AI Prompt</span>
                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded-full bg-[#D6B15E]/15 text-[#D6B15E] font-bold">
                  Active Directive
                </span>
              </h2>
              <p className="text-[11px] text-[#929292]">
                Configure how JOSA AI responds to your messages and voice
              </p>
            </div>
          </div>

          {isSavedPrompt && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold animate-fadeIn bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              <Check className="w-3.5 h-3.5" /> Prompt Saved!
            </span>
          )}
        </div>

        <p className="text-xs text-[#929292] leading-relaxed">
          Put your custom prompt below so JOSA AI adopts your preferred tone, brevity, behavioral rules, or analytical style across all voice and chat interactions:
        </p>

        {/* Textarea */}
        <div className="relative">
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={4}
            placeholder="e.g. Act as my direct executive coach. Always keep answers concise, clear, and actionable. Avoid generic pleasantries and challenge my assumptions..."
            className="w-full p-3 rounded-xl bg-[#0c0c0c] border border-[#292929] text-xs text-[#F5F5F5] placeholder:text-[#929292] focus:outline-none focus:border-[#D6B15E] font-mono leading-relaxed"
          />
          <div className="flex justify-between items-center text-[10px] text-[#929292] px-1 mt-1 font-mono">
            <span>Applied with highest priority in Gemini instructions</span>
            <span>{customPrompt.length} chars</span>
          </div>
        </div>

        {/* Quick Clickable Presets */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold text-[#929292]">Quick Prompt Templates:</div>
          <div className="flex flex-wrap gap-1.5">
            {[
              {
                label: '⚡ Concise & Direct',
                text: 'Answer in 1-2 punchy sentences. Be direct, clear, and high-impact with zero fluff.',
              },
              {
                label: '💼 Executive Coach',
                text: 'Act as my strategic executive coach. Hold me accountable, challenge assumptions, and emphasize leverage.',
              },
              {
                label: '😂 Witty & Conversational',
                text: 'Be humorous, sharp with witty banter, clever metaphors, and lively conversation like a close friend.',
              },
              {
                label: '🕊️ Calm & Grounded',
                text: 'Respond with peaceful wisdom, mindful clarity, gratitude, and tranquil perspective.',
              },
              {
                label: '🧠 Socratic Mentor',
                text: 'Ask thought-provoking follow-up questions before offering answers to sharpen my intellect.',
              },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setCustomPrompt(preset.text);
                  voiceEngine.playCue('pop');
                }}
                className="text-[10px] font-medium px-2.5 py-1 rounded-lg bg-[#1a1a1a] border border-[#292929] text-[#929292] hover:text-[#D6B15E] hover:border-[#D6B15E]/40 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setCustomPrompt(
                'Speak like an authentic, highly capable personal assistant who balances sharp intelligence with emotional clarity. Keep spoken answers concise, elegant, and actionable.',
              );
              voiceEngine.playCue('pop');
            }}
            className="py-2 px-3 rounded-xl border border-[#292929] text-[#929292] hover:text-[#F5F5F5] text-xs font-medium hover:bg-[#1a1a1a] transition-colors"
          >
            Reset to Default
          </button>

          <button
            type="button"
            onClick={handleSavePrompt}
            className="flex-1 py-2 px-4 rounded-xl bg-[#D6B15E] hover:bg-[#F0D58A] text-[#050505] font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Save AI Prompt</span>
          </button>
        </div>
      </section>

      {/* ========================================================
          2. VOICE & SPEECH SETTINGS
      ======================================================== */}
      <section className="p-5 rounded-2xl bg-[#151515] border border-[#292929] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-[#D6B15E]">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F5F5F5]">Voice & Speech</h2>
              <p className="text-[11px] text-[#929292]">Acoustic models and live voice speed</p>
            </div>
          </div>

          <button
            onClick={testVoiceSample}
            disabled={isPlayingTestVoice}
            className="text-xs px-2.5 py-1 rounded-lg bg-[#D6B15E]/15 text-[#D6B15E] border border-[#D6B15E]/30 font-semibold flex items-center gap-1.5 hover:bg-[#D6B15E]/25 transition-colors"
          >
            <Play className={`w-3 h-3 ${isPlayingTestVoice ? 'animate-spin' : ''}`} />
            <span>{isPlayingTestVoice ? 'Playing...' : 'Test Voice'}</span>
          </button>
        </div>

        {/* Voices List */}
        <div className="space-y-1.5">
          {voices.map((v) => {
            const isSelected = selectedVoice === v.name;
            return (
              <div
                key={v.name}
                onClick={() => handleVoiceSelect(v.name)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[#D6B15E] bg-[#1a1a1a] text-[#F5F5F5]'
                    : 'border-[#292929] bg-[#101010] text-[#929292] hover:border-[#383838]'
                }`}
              >
                <div>
                  <div className={`text-xs font-bold ${isSelected ? 'text-[#D6B15E]' : 'text-[#F5F5F5]'}`}>
                    {v.label}
                  </div>
                  <div className="text-[10px] text-[#929292]">{v.desc}</div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#D6B15E]" />}
              </div>
            );
          })}
        </div>

        {/* Speaking Speed Slider */}
        <div className="pt-2 border-t border-[#222222] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#929292]">Speaking Speed</span>
            <span className="font-mono text-[#D6B15E] font-semibold">{voiceSpeed.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.8"
            max="1.3"
            step="0.1"
            value={voiceSpeed}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            className="w-full accent-[#D6B15E] h-1.5 bg-[#0c0c0c] rounded-lg cursor-pointer"
          />
        </div>

        {/* Live Voice Animation Style Selection */}
        <div className="pt-2 border-t border-[#222222] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#F5F5F5]">Live Voice Animation Style</span>
            <span className="text-[10px] text-[#D6B15E] font-mono capitalize">
              {settings.voiceAnimationStyle || 'jarvis'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'jarvis', label: 'JARVIS Core' },
              { id: 'aurora', label: 'Aurora Waves' },
              { id: 'spectrum', label: 'Pulse Spectrum' },
            ].map((style) => {
              const isSelected = (settings.voiceAnimationStyle || 'jarvis') === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => {
                    db.updateSettings({ voiceAnimationStyle: style.id as any });
                    voiceEngine.playCue('pop');
                  }}
                  className={`p-2 rounded-xl text-center text-xs font-medium border transition-all ${
                    isSelected
                      ? 'border-[#D6B15E] bg-[#1a1a1a] text-[#D6B15E] font-bold shadow-sm'
                      : 'border-[#292929] bg-[#101010] text-[#929292] hover:text-white'
                  }`}
                >
                  {style.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================
          3. MEMORY & DATA STORAGE
      ======================================================== */}
      <section className="p-5 rounded-2xl bg-[#151515] border border-[#292929] space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-[#D6B15E]">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#F5F5F5]">Memory & Learning</h2>
            <p className="text-[11px] text-[#929292]">Continuous memory bank across sessions</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-[#101010] border border-[#292929]">
          <div>
            <div className="text-xs font-semibold text-[#F5F5F5]">Persistent Memory Retention</div>
            <div className="text-[11px] text-[#929292]">Remember preferences, goals, and facts automatically</div>
          </div>
          <input
            type="checkbox"
            checked={memoryEnabled}
            onChange={(e) => {
              setMemoryEnabled(e.target.checked);
              db.updateSettings({ memoryRetention: e.target.checked });
            }}
            className="w-4 h-4 accent-[#D6B15E] rounded"
          />
        </div>
      </section>

      {/* ========================================================
          4. DANGER ZONE
      ======================================================== */}
      <section className="p-5 rounded-2xl bg-[#151515] border border-[#292929] space-y-3">
        <div className="flex items-center gap-2 text-rose-400">
          <Trash2 className="w-4 h-4" />
          <h2 className="text-xs font-bold uppercase tracking-wider">Data Management</h2>
        </div>
        <p className="text-xs text-[#929292]">
          Reset JOSA AI or clear local cache. This will erase saved memories and conversation threads.
        </p>
        <button
          onClick={handleClearAllData}
          className="py-2.5 px-4 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset JOSA AI & Clear Data</span>
        </button>
      </section>
    </div>
  );
};
