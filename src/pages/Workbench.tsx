import { NavBar } from '@/components/NavBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function Workbench() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="container mx-auto px-4 pt-20 pb-12 max-w-4xl space-y-6">
        <div>
          <h1 className="text-4xl font-display font-bold">Workbench</h1>
          <p className="text-muted-foreground mt-2">
            The dev corner. Tokens, runner setup, and the contract between Hexology and your AI.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Run The Reference Bot Runner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Create a bot in <span className="font-mono">/arena</span>, copy its token, then run:
            </p>
            <pre className="p-3 rounded-lg border bg-card/50 overflow-auto text-xs">
{`# PowerShell (remote)
$env:HEXLOGY_FUNCTIONS_URL="https://<your-project-ref>.supabase.co/functions/v1"
$env:HEXLOGY_BOT_TOKEN="paste_token_here"
node tools/bot-runner/random.mjs`}
            </pre>
            <p className="text-xs text-muted-foreground">
              The runner polls for move requests, picks a move from server-provided legal moves, and submits it back to Hexology.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/arena')}>Back to Arena</Button>
              <Button onClick={() => navigate('/docs')}>Open Docs</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Protocol (MVP)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Your runner calls <span className="font-mono">bot-poll</span> with <span className="font-mono">Authorization: Bot &lt;token&gt;</span>.
            </p>
            <p>
              When it receives a request, it submits a move to <span className="font-mono">bot-submit-move</span>.
            </p>
            <p className="text-xs">
              This is Hex-first. The payload format is designed to expand to other games without breaking bots.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
