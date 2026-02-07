/**
 * Export game replays in HEX format (similar to PGN for chess)
 */

type Move = {
  ply: number;
  cell: number | null;
  color: number;
};

type MatchData = {
  id: string;
  size: number;
  winner: number | null;
  created_at: string;
  pie_rule: boolean;
  players: Array<{
    color: number;
    profile: { username: string };
    is_bot: boolean;
  }>;
};

/**
 * Convert cell index to algebraic notation (e.g., a1, b2)
 */
export function cellToNotation(cell: number, boardSize: number): string {
  if (cell === null) return 'swap';
  const row = Math.floor(cell / boardSize);
  const col = cell % boardSize;
  const colLetter = String.fromCharCode(97 + col); // a, b, c, ...
  const rowNum = row + 1;
  return `${colLetter}${rowNum}`;
}

/**
 * Generate HEX replay format
 */
export function generateHexReplay(match: MatchData, moves: Move[]): string {
  const player1 = match.players.find(p => p.color === 1);
  const player2 = match.players.find(p => p.color === 2);
  
  const lines: string[] = [];
  
  // Header
  lines.push(`[Event "The Open Board Game"]`);
  lines.push(`[Site "The Open Board"]`);
  lines.push(`[Date "${new Date(match.created_at).toISOString().split('T')[0]}"]`);
  lines.push(`[Board "${match.size}x${match.size}"]`);
  lines.push(`[PieRule "${match.pie_rule ? 'Yes' : 'No'}"]`);
  lines.push(`[Indigo "${player1?.is_bot ? 'AI' : player1?.profile.username || 'Unknown'}"]`);
  lines.push(`[Ochre "${player2?.is_bot ? 'AI' : player2?.profile.username || 'Unknown'}"]`);
  lines.push(`[Result "${match.winner === 1 ? '1-0' : match.winner === 2 ? '0-1' : '*'}"]`);
  lines.push(`[GameId "${match.id}"]`);
  lines.push('');
  
  // Moves
  const moveLines: string[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    const moveNum = Math.floor(i / 2) + 1;
    const move1 = moves[i];
    const move2 = moves[i + 1];
    
    let line = `${moveNum}. ${cellToNotation(move1.cell, match.size)}`;
    if (move2) {
      line += ` ${cellToNotation(move2.cell, match.size)}`;
    }
    moveLines.push(line);
  }
  
  // Wrap at ~80 chars
  let currentLine = '';
  for (const moveLine of moveLines) {
    if (currentLine.length + moveLine.length > 75) {
      lines.push(currentLine.trim());
      currentLine = moveLine + ' ';
    } else {
      currentLine += moveLine + ' ';
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }
  
  // Result
  lines.push(match.winner === 1 ? '1-0' : match.winner === 2 ? '0-1' : '*');
  
  return lines.join('\n');
}

/**
 * Generate JSON export format
 */
export function generateJsonReplay(match: MatchData, moves: Move[]): string {
  const player1 = match.players.find(p => p.color === 1);
  const player2 = match.players.find(p => p.color === 2);
  
  const exportData = {
    format: 'openboard-replay-v1',
    game: {
      id: match.id,
      date: match.created_at,
      boardSize: match.size,
      pieRule: match.pie_rule,
      winner: match.winner === 1 ? 'indigo' : match.winner === 2 ? 'ochre' : null,
    },
    players: {
      indigo: player1?.is_bot ? 'AI' : player1?.profile.username || 'Unknown',
      ochre: player2?.is_bot ? 'AI' : player2?.profile.username || 'Unknown',
    },
    moves: moves.map(m => ({
      ply: m.ply,
      player: m.color === 1 ? 'indigo' : 'ochre',
      cell: m.cell,
      notation: cellToNotation(m.cell, match.size),
    })),
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Download replay file
 */
export function downloadReplay(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
