import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SupportFrame } from "@/components/support/SupportFrame";
import { SupportPanel } from "@/components/support/SupportPanel";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Language, termsTranslations } from "@/lib/translations/legal";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Terms() {
  useDocumentTitle("Terms");

  const [language, setLanguage] = useState<Language>("en");
  const t = termsTranslations[language];

  return (
    <SupportFrame contentClassName="pt-24">
      <div className="mx-auto max-w-[1080px] space-y-8">
        <SupportPanel
          tone="dark"
          eyebrow="Terms"
          title={t.title}
          description={t.lastUpdated}
          titleBarEnd={<LanguageSelector currentLanguage={language} onLanguageChange={setLanguage} />}
          motionIndex={0}
          motionVariant="hero"
          footer={
            <Link to="/">
              <Button variant="supportOutline">
                <ArrowLeft className="h-4 w-4" />
                {t.backToHome}
              </Button>
            </Link>
          }
        >
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="support-chip">rules</span>
            <span className="support-chip support-chip--light">payments</span>
            <span className="support-chip support-chip--light">conduct</span>
          </div>
        </SupportPanel>

        <div className="grid gap-6">
          {t.sections.map((section, index) => (
            <SupportPanel
              key={index}
              tone={index % 3 === 1 ? "paper" : index % 2 === 0 ? "light" : "dark"}
              eyebrow={`Section ${index + 1}`}
              title={section.title}
              motionIndex={index + 1}
              motionVariant={index % 3 === 1 ? "card" : "aside"}
            >
              <p className={index % 3 === 1 ? "text-[15px] leading-7 text-black/80" : "text-[15px] leading-7 text-white/78"}>
                {section.content}
              </p>
              {section.list && (
                <ul className={index % 3 === 1 ? "mt-4 space-y-2 text-[15px] leading-7 text-black/78" : "mt-4 space-y-2 text-[15px] leading-7 text-white/76"}>
                  {section.list.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex gap-3">
                      <span className="support-mini-label pt-1">{String(itemIndex + 1).padStart(2, "0")}</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </SupportPanel>
          ))}
        </div>
      </div>
    </SupportFrame>
  );
}
