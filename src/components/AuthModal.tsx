import React, { useState } from 'react';
import { Shield, Lock, Unlock, Key, Fingerprint, AlertCircle, CheckCircle2 } from 'lucide-react';
import { UserSession } from '../types';
import { db } from '../services/db';
import { voiceEngine } from '../services/voice';

interface AuthModalProps {
  session: UserSession;
  isOpen: boolean;
  onUnlocked: () => void;
  isDarkMode?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  session,
  isOpen,
  onUnlocked,
  isDarkMode = true,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSettingNewPin, setIsSettingNewPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handlePinSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');

    if (isSettingNewPin) {
      if (newPin.length < 4) {
        setError('PIN must be at least 4 digits');
        return;
      }
      if (newPin !== confirmPin) {
        setError('PINs do not match');
        return;
      }
      await db.setPinLock(newPin);
      voiceEngine.playCue('success');
      setSuccessMsg('PIN successfully configured!');
      setTimeout(() => {
        setIsSettingNewPin(false);
        onUnlocked();
      }, 700);
      return;
    }

    // Unlocking
    if (!session.pinHash) {
      // No PIN set yet, direct unlock
      db.updateSession({ isLocked: false });
      voiceEngine.playCue('success');
      onUnlocked();
      return;
    }

    const success = await db.unlockWithPin(pin);
    if (success) {
      voiceEngine.playCue('success');
      setPin('');
      onUnlocked();
    } else {
      voiceEngine.playCue('alert');
      setError('Incorrect security PIN. Please try again.');
      setPin('');
    }
  };

  const handleBiometricSimulation = async () => {
    // WebAuthn or Simulated Biometric passkey unlock
    voiceEngine.playCue('success');
    db.updateSession({ isLocked: false });
    onUnlocked();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel-elevated w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl border border-indigo-500/20">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-indigo-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
          <Shield className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold tracking-tight mb-1">
          {isSettingNewPin ? 'Setup Session PIN' : 'Session Authenticated'}
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          {session.name} ({session.email})
        </p>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-2.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs flex items-center gap-2 text-left">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {isSettingNewPin ? (
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1 text-left font-medium">
                Enter 4-6 digit PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="••••"
                className="w-full text-center text-2xl tracking-widest px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 text-left font-medium">
                Confirm PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="••••"
                className="w-full text-center text-2xl tracking-widest px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSettingNewPin(false)}
                className="flex-1 py-2.5 text-xs text-slate-400 hover:text-white rounded-xl bg-slate-800/60"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 text-xs font-semibold text-white rounded-xl bg-indigo-600 hover:bg-indigo-500 shadow-md"
              >
                Save PIN
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {session.pinHash ? (
              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-2 font-medium">
                    Enter your security PIN to resume
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••"
                    className="w-full text-center text-3xl tracking-widest px-4 py-3 rounded-xl bg-slate-900/70 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-98 transition-transform"
                >
                  <Unlock className="w-4 h-4" /> Unlock Johnny Session
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => onUnlocked()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-600 hover:opacity-95 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
                >
                  <Unlock className="w-4 h-4" /> Enter Johnny Companion
                </button>
                <button
                  onClick={() => setIsSettingNewPin(true)}
                  className="w-full py-2.5 rounded-xl border border-slate-700 text-xs text-slate-300 hover:bg-slate-800/50 flex items-center justify-center gap-2"
                >
                  <Key className="w-3.5 h-3.5 text-teal-400" /> Set Up Security PIN
                </button>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800/60">
              <button
                onClick={handleBiometricSimulation}
                className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-200 flex items-center justify-center gap-2 rounded-xl hover:bg-slate-800/30"
              >
                <Fingerprint className="w-4 h-4 text-indigo-400" /> Quick Biometric Passkey Unlock
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
