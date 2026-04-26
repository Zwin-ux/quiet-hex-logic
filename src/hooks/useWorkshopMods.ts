import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { VariantScope, WorkshopVariant } from "@/lib/variants";

interface UseWorkshopModsOptions {
  featured?: boolean;
  gameKey?: string;
  worldId?: string;
  scopes?: VariantScope[];
  includeUnavailable?: boolean;
  refreshToken?: number | string;
}

export function useWorkshopMods(options: UseWorkshopModsOptions = {}) {
  const [mods, setMods] = useState<WorkshopVariant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchMods() {
      setLoading(true);

      try {
        let query = (supabase as any)
          .from("workshop_mods")
          .select("*")
          .eq("is_published", true)
          .order("is_official", { ascending: false })
          .order("featured_rank", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: false });

        if (options.featured) {
          query = query.eq("is_featured", true);
        }

        if (options.gameKey) {
          query = query.eq("game_key", options.gameKey);
        }

        if (options.worldId) {
          query = query.or(`world_id.is.null,world_id.eq.${options.worldId}`);
        }

        const { data, error } = await query;

        if (error) {
          console.warn("[useWorkshopMods] Table or columns may not exist yet:", error.message);
          if (!cancelled) {
            setMods([]);
          }
          return;
        }

        let nextMods = ((data ?? []) as WorkshopVariant[]).filter(Boolean);

        if (options.scopes?.length) {
          nextMods = nextMods.filter((mod) => {
            const scope = mod.scope ?? (mod.is_official ? "official_global" : "public_registry");
            return options.scopes?.includes(scope);
          });
        }

        if (!options.includeUnavailable) {
          nextMods = nextMods.filter((mod) => mod.availability !== "self_host");
        }

        if (!cancelled) {
          setMods(nextMods);
        }
      } catch {
        if (!cancelled) {
          setMods([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchMods();

    return () => {
      cancelled = true;
    };
  }, [
    options.featured,
    options.gameKey,
    options.includeUnavailable,
    options.refreshToken,
    options.scopes,
    options.worldId,
  ]);

  return { mods, loading };
}
