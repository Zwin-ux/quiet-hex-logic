import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle } from "lucide-react";

export default function Support() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-6">Support</h1>

        <div className="space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">Need Help?</h2>
            <p className="mb-4">
              We're here to help! For the fastest support, join our Discord community where you can chat directly with the developers and other players.
            </p>
            <a 
              href="https://discord.gg/67EmmZu69q" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block"
            >
              <Button className="bg-[#5865F2] hover:bg-[#4752C4] text-white">
                <MessageCircle className="h-4 w-4 mr-2" />
                Join Discord Community
              </Button>
            </a>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">Common Questions</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground">How do I play?</h3>
                <p>Connect your side of the board to the opposite side before your opponent does. Click on empty hexes to place your pieces.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">What is Hexology+?</h3>
                <p>Our premium subscription ($5/month) that unlocks exclusive board skins, unlimited AI practice, and advanced features.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">How do tournaments work?</h3>
                <p>Join our first tournament on February 25th, 2026 for a $500 prize pool! More details coming soon in Discord.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">Contact</h2>
            <p>
              For business inquiries or technical issues, reach out to us on Discord or email us at{" "}
              <a href="mailto:support@hexology.me" className="text-primary hover:underline">
                support@hexology.me
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
