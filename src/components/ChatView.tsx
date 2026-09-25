import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Trash2,
  PanelLeft,
  X,
  MessageSquare,
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Square,
  Paperclip,
  MoreHorizontal,
  Edit2,
  Radio,
  Sparkles,
  AlertCircle,
  Code2,
  Compass,
  Lightbulb,
  FileText,
} from 'lucide-react';
import { ChatMessage, PersonaState, MemoryItem, UserSession, AppSettings, ConversationThread } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { WaveformVisualizer } from './WaveformVisualizer';
import { sendChatMessage, requestTTSAudio } from '../services/api';
import { voiceEngine } from '../services/voice';
import { db } from '../services/db';

interface ChatViewProps {
  persona: PersonaState;
  memories: MemoryItem[];
  session: UserSession;
  settings: AppSettings;
  onStartLiveVoice: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  persona,
  memories,
  session,
  settings,
  onStartLiveVoice,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(db.getMessages());
  const [threads, setThreads] = useState<ConversationThread[]>(db.getThreads());
  const [activeThreadId, setActiveThreadId] = useState<string>(db.getActiveThreadId());
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeAudioMessageId, setActiveAudioMessageId] = useState<string | null>(null);

  // Speech-to-Text Dictation State (Separate from Live Voice)
  const [isDictating, setIsDictating] = useState<boolean>(false);
  const [dictationTime, setDictationTime] = useState<number>(0);
  const [interimDictationText, setInterimDictationText] = useState<string>('');
  const [dictationError, setDictationError] = useState<string | null>(null);

  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<Record<string, 'up' | 'down' | undefined>>({});
  const [isRenamingThreadId, setIsRenamingThreadId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState<string>('');
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dictationTimerRef = useRef<any>(null);
  const accumulatedDictationRef = useRef<string>('');

  // Sync state with rapid database
  useEffect(() => {
    const unsub = db.subscribe(() => {
      setMessages(db.getMessages());
      setThreads(db.getThreads());
      setActiveThreadId(db.getActiveThreadId());
    });
    return () => unsub();
  }, []);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating, isDictating]);

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [inputText]);

  // Clean up dictation timer on unmount
  useEffect(() => {
    return () => {
      if (dictationTimerRef.current) clearInterval(dictationTimerRef.current);
      voiceEngine.stopSpeechRecognition();
      voiceEngine.stopMicMonitoring();
    };
  }, []);

  // -------------------------------------------------------------
  // SPEECH-TO-TEXT DICTATION HANDLERS (Chat Microphone Feature)
  // -------------------------------------------------------------
  const startChatDictation = async () => {
    setDictationError(null);
    accumulatedDictationRef.current = '';
    setInterimDictationText('');
    setDictationTime(0);

    // Request microphone for speech recognition & visualizer
    const stream = await voiceEngine.startMicMonitoring();
    if (!stream) {
      setDictationError('Microphone permission denied. Please allow microphone access to dictate.');
      return;
    }

    voiceEngine.playCue('chime');
    setIsDictating(true);

    // Start timer counter
    dictationTimerRef.current = setInterval(() => {
      setDictationTime((prev) => prev + 1);
    }, 1000);

    const started = voiceEngine.startSpeechRecognition(
      (transcript, isFinal) => {
        if (isFinal) {
          accumulatedDictationRef.current = accumulatedDictationRef.current
            ? `${accumulatedDictationRef.current} ${transcript}`
            : transcript;
          setInterimDictationText('');
        } else {
          setInterimDictationText(transcript);
        }
      },
      (err) => {
        console.warn('[Dictation Notice]', err);
        setDictationError('Speech recognition encountered an issue. Tap Retry to try again.');
      },
    );

    if (!started) {
      stopChatDictation(false);
      setDictationError('Speech recognition is not supported in this browser environment.');
    }
  };

  const stopChatDictation = (applyText: boolean = true) => {
    if (dictationTimerRef.current) {
      clearInterval(dictationTimerRef.current);
      dictationTimerRef.current = null;
    }

    voiceEngine.stopSpeechRecognition();
    voiceEngine.stopMicMonitoring();
    setIsDictating(false);

    if (applyText) {
      const fullRecorded = `${accumulatedDictationRef.current} ${interimDictationText}`.trim();
      if (fullRecorded) {
        setInputText((prev) => (prev.trim() ? `${prev.trim()} ${fullRecorded}` : fullRecorded));
        voiceEngine.playCue('success');
      }
      // Focus textarea so the user can review and edit before sending
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    } else {
      voiceEngine.playCue('pop');
    }

    accumulatedDictationRef.current = '';
    setInterimDictationText('');
  };

  // -------------------------------------------------------------
  // CHAT MESSAGE SENDING & GENERATION
  // -------------------------------------------------------------
  const handleSend = async (customText?: string) => {
    const content = (customText || inputText).trim();
    if (!content || isGenerating) return;

    setInputText('');
    setDictationError(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // 1. Add User Message
    const userMsg = db.addMessage({
      role: 'user',
      text: content,
    });

    setIsGenerating(true);
    voiceEngine.playCue('pop');

    try {
      const currentHistory = db.getMessages();
      const response = await sendChatMessage(
        content,
        currentHistory.slice(-8),
        persona,
        memories,
        persona.customPrompt,
        session.name,
      );

      // Extract real memory if detected
      if (response.extractedMemory) {
        db.addMemory(response.extractedMemory, (response.category as any) || 'Fact', 'chat');
      }

      // Add AI Assistant Message
      const assistantMsg = db.addMessage({
        role: 'assistant',
        text: response.text,
        thought: response.thought,
        memoryExtracted: response.extractedMemory || undefined,
      });

      if (settings.autoSpeak) {
        playMessageAudio(assistantMsg.id, assistantMsg.text);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      db.addMessage({
        role: 'assistant',
        text: 'I encountered an issue reaching the assistant service. Please check your network connection and try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStopGenerating = () => {
    setIsGenerating(false);
    voiceEngine.playCue('pop');
  };

  const handleRegenerate = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      handleSend(lastUserMsg.text);
    }
  };

  const playMessageAudio = async (msgId: string, text: string) => {
    if (activeAudioMessageId === msgId) {
      voiceEngine.stopPlayback();
      setActiveAudioMessageId(null);
      return;
    }

    voiceEngine.stopPlayback();
    setActiveAudioMessageId(msgId);

    try {
      if (settings.voiceEngine === 'gemini') {
        const audioData = await requestTTSAudio(
          text,
          persona.voiceName,
          'Warm, articulate, natural AI assistant',
        );
        if (audioData) {
          await voiceEngine.playGeminiPCM(audioData, 24000);
          setActiveAudioMessageId(null);
          return;
        }
      }
      await voiceEngine.playWebSpeech(text, persona.voiceName);
    } catch (e) {
      console.warn('Playback fallback notice:', e);
    } finally {
      setActiveAudioMessageId(null);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    voiceEngine.playCue('pop');
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleFeedback = (msgId: string, type: 'up' | 'down') => {
    setFeedbackState((prev) => ({
      ...prev,
      [msgId]: prev[msgId] === type ? undefined : type,
    }));
    voiceEngine.playCue('pop');
  };

  // -------------------------------------------------------------
  // THREAD / CONVERSATION MANAGEMENT
  // -------------------------------------------------------------
  const handleNewChat = () => {
    const newThread = db.createNewThread();
    setActiveThreadId(newThread.id);
    setMessages([]);
    setIsSidebarOpen(false);
    voiceEngine.playCue('pop');
  };

  const handleSwitchThread = (threadId: string) => {
    const thread = db.switchThread(threadId);
    if (thread) {
      setActiveThreadId(thread.id);
      setMessages([...thread.messages]);
      setIsSidebarOpen(false);
      voiceEngine.playCue('pop');
    }
  };

  const handleRenameThread = (threadId: string) => {
    if (!renameInput.trim()) {
      setIsRenamingThreadId(null);
      return;
    }
    db.updateThreadTitle(threadId, renameInput.trim());
    setIsRenamingThreadId(null);
    setRenameInput('');
  };

  const handleDeleteThread = (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    db.deleteThread(threadId);
    voiceEngine.playCue('pop');
  };

  const handleClearAllHistory = () => {
    if (window.confirm('Are you sure you want to clear your conversation history? This cannot be undone.')) {
      db.clearAllThreads();
      setIsMenuOpen(false);
      voiceEngine.playCue('alert');
    }
  };

  const currentThread = threads.find((t) => t.id === activeThreadId);
  const activeTitle = currentThread?.title || (messages.length > 0 ? 'Conversation' : 'New Conversation');

  const filteredThreads = threads.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="relative flex h-full w-full bg-[#050505] text-[#F5F5F5] overflow-hidden">
      {/* --------------------------------------------------------- */}
      {/* CONVERSATION HISTORY DRAWER / SIDEBAR (Responsive) */}
      {/* --------------------------------------------------------- */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#101010] border-r border-[#292929] transform transition-transform duration-300 ease-in-out flex flex-col ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-[#292929] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#151515] border border-[#D6B15E]/40 flex items-center justify-center text-[#D6B15E]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-white tracking-wide">Conversations</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 rounded-lg text-[#929292] hover:text-white hover:bg-[#151515] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="w-full py-2.5 px-3 rounded-xl bg-[#151515] hover:bg-[#202020] border border-[#292929] hover:border-[#D6B15E]/50 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 text-[#D6B15E]" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search Threads */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#929292] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#151515] border border-[#292929] text-white placeholder:text-[#929292] focus:outline-none focus:border-[#D6B15E]/60 transition-colors"
            />
          </div>
        </div>

        {/* Real Threads List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {filteredThreads.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#929292]">
              No conversation history yet. Start a new chat!
            </div>
          ) : (
            filteredThreads.map((t) => {
              const isActive = t.id === activeThreadId;
              const isRenaming = isRenamingThreadId === t.id;

              return (
                <div
                  key={t.id}
                  onClick={() => handleSwitchThread(t.id)}
                  className={`group relative p-2.5 rounded-xl text-xs cursor-pointer transition-all flex items-center justify-between ${
                    isActive
                      ? 'bg-[#151515] border border-[#D6B15E]/40 text-white font-medium shadow-sm'
                      : 'hover:bg-[#151515]/60 text-[#929292] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <MessageSquare
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive ? 'text-[#D6B15E]' : 'text-[#929292]'
                      }`}
                    />
                    {isRenaming ? (
                      <input
                        type="text"
                        value={renameInput}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setRenameInput(e.target.value)}
                        onBlur={() => handleRenameThread(t.id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRenameThread(t.id)}
                        className="bg-[#202020] border border-[#D6B15E] rounded px-1.5 py-0.5 text-xs text-white focus:outline-none w-full"
                      />
                    ) : (
                      <span className="truncate text-xs">{t.title}</span>
                    )}
                  </div>

                  {/* Actions: Rename / Delete */}
                  <div className="hidden group-hover:flex items-center gap-1 shrink-0 ml-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsRenamingThreadId(t.id);
                        setRenameInput(t.title);
                      }}
                      className="p-1 rounded text-[#929292] hover:text-[#D6B15E]"
                      title="Rename"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteThread(t.id, e)}
                      className="p-1 rounded text-[#929292] hover:text-rose-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Clear All History Button */}
        <div className="p-3 border-t border-[#292929]">
          <button
            onClick={handleClearAllHistory}
            className="w-full py-2 px-3 rounded-xl text-[11px] font-medium text-[#929292] hover:text-rose-400 hover:bg-rose-950/20 transition-colors flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All History</span>
          </button>
        </div>
      </aside>

      {/* Backdrop overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* --------------------------------------------------------- */}
      {/* MAIN CHAT CONTAINER */}
      {/* --------------------------------------------------------- */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Top Chat Header */}
        <header className="h-14 border-b border-[#292929] bg-[#050505]/95 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            {/* Sidebar Toggle */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-xl text-[#929292] hover:text-white hover:bg-[#151515] transition-colors"
              title="Open Conversation History"
            >
              <PanelLeft className="w-4 h-4" />
            </button>

            {/* Conversation Title & Model */}
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                {activeTitle}
              </h2>
              <div className="flex items-center gap-1.5 text-[10px] text-[#929292] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D6B15E]" />
                <span>Gemini 3.8 Flash</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Dedicated Live Voice Header Button (Separate from chat mic) */}
            <button
              onClick={onStartLiveVoice}
              className="px-3 py-1.5 rounded-xl bg-[#151515] hover:bg-[#202020] border border-[#D6B15E]/40 hover:border-[#D6B15E] text-[#D6B15E] text-xs font-semibold flex items-center gap-2 transition-all shadow-sm group active:scale-95"
              title="Launch Live Voice"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse text-[#D6B15E]" />
              <span className="hidden sm:inline">Live Voice</span>
            </button>

            {/* New Chat Shortcut */}
            <button
              onClick={handleNewChat}
              className="p-2 rounded-xl text-[#929292] hover:text-white hover:bg-[#151515] transition-colors"
              title="New Conversation"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Options Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-xl text-[#929292] hover:text-white hover:bg-[#151515] transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-[#101010] border border-[#292929] shadow-2xl py-1.5 z-50 animate-fadeIn">
                  <button
                    onClick={() => {
                      db.clearMessages();
                      setIsMenuOpen(false);
                      voiceEngine.playCue('pop');
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-rose-400 hover:bg-rose-950/20 flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Messages</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ------------------------------------------------------- */}
        {/* MESSAGE STREAM AREA */}
        {/* ------------------------------------------------------- */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 max-w-3xl mx-auto w-full">
          {/* EMPTY STATE: Shown when no messages exist */}
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fadeIn space-y-6">
              {/* JOSA AI Waveform Emblem */}
              <div className="w-16 h-16 rounded-3xl bg-[#151515] border border-[#D6B15E]/40 flex items-center justify-center shadow-xl shadow-[#D6B15E]/5">
                <div className="flex items-center gap-1">
                  <span className="w-1 h-3 bg-[#D6B15E] rounded-full" />
                  <span className="w-1 h-6 bg-[#F0D58A] rounded-full" />
                  <span className="w-1 h-8 bg-[#D6B15E] rounded-full" />
                  <span className="w-1 h-5 bg-[#F0D58A] rounded-full" />
                  <span className="w-1 h-2.5 bg-[#D6B15E] rounded-full" />
                </div>
              </div>

              <div className="space-y-2 max-w-sm">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  How can I help you today{session.name ? `, ${session.name.split(' ')[0]}` : ''}?
                </h3>
                <p className="text-xs text-[#929292] leading-relaxed">
                  Ask questions, brainstorm concepts, compose messages, or code. Speak freely or type your thoughts.
                </p>
              </div>

              {/* Starter Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-md pt-2">
                {[
                  {
                    icon: <Lightbulb className="w-3.5 h-3.5 text-[#D6B15E]" />,
                    title: 'Brainstorm Concepts',
                    prompt: 'Help me brainstorm 3 innovative ideas for my upcoming project.',
                  },
                  {
                    icon: <Code2 className="w-3.5 h-3.5 text-[#F0D58A]" />,
                    title: 'Help Me Code',
                    prompt: 'Explain the principles of clean scalable TypeScript architecture with practical examples.',
                  },
                  {
                    icon: <FileText className="w-3.5 h-3.5 text-[#D6B15E]" />,
                    title: 'Executive Summary',
                    prompt: 'Draft a concise, professional status update for key stakeholders.',
                  },
                  {
                    icon: <Compass className="w-3.5 h-3.5 text-[#F0D58A]" />,
                    title: 'Strategic Priorities',
                    prompt: 'What framework should I use to prioritize high-leverage tasks this week?',
                  },
                ].map((card) => (
                  <button
                    key={card.title}
                    onClick={() => handleSend(card.prompt)}
                    className="p-3 rounded-2xl bg-[#121212] border border-[#292929] hover:border-[#D6B15E]/40 hover:bg-[#151515] text-left transition-all group flex flex-col justify-between space-y-1 shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-[#181818] border border-[#292929] group-hover:border-[#D6B15E]/30 transition-colors">
                        {card.icon}
                      </div>
                      <span className="text-xs font-semibold text-white group-hover:text-[#D6B15E] transition-colors">
                        {card.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#929292] line-clamp-2 leading-relaxed">
                      {card.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isUser = m.role === 'user';
              const isPlaying = activeAudioMessageId === m.id;

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-fadeIn`}
                >
                  <div className={`flex items-start gap-3 max-w-[88%] sm:max-w-[82%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-[#151515] border border-[#D6B15E]/40 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <span className="text-[10px] font-black text-[#D6B15E]">J</span>
                      </div>
                    )}

                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Message Bubble Content */}
                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isUser
                            ? 'bg-[#181818] border border-[#292929] text-white shadow-sm'
                            : 'bg-[#121212] border border-[#292929] text-[#F5F5F5] shadow-sm'
                        }`}
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap">{m.text}</p>
                        ) : (
                          <MarkdownRenderer content={m.text} />
                        )}
                      </div>

                      {/* Memory Saved Pill (if memory was extracted from this interaction) */}
                      {m.memoryExtracted && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D6B15E]/10 border border-[#D6B15E]/30 text-[10px] text-[#D6B15E] font-medium">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Learned: "{m.memoryExtracted}"</span>
                        </div>
                      )}

                      {/* Controls below AI response: Copy, Listen, Regenerate, Feedback */}
                      {!isUser && (
                        <div className="flex items-center gap-1 pt-1 text-[#929292]">
                          {/* Copy */}
                          <button
                            onClick={() => handleCopyMessage(m.id, m.text)}
                            className="p-1.5 rounded-lg hover:text-white hover:bg-[#151515] transition-colors"
                            title="Copy message"
                          >
                            {copiedMessageId === m.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Listen / Voice Playback */}
                          <button
                            onClick={() => playMessageAudio(m.id, m.text)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isPlaying
                                ? 'text-[#D6B15E] bg-[#151515]'
                                : 'hover:text-white hover:bg-[#151515]'
                            }`}
                            title={isPlaying ? 'Stop audio' : 'Listen to message'}
                          >
                            {isPlaying ? (
                              <VolumeX className="w-3.5 h-3.5" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Regenerate */}
                          <button
                            onClick={handleRegenerate}
                            className="p-1.5 rounded-lg hover:text-white hover:bg-[#151515] transition-colors"
                            title="Regenerate response"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          {/* Thumbs Up */}
                          <button
                            onClick={() => handleFeedback(m.id, 'up')}
                            className={`p-1.5 rounded-lg transition-colors ${
                              feedbackState[m.id] === 'up'
                                ? 'text-[#D6B15E] bg-[#151515]'
                                : 'hover:text-white hover:bg-[#151515]'
                            }`}
                            title="Helpful response"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>

                          {/* Thumbs Down */}
                          <button
                            onClick={() => handleFeedback(m.id, 'down')}
                            className={`p-1.5 rounded-lg transition-colors ${
                              feedbackState[m.id] === 'down'
                                ? 'text-rose-400 bg-[#151515]'
                                : 'hover:text-white hover:bg-[#151515]'
                            }`}
                            title="Not helpful"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Thinking / Generating Indicator */}
          {isGenerating && (
            <div className="flex items-start gap-3 animate-fadeIn">
              <div className="w-8 h-8 rounded-xl bg-[#151515] border border-[#D6B15E]/40 flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-[10px] font-black text-[#D6B15E]">J</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#121212] border border-[#292929] flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#D6B15E] animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-[#F0D58A] animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-[#D6B15E] animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="text-xs text-[#929292]">Thinking...</span>
                <button
                  onClick={handleStopGenerating}
                  className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#181818] border border-[#292929] text-[10px] text-[#929292] hover:text-white hover:border-[#D6B15E]/40 transition-colors"
                  title="Stop generating"
                >
                  <Square className="w-2.5 h-2.5 fill-current" />
                  <span>Stop</span>
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ------------------------------------------------------- */}
        {/* COMPOSER / INPUT CONTAINER (Fixed at Bottom) */}
        {/* ------------------------------------------------------- */}
        <div className="p-3 sm:p-4 bg-[#050505]/90 border-t border-[#292929]/70 backdrop-blur-md shrink-0">
          <div className="max-w-3xl mx-auto w-full space-y-2">
            {/* Dictation Error Notice (if microphone was blocked) */}
            {dictationError && (
              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center justify-between gap-2 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{dictationError}</span>
                </div>
                <button
                  onClick={startChatDictation}
                  className="px-2 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-[11px] font-semibold text-white shrink-0"
                >
                  Retry
                </button>
              </div>
            )}

            {/* SPEECH-TO-TEXT ACTIVE RECORDING BAR */}
            {isDictating ? (
              <div className="p-3 rounded-2xl bg-[#121212] border border-[#D6B15E]/50 shadow-lg flex items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Pulsing Recording Indicator */}
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-rose-950/60 border border-rose-800/80 text-rose-400 text-[11px] font-mono font-bold shrink-0">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span>
                      {Math.floor(dictationTime / 60)}:
                      {(dictationTime % 60).toString().padStart(2, '0')}
                    </span>
                  </div>

                  {/* Audio Waveform Animation */}
                  <WaveformVisualizer isPlaying={true} barCount={12} className="h-4 shrink-0" />

                  {/* Recognized text preview */}
                  <p className="text-xs text-white truncate italic min-w-0 flex-1">
                    {interimDictationText || accumulatedDictationRef.current || 'Listening to your voice...'}
                  </p>
                </div>

                {/* Cancel & Done Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => stopChatDictation(false)}
                    className="p-2 rounded-xl text-[#929292] hover:text-rose-400 hover:bg-[#181818] transition-colors"
                    title="Cancel recording"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => stopChatDictation(true)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#D6B15E] to-[#F0D58A] text-[#050505] font-bold text-xs flex items-center gap-1 shadow-md shadow-[#D6B15E]/20 hover:opacity-95 transition-all"
                    title="Use recognized text"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Done</span>
                  </button>
                </div>
              </div>
            ) : (
              /* STANDARD TEXT COMPOSER */
              <div className="relative rounded-2xl bg-[#121212] border border-[#292929] focus-within:border-[#D6B15E]/60 transition-all p-2 flex items-end gap-2 shadow-inner">
                {/* Paperclip / Attachment */}
                <button
                  type="button"
                  onClick={() => alert('Attachments can be added once Cloud Storage is configured.')}
                  className="p-2 text-[#929292] hover:text-white transition-colors shrink-0"
                  title="Attach file"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Multiline Textarea */}
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={1}
                  placeholder="Message JOSA..."
                  className="flex-1 bg-transparent text-xs text-[#F5F5F5] placeholder:text-[#929292] focus:outline-none resize-none max-h-32 py-2 leading-relaxed"
                />

                {/* Chat Microphone (Speech-to-Text Dictation Feature) */}
                <button
                  type="button"
                  onClick={startChatDictation}
                  className="p-2 text-[#929292] hover:text-[#D6B15E] hover:bg-[#181818] rounded-xl transition-colors shrink-0"
                  title="Dictate with voice"
                >
                  <Mic className="w-4 h-4" />
                </button>

                {/* Send Button */}
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!inputText.trim() || isGenerating}
                  className="p-2 rounded-xl bg-gradient-to-r from-[#D6B15E] to-[#F0D58A] text-[#050505] disabled:opacity-30 disabled:pointer-events-none hover:opacity-95 transition-all shrink-0 shadow-sm"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="text-center text-[10px] text-[#929292]">
              JOSA AI can make mistakes. Check important info.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
