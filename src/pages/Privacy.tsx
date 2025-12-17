import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Language, privacyTranslations } from "@/lib/translations/legal";

export default function Privacy() {
  const [language, setLanguage] = useState<Language>('en');
  const t = privacyTranslations[language];

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t.backToHome}
            </Button>
          </Link>
          <LanguageSelector currentLanguage={language} onLanguageChange={setLanguage} />
        </div>

        <h1 className="text-4xl font-bold mb-8">{t.title}</h1>
        <p className="text-muted-foreground mb-8">{t.lastUpdated}</p>

        <div className="prose prose-invert max-w-none space-y-6">
          {t.sections.map((section, index) => (
            <section key={index}>
              <h2 className="text-2xl font-semibold mb-4">{section.title}</h2>
              <p className="text-muted-foreground">{section.content}</p>
              {section.list && (
                <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                  {section.list.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
