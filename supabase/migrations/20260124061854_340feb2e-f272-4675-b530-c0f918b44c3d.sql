-- Create rematch_requests table to track rematch requests between players
CREATE TABLE IF NOT EXISTS rematch_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  lobby_id UUID REFERENCES lobbies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_id, requester_id)
);

-- Add RLS policies
ALTER TABLE rematch_requests ENABLE ROW LEVEL SECURITY;

-- Players can view rematch requests for matches they participated in
CREATE POLICY "Players can view their rematch requests"
  ON rematch_requests
  FOR SELECT
  USING (
    auth.uid() = requester_id OR auth.uid() = recipient_id
  );

-- Players can create rematch requests for matches they participated in
CREATE POLICY "Players can create rematch requests"
  ON rematch_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() = requester_id
  );

-- Players can update rematch requests where they are the recipient
CREATE POLICY "Recipients can update rematch requests"
  ON rematch_requests
  FOR UPDATE
  USING (auth.uid() = recipient_id);

-- Add index for faster lookups
CREATE INDEX idx_rematch_requests_match_id ON rematch_requests(match_id);
CREATE INDEX idx_rematch_requests_status ON rematch_requests(status);

-- Add updated_at trigger
CREATE TRIGGER update_rematch_requests_updated_at
  BEFORE UPDATE ON rematch_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();