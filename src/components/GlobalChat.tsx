import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, ChevronUp, ChevronDown, Users } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { formatDistanceToNow } from 'date-fns';

type ChatMessage = {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_color: string;
  };
};

export function GlobalChat() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastReadIdRef = useRef<string | null>(null);

  // Fetch initial messages - always fetch, not just when expanded
  useEffect(() => {
    if (!user) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('global_chat_messages')
        .select('*, profiles(username, avatar_color)')
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages(data as any);
      if (data && data.length > 0) {
        lastReadIdRef.current = data[data.length - 1].id;
      }
      setTimeout(() => scrollToBottom(), 100);
    };

    fetchMessages();
  }, [user]);

  // Subscribe to new messages - always subscribe
  useEffect(() => {
    if (!user) return;

    console.log('[GlobalChat] Subscribing to global_chat channel');
    const channel = supabase
      .channel('global_chat') // Use consistent channel name
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'global_chat_messages',
        },
        async (payload) => {
          console.log('[GlobalChat] New message received:', payload.new.id);
          // Fetch the full message with profile data
          const { data } = await supabase
            .from('global_chat_messages')
            .select('*, profiles(username, avatar_color)')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => {
              // Prevent duplicates
              if (prev.some(m => m.id === data.id)) {
                return prev;
              }
              return [...prev, data as any];
            });

            // Increment unread count if chat is collapsed and message is not from current user
            if (!isExpanded && data.user_id !== user.id) {
              setUnreadCount((prev) => prev + 1);
            }

            setTimeout(() => scrollToBottom(), 100);
          }
        }
      )
      .subscribe((status) => {
        console.log('[GlobalChat] Subscription status:', status);
      });

    return () => {
      console.log('[GlobalChat] Unsubscribing from global_chat channel');
      supabase.removeChannel(channel);
    };
  }, [user, isExpanded]);

  // Reset unread count when expanded
  useEffect(() => {
    if (isExpanded && messages.length > 0) {
      setUnreadCount(0);
      lastReadIdRef.current = messages[messages.length - 1].id;
    }
  }, [isExpanded, messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || loading) return;

    setLoading(true);
    const { error } = await supabase
      .from('global_chat_messages')
      .insert({ user_id: user.id, message: newMessage.trim() });

    if (error) {
      console.error('Error sending message:', error);
    } else {
      setNewMessage('');
    }
    setLoading(false);
  };

  if (!user) return null;

  const latestMessage = messages[messages.length - 1];

  return (
    <>
      {/* Persistent Bottom Chat Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
        <div className="pointer-events-auto">
          {/* Expanded Chat View */}
          {isExpanded && (
            <Card className="mx-auto max-w-4xl mb-0 rounded-b-none shadow-2xl border-x border-t border-b-0 animate-in slide-in-from-bottom-4 duration-300">
              <div className="h-[400px] flex flex-col">
                {/* Header */}
                <div className="px-4 py-3 border-b flex items-center justify-between bg-gradient-to-r from-primary/5 to-primary/10">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold text-base">Global Chat</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Chat with other players
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setIsExpanded(false)}
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                  >
                    <ChevronDown className="h-4 w-4" />
                    Minimize
                  </Button>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div key={msg.id} className="flex gap-3 animate-in fade-in duration-300">
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
                            </div>
                            <p className="text-sm break-words">{msg.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>

                {/* Input */}
                <form onSubmit={handleSend} className="p-3 border-t flex gap-2 bg-background">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    maxLength={500}
                    disabled={loading}
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={loading || !newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </Card>
          )}

          {/* Collapsed Chat Bar */}
          {!isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="w-full bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-t border-border hover:from-primary/20 hover:via-primary/10 hover:to-primary/20 transition-all duration-200 shadow-lg"
            >
              <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                {/* Left: Chat Icon + Latest Message */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative">
                    <MessageCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-ochre animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Badge>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">Global Chat</span>
                      {unreadCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {unreadCount} new
                        </Badge>
                      )}
                    </div>
                    {latestMessage ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                        <span className="font-medium text-foreground">
                          {latestMessage.profiles.username}:
                        </span>
                        <span className="truncate">{latestMessage.message}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No messages yet</p>
                    )}
                  </div>
                </div>

                {/* Right: Expand Button */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Click to expand
                  </span>
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Spacer to prevent content from being hidden behind chat bar */}
      <div className={isExpanded ? 'h-[400px]' : 'h-[60px]'} />
    </>
  );
}
