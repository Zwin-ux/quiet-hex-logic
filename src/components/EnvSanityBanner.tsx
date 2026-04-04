import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSupabaseConfigSnapshot } from '@/integrations/supabase/client';

export function EnvSanityBanner() {
  const { resolvedUrl: url, projectId: pid } = getSupabaseConfigSnapshot();

  // Known deleted/old project ref that causes ERR_NAME_NOT_RESOLVED.
  const knownBadRefs = new Set(['ptuxqfwicdpdslqwnswd']);

  const urlRef = url.includes('.supabase.co') ? url.split('https://')[1]?.split('.supabase.co')[0] : '';
  const activeRef = (urlRef || pid || '').trim();

  const misconfigured =
    !activeRef ||
    url.includes('your-project-id') ||
    knownBadRefs.has(activeRef);

  if (!misconfigured) return null;

  return (
    <div className="container mx-auto px-4 pt-16 max-w-6xl">
      <Card className="border-red-500/30 bg-red-500/5">
        <CardContent className="pt-6 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <div className="font-medium">Supabase env looks misconfigured</div>
            <div className="text-sm text-muted-foreground">
              This build is pointing at <span className="font-mono">{activeRef || '(missing)'}</span>.
            </div>
            <div className="text-xs text-muted-foreground">
              Fix by setting <span className="font-mono">SUPABASE_URL</span> or <span className="font-mono">VITE_SUPABASE_URL</span> and restarting the Railway service.
            </div>
            <div className="pt-2">
              <Button size="sm" variant="outline" onClick={() => { window.location.href = '/debug'; }}>Open Debug</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
