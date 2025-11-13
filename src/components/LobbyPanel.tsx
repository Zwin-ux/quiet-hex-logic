import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useLobby } from '@/hooks/useLobby';
import { Crown, Users, Copy, Check, LogOut, Play, Send, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RealtimeChannel } from '@supabase/supabase-js';

type LobbyPanelProps = {
  lobbyId: string;
  userId: string;
};

type ChatMessage = {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles?: {
    username: string;
    avatar_color?: string;
  };
};

export function LobbyPanel({ lobbyId, userId }: LobbyPanelProps) {
  const { lobby, players, loading, error } = useLobby(lobbyId, userId);
  const [copied, setCopied] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [starting, setStarting] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const isHost = lobby?.host_id === userId;
  const currentPlayer = players.find(p => p.player_id === userId);
  const allReady = players.length === 2 && players.every(p => p.is_ready);
  const canStart = isHost && allReady;

  // Auto-navigate both players when match starts (critical for guest navigation)
  useEffect(() => {
    if (!lobby || hasNavigated) return;

    // Detect when lobby status changes to 'starting'
    if (lobby.status === 'starting') {
      console.log(`[LobbyPanel] Lobby ${lobbyId} starting, fetching match...`);
      setHasNavigated(true); // Prevent duplicate navigation

      // Query for the match that was created from this lobby
      const fetchMatchAndNavigate = async () => {
        try {
          const { data: match, error } = await supabase
            .from('matches')
            .select('id')
            .eq('lobby_id', lobbyId)
            .single();

          if (error) {
            console.error('[LobbyPanel] Error fetching match:', error);
            toast.error('Failed to join match', {
              description: 'Please try refreshing the page'
            });
            setHasNavigated(false); // Allow retry
            return;
          }

          if (match) {
            console.log(`[LobbyPanel] Match ${match.id} found, navigating...`);
            toast.success('Match starting!');
            navigate(`/match/${match.id}`);
          } else {
            console.warn('[LobbyPanel] No match found for lobby');
            setHasNavigated(false); // Allow retry
          }
        } catch (err) {
          console.error('[LobbyPanel] Exception fetching match:', err);
          toast.error('Failed to start match');
          setHasNavigated(false); // Allow retry
        }
      };

      fetchMatchAndNavigate();
    }
  }, [lobby?.status, lobbyId, navigate, hasNavigated]);

  // Fetch and subscribe to chat messages
  useEffect(() => {
    if (!lobbyId) return;

    let chatChannel: RealtimeChannel;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('lobby_chat_messages')
        .select('*, profiles(username, avatar_color)')
        .eq('lobby_id', lobbyId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Error fetching chat messages:', error);
      } else {
        setChatMessages(data || []);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    chatChannel = supabase
      .channel(`lobby-chat:${lobbyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lobby_chat_messages',
          filter: `lobby_id=eq.${lobbyId}`
        },
        async (payload) => {
          // Fetch the message with profile data
          const { data } = await supabase
            .from('lobby_chat_messages')
            .select('*, profiles(username, avatar_color)')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setChatMessages(prev => [...prev, data]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [lobbyId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const copyCode = async () => {
    if (lobby?.code) {
      await navigator.clipboard.writeText(lobby.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Code copied!');
    }
  };

  const toggleReady = async () => {
    try {
      const { error } = await supabase.functions.invoke('toggle-lobby-ready', {
        body: {
          lobbyId,
          isReady: !currentPlayer?.is_ready
        }
      });

      if (error) throw error;
    } catch (err: any) {
      toast.error('Failed to update ready state', {
        description: err.message
      });
    }
  };

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('lobby_chat_messages')
        .insert({
          lobby_id: lobbyId,
          user_id: userId,
          message: newMessage.trim()
        });

      if (error) throw error;
      setNewMessage('');
    } catch (err: any) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const updateSettings = async (field: string, value: any) => {
    if (!isHost) return;
    
    setUpdating(true);
    try {
      const { error } = await supabase.functions.invoke('update-lobby-settings', {
        body: {
          lobbyId,
          [field]: value
        }
      });

      if (error) throw error;
      toast.success('Settings updated');
    } catch (err: any) {
      toast.error('Failed to update settings', {
        description: err.message
      });
    } finally {
      setUpdating(false);
    }
  };

  const startMatch = async () => {
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke('start-lobby-match', {
        body: { lobbyId }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Match starting!');
      navigate(`/match/${data.matchId}`);
    } catch (err: any) {
      toast.error('Failed to start match', {
        description: err.message
      });
    } finally {
      setStarting(false);
    }
  };

  const leaveLobby = async () => {
    try {
      const { error } = await supabase.functions.invoke('leave-lobby', {
        body: { lobbyId }
      });

      if (error) throw error;
      toast.success('Left lobby');
      navigate('/lobby');
    } catch (err: any) {
      toast.error('Failed to leave lobby', {
        description: err.message
      });
    }
  };

  if (loading) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">Loading lobby...</p>
      </Card>
    );
  }

  if (error || !lobby) {
    return (
      <Card className="p-12 text-center">
        <p className="text-destructive mb-4">{error || 'Lobby not found'}</p>
        <Button onClick={() => navigate('/lobby')}>Back to Lobby</Button>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Code Display */}
      <Card className="p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-2 border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Lobby Code</p>
            <p className="text-4xl font-mono font-bold tracking-wider text-primary">
              {lobby.code}
            </p>
          </div>
          <Button onClick={copyCode} variant="outline" className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Players */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Players ({players.length}/2)</h3>
          </div>
          
          <div className="space-y-3">
            {players.map((player) => {
              // Defensive null-safety for profiles
              const username = player.profiles?.username || 'Unknown';
              const avatarLetter = username[0]?.toUpperCase() || '?';
              const avatarColor = player.profiles?.avatar_color || 'indigo';

              return (
                <div
                  key={player.player_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `var(--${avatarColor}-500, rgb(99 102 241 / 0.1))` }}
                    >
                      <span className="font-bold" style={{ color: `var(--${avatarColor}-700, rgb(67 56 202))` }}>
                        {avatarLetter}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{username}</span>
                        {player.role === 'host' && (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      {player.player_id === userId && (
                        <span className="text-xs text-muted-foreground">You</span>
                      )}
                    </div>
                  </div>

                  {player.is_ready ? (
                    <Badge className="bg-green-500">Ready</Badge>
                  ) : (
                    <Badge variant="outline">Not Ready</Badge>
                  )}
                </div>
              );
            })}
            
            {players.length < 2 && (
              <div className="p-4 border-2 border-dashed rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  Waiting for player 2...
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Settings */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Game Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Board Size
              </label>
              <Select
                value={lobby.board_size.toString()}
                onValueChange={(v) => updateSettings('boardSize', parseInt(v))}
                disabled={!isHost || updating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7×7 - Quick</SelectItem>
                  <SelectItem value="9">9×9 - Standard</SelectItem>
                  <SelectItem value="11">11×11 - Classic</SelectItem>
                  <SelectItem value="13">13×13 - Epic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-sm">Pie Rule</p>
                <p className="text-xs text-muted-foreground">Swap allowed</p>
              </div>
              <Button
                variant={lobby.pie_rule ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSettings('pieRule', !lobby.pie_rule)}
                disabled={!isHost || updating}
              >
                {lobby.pie_rule ? 'On' : 'Off'}
              </Button>
            </div>
          </div>

          {!isHost && (
            <p className="text-xs text-muted-foreground mt-4">
              Only the host can change settings
            </p>
          )}
        </Card>

        {/* Chat Section */}
        <Card className="p-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h3 className="font-body text-lg font-semibold">Lobby Chat</h3>
          </div>

          <div className="space-y-4">
            {/* Messages */}
            <ScrollArea className="h-[300px] pr-4 border rounded-lg bg-muted/30">
              <div className="p-4 space-y-3">
                {chatMessages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No messages yet. Say hello! 👋
                  </p>
                ) : (
                  chatMessages.map((msg) => {
                    const isOwnMessage = msg.user_id === userId;
                    const username = msg.profiles?.username || 'Unknown';
                    const avatarColor = msg.profiles?.avatar_color || 'indigo';

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm"
                          style={{ backgroundColor: `hsl(var(--${avatarColor}))` }}
                        >
                          {username[0]?.toUpperCase()}
                        </div>
                        <div className={`flex-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                          <div className={`flex items-baseline gap-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                            <span className="text-xs font-semibold">
                              {isOwnMessage ? 'You' : username}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.created_at).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                          <div
                            className={`mt-1 inline-block px-3 py-2 rounded-lg text-sm ${
                              isOwnMessage
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {msg.message}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <form onSubmit={sendChatMessage} className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                maxLength={200}
                disabled={sendingMessage}
                className="flex-1"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!newMessage.trim() || sendingMessage}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={leaveLobby}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Leave Lobby
        </Button>

        <Button
          onClick={toggleReady}
          variant={currentPlayer?.is_ready ? 'outline' : 'default'}
          className="flex-1"
        >
          {currentPlayer?.is_ready ? 'Not Ready' : 'Ready Up'}
        </Button>

        {isHost && (
          <Button
            onClick={startMatch}
            disabled={!canStart || starting}
            className="gap-2 flex-1"
          >
            <Play className="h-4 w-4" />
            {starting ? 'Starting...' : 'Start Match'}
          </Button>
        )}
      </div>

      {!allReady && players.length === 2 && (
        <p className="text-center text-sm text-muted-foreground">
          Both players must be ready to start
        </p>
      )}
    </div>
  );
}
