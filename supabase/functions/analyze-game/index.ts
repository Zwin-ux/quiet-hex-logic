import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Move {
  ply: number;
  cell: number | null;
  color: number;
}

interface AnalyzedMove {
  ply: number;
  cell: number | null;
  color: number;
  rating: 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
  comment: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { matchId } = await req.json();
    console.log('[analyze-game] Analyzing match:', matchId);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Fetch match and moves
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select(`
        id, size, winner, pie_rule, created_at,
        players:match_players(color, is_bot, profile:profiles(username))
      `)
      .eq('id', matchId)
      .single();

    if (matchError) {
      console.error('[analyze-game] Match fetch error:', matchError);
      throw new Error('Match not found');
    }

    const { data: moves, error: movesError } = await supabase
      .from('moves')
      .select('ply, cell, color')
      .eq('match_id', matchId)
      .order('ply', { ascending: true });

    if (movesError) {
      console.error('[analyze-game] Moves fetch error:', movesError);
      throw new Error('Could not fetch moves');
    }

    console.log('[analyze-game] Found', moves?.length, 'moves');

    // Build prompt for AI analysis
    const player1 = match.players?.find((p: any) => p.color === 1);
    const player2 = match.players?.find((p: any) => p.color === 2);
    const player1Name = player1?.is_bot ? 'AI' : (player1?.profile as any)?.username || 'Unknown';
    const player2Name = player2?.is_bot ? 'AI' : (player2?.profile as any)?.username || 'Unknown';

    const gameContext = `
Hex game analysis request:
- Board: ${match.size}x${match.size}
- Pie Rule: ${match.pie_rule ? 'Yes' : 'No'}
- Indigo player: ${player1Name}
- Ochre player: ${player2Name}
- Winner: ${match.winner === 1 ? 'Indigo' : match.winner === 2 ? 'Ochre' : 'None'}

Moves (format: ply, cell, color where 1=Indigo, 2=Ochre):
${moves?.map((m: Move) => `${m.ply}: cell ${m.cell === null ? 'SWAP' : m.cell} by ${m.color === 1 ? 'Indigo' : 'Ochre'}`).join('\n')}

Hex rules: Players take turns placing stones. Indigo connects top-bottom, Ochre connects left-right. Swap rule allows second player to swap after first move.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a Hex game expert analyst. Analyze each move and rate it. Be concise but insightful.
            
Rate each move as one of: excellent, good, inaccuracy, mistake, blunder
Consider: center control, connectivity, blocking threats, building paths.`
          },
          { role: 'user', content: gameContext }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'analyze_moves',
              description: 'Return analysis for each move in the game',
              parameters: {
                type: 'object',
                properties: {
                  summary: {
                    type: 'string',
                    description: 'Brief overall game summary (2-3 sentences)'
                  },
                  keyMoments: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of 2-4 key turning points'
                  },
                  moves: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        ply: { type: 'number' },
                        rating: { type: 'string', enum: ['excellent', 'good', 'inaccuracy', 'mistake', 'blunder'] },
                        comment: { type: 'string', description: 'Brief comment about the move (max 20 words)' }
                      },
                      required: ['ply', 'rating', 'comment']
                    }
                  }
                },
                required: ['summary', 'keyMoments', 'moves']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'analyze_moves' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('[analyze-game] AI error:', response.status, errorText);
      throw new Error('AI analysis failed');
    }

    const aiResponse = await response.json();
    console.log('[analyze-game] AI response received');

    // Parse tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error('Invalid AI response format');
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    // Merge analysis with original moves
    const analyzedMoves: AnalyzedMove[] = moves?.map((m: Move) => {
      const moveAnalysis = analysis.moves?.find((a: any) => a.ply === m.ply);
      return {
        ...m,
        rating: moveAnalysis?.rating || 'good',
        comment: moveAnalysis?.comment || '',
      };
    }) || [];

    console.log('[analyze-game] Analysis complete');

    return new Response(JSON.stringify({
      summary: analysis.summary,
      keyMoments: analysis.keyMoments,
      moves: analyzedMoves,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[analyze-game] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
