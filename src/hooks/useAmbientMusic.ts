import { useCallback, useRef, useState, useEffect } from 'react';

/**
 * Ambient music generator using Web Audio API
 * Creates calming, procedural background music for matches
 */
export function useAmbientMusic() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const isPlayingRef = useRef(false);
  const animationFrameRef = useRef<number>();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('openboard_music_volume');
    return saved ? parseFloat(saved) : 0.3;
  });
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('openboard_music_muted') === 'true';
  });

  // Persist settings
  useEffect(() => {
    localStorage.setItem('openboard_music_volume', volume.toString());
  }, [volume]);

  useEffect(() => {
    localStorage.setItem('openboard_music_muted', isMuted.toString());
  }, [isMuted]);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      masterGainRef.current = audioContextRef.current.createGain();
      masterGainRef.current.connect(audioContextRef.current.destination);
      masterGainRef.current.gain.value = isMuted ? 0 : volume * 0.15; // Scale down for ambient
    }
    return audioContextRef.current;
  }, [volume, isMuted]);

  // Update volume in real-time
  useEffect(() => {
    if (masterGainRef.current) {
      const targetVolume = isMuted ? 0 : volume * 0.15;
      masterGainRef.current.gain.setTargetAtTime(targetVolume, audioContextRef.current?.currentTime || 0, 0.1);
    }
  }, [volume, isMuted]);

  const startMusic = useCallback(() => {
    if (isPlayingRef.current) return;
    
    try {
      const ctx = getAudioContext();
      const masterGain = masterGainRef.current!;
      
      // Resume context if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Ambient drone frequencies (pentatonic scale for pleasant sound)
      const baseFreq = 110; // A2
      const frequencies = [
        baseFreq,           // Root
        baseFreq * 1.5,     // Perfect 5th
        baseFreq * 2,       // Octave
        baseFreq * 1.25,    // Major 3rd
      ];

      // Create layered drones
      frequencies.forEach((freq, i) => {
        // Main sine wave
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = freq;
        oscGain.gain.value = 0.3 - i * 0.05;
        
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start();
        oscillatorsRef.current.push(osc);

        // Subtle detuned layer for richness
        const osc2 = ctx.createOscillator();
        const osc2Gain = ctx.createGain();
        
        osc2.type = 'sine';
        osc2.frequency.value = freq * 1.003; // Slight detune
        osc2Gain.gain.value = 0.15 - i * 0.02;
        
        osc2.connect(osc2Gain);
        osc2Gain.connect(masterGain);
        osc2.start();
        oscillatorsRef.current.push(osc2);
      });

      // Add evolving pad with LFO modulation
      const padOsc = ctx.createOscillator();
      const padGain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      
      padOsc.type = 'triangle';
      padOsc.frequency.value = baseFreq * 2;
      padGain.gain.value = 0.1;
      
      lfo.type = 'sine';
      lfo.frequency.value = 0.1; // Very slow modulation
      lfoGain.gain.value = 10; // Frequency modulation depth
      
      lfo.connect(lfoGain);
      lfoGain.connect(padOsc.frequency);
      padOsc.connect(padGain);
      padGain.connect(masterGain);
      
      lfo.start();
      padOsc.start();
      oscillatorsRef.current.push(padOsc, lfo);

      // Random sparkle notes
      const playSparkle = () => {
        if (!isPlayingRef.current) return;
        
        const sparkleFreqs = [440, 523.25, 659.25, 783.99, 880]; // A4 to A5 pentatonic
        const freq = sparkleFreqs[Math.floor(Math.random() * sparkleFreqs.length)];
        
        const sparkleOsc = ctx.createOscillator();
        const sparkleGain = ctx.createGain();
        const now = ctx.currentTime;
        
        sparkleOsc.type = 'sine';
        sparkleOsc.frequency.value = freq;
        
        sparkleGain.gain.setValueAtTime(0, now);
        sparkleGain.gain.linearRampToValueAtTime(0.08, now + 0.1);
        sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 2);
        
        sparkleOsc.connect(sparkleGain);
        sparkleGain.connect(masterGain);
        
        sparkleOsc.start(now);
        sparkleOsc.stop(now + 2.5);
        
        // Schedule next sparkle
        const nextDelay = 3000 + Math.random() * 5000;
        setTimeout(playSparkle, nextDelay);
      };
      
      // Start sparkles after a delay
      setTimeout(playSparkle, 2000);

      isPlayingRef.current = true;
      setIsPlaying(true);
    } catch (e) {
      console.error('Failed to start ambient music:', e);
    }
  }, [getAudioContext]);

  const stopMusic = useCallback(() => {
    if (!isPlayingRef.current) return;
    
    try {
      const ctx = audioContextRef.current;
      if (!ctx) return;

      // Fade out and stop all oscillators
      oscillatorsRef.current.forEach(osc => {
        try {
          osc.stop(ctx.currentTime + 0.5);
        } catch (e) {
          // Already stopped
        }
      });
      
      oscillatorsRef.current = [];
      isPlayingRef.current = false;
      setIsPlaying(false);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    } catch (e) {
      console.error('Failed to stop ambient music:', e);
    }
  }, []);

  const toggleMusic = useCallback(() => {
    if (isPlayingRef.current) {
      stopMusic();
    } else {
      startMusic();
    }
  }, [startMusic, stopMusic]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const updateVolume = useCallback((newVolume: number) => {
    setVolume(Math.max(0, Math.min(1, newVolume)));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMusic();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopMusic]);

  return {
    isPlaying,
    volume,
    isMuted,
    startMusic,
    stopMusic,
    toggleMusic,
    toggleMute,
    updateVolume,
  };
}
