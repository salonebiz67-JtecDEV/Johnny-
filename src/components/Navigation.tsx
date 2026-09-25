import React from 'react';
import {
  Home,
  MessageSquare,
  Radio,
  User,
  Settings,
  Sparkles,
  Zap,
  Mic,
  Shield,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { NavigationTab, UserSession, TokenUsage } from '../types';
import { voiceEngine } from '../services/voice';

interface NavigationProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  isLiveActive?: boolean;
  session: UserSession;
  tokenUsage: TokenUsage;
  onStartNewChat?: () => void;
}

export const DesktopSidebar: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  isLiveActive = false,
  session,
  tokenUsage,
  onStartNewChat,
}) => {
  const navItems: { id: NavigationTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-4 h-4" /> },
    { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'live', label: 'Live Voice', icon: <Radio className="w-4 h-4" />, badge: 'LIVE' },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const handleSelect = (tab: NavigationTab) => {
    voiceEngine.playCue('pop');
    onTabChange(tab);
  };

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-[#050505] border-r border-[#292929] p-4 select-none shrink-0 fixed top-0 left-0 bottom-0 z-30">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 py-3 mb-4">
        {/* JOSA Emblem */}
        <div className="w-9 h-9 rounded-xl bg-[#151515] border border-[#D6B15E]/40 flex items-center justify-center shadow-sm">
          <div className="flex items-center gap-[2px]">
            <span className="w-[2px] h-2.5 bg-[#D6B15E] rounded-full" />
            <span className="w-[2px] h-4.5 bg-[#F0D58A] rounded-full" />
            <span className="w-[2px] h-3 bg-[#D6B15E] rounded-full" />
          </div>
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-[#F5F5F5] flex items-center gap-1.5">
            JOSA AI
          </h1>
          <p className="text-[11px] text-[#929292] font-medium tracking-tight">
            Personal AI Assistant
          </p>
        </div>
      </div>

      {/* Primary Action Button: New Chat */}
      <button
        onClick={() => {
          onTabChange('chat');
          onStartNewChat?.();
        }}
        className="w-full py-2.5 px-3.5 mb-5 rounded-xl border border-[#292929] hover:border-[#D6B15E]/50 bg-[#151515] hover:bg-[#1a1a1a] text-[#F5F5F5] hover:text-[#D6B15E] text-xs font-semibold flex items-center justify-between transition-all group focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#D6B15E] group-hover:scale-110 transition-transform" />
          <span>New Conversation</span>
        </div>
        <span className="text-[10px] text-[#929292] font-mono">⌘N</span>
      </button>

      {/* Main Navigation Links */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#151515] text-[#F5F5F5] font-semibold border border-[#D6B15E]/30 shadow-sm'
                  : 'text-[#929292] hover:text-[#F5F5F5] hover:bg-[#101010]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-[#D6B15E]' : 'text-[#929292]'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-mono tracking-wider ${
                    isLiveActive
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                      : 'bg-[#D6B15E]/15 text-[#D6B15E] border border-[#D6B15E]/30'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Real-Time Token Usage Card */}
      <div className="p-3.5 rounded-2xl bg-[#101010] border border-[#292929] mb-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#929292] flex items-center gap-1.5 font-medium text-[11px]">
            <Zap className="w-3.5 h-3.5 text-[#D6B15E]" />
            <span>Tokens Available</span>
          </span>
          <span className="text-[#D6B15E] font-mono font-bold text-xs">
            {tokenUsage.tokensRemaining.toLocaleString()}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-[#1e1e1e] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#D6B15E] to-[#F0D58A] transition-all duration-500"
            style={{
              width: `${Math.min(100, Math.max(5, (tokenUsage.tokensUsed / tokenUsage.totalQuota) * 100))}%`,
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-[#929292] font-mono">
          <span>{tokenUsage.tokensUsed.toLocaleString()} used</span>
          <span>{tokenUsage.uptimePercent}% uptime</span>
        </div>
      </div>

      {/* Bottom User Profile Section */}
      <div
        onClick={() => handleSelect('profile')}
        className="flex items-center gap-3 p-2.5 rounded-xl border border-[#292929] hover:border-[#D6B15E]/40 bg-[#151515] cursor-pointer transition-all group"
      >
        <div className="relative shrink-0">
          <img
            src={session.avatar}
            alt={session.name}
            className="w-9 h-9 rounded-full object-cover border border-[#D6B15E]/30"
          />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#050505]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-[#F5F5F5] truncate group-hover:text-[#D6B15E] transition-colors">
            {session.name}
          </div>
          <div className="text-[10px] text-[#929292] truncate">Pro Subscriber</div>
        </div>
        <ChevronRight className="w-4 h-4 text-[#929292] group-hover:text-[#D6B15E] group-hover:translate-x-0.5 transition-all" />
      </div>
    </aside>
  );
};

export const MobileBottomNav: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  isLiveActive = false,
}) => {
  const handleSelect = (tab: NavigationTab) => {
    voiceEngine.playCue('pop');
    onTabChange(tab);
  };

  const navItems: { id: NavigationTab; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-[#292929] px-4 pb-safe-offset pt-1">
      <div className="flex items-center justify-between max-w-sm mx-auto h-16">
        {/* Left items */}
        {navItems.slice(0, 2).map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className="flex flex-col items-center justify-center w-14 h-full relative group focus:outline-none"
            >
              <div
                className={`transition-colors duration-150 ${
                  isActive ? 'text-[#D6B15E]' : 'text-[#929292] group-hover:text-[#F5F5F5]'
                }`}
              >
                {item.icon}
              </div>
              <span
                className={`text-[10px] mt-1 tracking-tight transition-colors duration-150 ${
                  isActive ? 'text-[#D6B15E] font-semibold' : 'text-[#929292]'
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-4 h-[2px] bg-[#D6B15E] rounded-full" />
              )}
            </button>
          );
        })}

        {/* Center Live Voice Button (Metallic Gold Accent) */}
        <button
          onClick={() => handleSelect('live')}
          aria-label="Start Live Voice"
          className="relative -top-3.5 flex flex-col items-center group focus:outline-none"
        >
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
              isLiveActive || currentTab === 'live'
                ? 'bg-[#D6B15E] text-[#050505] shadow-[0_0_18px_rgba(214,177,94,0.45)] scale-105'
                : 'bg-[#151515] border border-[#D6B15E]/60 text-[#D6B15E] hover:border-[#D6B15E] shadow-black/80'
            }`}
          >
            <Radio className="w-6 h-6" />
          </div>
          <span
            className={`text-[10px] mt-1 font-semibold tracking-tight transition-colors ${
              currentTab === 'live' ? 'text-[#D6B15E]' : 'text-[#929292]'
            }`}
          >
            Live Voice
          </span>
        </button>

        {/* Right items */}
        {navItems.slice(2, 4).map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className="flex flex-col items-center justify-center w-14 h-full relative group focus:outline-none"
            >
              <div
                className={`transition-colors duration-150 ${
                  isActive ? 'text-[#D6B15E]' : 'text-[#929292] group-hover:text-[#F5F5F5]'
                }`}
              >
                {item.icon}
              </div>
              <span
                className={`text-[10px] mt-1 tracking-tight transition-colors duration-150 ${
                  isActive ? 'text-[#D6B15E] font-semibold' : 'text-[#929292]'
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-4 h-[2px] bg-[#D6B15E] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
