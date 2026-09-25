/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { NavigationTab, PersonaState, MemoryItem, UserSession, AppSettings, TokenUsage } from './types';
import { db } from './services/db';
import { voiceEngine } from './services/voice';
import { checkServerHealth, sendChatMessage } from './services/api';
import { DesktopSidebar, MobileBottomNav } from './components/Navigation';
import { HomeView } from './components/HomeView';
import { ChatView } from './components/ChatView';
import { LiveVoiceView } from './components/LiveVoiceView';
import { ProfileView } from './components/ProfileView';
import { SettingsView } from './components/SettingsView';
import { AuthModal } from './components/AuthModal';

export default function App() {
  const [persona, setPersona] = useState<PersonaState>(db.getPersona());
  const [memories, setMemories] = useState<MemoryItem[]>(db.getMemories());
  const [session, setSession] = useState<UserSession>(db.getSession());
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>(db.getTokenUsage());
  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(session.isLocked);

  // Sync state from reactive database
  useEffect(() => {
    const unsub = db.subscribe(() => {
      setPersona(db.getPersona());
      setMemories(db.getMemories());
      setSession(db.getSession());
      setSettings(db.getSettings());
      setTokenUsage(db.getTokenUsage());
    });

    checkServerHealth().then((health) => {
      console.log('[JOSA AI Engine]', health);
    });

    return () => unsub();
  }, []);

  const handleStartLiveVoice = () => {
    voiceEngine.playCue('chime');
    setIsLiveVoiceOpen(true);
  };

  const handleCloseLiveVoice = () => {
    voiceEngine.stopPlayback();
    voiceEngine.stopSpeechRecognition();
    setIsLiveVoiceOpen(false);
  };

  const handleSendPrompt = async (prompt: string) => {
    setCurrentTab('chat');
    db.addMessage({
      role: 'user',
      text: prompt,
    });

    try {
      const history = db.getMessages();
      const response = await sendChatMessage(
        prompt,
        history.slice(-6),
        persona,
        memories,
        persona.customPrompt,
        session.name,
      );

      if (response.extractedMemory) {
        db.addMemory(response.extractedMemory, (response.category as any) || 'Fact', 'chat');
      }

      db.addMessage({
        role: 'assistant',
        text: response.text,
        thought: response.thought,
        memoryExtracted: response.extractedMemory || undefined,
      });

      if (settings.autoSpeak) {
        voiceEngine.playWebSpeech(response.text, persona.voiceName);
      }
    } catch (e) {
      console.warn('Prompt error:', e);
    }
  };

  const handleTabChange = (tab: NavigationTab) => {
    if (tab === 'live') {
      setIsLiveVoiceOpen(true);
    } else {
      setCurrentTab(tab);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5] flex flex-col md:flex-row selection:bg-[#D6B15E]/30 selection:text-[#F0D58A]">
      {/* Desktop Sidebar Navigation (Hidden on Mobile) */}
      <DesktopSidebar
        currentTab={currentTab}
        onTabChange={handleTabChange}
        isLiveActive={isLiveVoiceOpen}
        session={session}
        tokenUsage={tokenUsage}
        onStartNewChat={() => setCurrentTab('chat')}
      />

      {/* Main Viewport Content (Offset by md:pl-64 on desktop) */}
      <div className="flex-1 md:pl-64 min-h-screen flex flex-col">
        <main className="flex-1">
          {currentTab === 'home' && (
            <HomeView
              persona={persona}
              memories={memories}
              session={session}
              tokenUsage={tokenUsage}
              onNavigate={setCurrentTab}
              onStartLiveVoice={handleStartLiveVoice}
              onSendPrompt={handleSendPrompt}
            />
          )}

          {currentTab === 'chat' && (
            <ChatView
              persona={persona}
              memories={memories}
              session={session}
              settings={settings}
              onStartLiveVoice={handleStartLiveVoice}
            />
          )}

          {currentTab === 'profile' && (
            <ProfileView
              persona={persona}
              memories={memories}
              session={session}
              tokenUsage={tokenUsage}
              onNavigate={setCurrentTab}
              onOpenPinModal={() => setIsAuthModalOpen(true)}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              persona={persona}
              settings={settings}
              session={session}
              onNavigate={setCurrentTab}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Hidden on Desktop) */}
      {!isLiveVoiceOpen && (
        <MobileBottomNav
          currentTab={currentTab}
          onTabChange={handleTabChange}
          isLiveActive={isLiveVoiceOpen}
          session={session}
          tokenUsage={tokenUsage}
        />
      )}

      {/* Full-Screen Live Voice Overlay (JOSA LIVE) */}
      {isLiveVoiceOpen && (
        <LiveVoiceView
          persona={persona}
          memories={memories}
          session={session}
          settings={settings}
          onClose={handleCloseLiveVoice}
          onOpenSettings={() => {
            setIsLiveVoiceOpen(false);
            setCurrentTab('settings');
          }}
        />
      )}

      {/* Security & Authentication Gate Modal */}
      <AuthModal
        session={session}
        isOpen={isAuthModalOpen || session.isLocked}
        onUnlocked={() => {
          setIsAuthModalOpen(false);
          db.updateSession({ isLocked: false });
        }}
        isDarkMode={true}
      />
    </div>
  );
}
