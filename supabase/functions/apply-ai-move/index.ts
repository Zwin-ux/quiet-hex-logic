import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const applyAIMoveSchema = z.object({
  matchId: z.string().uuid('Invalid match ID'),
  cell: z.number().int().min(0).max(10000).nullable(),
  actionId: z.string().uuid('Invalid action ID')
});

// Minimal validator (mirrors apply-move)
class DSU {
  parent: number[];
  constructor(n: number){ this.parent = Array.from({length:n}, (_,i)=>i); }
  find(x:number): number { return this.parent[x]===x? x : (this.parent[x]=this.find(this.parent[x])); }
  union(x:number,y:number){ x=this.find(x); y=this.find(y); if(x!==y) this.parent[y]=x; }
}
class HexValidator {
  n:number; board:(0|1|2)[]; turn:number; pieRule:boolean; dsu1:DSU; dsu2:DSU;
  constructor(size:number,pie:boolean){ this.n=size; this.pieRule=pie; this.board=Array(size*size).fill(0); this.turn=1; this.dsu1=new DSU(size*size+2); this.dsu2=new DSU(size*size+2); }
  legal(cell:number|null){ if(cell===null){ return this.turn===2 && this.pieRule; } return cell>=0 && cell<this.board.length && this.board[cell]===0; }
  play(cell:number|null){ if(!this.legal(cell)) throw new Error('Illegal move'); if(cell===null){ this.board=this.board.map(c=>c===1?2:c===2?1:0) as (0|1|2)[]; this.turn++; return; } const color=this.turn%2===1?1:2; this.board[cell]=color; const dsu=color===1?this.dsu1:this.dsu2; for(const nb of this.getNeighbors(cell)){ if(this.board[nb]===color) dsu.union(cell, nb); } if(color===1){ const col=cell%this.n; if(col===0) dsu.union(cell,this.board.length); if(col===this.n-1) dsu.union(cell,this.board.length+1); } else { const row=Math.floor(cell/this.n); if(row===0) dsu.union(cell,this.board.length); if(row===this.n-1) dsu.union(cell,this.board.length+1); } this.turn++; }
  getNeighbors(cell:number){ const row=Math.floor(cell/this.n), col=cell%this.n; const res:number[]=[]; const deltas=[[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0]]; for(const [dr,dc] of deltas){ const nr=row+dr, nc=col+dc; if(nr>=0&&nr<this.n&&nc>=0&&nc<this.n) res.push(nr*this.n+nc);} return res; }
  winner():0|1|2{ const l=this.board.length, r=this.board.length+1; if(this.dsu1.find(l)===this.dsu1.find(r)) return 1; if(this.dsu2.find(l)===this.dsu2.find(r)) return 2; return 0; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    
    // Validate input
    const validationResult = applyAIMoveSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid input parameters', 
        details: validationResult.error.format() 
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    const { matchId, cell, actionId } = validationResult.data;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Load match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();
    if (matchError || !match) return new Response(JSON.stringify({ error: 'Match not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Authorization: AI practice only, requester must be owner, and it must be AI's turn
    if (!match.ai_difficulty) return new Response(JSON.stringify({ error: 'Not an AI practice match' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (match.owner !== user.id) return new Response(JSON.stringify({ error: 'Only the owner can trigger AI moves' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const currentPlayerColor = match.turn % 2 === 1 ? 1 : 2;
    if (currentPlayerColor !== 2) return new Response(JSON.stringify({ error: 'Not AI turn' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Rate limit per user/match
    const rateLimitOk = await supabase.rpc('check_move_rate_limit', {
      _match_id: matchId,
      _user_id: user.id
    });
    if (!rateLimitOk.data) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded - too many moves' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Idempotency: if this action_id already processed, return cached state
    const { data: existingMove } = await supabase
      .from('moves')
      .select('ply')
      .eq('match_id', matchId)
      .eq('action_id', actionId)
      .maybeSingle();

    if (existingMove) {
      return new Response(JSON.stringify({ success: true, turn: match.turn, winner: match.winner, status: match.status, cached: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const currentVersion = match.version ?? 0;

    // Build state
    const { data: moves, error: movesError } = await supabase
      .from('moves')
      .select('*')
      .eq('match_id', matchId)
      .order('ply', { ascending: true });
    if (movesError) return new Response(JSON.stringify({ error: 'Failed to fetch moves' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const validator = new HexValidator(match.size, match.pie_rule);
    for (const m of moves || []) validator.play(m.cell);

    // Validate and apply AI move
    if (!validator.legal(cell)) return new Response(JSON.stringify({ error: 'Illegal move' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    validator.play(cell);

    const winner = validator.winner();
    const newTurn = validator.turn;
    const newStatus = winner ? 'finished' : 'active';

    // Record move as color 2 with idempotency action_id
    const { error: moveInsertError } = await supabase
      .from('moves')
      .insert({ match_id: matchId, ply: match.turn, color: 2, cell, action_id: actionId });

    if (moveInsertError) {
      // Duplicate action_id
      if ((moveInsertError as any).code === '23505') {
        return new Response(JSON.stringify({ success: true, turn: match.turn, winner: match.winner, status: match.status, cached: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: 'Failed to record move' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Optimistic concurrency update on matches
    const { data: updated, error: matchUpdateError } = await supabase
      .from('matches')
      .update({ 
        turn: newTurn, 
        status: newStatus, 
        winner: winner || null, 
        version: currentVersion + 1,
        updated_at: new Date().toISOString() 
      })
      .eq('id', matchId)
      .eq('version', currentVersion)
      .select()
      .maybeSingle();

    if (matchUpdateError || !updated) {
      return new Response(JSON.stringify({ error: 'Match state changed - please retry' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, turn: newTurn, winner: winner || null, status: newStatus }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('apply-ai-move error', e);
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});