import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WorkshopMod {
  id: string;
  name: string;
  description: string;
  game_key: string;
  rules: Record<string, unknown>;
  is_featured: boolean;
  author_id: string;
  created_at: string;
}

interface UseWorkshopModsOptions {
  featured?: boolean;
  gameKey?: string;
}

export function useWorkshopMods(options: UseWorkshopModsOptions = {}) {
  const [mods, setMods] = useState<WorkshopMod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMods() {
      try {
        let query = supabase
          .from('workshop_mods' as any)
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (options.featured) {
          query = query.eq('is_featured', true);
        }
        if (options.gameKey) {
          query = query.eq('game_key', options.gameKey);
        }

        const { data, error } = await query;
        if (error) {
          console.warn('[useWorkshopMods] Table may not exist yet:', error.message);
          setMods([]);
        } else {
          setMods((data as WorkshopMod[]) || []);
        }
      } catch {
        setMods([]);
      } finally {
        setLoading(false);
      }
    }

    fetchMods();
  }, [options.featured, options.gameKey]);

  return { mods, loading };
}
