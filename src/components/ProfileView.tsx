import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Crown,
  User,
  Radio,
  Palette,
  Bell,
  Info,
  ChevronRight,
  Brain,
  Zap,
  CheckCircle,
  Plus,
  Trash2,
  Search,
  Download,
  Key,
  Sparkles,
  Lock,
  LogOut,
  Edit3,
  Shield,
  MessageSquare,
} from 'lucide-react';
import { PersonaState, MemoryItem, UserSession, NavigationTab, MemoryCategory, TokenUsage } from '../types';
import { db } from '../services/db';
import { voiceEngine } from '../services/voice';

interface ProfileViewProps {
  persona: PersonaState;
  memories: MemoryItem[];
  session: UserSession;
  tokenUsage: TokenUsage;
  onNavigate: (tab: NavigationTab) => void;
  onOpenPinModal: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  persona,
  memories,
  session,
  tokenUsage,
  onNavigate,
  onOpenPinModal,
}) => {
  const [activeModal, setActiveModal] = useState<'none' | 'memories' | 'account' | 'editProfile'>('none');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [newMemText, setNewMemText] = useState('');
  const [newMemCategory, setNewMemCategory] = useState<MemoryCategory>('Fact');

  // Edit profile state
  const [editName, setEditName] = useState(session.name);
  const [editEmail, setEditEmail] = useState(session.email);

  const tokenPercentUsed = Math.min(
    100,
    Math.round((tokenUsage.tokensUsed / tokenUsage.totalQuota) * 100),
  );

  const filteredMemories = memories.filter((m) => {
    const matchesSearch = m.text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemText.trim()) return;
    db.addMemory(newMemText.trim(), newMemCategory, 'manual');
    voiceEngine.playCue('success');
    setNewMemText('');
  };

  const handleDeleteMemory = (id: string) => {
    db.deleteMemory(id);
    voiceEngine.playCue('pop');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    db.updateSession({ name: editName.trim(), email: editEmail.trim() });
    voiceEngine.playCue('success');
    setActiveModal('none');
  };

  const handleExportData = () => {
    const dataStr = db.exportData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `josa_ai_archive_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    voiceEngine.playCue('success');
  };

  return (
    <div className="pb-28 md:pb-12 pt-4 px-4 sm:px-6 max-w-3xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <header className="flex items-center justify-between py-2">
        <h1 className="text-xl font-bold tracking-tight text-[#F5F5F5]">Account & Profile</h1>
        <button
          onClick={() => onNavigate('settings')}
          className="p-2 text-[#929292] hover:text-[#F5F5F5] hover:bg-[#151515] rounded-xl border border-transparent hover:border-[#292929] transition-all"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
      </header>

      {/* User Information Card */}
      <div className="p-5 rounded-2xl bg-[#151515] border border-[#292929] shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={session.avatar}
                alt={session.name}
                className="w-16 h-16 rounded-full object-cover border border-[#D6B15E]/40"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#151515]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#F5F5F5]">{session.name}</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D6B15E]/15 text-[#D6B15E] border border-[#D6B15E]/30 flex items-center gap-1">
                  <Crown className="w-3 h-3 fill-current" /> Pro
                </span>
              </div>
              <p className="text-xs text-[#929292] mt-0.5">{session.email}</p>
              <p className="text-[11px] text-[#929292] font-mono mt-1">
                User ID: {session.userId}
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveModal('editProfile')}
            className="hidden sm:flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-[#292929] hover:border-[#D6B15E]/40 bg-[#1a1a1a] hover:bg-[#202020] text-xs font-semibold text-[#F5F5F5] transition-all"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#D6B15E]" />
            <span>Edit Profile</span>
          </button>
        </div>

        {/* Mobile edit button */}
        <div className="sm:hidden mt-4 pt-3 border-t border-[#222222]">
          <button
            onClick={() => setActiveModal('editProfile')}
            className="w-full py-2 rounded-xl border border-[#292929] bg-[#1a1a1a] text-xs font-semibold text-[#F5F5F5] flex items-center justify-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#D6B15E]" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* Real-time Token & Performance Stats */}
      <div className="p-5 rounded-2xl bg-[#151515] border border-[#292929] space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#D6B15E]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5]">
              Real-Time Usage & Quota
            </h3>
          </div>
          <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Sync
          </span>
        </div>

        {/* 3 Metrics Grid */}
        <div className="grid grid-cols-3 divide-x divide-[#242424] text-center pt-1">
          <div>
            <div className="text-lg sm:text-xl font-bold text-[#F5F5F5] font-mono">
              {tokenUsage.tokensUsed.toLocaleString()}
            </div>
            <div className="text-[11px] text-[#929292] mt-0.5">Tokens Used</div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-bold text-[#D6B15E] font-mono">
              {tokenUsage.tokensRemaining.toLocaleString()}
            </div>
            <div className="text-[11px] text-[#929292] mt-0.5">Tokens Remaining</div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-bold text-[#F5F5F5] font-mono">
              {tokenUsage.modelRepliesCount}
            </div>
            <div className="text-[11px] text-[#929292] mt-0.5">Model Replies</div>
          </div>
        </div>

        {/* Real-Time Progress Bar */}
        <div className="pt-2 space-y-1.5">
          <div className="flex justify-between text-xs font-mono text-[#929292]">
            <span>Quota Allocation</span>
            <span>{tokenPercentUsed}% consumed</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#101010] overflow-hidden border border-[#222222]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#D6B15E] to-[#F0D58A] transition-all duration-500"
              style={{ width: `${Math.max(4, tokenPercentUsed)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Menu Options List */}
      <div className="space-y-2">
        {/* Saved Memories Section */}
        <div
          onClick={() => setActiveModal('memories')}
          className="flex items-center justify-between p-4 rounded-2xl bg-[#151515] border border-[#292929] hover:border-[#D6B15E]/40 cursor-pointer transition-all group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-[#D6B15E] shrink-0">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#F5F5F5] group-hover:text-[#D6B15E] transition-colors flex items-center gap-2">
                <span>Saved Memories</span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-[#101010] text-[#D6B15E] border border-[#292929]">
                  {memories.length}
                </span>
              </div>
              <p className="text-[11px] text-[#929292] mt-0.5">
                Facts, preferences, and events JOSA retains about you
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#929292] group-hover:text-[#D6B15E] group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>

        {/* AI Personalization Shortcut */}
        <div
          onClick={() => onNavigate('settings')}
          className="flex items-center justify-between p-4 rounded-2xl bg-[#151515] border border-[#292929] hover:border-[#D6B15E]/40 cursor-pointer transition-all group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-[#D6B15E] shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#F5F5F5] group-hover:text-[#D6B15E] transition-colors">
                AI Personalization & Custom Prompt
              </div>
              <p className="text-[11px] text-[#929292] mt-0.5">
                Customize instructions, response style, and tone
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#929292] group-hover:text-[#D6B15E] group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>

        {/* Conversation History Shortcut */}
        <div
          onClick={() => onNavigate('chat')}
          className="flex items-center justify-between p-4 rounded-2xl bg-[#151515] border border-[#292929] hover:border-[#D6B15E]/40 cursor-pointer transition-all group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-[#D6B15E] shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#F5F5F5] group-hover:text-[#D6B15E] transition-colors">
                Conversation History
              </div>
              <p className="text-[11px] text-[#929292] mt-0.5">
                Browse and search past chat sessions
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#929292] group-hover:text-[#D6B15E] group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>

        {/* Privacy & Session Security */}
        <div
          onClick={onOpenPinModal}
          className="flex items-center justify-between p-4 rounded-2xl bg-[#151515] border border-[#292929] hover:border-[#D6B15E]/40 cursor-pointer transition-all group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-[#D6B15E] shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#F5F5F5] group-hover:text-[#D6B15E] transition-colors">
                Privacy & PIN Lock
              </div>
              <p className="text-[11px] text-[#929292] mt-0.5">
                {session.pinHash ? 'PIN security active' : 'Set up security PIN'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#929292] group-hover:text-[#D6B15E] group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>

        {/* Data Export Archive */}
        <div
          onClick={handleExportData}
          className="flex items-center justify-between p-4 rounded-2xl bg-[#151515] border border-[#292929] hover:border-[#D6B15E]/40 cursor-pointer transition-all group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-[#D6B15E] shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#F5F5F5] group-hover:text-[#D6B15E] transition-colors">
                Export Data Archive
              </div>
              <p className="text-[11px] text-[#929292] mt-0.5">
                Download your memories and conversations as JSON
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#929292] group-hover:text-[#D6B15E] group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>

        {/* Lock / Sign Out */}
        <div
          onClick={() => {
            db.lockSession();
            voiceEngine.playCue('pop');
          }}
          className="flex items-center justify-between p-4 rounded-2xl bg-[#151515] border border-[#292929] hover:border-rose-500/40 cursor-pointer transition-all group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-rose-400">Lock Session</div>
              <p className="text-[11px] text-[#929292] mt-0.5">Require PIN or biometric unlock to resume</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#929292] group-hover:text-rose-400 group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>
      </div>

      {/* ========================================================
          SAVED MEMORIES MODAL WITH CATEGORY FILTERING
      ======================================================== */}
      {activeModal === 'memories' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-3 animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-[#292929] bg-[#101010] p-5 shadow-2xl max-h-[85vh] flex flex-col space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-[#D6B15E]" />
                <h3 className="text-sm font-bold text-[#F5F5F5]">JOSA AI Memory Bank</h3>
              </div>
              <button
                onClick={() => setActiveModal('none')}
                className="text-xs text-[#929292] hover:text-[#F5F5F5] px-2.5 py-1 rounded-lg bg-[#1a1a1a]"
              >
                Close
              </button>
            </div>

            {/* Add memory input */}
            <form onSubmit={handleAddMemory} className="space-y-2">
              <input
                type="text"
                value={newMemText}
                onChange={(e) => setNewMemText(e.target.value)}
                placeholder="Teach JOSA a new fact, preference, or event..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-[#151515] border border-[#292929] text-white focus:outline-none focus:border-[#D6B15E]"
              />
              <div className="flex items-center justify-between">
                <select
                  value={newMemCategory}
                  onChange={(e) => setNewMemCategory(e.target.value as MemoryCategory)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-[#151515] border border-[#292929] text-[#F5F5F5] focus:outline-none"
                >
                  <option value="Fact">Fact</option>
                  <option value="Preference">Preference</option>
                  <option value="Event">Event</option>
                  <option value="Goal">Goal</option>
                  <option value="Emotion">Emotion</option>
                </select>
                <button
                  type="submit"
                  disabled={!newMemText.trim()}
                  className="px-3 py-1 rounded-lg bg-[#D6B15E] hover:bg-[#F0D58A] text-black font-semibold text-xs transition-colors disabled:opacity-40"
                >
                  Save Memory
                </button>
              </div>
            </form>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#929292] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search memories..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#151515] border border-[#292929] text-white focus:outline-none focus:border-[#D6B15E]"
              />
            </div>

            {/* Category Filter Pills (Fact, Preference, Event, Goal, Emotion) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#929292] px-0.5">
                <span>Filter by Category:</span>
                <span className="text-[10px] text-[#D6B15E] font-mono">
                  Showing {filteredMemories.length} of {memories.length}
                </span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
                {[
                  { id: 'All', label: 'All', count: memories.length },
                  { id: 'Fact', label: 'Fact', count: memories.filter((m) => m.category === 'Fact').length },
                  { id: 'Preference', label: 'Preference', count: memories.filter((m) => m.category === 'Preference').length },
                  { id: 'Event', label: 'Event', count: memories.filter((m) => m.category === 'Event').length },
                  { id: 'Goal', label: 'Goal', count: memories.filter((m) => m.category === 'Goal').length },
                  { id: 'Emotion', label: 'Emotion', count: memories.filter((m) => m.category === 'Emotion').length },
                ].map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#D6B15E] text-[#050505] font-bold shadow-sm'
                          : 'bg-[#151515] border border-[#292929] text-[#929292] hover:text-[#F5F5F5]'
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span className={`text-[9px] px-1 rounded-full font-mono ${isSelected ? 'bg-black/30 text-black font-black' : 'text-[#929292]'}`}>
                        {cat.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filtered Memories List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-60">
              {filteredMemories.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#929292] bg-[#151515] rounded-xl border border-[#292929]">
                  No memories found for category "{selectedCategory}".
                </div>
              ) : (
                filteredMemories.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-[#151515] border border-[#292929] flex items-start justify-between gap-2.5"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#1f1e1b] text-[#D6B15E] border border-[#D6B15E]/30">
                          {m.category}
                        </span>
                        <span className="text-[10px] text-[#929292] font-mono">
                          {new Date(m.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-xs text-[#F5F5F5] mt-1 leading-relaxed">{m.text}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteMemory(m.id)}
                      className="p-1 text-[#929292] hover:text-rose-400 transition-colors shrink-0"
                      title="Delete memory"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {activeModal === 'editProfile' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl border border-[#292929] bg-[#101010] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
              <h3 className="text-sm font-bold text-[#F5F5F5]">Edit Profile</h3>
              <button
                onClick={() => setActiveModal('none')}
                className="text-xs text-[#929292] hover:text-white px-2 py-1 rounded-lg bg-[#1a1a1a]"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div>
                <label className="text-[#929292] block mb-1">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#151515] border border-[#292929] text-white focus:outline-none focus:border-[#D6B15E]"
                  required
                />
              </div>

              <div>
                <label className="text-[#929292] block mb-1">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#151515] border border-[#292929] text-white focus:outline-none focus:border-[#D6B15E]"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#D6B15E] text-black font-semibold text-xs transition-colors shadow-md mt-2"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
