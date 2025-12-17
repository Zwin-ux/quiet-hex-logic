import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGuestMode } from '@/hooks/useGuestMode';
import { usePremium } from '@/hooks/usePremium';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { MessageCircle, Send, X, Minus, Terminal, Hash, User, Sparkles, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  username: string;
  content: string;
  is_premium: boolean;
  is_guest: boolean;
  created_at: string;
  user_id: string | null;
}

export const GlobalChat: React.FC = () => {
  const { user } = useAuth();
  const { isGuest, guestUsername } = useGuestMode();
  const { isPremium } = usePremium(user?.id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel('global_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'global_messages' },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message].slice(-50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from('global_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(50);
    
    if (data) setMessages(data);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const currentUsername = user?.email?.split('@')[0] || guestUsername || 'Anonymouse';
    
    const { error } = await supabase.from('global_messages').insert({
      content: newMessage.trim(),
      username: currentUsername,
      user_id: user?.id || null,
      is_guest: isGuest,
      is_premium: isPremium,
    });

    if (!error) setNewMessage('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-3 font-mono">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn(
              "w-80 md:w-96 bg-[#0c0c0c] border-[3px] border-[#333] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden relative",
              isMinimized ? "h-12" : "h-[500px]"
            )}
          >
            {/* Retro Scanline Overlay */}
            <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.03] overflow-hidden">
              <div className="w-full h-2 bg-white animate-scanline" />
            </div>

            {/* Retro Title Bar */}
            <div className="h-10 bg-[#222] border-b-[3px] border-[#333] flex items-center justify-between px-3 cursor-move shrink-0 z-20">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57] shadow-[inset_-1px_-1px_1px_rgba(0,0,0,0.5)] border border-black/20" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-[inset_-1px_-1px_1px_rgba(0,0,0,0.5)] border border-black/20" />
                <div className="w-3 h-3 rounded-full bg-[#28c940] shadow-[inset_-1px_-1px_1px_rgba(0,0,0,0.5)] border border-black/20" />
                <span className="text-[10px] font-bold text-white ml-2 tracking-widest uppercase flex items-center gap-2">
                  <Activity className="h-3 w-3 text-emerald-500 animate-pulse" />
                  arena_chat.v1.0.4
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsMinimized(!isMinimized)} className="hover:bg-white/10 p-1 border border-transparent active:border-white/20 transition-all">
                  <Minus className="h-4 w-4 text-white" />
                </button>
                <button onClick={() => setIsOpen(false)} className="hover:bg-red-500 p-1 border border-transparent active:border-white/20 transition-all">
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* System Marquee */}
                <div className="bg-emerald-500/10 border-b border-emerald-500/20 py-1 overflow-hidden whitespace-nowrap z-20">
                  <div className="animate-marquee inline-block text-[9px] text-emerald-500 font-bold uppercase tracking-widest">
                    --- [SYSTEM] REALTIME COMM CHANNEL ACTIVE --- NO SPAMMING --- BE KIND OR BE KICKED --- ARENA INTEGRITY: 100% ---
                  </div>
                </div>

                {/* Message List */}
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0a0a0a] scrollbar-retro z-20"
                >
                  {messages.map((msg) => (
                    <div key={msg.id} className="group animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="flex items-center gap-2 mb-1">
                        {msg.is_premium ? (
                          <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                        ) : (
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0 shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
                        )}
                        <span className={cn(
                          "text-[10px] px-1 font-bold tracking-tighter transition-colors uppercase border shrink-0",
                          msg.is_premium ? "text-amber-500 border-amber-500/20 bg-amber-500/5" : "text-blue-500 border-blue-500/20 bg-blue-500/5",
                          msg.is_guest && "text-white/40 border-white/10"
                        )}>
                          {msg.is_guest ? 'GUEST' : (msg.is_premium ? 'PREMIUM' : 'ELITE')}
                        </span>
                        <span className={cn(
                          "font-bold text-xs group-hover:underline cursor-pointer tracking-tight truncate",
                          msg.is_premium ? "text-amber-400" : "text-emerald-500",
                          msg.is_guest && "text-white/60"
                        )}>
                          {msg.username}
                        </span>
                        <div className="h-[1px] flex-1 bg-white/5 mx-2" />
                        <span className="text-[9px] text-white/20 shrink-0 tabular-nums">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className={cn(
                        "text-sm mt-1 pl-4 leading-relaxed break-words border-l-[2px] transition-all group-hover:border-emerald-500/30",
                        msg.is_premium ? "text-amber-50/80 border-amber-500/10" : "text-white/80 border-white/5"
                      )}>
                        {msg.content}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Input Area */}
                <form onSubmit={handleSendMessage} className="p-3 bg-[#111] border-t-[3px] border-[#333] z-20">
                  <div className="relative flex items-center gap-2">
                    <Terminal className="absolute left-3 h-4 w-4 text-emerald-500/50" />
                    <input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Enter command or message..."
                      maxLength={500}
                      className="w-full bg-black border border-[#444] text-emerald-500 text-sm pl-9 pr-12 py-2.5 focus:outline-none focus:border-emerald-500/50 placeholder:text-[#333] transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                    />
                    <button 
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="absolute right-2 p-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black disabled:bg-transparent disabled:text-[#333] transition-all active:scale-95"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex justify-between items-center mt-2 px-1">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-[9px] text-emerald-500/50 uppercase tracking-tighter">
                        uplink active / {isGuest ? 'guest-relay' : 'secure-node'}
                      </span>
                    </div>
                    <span className={cn(
                      "text-[9px] tabular-nums",
                      newMessage.length > 450 ? "text-red-500" : "text-white/30"
                    )}>
                      {newMessage.length}/500
                    </span>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-14 w-14 rounded-none bg-[#0c0c0c] flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-[3px] border-[#333] relative group overflow-hidden transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
          isOpen ? "bg-amber-500 border-amber-600" : "hover:border-emerald-500"
        )}
      >
        <div className="absolute inset-0 bg-emerald-500/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 pointer-events-none" />
        {isOpen ? (
          <X className="h-7 w-7 text-black relative z-10" />
        ) : (
          <div className="relative">
            <MessageCircle className="h-7 w-7 text-emerald-500 group-hover:text-white transition-colors relative z-10" />
            <Activity className="absolute -top-1 -right-1 h-3 w-3 text-red-500 animate-pulse pointer-events-none" />
          </div>
        )}
        {!isOpen && messages.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 pointer-events-none">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 text-[8px] items-center justify-center text-black font-bold border border-black/20">
              !
            </span>
          </span>
        )}
      </motion.button>

      <style jsx>{`
        .scrollbar-retro::-webkit-scrollbar {
          width: 8px;
        }
        .scrollbar-retro::-webkit-scrollbar-track {
          background: #050505;
          border-left: 1px solid #222;
        }
        .scrollbar-retro::-webkit-scrollbar-thumb {
          background: #222;
          border: 1px solid #333;
        }
        .scrollbar-retro::-webkit-scrollbar-thumb:hover {
          background: #333;
        }
      `}</style>
    </div>
  );
};
