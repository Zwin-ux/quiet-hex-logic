import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { matchId } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch match and moves
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('size, pie_rule, turn')
      .eq('id', matchId)
      .single();

    if (matchError) throw matchError;

    const { data: moves, error: movesError } = await supabase
      .from('moves')
      .select('ply, color, cell')
      .eq('match_id', matchId)
      .order('ply', { ascending: true });

    if (movesError) throw movesError;

    // Build board state representation
    const boardSize = match.size;
    const board = Array(boardSize * boardSize).fill(0);
    let canUsePieRule = false;

    for (const move of moves) {
      if (move.cell !== null) {
        board[move.cell] = move.color;
      }
    }

    // Check if pie rule is available
    if (match.pie_rule && moves.length === 1 && moves[0].cell !== null) {
      canUsePieRule = true;
    }

    // Get available moves
    const emptyCells = board
      .map((val, idx) => val === 0 ? idx : -1)
      .filter(idx => idx !== -1);

    // Call Lovable AI for move suggestion
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are an expert Hex game AI. Hex is played on a ${boardSize}×${boardSize} rhombus board. 
Player 1 (indigo) connects West-East. Player 2 (ochre) connects North-South.
Players alternate placing stones. First to connect their sides wins.

Key strategies:
- Control the center
- Build bridges (two stones separated by specific empty cells that guarantee connection)
- Block opponent's connections
- Create multiple threats simultaneously

Current turn: Player ${match.turn}`;

    const userPrompt = `Board state (0=empty, 1=indigo, 2=ochre):
${board.map((v, i) => (i % boardSize === 0 ? '\n' : '') + v).join(' ')}

Available moves: ${emptyCells.slice(0, 20).join(', ')}${emptyCells.length > 20 ? '...' : ''}
${canUsePieRule ? '\nPie rule available: You can swap colors instead of playing.' : ''}

Analyze and choose the best move. ${canUsePieRule ? 'Consider whether swapping is better than playing a move.' : ''}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          name: 'make_move',
          description: 'Make a move in the Hex game',
          parameters: {
            type: 'object',
            properties: {
              move: {
                type: ['number', 'null'],
                description: 'Cell index (0 to board_size²-1) or null for pie swap'
              },
              reasoning: {
                type: 'string',
                description: 'Brief explanation of why this move is strong (20-40 words)'
              }
            },
            required: ['move', 'reasoning'],
            additionalProperties: false
          }
        }],
        tool_choice: { type: 'function', function: { name: 'make_move' } }
      })
    });

    if (!aiResponse.ok) {
      console.error('AI API error:', aiResponse.status, await aiResponse.text());
      // Fallback to random move
      const randomMove = canUsePieRule && Math.random() < 0.3 
        ? null 
        : emptyCells[Math.floor(Math.random() * emptyCells.length)];
      return new Response(
        JSON.stringify({ 
          move: randomMove, 
          reasoning: 'Random move (AI unavailable)' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    
    if (toolCall) {
      const args = JSON.parse(toolCall.function.arguments);
      const move = args.move === null ? null : Number(args.move);
      
      // Validate move
      if (move !== null && (move < 0 || move >= boardSize * boardSize || board[move] !== 0)) {
        throw new Error('AI suggested invalid move');
      }
      
      return new Response(
        JSON.stringify({ move, reasoning: args.reasoning }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('No valid AI response');

  } catch (error) {
    console.error('Error in ai-move:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
