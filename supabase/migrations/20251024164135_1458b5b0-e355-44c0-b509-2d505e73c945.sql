-- Fix generate_lobby_code function to use accessible random function
DROP FUNCTION IF EXISTS public.generate_lobby_code();

CREATE OR REPLACE FUNCTION public.generate_lobby_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random 6-character uppercase alphanumeric code using gen_random_uuid
    new_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM lobbies WHERE code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;