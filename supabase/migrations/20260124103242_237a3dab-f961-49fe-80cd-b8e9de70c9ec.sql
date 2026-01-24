-- Service role can do everything (for edge functions)
CREATE POLICY "Service role has full access to rematch_requests"
  ON rematch_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Enable realtime for rematch_requests
ALTER PUBLICATION supabase_realtime ADD TABLE rematch_requests;