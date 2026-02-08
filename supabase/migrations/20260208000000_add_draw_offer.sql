-- Add draw_offered_by column to matches table.
-- Tracks which player color (1 or 2) has offered a draw.
-- NULL when no draw offer is pending.
ALTER TABLE matches ADD COLUMN IF NOT EXISTS draw_offered_by SMALLINT NULL;
