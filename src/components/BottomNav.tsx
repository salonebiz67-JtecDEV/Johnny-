import React from 'react';
import { Home, MessageSquare, Radio, User, Mic } from 'lucide-react';
import { NavigationTab } from '../types';
import { voiceEngine } from '../services/voice';

interface BottomNavProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  isLiveActive?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  isLiveActive = false,
}) => {
  const handleSelect = (tab: NavigationTab) => {
    voiceEngine.playCue('pop');
    onTabChange(tab);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 pt-1 max-w-md mx-auto pointer-events-none">
      <div className="pointer-events-auto bg-[#0d0e12]/95 backdrop-blur-2xl rounded-3xl px-3 py-2 flex items-center justify-around border border-amber-500/15 shadow-2xl shadow-black/80">
        {/* 1. Home Tab */}
        <button
          onClick={() => handleSelect('home')}
          className="flex flex-col items-center py-1 px-3 relative group focus:outline-none"
        >
          <Home
            className={`w-5 h-5 transition-colors ${
              currentTab === 'home' ? 'text-amber-400' : 'text-neutral-500 group-hover:text-neutral-300'
            }`}
          />
          <span
            className={`text-[11px] mt-1 tracking-tight transition-colors ${
              currentTab === 'home' ? 'text-amber-400 font-semibold' : 'text-neutral-500'
            }`}
          >
            Home
          </span>
          {currentTab === 'home' && (
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-[2.5px] bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
          )}
        </button>

        {/* 2. Chat Tab */}
        <button
          onClick={() => handleSelect('chat')}
          className="flex flex-col items-center py-1 px-3 relative group focus:outline-none"
        >
          <MessageSquare
            className={`w-5 h-5 transition-colors ${
              currentTab === 'chat' ? 'text-amber-400' : 'text-neutral-500 group-hover:text-neutral-300'
            }`}
          />
          <span
            className={`text-[11px] mt-1 tracking-tight transition-colors ${
              currentTab === 'chat' ? 'text-amber-400 font-semibold' : 'text-neutral-500'
            }`}
          >
            Chat
          </span>
          {currentTab === 'chat' && (
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-[2.5px] bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
          )}
        </button>

        {/* 3. Center Elevated Gold Mic Button */}
        <button
          onClick={() => handleSelect('live')}
          aria-label="Start Voice Conversation"
          className="relative -top-5 flex flex-col items-center group focus:outline-none"
        >
          <div className="w-14 h-14 rounded-full p-[2.5px] bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 shadow-[0_0_20px_rgba(245,158,11,0.45)] group-hover:scale-105 active:scale-95 transition-all">
            <div className="w-full h-full rounded-full bg-[#111317] border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Mic className="w-6 h-6 text-amber-400 fill-amber-400/20" />
            </div>
          </div>
          {isLiveActive && (
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-rose-500 border-2 border-black rounded-full animate-ping" />
          )}
        </button>

        {/* 4. Live Voice Tab */}
        <button
          onClick={() => handleSelect('live')}
          className="flex flex-col items-center py-1 px-3 relative group focus:outline-none"
        >
          <div className="relative">
            {/* Custom soundwave icon matching reference image */}
            <div className="flex items-center gap-[2px] h-5 px-0.5">
              <span className={`w-[2.5px] h-2 rounded-full ${currentTab === 'live' ? 'bg-amber-400' : 'bg-neutral-500'}`} />
              <span className={`w-[2.5px] h-4 rounded-full ${currentTab === 'live' ? 'bg-amber-400' : 'bg-neutral-500'}`} />
              <span className={`w-[2.5px] h-3 rounded-full ${currentTab === 'live' ? 'bg-amber-400' : 'bg-neutral-500'}`} />
            </div>
          </div>
          <span
            className={`text-[11px] mt-1 tracking-tight transition-colors ${
              currentTab === 'live' ? 'text-amber-400 font-semibold' : 'text-neutral-500'
            }`}
          >
            Live
          </span>
          {currentTab === 'live' && (
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-[2.5px] bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
          )}
        </button>

        {/* 5. Profile Tab */}
        <button
          onClick={() => handleSelect('profile')}
          className="flex flex-col items-center py-1 px-3 relative group focus:outline-none"
        >
          <User
            className={`w-5 h-5 transition-colors ${
              currentTab === 'profile' ? 'text-amber-400' : 'text-neutral-500 group-hover:text-neutral-300'
            }`}
          />
          <span
            className={`text-[11px] mt-1 tracking-tight transition-colors ${
              currentTab === 'profile' ? 'text-amber-400 font-semibold' : 'text-neutral-500'
            }`}
          >
            Profile
          </span>
          {currentTab === 'profile' && (
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-[2.5px] bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
          )}
        </button>
      </div>
    </nav>
  );
};
