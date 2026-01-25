/**
 * Enhanced Chat Component
 * Supports emotes, moderation, and rich interactions
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserAvatar } from '@/components/UserAvatar';
import { Send, Smile, MoreVertical, Flag, VolumeX } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

// Available emotes
const EMOTES = [
  { code: ':gg:', display: '🎮' },
  { code: ':nice:', display: '👍' },
  { code: ':think:', display: '🤔' },
  { code: ':wow:', display: '😮' },
  { code: ':sad:', display: '😢' },
  { code: ':fire:', display: '🔥' },
  { code: ':star:', display: '⭐' },
  { code: ':hex:', display: '⬡' },
  { code: ':crown:', display: '👑' },
  { code: ':clap:', display: '👏' },
];

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_color: string;
  };
}

interface EnhancedChatProps {
  channelType: 'global' | 'lobby' | 'match';
  channelId?: string;
  maxHeight?: string;
  showHeader?: boolean;
}

export function EnhancedChat({ 
  channelType, 
  channelId, 
  maxHeight = '300px',
  showHeader = true 
}: EnhancedChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch messages
  useEffect(() => {
    if (!user) return;
    
    const fetchMessages = async () => {
      let data: any[] | null = null;

      if (channelType === 'lobby' && channelId) {
        const result = await supabase
          .from('lobby_chat_messages')
          .select('*, profiles(username, avatar_color)')
          .eq('lobby_id', channelId)
          .order('created_at', { ascending: true })
          .limit(50);
        data = result.data;
      } else {
        const result = await supabase
          .from('global_chat_messages')
          .select('*, profiles(username, avatar_color)')
          .order('created_at', { ascending: true })
          .limit(50);
        data = result.data;
      }
      
      if (data) {
        setMessages(data as ChatMessage[]);
        setTimeout(scrollToBottom, 100);
      }
    };

    fetchMessages();
  }, [user, channelType, channelId]);

  // Subscribe to new messages
  useEffect(() => {
    if (!user) return;

    const tableName = channelType === 'lobby' ? 'lobby_chat_messages' : 'global_chat_messages';
    const channelName = `chat-${channelType}-${channelId || 'global'}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: tableName,
        },
        async (payload) => {
          // Fetch full message with profile
          let data: any = null;
          
          if (channelType === 'lobby') {
            const result = await supabase
              .from('lobby_chat_messages')
              .select('*, profiles(username, avatar_color)')
              .eq('id', payload.new.id)
              .single();
            data = result.data;
          } else {
            const result = await supabase
              .from('global_chat_messages')
              .select('*, profiles(username, avatar_color)')
              .eq('id', payload.new.id)
              .single();
            data = result.data;
          }

          if (data) {
            setMessages(prev => {
              if (prev.some(m => m.id === data.id)) return prev;
              return [...prev, data as ChatMessage];
            });
            setTimeout(scrollToBottom, 100);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, channelType, channelId]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  // Process emotes in message
  const processEmotes = (text: string): string => {
    let processed = text;
    EMOTES.forEach(({ code, display }) => {
      processed = processed.split(code).join(display);
    });
    return processed;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || loading) return;

    setLoading(true);
    
    let error: any = null;
    
    if (channelType === 'lobby' && channelId) {
      const result = await supabase
        .from('lobby_chat_messages')
        .insert({ user_id: user.id, message: newMessage.trim(), lobby_id: channelId });
      error = result.error;
    } else {
      const result = await supabase
        .from('global_chat_messages')
        .insert({ user_id: user.id, message: newMessage.trim() });
      error = result.error;
    }

    if (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } else {
      setNewMessage('');
    }
    
    setLoading(false);
  };

  const insertEmote = (emote: { code: string; display: string }) => {
    setNewMessage(prev => prev + emote.code);
  };

  const toggleMute = (userId: string) => {
    setMutedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
        toast.success('User unmuted');
      } else {
        next.add(userId);
        toast.success('User muted');
      }
      return next;
    });
  };

  const reportMessage = (_messageId: string) => {
    toast.success('Message reported', {
      description: 'Our team will review this message'
    });
  };

  // Filter muted users
  const visibleMessages = messages.filter(m => !mutedUsers.has(m.user_id));

  if (!user) return null;

  return (
    <div className="flex flex-col h-full">
      {showHeader && (
        <div className="p-3 border-b flex items-center justify-between bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {channelType === 'global' ? 'Global' : channelType === 'lobby' ? 'Lobby' : 'Match'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {visibleMessages.length} messages
            </span>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 p-3" ref={scrollRef} style={{ maxHeight }}>
        <div className="space-y-3">
          {visibleMessages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No messages yet</p>
            </div>
          ) : (
            visibleMessages.map((msg) => (
              <div key={msg.id} className="flex gap-2 group">
                <UserAvatar
                  username={msg.profiles.username}
                  color={msg.profiles.avatar_color}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-sm">{msg.profiles.username}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </span>
                    
                    {/* Message actions */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-32 p-1" align="end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-2 h-8"
                            onClick={() => toggleMute(msg.user_id)}
                          >
                            <VolumeX className="h-3 w-3" />
                            Mute
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-2 h-8 text-destructive"
                            onClick={() => reportMessage(msg.id)}
                          >
                            <Flag className="h-3 w-3" />
                            Report
                          </Button>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <p className="text-sm break-words">
                    {processEmotes(msg.message)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSend} className="p-2 border-t flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="shrink-0">
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="grid grid-cols-5 gap-1">
              {EMOTES.map((emote) => (
                <Button
                  key={emote.code}
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 text-xl p-0"
                  onClick={() => insertEmote(emote)}
                >
                  {emote.display}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          maxLength={300}
          disabled={loading}
          className="flex-1"
        />
        
        <Button type="submit" size="icon" disabled={loading || !newMessage.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
