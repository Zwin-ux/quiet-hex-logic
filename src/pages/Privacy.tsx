import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto px-4 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 17, 2024</p>

        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground">
              This Privacy Policy explains how Hexology collects, uses, and protects your 
              information when you use our service. We are committed to protecting your privacy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <p className="text-muted-foreground">We may collect the following types of information:</p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li><strong>Account Information:</strong> Email address, username, and profile preferences</li>
              <li><strong>Game Data:</strong> Match history, ratings, puzzle progress, and achievements</li>
              <li><strong>Discord Information:</strong> When using Discord integration, your Discord user ID and username</li>
              <li><strong>Usage Data:</strong> How you interact with our service, including pages visited and features used</li>
              <li><strong>Device Information:</strong> Browser type, device type, and IP address</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground">We use your information to:</p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li>Provide and improve our game service</li>
              <li>Manage your account and preferences</li>
              <li>Track game statistics and maintain leaderboards</li>
              <li>Process premium subscriptions</li>
              <li>Communicate service updates and changes</li>
              <li>Prevent cheating and enforce our Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Sharing</h2>
            <p className="text-muted-foreground">
              We do not sell your personal information. We may share data with:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li><strong>Service Providers:</strong> Third-party services that help us operate (e.g., hosting, payment processing)</li>
              <li><strong>Discord:</strong> When you use Discord integration, information is shared per Discord's policies</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <p className="text-muted-foreground">
              We implement appropriate security measures to protect your information. However, 
              no method of transmission over the internet is 100% secure, and we cannot guarantee 
              absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your information as long as your account is active or as needed to provide 
              services. You may request deletion of your account and associated data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Your Rights</h2>
            <p className="text-muted-foreground">You have the right to:</p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data</li>
              <li>Opt out of marketing communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Cookies</h2>
            <p className="text-muted-foreground">
              We use cookies and similar technologies to maintain sessions, remember preferences, 
              and analyze usage. You can control cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Children's Privacy</h2>
            <p className="text-muted-foreground">
              Hexology is not intended for children under 13. We do not knowingly collect 
              information from children under 13. If you believe we have collected such 
              information, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of 
              significant changes by posting the new policy on this page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <p className="text-muted-foreground">
              For questions about this Privacy Policy, please contact us through our Discord community.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
