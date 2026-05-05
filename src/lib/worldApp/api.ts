import type { Session } from '@supabase/supabase-js';
import { getAppApiUrl } from '@/lib/appApi';

export async function worldAppApiJson<T>(path: string, session: Session, init?: RequestInit): Promise<T> {
  const response = await fetch(getAppApiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || 'World App request failed.');
  }

  return payload as T;
}
