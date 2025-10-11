-- Fix search_path for generate_match_code function
CREATE OR REPLACE FUNCTION public.generate_match_code(match_uuid uuid)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT upper(substring(encode(decode(replace(match_uuid::text, '-', ''), 'hex'), 'base32'), 1, 6))
$$;