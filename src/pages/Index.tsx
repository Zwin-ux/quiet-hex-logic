import { SiteFrame } from "@/components/board/SiteFrame";
import { PracticeDesk } from "@/components/GameGrid";
import { LandingHero } from "@/components/Hero";
import { QuietFooter } from "@/components/QuietFooter";
import { useSurfaceCapabilities } from "@/lib/surfaces";
import WorldAppHome from "@/pages/WorldAppHome";

const Index = () => {
  const { isWorld } = useSurfaceCapabilities();

  if (isWorld) {
    return <WorldAppHome />;
  }

  return (
    <SiteFrame
      contentMode="full"
      navVariant="landing"
      shellVariant="landing"
      contentClassName="pb-0"
    >
      <LandingHero />
      <PracticeDesk />
      <QuietFooter />
    </SiteFrame>
  );
};

export default Index;
