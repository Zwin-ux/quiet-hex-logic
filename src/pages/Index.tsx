import { SiteFrame } from "@/components/board/SiteFrame";
import { CapabilityShowcase } from "@/components/FeaturesShowcase";
import { PracticeDesk } from "@/components/GameGrid";
import { LandingHero } from "@/components/Hero";
import { QuietFooter } from "@/components/QuietFooter";

const Index = () => {
  return (
    <SiteFrame
      contentMode="full"
      navVariant="landing"
      shellVariant="landing"
      contentClassName="pb-0"
    >
      <LandingHero />
      <PracticeDesk />
      <CapabilityShowcase />
      <QuietFooter />
    </SiteFrame>
  );
};

export default Index;
