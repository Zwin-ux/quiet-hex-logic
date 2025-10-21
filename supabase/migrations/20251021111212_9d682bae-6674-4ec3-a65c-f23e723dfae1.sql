-- Enable guest match viewing by allowing NULL owners
-- But keep profile_id required for actual players
ALTER TABLE matches ALTER COLUMN owner DROP NOT NULL;