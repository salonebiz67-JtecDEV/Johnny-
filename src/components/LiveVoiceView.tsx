import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  Sparkles,
  Sliders,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  LogOut,
} from 'lucide-react';
import { PersonaState, MemoryItem, UserSession, AppSettings, VoiceAnimationStyle } from '../types';
import { AudioOrb, OrbVisualState } from './AudioOrb';
import { voiceEngine } from '../services/voice';
import { sendChatMessage, requestTTSAudio } from '../services/api';
import { db } from '../services/db';

interface LiveVoiceViewProps {
  persona: PersonaState;
  memories: MemoryItem[];
  session: UserSession;
  settings: AppSettings;
  onClose: () => void;
  onOpenSettings?: () => void;
}

type ConnectionState = 'connecting' | 'connected' | 'error';

export const LiveVoiceView: React.FC<LiveVoiceViewProps> = ({
  persona,
  memories,
  session,
  settings,
  onClose,
}) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [orbState, setOrbState] = useState<OrbVisualState>('connecting');
  const [animationStyle, setAnimationStyle] = useState<VoiceAnimationStyle>(
    settings.voiceAnimationStyle || 'jarvis',
  );
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [currentAIText, setCurrentAIText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isStyleModalOpen, setIsStyleModalOpen] = useState<boolean>(false);

  const silenceTimeoutRef = useRef<any>(null);
  const transcriptBufferRef = useRef<string>('');
  const isComponentMounted = useRef<boolean>(true);
  const welcomeSpokenRef = useRef<boolean>(false);

  // Initialize Real-Time Live Voice Session
  useEffect(() => {
    isComponentMounted.current = true;
    welcomeSpokenRef.current = false;
    connectLiveVoice();

    const unsubscribeSpeaking = voiceEngine.subscribeSpeakingState((speaking) => {
      if (isComponentMounted.current && connectionState === 'connected') {
        if (speaking) {
          setOrbState('speaking');
        } else if (!isMicMuted) {
          setOrbState('listening');
        } else {
          setOrbState('idle');
        }
      }
    });

    return () => {
      isComponentMounted.current = false;
      unsubscribeSpeaking();
      cleanupLiveSession();
    };
  }, []);

  const cleanupLiveSession = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    voiceEngine.stopPlayback();
    voiceEngine.stopSpeechRecognition();
    voiceEngine.stopMicMonitoring();
  };

  const connectLiveVoice = async () => {
    setConnectionState('connecting');
    setConnectionError(null);
    setOrbState('connecting');

    try {
      // 1. Request actual microphone stream
      const stream = await voiceEngine.startMicMonitoring();
      if (!stream) {
        throw new Error('Microphone permission denied or audio input device unavailable.');
      }

      if (!isComponentMounted.current) return;
      setConnectionState('connected');

      // 2. Play Welcome Greeting from JOSA
      if (!welcomeSpokenRef.current) {
        welcomeSpokenRef.current = true;
        const firstName = session.name ? session.name.split(' ')[0] : 'there';
        const welcomeText = `Hey ${firstName}, welcome back. I'm here with you. What would you like to talk about?`;
        setCurrentAIText(welcomeText);

        if (!isSpeakerMuted) {
          setOrbState('speaking');
          let played = false;

          if (settings.voiceEngine === 'gemini') {
            try {
              const audioData = await requestTTSAudio(
                welcomeText,
                persona.voiceName,
                'Warm, articulate, natural AI assistant',
              );
              if (audioData && isComponentMounted.current) {
                await voiceEngine.playGeminiPCM(audioData, 24000);
                played = true;
              }
            } catch (err) {
              console.warn('TTS welcome fallback:', err);
            }
          }

          if (!played && isComponentMounted.current) {
            await voiceEngine.playWebSpeech(welcomeText, persona.voiceName);
          }
        }

        // 3. Begin listening cycle for user's turn
        if (isComponentMounted.current && !isMicMuted) {
          startListeningCycle();
        } else if (isComponentMounted.current) {
          setOrbState('idle');
        }
      }
    } catch (err: any) {
      console.warn('[LiveVoice] Connection failure:', err);
      if (isComponentMounted.current) {
        setConnectionState('error');
        setConnectionError(
          err.message || 'Unable to access your microphone. Please verify browser permissions.',
        );
        setOrbState('idle');
      }
    }
  };

  const startListeningCycle = () => {
    if (isMicMuted || connectionState !== 'connected') return;

    setOrbState('listening');
    voiceEngine.startSpeechRecognition(
      (text: string, isFinal: boolean) => {
        if (!isComponentMounted.current || isProcessing) return;

        setLiveTranscript(text);
        transcriptBufferRef.current = text;

        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }

        if (isFinal) {
          handleVoiceTurn(text);
        } else {
          // Pause detection for natural conversational cadence
          silenceTimeoutRef.current = setTimeout(() => {
            if (transcriptBufferRef.current.trim().length > 1) {
              handleVoiceTurn(transcriptBufferRef.current);
            }
          }, 1400);
        }
      },
      (err) => {
        console.warn('Recognition notice:', err);
      },
    );
  };

  const handleVoiceTurn = async (spokenText: string) => {
    if (!spokenText.trim() || isProcessing) return;

    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    voiceEngine.stopSpeechRecognition();

    setIsProcessing(true);
    setOrbState('thinking');
    voiceEngine.playCue('pop');

    // Save actual user message to chat history
    db.addMessage({
      role: 'user',
      text: spokenText,
      isVoiceInput: true,
    });

    try {
      const messagesHistory = db.getMessages();
      const chatResponse = await sendChatMessage(
        spokenText,
        messagesHistory.slice(-6),
        persona,
        memories,
        persona.customPrompt,
        session.name,
      );

      setCurrentAIText(chatResponse.text);

      if (chatResponse.extractedMemory) {
        db.addMemory(chatResponse.extractedMemory, chatResponse.category as any, 'voice');
      }

      // Save actual assistant reply to chat history
      db.addMessage({
        role: 'assistant',
        text: chatResponse.text,
        thought: chatResponse.thought,
      });

      db.boostAffinity(2);

      if (!isSpeakerMuted && isComponentMounted.current) {
        setOrbState('speaking');
        let played = false;

        if (settings.voiceEngine === 'gemini') {
          try {
            const audioData = await requestTTSAudio(
              chatResponse.text,
              persona.voiceName,
              'Warm, articulate, natural AI assistant',
            );
            if (audioData && isComponentMounted.current) {
              await voiceEngine.playGeminiPCM(audioData, 24000);
              played = true;
            }
          } catch (e) {
            console.warn('TTS playback fallback:', e);
          }
        }

        if (!played && isComponentMounted.current) {
          await voiceEngine.playWebSpeech(chatResponse.text, persona.voiceName);
        }
      }
    } catch (err: any) {
      console.error('Live voice processing error:', err);
      setCurrentAIText('I caught that, though my connection fluctuated for a moment. Could you say that again?');
    } finally {
      setIsProcessing(false);
      transcriptBufferRef.current = '';
      setLiveTranscript('');

      if (!isMicMuted && isComponentMounted.current) {
        startListeningCycle();
      } else if (isComponentMounted.current) {
        setOrbState('idle');
      }
    }
  };

  const handleInterrupt = () => {
    voiceEngine.stopPlayback();
    voiceEngine.playCue('pop');
    if (!isMicMuted) {
      startListeningCycle();
    } else {
      setOrbState('idle');
    }
  };

  const toggleMic = () => {
    if (isMicMuted) {
      setIsMicMuted(false);
      voiceEngine.playCue('chime');
      startListeningCycle();
    } else {
      setIsMicMuted(true);
      voiceEngine.stopSpeechRecognition();
      voiceEngine.playCue('alert');
      setOrbState('idle');
    }
  };

  const toggleSpeaker = () => {
    const nextState = !isSpeakerMuted;
    setIsSpeakerMuted(nextState);
    if (nextState) {
      voiceEngine.stopPlayback();
    }
    voiceEngine.playCue('pop');
  };

  const handleSelectStyle = (style: VoiceAnimationStyle) => {
    setAnimationStyle(style);
    db.updateSettings({ voiceAnimationStyle: style });
    setIsStyleModalOpen(false);
    voiceEngine.playCue('pop');
  };

  const handleExit = () => {
    cleanupLiveSession();
    onClose();
  };

  const getStatusText = () => {
    if (connectionState === 'connecting') return 'Connecting to Live Voice...';
    if (connectionState === 'error') return 'Connection Error';
    if (isMicMuted) return 'Microphone muted';
    if (orbState === 'speaking') return 'JOSA is speaking...';
    if (orbState === 'thinking') return 'Thinking...';
    if (orbState === 'listening') return 'Listening...';
    return 'Ready to talk';
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050505] text-[#F5F5F5] flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none animate-fadeIn">
      {/* Cinematic Golden Atmospheric Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[460px] h-[460px] bg-[#D6B15E]/8 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between pt-2 px-1">
        <button
          onClick={handleExit}
          className="p-2.5 rounded-full text-[#929292] hover:text-[#F5F5F5] hover:bg-[#151515] transition-colors focus:outline-none"
          title="Exit Live Voice"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionState === 'connected'
                  ? 'bg-[#D6B15E] animate-pulse'
                  : connectionState === 'connecting'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-rose-500'
              }`}
            />
            <h2 className="text-sm font-bold tracking-tight text-[#F5F5F5]">JOSA LIVE</h2>
          </div>
          <p className="text-[11px] text-[#929292] font-mono">
            {connectionState === 'connected' ? 'Real-Time Voice • Gemini 3.8 Flash' : 'Establishing Secure Session'}
          </p>
        </div>

        {/* Animation Style Selector Button */}
        <button
          onClick={() => setIsStyleModalOpen(true)}
          className="p-2.5 rounded-full text-[#929292] hover:text-[#D6B15E] hover:bg-[#151515] transition-colors focus:outline-none"
          title="Change Animation Style"
        >
          <Sparkles className="w-5 h-5" />
        </button>
      </header>

      {/* Center Voice Visualizer */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-auto">
        {connectionState === 'error' ? (
          <div className="text-center space-y-4 max-w-sm px-4 p-6 rounded-3xl bg-[#151515] border border-rose-900/60 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/80 flex items-center justify-center mx-auto text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Microphone Access Required</h3>
              <p className="text-xs text-[#929292] leading-relaxed">
                {connectionError || 'Please allow microphone access in your browser to speak with JOSA.'}
              </p>
            </div>
            <button
              onClick={connectLiveVoice}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D6B15E] to-[#F0D58A] hover:opacity-95 text-[#050505] font-bold text-xs shadow-lg shadow-[#D6B15E]/20 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Connection</span>
            </button>
          </div>
        ) : (
          <>
            <AudioOrb
              state={orbState}
              style={animationStyle}
              size={290}
              onClick={() => {
                if (orbState === 'speaking') {
                  handleInterrupt();
                } else if (!isProcessing && connectionState === 'connected') {
                  startListeningCycle();
                }
              }}
            />

            {/* Status Typography */}
            <div className="mt-8 text-center space-y-2 max-w-md px-4">
              <h3 className="text-base font-bold text-[#D6B15E] tracking-tight">
                {getStatusText()}
              </h3>

              {/* Subtitle / Transcription Box */}
              <div className="min-h-[48px] flex items-center justify-center">
                {liveTranscript ? (
                  <p className="text-sm text-[#F0D58A] italic animate-fadeIn font-medium">
                    "{liveTranscript}"
                  </p>
                ) : orbState === 'speaking' ? (
                  <p className="text-xs text-[#F5F5F5] line-clamp-2 leading-relaxed">
                    "{currentAIText}"
                  </p>
                ) : (
                  <p className="text-xs text-[#929292]">
                    {connectionState === 'connecting'
                      ? 'Initializing voice connection...'
                      : isMicMuted
                      ? 'Tap microphone below to unmute'
                      : 'Speak freely, JOSA will respond naturally'}
                  </p>
                )}
              </div>

              {/* Interrupt button when JOSA is speaking */}
              {orbState === 'speaking' && (
                <button
                  onClick={handleInterrupt}
                  className="mt-2 inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-[#151515] border border-[#D6B15E]/40 text-[#D6B15E] text-xs font-semibold hover:bg-[#202020] transition-colors"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Tap to Interrupt</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Bottom Controls: Elegant Black & Gold (NO PHONE RED BUTTON!) */}
      <footer className="relative z-10 max-w-sm mx-auto w-full pb-6 px-4 space-y-4">
        <div className="flex items-center justify-center gap-6">
          {/* Mute/Unmute Mic */}
          <button
            onClick={toggleMic}
            disabled={connectionState !== 'connected'}
            className={`w-13 h-13 rounded-2xl flex items-center justify-center border transition-all ${
              isMicMuted
                ? 'bg-rose-950/40 border-rose-700/60 text-rose-400'
                : 'bg-[#151515] border-[#292929] text-[#929292] hover:text-[#F5F5F5] hover:border-[#D6B15E]/40'
            } disabled:opacity-40`}
            title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Neutral Exit Live Voice Button (Replaces Red Phone Button) */}
          <button
            onClick={handleExit}
            className="h-13 px-6 rounded-2xl bg-[#151515] hover:bg-[#202020] border border-[#292929] hover:border-[#D6B15E]/50 text-[#F5F5F5] flex items-center justify-center gap-2 text-xs font-semibold transition-all shadow-md active:scale-95"
            title="Exit Live Voice"
          >
            <LogOut className="w-4 h-4 text-[#D6B15E]" />
            <span>Exit Live Voice</span>
          </button>

          {/* Mute/Unmute Speaker */}
          <button
            onClick={toggleSpeaker}
            disabled={connectionState !== 'connected'}
            className={`w-13 h-13 rounded-2xl flex items-center justify-center border transition-all ${
              isSpeakerMuted
                ? 'bg-[#151515] border-[#292929] text-[#929292]/50'
                : 'bg-[#151515] border-[#292929] text-[#929292] hover:text-[#F5F5F5] hover:border-[#D6B15E]/40'
            } disabled:opacity-40`}
            title={isSpeakerMuted ? 'Unmute Speaker' : 'Mute Speaker'}
          >
            {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 text-center text-[11px] text-[#929292]">
          <span>Style:</span>
          <button
            onClick={() => setIsStyleModalOpen(true)}
            className="text-[#D6B15E] font-medium underline underline-offset-2 hover:text-[#F0D58A] transition-colors"
          >
            {animationStyle === 'jarvis'
              ? 'JARVIS Core'
              : animationStyle === 'aurora'
              ? 'Aurora Waves'
              : 'Pulse Spectrum'}
          </button>
        </div>
      </footer>

      {/* Animation Style Selector Modal */}
      {isStyleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl border border-[#292929] bg-[#101010] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#292929]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D6B15E]" />
                <h3 className="text-sm font-bold text-[#F5F5F5]">AI Voice Animation Style</h3>
              </div>
              <button
                onClick={() => setIsStyleModalOpen(false)}
                className="p-1 rounded-lg text-[#929292] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#929292]">
              Choose how JOSA's voice energy responds to speech in real time:
            </p>

            <div className="space-y-2.5">
              {[
                {
                  id: 'jarvis' as VoiceAnimationStyle,
                  title: 'JARVIS Core',
                  desc: 'Futuristic circular energy core with concentric golden rings, technical tick marks, and subtle glow.',
                },
                {
                  id: 'aurora' as VoiceAnimationStyle,
                  title: 'Aurora Waves',
                  desc: 'Fluid, organic champagne-gold ribbon waves pulsing gracefully with natural speech cadence.',
                },
                {
                  id: 'spectrum' as VoiceAnimationStyle,
                  title: 'Pulse Spectrum',
                  desc: 'Radial audio frequency spectrum reacting in real time to microphone and playback audio.',
                },
              ].map((item) => {
                const isSelected = animationStyle === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectStyle(item.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'border-[#D6B15E] bg-[#151515] shadow-lg shadow-[#D6B15E]/10'
                        : 'border-[#292929] bg-[#121212] hover:border-[#383838]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        {item.title}
                        {isSelected && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#D6B15E]/20 text-[#D6B15E] font-medium">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#929292] leading-relaxed">{item.desc}</p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#D6B15E] flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-[#050505] stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
