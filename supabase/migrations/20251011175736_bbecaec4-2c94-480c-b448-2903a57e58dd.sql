-- Lock matches table to service role only for updates
DROP POLICY IF EXISTS "matches_update" ON public.matches;

CREATE POLICY "matches_update_service_only" 
ON public.matches
FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Ensure finished matches have winners
ALTER TABLE public.matches
ADD CONSTRAINT finished_must_have_winner
CHECK ((status <> 'finished') OR winner IS NOT NULL);

-- Prevent changing immutable fields after first move
CREATE OR REPLACE FUNCTION public.prevent_rules_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM moves WHERE match_id = NEW.id) THEN
    IF NEW.size IS DISTINCT FROM OLD.size
    OR NEW.pie_rule IS DISTINCT FROM OLD.pie_rule
    OR NEW.owner IS DISTINCT FROM OLD.owner THEN
      RAISE EXCEPTION 'Cannot change size, pie_rule, or owner after first move';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_rules_change
BEFORE UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.prevent_rules_change();