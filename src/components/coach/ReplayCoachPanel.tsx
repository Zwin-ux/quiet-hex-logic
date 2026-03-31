import { FormEvent, useMemo, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Brain, Loader2, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/useAuth';
import { getAppApiUrl } from '@/lib/appApi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';

interface ReplayCoachPanelProps {
  currentPly: number;
  gameKey: string;
  matchId: string;
  moveCount: number;
}

const STARTER_PROMPTS = [
  'What changed on the last move?',
  'What should each side care about from here?',
  'Summarize the turning point in plain English.',
];

export function ReplayCoachPanel({ currentPly, gameKey, matchId, moveCount }: ReplayCoachPanelProps) {
  const { session } = useAuth();
  const [input, setInput] = useState('');

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: getAppApiUrl('/api/chat'),
      }),
    []
  );

  const { messages, sendMessage, status, stop, error } = useChat({
    transport,
    onError: (chatError) => {
      toast.error('Coach unavailable', {
        description: chatError.message || 'The Railway chat service did not respond.',
      });
    },
  });

  const isBusy = status === 'submitted' || status === 'streaming';

  const sendPrompt = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setInput('');

    await sendMessage(
      { text: trimmed },
      {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
        body: {
          context: {
            page: 'replay',
            matchId,
            gameKey,
            currentPly,
            moveCount,
          },
        },
      }
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isBusy) return;
    await sendPrompt(input);
  };

  return (
    <Card className="p-5 shadow-lg border-2 border-border/60 bg-card/95">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-indigo" />
            <h3 className="font-body text-lg font-semibold">Replay Coach</h3>
            <Badge variant="outline" className="text-xs uppercase tracking-[0.18em]">
              AI
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Tactical, plain-language coaching for the position you are scrubbing through right now.
          </p>
        </div>

        {isBusy ? (
          <Button type="button" variant="ghost" size="sm" onClick={stop}>
            Stop
          </Button>
        ) : (
          <Badge variant="secondary" className="whitespace-nowrap">
            Ply {currentPly} / {moveCount}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {STARTER_PROMPTS.map((prompt) => (
          <Button
            key={prompt}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto whitespace-normal text-left"
            disabled={isBusy}
            onClick={() => void sendPrompt(prompt)}
          >
            <Sparkles className="h-3.5 w-3.5 mr-2 shrink-0" />
            {prompt}
          </Button>
        ))}
      </div>

      <ScrollArea className="h-72 rounded-xl border bg-background/70 px-4 py-3 mb-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="space-y-2 py-10 text-sm text-muted-foreground">
              <p>The coach knows you are on a replay and can reference the current match snapshot.</p>
              <p>Ask for the last-move consequence, long-term plan, or the biggest turning point.</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={message.role === 'user' ? 'ml-auto max-w-[88%]' : 'max-w-[92%]'}
              >
                <div className="mb-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {message.role === 'user' ? 'You' : 'Coach'}
                </div>
                <div
                  className={
                    message.role === 'user'
                      ? 'rounded-2xl rounded-tr-md bg-primary px-4 py-3 text-primary-foreground'
                      : 'rounded-2xl rounded-tl-md border bg-card px-4 py-3'
                  }
                >
                  {message.parts.map((part, index) => {
                    if (part.type === 'text') {
                      return (
                        <p key={`${message.id}-${index}`} className="whitespace-pre-wrap text-sm leading-6">
                          {part.text}
                        </p>
                      );
                    }

                    if (part.type === 'reasoning') {
                      return (
                        <p key={`${message.id}-${index}`} className="text-xs text-muted-foreground">
                          Thinking...
                        </p>
                      );
                    }

                    return null;
                  })}
                </div>
              </div>
            ))
          )}

          {isBusy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Coach is reading the position...
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about the current position, the last move, or the biggest turning point."
          className="min-h-[96px] resize-none"
          disabled={isBusy}
        />

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {error ? error.message : 'Powered by the Railway chat service.'}
          </div>
          <Button type="submit" disabled={isBusy || !input.trim()} className="gap-2">
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Ask Coach
          </Button>
        </div>
      </form>
    </Card>
  );
}
