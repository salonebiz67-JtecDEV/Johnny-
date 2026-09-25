import React, { useState } from 'react';
import {
  Compass,
  PenTool,
  Code2,
  Calendar,
  Sparkles,
  ArrowUp,
  Radio,
  ChevronRight,
  Settings,
  Paperclip,
  Mic,
  MessageSquare,
  Clock,
  Zap,
} from 'lucide-react';
import { PersonaState, MemoryItem, UserSession, NavigationTab, TokenUsage, ConversationThread } from '../types';
import { voiceEngine } from '../services/voice';
import { db } from '../services/db';

interface HomeViewProps {
  persona: PersonaState;
  memories: MemoryItem[];
  session: UserSession;
  tokenUsage: TokenUsage;
  onNavigate: (tab: NavigationTab) => void;
  onStartLiveVoice: () => void;
  onSendPrompt: (prompt: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  persona,
  memories,
  session,
  tokenUsage,
  onNavigate,
  onStartLiveVoice,
  onSendPrompt,
}) => {
  const [inputText, setInputText] = useState('');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    onSendPrompt(text);
  };

  const quickActionCards = [
    {
      id: 'learn',
      title: 'Learn something new',
      description: 'Explore concepts, mental models, or complex ideas',
      prompt: 'Explain a fascinating concept from science, philosophy, or technology that will expand my mental models today.',
      icon: <Compass className="w-5 h-5 text-[#D6B15E]" />,
    },
    {
      id: 'write',
      title: 'Write something',
      description: 'Draft emails, articles, speeches, or creative prose',
      prompt: 'Help me draft an articulate, impactful piece of writing. What topic or audience should we focus on?',
      icon: <PenTool className="w-5 h-5 text-[#D6B15E]" />,
    },
    {
      id: 'code',
      title: 'Help me code',
      description: 'Architect systems, debug errors, or write algorithms',
      prompt: 'I need your expertise with software engineering and clean code architecture. Ready to brainstorm or debug?',
      icon: <Code2 className="w-5 h-5 text-[#D6B15E]" />,
    },
    {
      id: 'plan',
      title: 'Plan my day',
      description: 'Structure priorities, deep work blocks, and schedule',
      prompt: 'Let us build a structured, high-priority schedule for my day with dedicated focus blocks.',
      icon: <Calendar className="w-5 h-5 text-[#D6B15E]" />,
    },
  ];

  // Fetch actual saved threads from database
  const savedThreads: ConversationThread[] = db.getThreads().filter((t: ConversationThread) => t.messages.length > 0);
  const recentConversations = savedThreads.slice(0, 3).map((t: ConversationThread) => {
    const lastMsg = t.messages[t.messages.length - 1];
    const dateObj = new Date(t.updatedAt || t.createdAt);
    return {
      id: t.id,
      title: t.title,
      snippet: lastMsg ? lastMsg.text : 'Conversation ready',
      time: dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' }),
    };
  });

  return (
    <div className="pb-28 md:pb-12 pt-4 px-4 sm:px-6 max-w-3xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Header */}
      <header className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#151515] border border-[#D6B15E]/40 flex items-center justify-center">
            <div className="flex items-center gap-[2px]">
              <span className="w-[2px] h-2 bg-[#D6B15E] rounded-full" />
              <span className="w-[2px] h-4 bg-[#F0D58A] rounded-full" />
              <span className="w-[2px] h-2 bg-[#D6B15E] rounded-full" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#F5F5F5] tracking-tight">JOSA AI</span>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-[#151515] text-[#D6B15E] border border-[#292929]">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-[#929292]">Your personal AI companion</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('settings')}
            className="p-2 rounded-xl text-[#929292] hover:text-[#F5F5F5] hover:bg-[#151515] border border-transparent hover:border-[#292929] transition-all focus:outline-none"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigate('profile')}
            className="relative group focus:outline-none"
            title="Profile"
          >
            <img
              src={session.avatar}
              alt={session.name}
              className="w-9 h-9 rounded-full object-cover border border-[#292929] group-hover:border-[#D6B15E]/60 transition-colors"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#050505]" />
          </button>
        </div>
      </header>

      {/* Welcome Section */}
      <section className="pt-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F5F5]">
          {getGreeting()}, {session.name.split(' ')[0]}.
        </h1>
        <p className="text-sm text-[#929292] mt-1 leading-relaxed">
          How can I assist you with your thoughts, projects, or decisions today?
        </p>
      </section>

      {/* Large AI Message Input Container */}
      <section>
        <form
          onSubmit={handleSubmit}
          className="relative rounded-2xl bg-[#151515] border border-[#292929] hover:border-[#D6B15E]/40 focus-within:border-[#D6B15E] p-3 shadow-lg shadow-black/60 transition-all"
        >
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Ask JOSA anything..."
            rows={3}
            className="w-full bg-transparent text-sm text-[#F5F5F5] placeholder:text-[#929292] focus:outline-none resize-none px-1 leading-relaxed"
          />

          <div className="flex items-center justify-between pt-2 border-t border-[#222222]">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  voiceEngine.playCue('pop');
                  alert('Attachment support: upload documents or code snippets in Chat.');
                }}
                className="p-2 text-[#929292] hover:text-[#F5F5F5] hover:bg-[#1a1a1a] rounded-lg transition-colors"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onStartLiveVoice}
                className="p-2 text-[#929292] hover:text-[#D6B15E] hover:bg-[#1a1a1a] rounded-lg transition-colors flex items-center gap-1.5 text-xs"
                title="Voice Input"
              >
                <Mic className="w-4 h-4" />
                <span className="hidden sm:inline text-[11px] font-medium">Voice</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="py-2 px-3.5 rounded-xl bg-[#D6B15E] hover:bg-[#F0D58A] disabled:opacity-30 disabled:hover:bg-[#D6B15E] text-[#050505] font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <span>Send</span>
              <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </form>
      </section>

      {/* Live Conversation Voice Mode Hero Card */}
      <section>
        <div
          onClick={onStartLiveVoice}
          className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-r from-[#151515] via-[#171717] to-[#121212] border border-[#292929] hover:border-[#D6B15E]/40 cursor-pointer transition-all group shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#1f1e1b] border border-[#D6B15E]/30 flex items-center justify-center text-[#D6B15E] shadow-sm group-hover:scale-105 transition-transform">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#F5F5F5] group-hover:text-[#D6B15E] transition-colors">
                    Live Conversation Mode
                  </h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#D6B15E]/15 text-[#D6B15E]">
                    JOSA LIVE
                  </span>
                </div>
                <p className="text-xs text-[#929292] mt-0.5">
                  Low-latency voice conversation with Gemini. Speak naturally in real time.
                </p>
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-[#1e1e1e] flex items-center justify-center text-[#929292] group-hover:text-[#D6B15E] group-hover:translate-x-0.5 transition-all">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </section>

      {/* Quick Action Cards Grid */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#929292]">
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickActionCards.map((card) => (
            <div
              key={card.id}
              onClick={() => onSendPrompt(card.prompt)}
              className="p-4 rounded-2xl bg-[#151515] border border-[#292929] hover:border-[#D6B15E]/40 hover:bg-[#181818] cursor-pointer transition-all group shadow-sm flex flex-col justify-between min-h-[96px]"
            >
              <div className="flex items-start justify-between">
                <div className="p-2 rounded-xl bg-[#1a1a1a] border border-[#292929] group-hover:border-[#D6B15E]/30 transition-colors">
                  {card.icon}
                </div>
                <ChevronRight className="w-4 h-4 text-[#929292] group-hover:text-[#D6B15E] group-hover:translate-x-0.5 transition-all" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[#F5F5F5] group-hover:text-[#D6B15E] transition-colors mt-2">
                  {card.title}
                </h4>
                <p className="text-[11px] text-[#929292] line-clamp-1 mt-0.5">
                  {card.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Conversations Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#929292]">
            Recent Conversations
          </h2>
          <button
            onClick={() => onNavigate('chat')}
            className="text-xs font-medium text-[#D6B15E] hover:text-[#F0D58A] flex items-center gap-1 transition-colors"
          >
            <span>View all</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          {recentConversations.length === 0 ? (
            <div
              onClick={() => onNavigate('chat')}
              className="p-4 rounded-xl bg-[#151515] border border-[#292929] hover:border-[#D6B15E]/30 text-center cursor-pointer transition-colors"
            >
              <p className="text-xs text-[#929292]">
                No recent conversations yet. Ask JOSA anything above to start!
              </p>
            </div>
          ) : (
            recentConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => {
                  db.switchThread(conv.id);
                  onNavigate('chat');
                }}
                className="p-3.5 rounded-xl bg-[#151515] border border-[#292929] hover:border-[#D6B15E]/30 hover:bg-[#181818] cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center text-[#929292] group-hover:text-[#D6B15E] transition-colors shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-[#F5F5F5] group-hover:text-[#D6B15E] transition-colors truncate">
                      {conv.title}
                    </h4>
                    <p className="text-[11px] text-[#929292] truncate">{conv.snippet}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-[10px] text-[#929292] font-mono">{conv.time}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#929292] group-hover:text-[#D6B15E]" />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
