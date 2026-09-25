/**
 * Voice & Audio Service for Johnny
 * Handles Web Audio API PCM streaming, microphone analysis,
 * speech recognition, frequency extraction, and audio synthesis.
 */

class VoiceEngine {
  private audioCtx: AudioContext | null = null;
  private currentSourceNode: AudioBufferSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private micAnalyserNode: AnalyserNode | null = null;
  private recognition: any = null;
  private isSpeaking: boolean = false;
  private isListening: boolean = false;

  private onSpeechResultCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private onSpeechErrorCallback: ((error: string) => void) | null = null;
  private onSpeakingStateChange: ((speaking: boolean) => void) | null = null;

  constructor() {
    // Lazily initialize AudioContext on user interaction
  }

  private initAudioContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass({ sampleRate: 24000 });
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.8;
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Play PCM 24000Hz audio from Gemini TTS (base64 raw PCM)
  public async playGeminiPCM(base64Data: string, sampleRate = 24000): Promise<void> {
    try {
      this.stopPlayback();
      const ctx = this.initAudioContext();

      // Decode base64 to binary string
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // 16-bit signed PCM conversion
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32Array.length, sampleRate);
      audioBuffer.copyToChannel(float32Array, 0);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      // Connect source -> analyser -> destination
      if (!this.analyserNode) {
        this.analyserNode = ctx.createAnalyser();
        this.analyserNode.fftSize = 256;
      }
      source.connect(this.analyserNode);
      this.analyserNode.connect(ctx.destination);

      this.currentSourceNode = source;
      this.isSpeaking = true;
      this.onSpeakingStateChange?.(true);

      source.onended = () => {
        this.isSpeaking = false;
        this.currentSourceNode = null;
        this.onSpeakingStateChange?.(false);
      };

      source.start(0);
    } catch (err) {
      console.error('Error playing Gemini PCM audio:', err);
      this.isSpeaking = false;
      this.onSpeakingStateChange?.(false);
      throw err;
    }
  }

  // Web Speech Synthesis Fallback (for offline or instantaneous speech)
  public playWebSpeech(text: string, voiceName?: string): Promise<void> {
    return new Promise((resolve) => {
      this.stopPlayback();
      if (!('speechSynthesis' in window)) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = voiceName === 'Kore' || voiceName === 'Zephyr' ? 1.15 : 0.95;

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const preferredVoice = voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')),
        );
        if (preferredVoice) utterance.voice = preferredVoice;
      }

      this.isSpeaking = true;
      this.onSpeakingStateChange?.(true);

      utterance.onend = () => {
        this.isSpeaking = false;
        this.onSpeakingStateChange?.(false);
        resolve();
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        this.onSpeakingStateChange?.(false);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  public stopPlayback(): void {
    if (this.currentSourceNode) {
      try {
        this.currentSourceNode.stop();
      } catch (e) {
        // Ignored
      }
      this.currentSourceNode = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
    this.onSpeakingStateChange?.(false);
  }

  // Get frequency spectrum from Johnny's audio playback
  public getPlaybackFrequencyData(): Uint8Array {
    if (!this.isSpeaking) {
      return new Uint8Array(64);
    }
    if (this.analyserNode && this.currentSourceNode) {
      const data = new Uint8Array(this.analyserNode.frequencyBinCount);
      this.analyserNode.getByteFrequencyData(data);
      return data;
    }

    // Synthesize organic speech frequencies during Web Speech playback
    const synthData = new Uint8Array(64);
    const now = Date.now() / 120;
    for (let i = 0; i < 32; i++) {
      const harmonic = Math.sin(now * 2 + i * 0.4) * 0.5 + 0.5;
      const cadence = Math.sin(now * 0.8) * 0.3 + 0.7;
      synthData[i] = Math.floor(harmonic * cadence * 190);
    }
    return synthData;
  }

  // Initialize Microphone stream & Analyser for live visualizer
  public async startMicMonitoring(): Promise<MediaStream | null> {
    try {
      if (this.micStream) return this.micStream;
      const ctx = this.initAudioContext();
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const micSource = ctx.createMediaStreamSource(this.micStream);
      this.micAnalyserNode = ctx.createAnalyser();
      this.micAnalyserNode.fftSize = 256;
      this.micAnalyserNode.smoothingTimeConstant = 0.75;
      micSource.connect(this.micAnalyserNode);
      return this.micStream;
    } catch (err) {
      console.warn('Microphone permission not granted or audio input unavailable:', err);
      return null;
    }
  }

  public stopMicMonitoring(): void {
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    this.micAnalyserNode = null;
  }

  public getMicFrequencyData(): Uint8Array {
    if (!this.micAnalyserNode) {
      return new Uint8Array(64);
    }
    const data = new Uint8Array(this.micAnalyserNode.frequencyBinCount);
    this.micAnalyserNode.getByteFrequencyData(data);
    return data;
  }

  // Real RMS microphone volume from 0.0 to 1.0
  public getMicVolume(): number {
    if (!this.micAnalyserNode) return 0;
    const data = new Uint8Array(this.micAnalyserNode.frequencyBinCount);
    this.micAnalyserNode.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    const rawVolume = sum / (data.length * 255);
    // Smooth amplification for responsive visualizer
    return Math.min(1.0, rawVolume * 2.2);
  }

  // Real RMS playback volume from 0.0 to 1.0
  public getPlaybackVolume(): number {
    if (!this.isSpeaking) return 0;
    if (this.analyserNode && this.currentSourceNode) {
      const data = new Uint8Array(this.analyserNode.frequencyBinCount);
      this.analyserNode.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i];
      }
      return Math.min(1.0, (sum / (data.length * 255)) * 2.0);
    }
    // Web speech synthesized cadence
    const now = Date.now() / 140;
    return (Math.sin(now * 2) * 0.25 + 0.5) * 0.7;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  // Speech Recognition with Web Speech API
  public startSpeechRecognition(
    onResult: (text: string, isFinal: boolean) => void,
    onError?: (err: string) => void,
  ): boolean {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onError?.('Speech recognition is not supported in this browser. You can type or use fallback voice.');
      return false;
    }

    try {
      if (this.recognition) {
        this.recognition.abort();
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.onSpeechResultCallback = onResult;
      this.onSpeechErrorCallback = onError || null;

      this.recognition.onstart = () => {
        this.isListening = true;
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript.trim()) {
          this.onSpeechResultCallback?.(finalTranscript.trim(), true);
        } else if (interimTranscript.trim()) {
          this.onSpeechResultCallback?.(interimTranscript.trim(), false);
        }
      };

      this.recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.warn('Speech recognition error:', event.error);
          this.onSpeechErrorCallback?.(event.error);
        }
      };

      this.recognition.onend = () => {
        // Can be restarted in continuous hands-free mode if intended
        this.isListening = false;
      };

      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (e: any) {
      console.error('Failed to start speech recognition:', e);
      onError?.(e.message || 'Speech recognition initialization failed');
      return false;
    }
  }

  public stopSpeechRecognition(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignored
      }
      this.recognition = null;
    }
    this.isListening = false;
  }

  public subscribeSpeakingState(cb: (speaking: boolean) => void): () => void {
    this.onSpeakingStateChange = cb;
    return () => {
      this.onSpeakingStateChange = null;
    };
  }

  // Synthesize pleasant UI sound cues natively (no external audio assets required)
  public playCue(type: 'chime' | 'pop' | 'success' | 'alert'): void {
    try {
      const ctx = this.initAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'chime') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'pop') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(540, now + 0.08);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'alert') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.15);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (e) {
      // Audio cue failure should never interrupt flow
    }
  }

  public getSpeaking(): boolean {
    return this.isSpeaking;
  }

  public getListening(): boolean {
    return this.isListening;
  }
}

export const voiceEngine = new VoiceEngine();
