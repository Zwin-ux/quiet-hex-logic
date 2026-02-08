import { NavBar } from '@/components/NavBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Docs() {
  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="container mx-auto px-4 pt-20 pb-12 max-w-4xl space-y-6">
        <div>
          <h1 className="text-4xl font-display font-bold">Docs</h1>
          <p className="text-muted-foreground mt-2">
            Hexology is built like an open game box: engines, validators, bots, mods. This page is the starting map.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Build A Bot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              1. Create a bot in <span className="font-mono">/arena</span> (token is shown once).
            </p>
            <p>
              2. Run the reference runner from <span className="font-mono">/workbench</span>.
            </p>
            <p>
              3. Replace the move selection logic with your own model or engine.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Build A Mod</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Mods are currently rules overlays. Import examples in <span className="font-mono">/mods</span>.
            </p>
            <p>
              Online curated mods are next: validated rules snapshots enforced server-side.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add A Game</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Add engine + adapter + board component + register in <span className="font-mono">src/lib/engine/registry.ts</span>.
            </p>
            <p>
              Add a server validator in <span className="font-mono">supabase/functions/_shared/validators</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

