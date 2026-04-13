import { useCallback, useRef } from 'react';
import { useHaptics } from './useHaptics';

/**
 * Game sound effects using Web Audio API
 * Synthesizes sounds for instant playback without external dependencies
 * Includes haptic feedback for iOS/mobile devices
 */
export function useGameSounds() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const { triggerPlacement, triggerVictory, triggerDefeat, triggerError } = useHaptics();

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Piece placement sound - satisfying "pop" click + haptic
  const playPlaceSound = useCallback(() => {
    // Trigger haptic feedback for iOS
    triggerPlacement();
    
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // Create oscillator for the main tone
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
      
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.1);

      // Add a subtle click layer
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      
      clickOsc.type = 'square';
      clickOsc.frequency.setValueAtTime(1200, now);
      clickOsc.frequency.exponentialRampToValueAtTime(200, now + 0.03);
      
      clickGain.gain.setValueAtTime(0.1, now);
      clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      
      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);
      
      clickOsc.start(now);
      clickOsc.stop(now + 0.05);
    } catch (e) {
      // Audio not supported or blocked
    }
  }, [getAudioContext, triggerPlacement]);

  // Victory sound - triumphant ascending chord + celebration haptic
  const playWinSound = useCallback(() => {
    // Trigger celebration haptic pattern
    triggerVictory();
    
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // Play a triumphant chord progression
      const notes = [
        { freq: 523.25, delay: 0 },      // C5
        { freq: 659.25, delay: 0.1 },    // E5
        { freq: 783.99, delay: 0.2 },    // G5
        { freq: 1046.50, delay: 0.35 },  // C6 (octave)
      ];

      notes.forEach(({ freq, delay }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);
        
        gainNode.gain.setValueAtTime(0, now + delay);
        gainNode.gain.linearRampToValueAtTime(0.25, now + delay + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.6);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(now + delay);
        osc.stop(now + delay + 0.7);
      });

      // Add shimmer effect
      for (let i = 0; i < 3; i++) {
        const shimmerOsc = ctx.createOscillator();
        const shimmerGain = ctx.createGain();
        
        shimmerOsc.type = 'triangle';
        shimmerOsc.frequency.setValueAtTime(2000 + i * 500, now + 0.4);
        shimmerOsc.frequency.exponentialRampToValueAtTime(1000, now + 0.8);
        
        shimmerGain.gain.setValueAtTime(0.05, now + 0.4);
        shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        
        shimmerOsc.connect(shimmerGain);
        shimmerGain.connect(ctx.destination);
        
        shimmerOsc.start(now + 0.4 + i * 0.05);
        shimmerOsc.stop(now + 1);
      }
    } catch (e) {
      // Audio not supported or blocked
    }
  }, [getAudioContext, triggerVictory]);

  // Defeat sound - descending tone + heavy haptic
  const playLoseSound = useCallback(() => {
    // Trigger defeat haptic
    triggerDefeat();
    
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      const notes = [
        { freq: 400, delay: 0 },
        { freq: 350, delay: 0.15 },
        { freq: 300, delay: 0.3 },
      ];

      notes.forEach(({ freq, delay }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);
        
        gainNode.gain.setValueAtTime(0.2, now + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.4);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(now + delay);
        osc.stop(now + delay + 0.5);
      });
    } catch (e) {
      // Audio not supported or blocked
    }
  }, [getAudioContext, triggerDefeat]);

  // Invalid move sound - error buzz + error haptic
  const playErrorSound = useCallback(() => {
    // Trigger error haptic
    triggerError();
    
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.setValueAtTime(100, now + 0.1);
      
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {
      // Audio not supported or blocked
    }
  }, [getAudioContext, triggerError]);

  return {
    playPlaceSound,
    playWinSound,
    playLoseSound,
    playErrorSound,
  };
}
