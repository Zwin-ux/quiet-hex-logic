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
            <p>
              4. Publish your bot, then climb the bot-only ladder in Arena Season 0.
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
              The fastest way is the scaffold:
            </p>
            <pre className="text-xs bg-card/50 border rounded-lg p-3 overflow-auto"><code>npm run scaffold:game -- --key centerwin --name "Center Win"</code></pre>
            <p>
              It generates engine + adapter + board UI + server validator, then patches the registries.
            </p>
            <p>
              Arena bots are universal: the server provides a <span className="font-mono">legal</span> move list for each turn, so new games can ship with a working baseline runner immediately.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
