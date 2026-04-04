import { AlertTriangle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSupabaseConfigSnapshot } from '@/integrations/supabase/client';

export function DeploymentConfigScreen() {
  const buildId = typeof __HEXLOGY_BUILD_ID__ === 'string' ? __HEXLOGY_BUILD_ID__ : '';
  const { configError, resolvedUrl, projectId, publishableKeyPresent } = getSupabaseConfigSnapshot();

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <Card className="border-red-500/30 bg-card/95 shadow-xl">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <CardTitle className="font-display text-2xl">Deployment Config Missing</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              This Railway deploy started, but the frontend did not receive the public Supabase settings it needs to boot.
            </p>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-2">
              <div>
                Error: <span className="font-mono">{configError}</span>
              </div>
              <div>
                Resolved URL: <span className="font-mono">{resolvedUrl || '(missing)'}</span>
              </div>
              <div>
                Project ID: <span className="font-mono">{projectId || '(missing)'}</span>
              </div>
              <div>
                Publishable key present: <span className="font-mono">{publishableKeyPresent ? 'yes' : 'no'}</span>
              </div>
              <div>
                Build ID: <span className="font-mono">{buildId || '(unknown)'}</span>
              </div>
            </div>

            <div className="space-y-2 text-muted-foreground">
              <p>Set one of these pairs in Railway and restart the service:</p>
              <p className="font-mono text-foreground">SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY</p>
              <p className="font-mono text-foreground">VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => window.location.reload()} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Reload
              </Button>
              <Button variant="outline" onClick={() => (window.location.href = '/debug')}>
                Open Debug
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
