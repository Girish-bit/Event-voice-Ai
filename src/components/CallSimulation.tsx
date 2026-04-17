import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, Mic, Volume2, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Contact } from '../types';

interface CallSimulationProps {
  isOpen: boolean;
  onClose: () => void;
  script: string;
  contacts: Contact[];
  language?: 'English' | 'Kannada';
  onComplete?: (contactId: string) => void;
  onMakeRealCall?: (contact: Contact) => Promise<void>;
}

export function CallSimulation({ isOpen, onClose, script, contacts, language = 'English', onComplete, onMakeRealCall }: CallSimulationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<'calling' | 'active' | 'ended'>('calling');
  const [timer, setTimer] = useState(0);

  const currentContact = contacts[currentIndex];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'active') {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (isOpen && currentContact) {
      startCall();
    }
  }, [isOpen, currentIndex]);

  const startCall = async () => {
    setStatus('calling');
    setTimer(0);
    
    // If real call function is provided, trigger the backend call
    if (onMakeRealCall && currentContact) {
      await onMakeRealCall(currentContact);
    }
    
    // Simulate answering after 2 seconds for UI feedback
    const timeout = setTimeout(() => {
      setStatus('active');
      speakScript();
    }, 2000);
    
    return () => clearTimeout(timeout);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const speakScript = () => {
    if (!window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(script);
    utterance.rate = 0.85; // Slightly slower feels more professional
    utterance.pitch = 0.9; // Lower pitch feels more mature

    if (language === 'Kannada') {
      utterance.lang = 'kn-IN';
      // Try to find a Kannada voice
      const voices = window.speechSynthesis.getVoices();
      const knVoice = voices.find(v => v.lang.includes('kn'));
      if (knVoice) utterance.voice = knVoice;
    }
    
    utterance.onend = () => {
      if (onComplete && currentContact) {
        onComplete(currentContact.id);
      }

      setTimeout(() => {
        if (currentIndex < contacts.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          setStatus('ended');
          setTimeout(onClose, 1500);
        }
      }, 2000);
    };
    
    window.speechSynthesis.speak(utterance);
  };

  const handleEndCall = () => {
    window.speechSynthesis.cancel();
    setStatus('ended');
    setTimeout(onClose, 500);
  };

  if (!currentContact && isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          <div className="relative w-full max-w-md aspect-[9/19] bg-zinc-900 rounded-[3rem] border-8 border-zinc-800 overflow-hidden flex flex-col items-center justify-between py-16 px-8 shadow-2xl">
            {/* Status Bar */}
            <div className="absolute top-0 w-full h-8 flex justify-between px-10 items-center">
              <span className="text-white text-xs font-medium">9:41</span>
              <div className="w-20 h-6 bg-black rounded-full" />
              <div className="flex gap-1">
                <div className="w-4 h-2 bg-white/20 rounded-sm" />
                <div className="w-4 h-2 bg-white/20 rounded-sm" />
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="absolute top-12 w-full flex justify-center">
              <Badge variant="outline" className="text-zinc-500 border-zinc-800">
                Call {currentIndex + 1} of {contacts.length}
              </Badge>
            </div>

            {/* Contact Info */}
            <div className="flex flex-col items-center gap-4 mt-12">
              <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center">
                <User className="w-12 h-12 text-zinc-400" />
              </div>
              <div className="text-center">
                <h2 className="text-white text-2xl font-semibold">{currentContact.name}</h2>
                <p className="text-zinc-500 text-xs mb-1">{currentContact.phone}</p>
                <p className="text-zinc-400 text-sm mt-1 uppercase tracking-widest">
                  {status === 'calling' ? 'Calling...' : status === 'active' ? formatTime(timer) : 'Call Ended'}
                </p>
              </div>
            </div>

            {/* Script Preview (Subtitles) */}
            {status === 'active' && (
              <motion.div 
                key={currentIndex}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-zinc-800/50 p-6 rounded-2xl border border-white/5 w-full"
              >
                <p className="text-zinc-300 text-sm italic leading-relaxed text-center">
                  "{script}"
                </p>
              </motion.div>
            )}

            {/* Controls */}
            <div className="grid grid-cols-3 gap-8 w-full mb-8">
              <div className="flex flex-col items-center gap-2">
                <Button variant="ghost" size="icon" className="w-14 h-14 rounded-full bg-zinc-800 text-white hover:bg-zinc-700">
                  <Mic className="w-6 h-6" />
                </Button>
                <span className="text-zinc-500 text-[10px] uppercase font-bold">Mute</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Button variant="ghost" size="icon" className="w-14 h-14 rounded-full bg-zinc-800 text-white hover:bg-zinc-700">
                  <Volume2 className="w-6 h-6" />
                </Button>
                <span className="text-zinc-500 text-[10px] uppercase font-bold">Speaker</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Button 
                  onClick={handleEndCall}
                  variant="destructive" 
                  size="icon" 
                  className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600"
                >
                  <PhoneOff className="w-6 h-6" />
                </Button>
                <span className="text-zinc-500 text-[10px] uppercase font-bold">End</span>
              </div>
            </div>

            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
