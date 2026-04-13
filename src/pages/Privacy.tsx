import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SupportFrame } from "@/components/support/SupportFrame";
import { SupportPanel } from "@/components/support/SupportPanel";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Language, privacyTranslations } from "@/lib/translations/legal";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Privacy() {
  useDocumentTitle("Privacy");

  const [language, setLanguage] = useState<Language>("en");
  const t = privacyTranslations[language];

  return (
    <SupportFrame contentClassName="pt-24">
      <div className="mx-auto max-w-[1080px] space-y-8">
        <SupportPanel
          tone="dark"
          eyebrow="Privacy"
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
            <span className="support-chip">accounts</span>
            <span className="support-chip support-chip--light">events</span>
            <span className="support-chip support-chip--light">billing</span>
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

        <SupportPanel
          tone="paper"
          eyebrow="Questions"
          title="Need a privacy answer"
          description="Join Discord for a quick reply. Use email if it should stay in writing."
          motionIndex={t.sections.length + 1}
          footer={
            <div className="flex flex-wrap gap-3">
              <a href="https://discord.gg/67EmmZu69q" target="_blank" rel="noopener noreferrer">
                <Button variant="support">Join Discord</Button>
              </a>
              <a href="mailto:community@hexology.me">
                <Button variant="supportOutline">Email</Button>
              </a>
            </div>
          }
        />
      </div>
    </SupportFrame>
  );
}
