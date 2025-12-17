import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto px-4 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 17, 2024</p>

        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using Hexology, you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground">
              Hexology is an online hex-based strategy board game platform that allows users to 
              play against AI opponents or other players, participate in tournaments, solve puzzles, 
              and track their progress through ratings and leaderboards.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground">
              You may create an account to access certain features. You are responsible for 
              maintaining the confidentiality of your account credentials and for all activities 
              under your account. You must be at least 13 years old to create an account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. User Conduct</h2>
            <p className="text-muted-foreground">You agree not to:</p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li>Use cheats, exploits, or unauthorized third-party software</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Impersonate others or provide false information</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Use the service for any illegal purpose</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Premium Subscription (Hexology+)</h2>
            <p className="text-muted-foreground">
              Hexology+ is an optional premium subscription that provides additional features. 
              Subscriptions are billed monthly or annually. You may cancel at any time, and 
              your subscription will remain active until the end of the billing period.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property</h2>
            <p className="text-muted-foreground">
              All content, features, and functionality of Hexology are owned by us and are 
              protected by copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground">
              Hexology is provided "as is" without warranties of any kind. We do not guarantee 
              that the service will be uninterrupted, secure, or error-free.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              To the maximum extent permitted by law, we shall not be liable for any indirect, 
              incidental, special, or consequential damages arising from your use of Hexology.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We may update these terms from time to time. Continued use of the service after 
              changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these Terms of Service, please contact us through our Discord community.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
