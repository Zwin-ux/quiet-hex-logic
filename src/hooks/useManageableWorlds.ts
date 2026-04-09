import { useEffect, useState } from 'react';
import { listManageableWorlds, type WorldOption } from '@/lib/worlds';

export function useManageableWorlds(userId?: string) {
  const [worlds, setWorlds] = useState<WorldOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!userId) {
        setWorlds([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const data = await listManageableWorlds(userId);
        if (!cancelled) {
          setWorlds(data);
        }
      } catch {
        if (!cancelled) {
          setWorlds([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return {
    worlds,
    loading,
  };
}
