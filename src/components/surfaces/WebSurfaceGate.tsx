import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ExternalLink, MonitorSmartphone } from "lucide-react";
import { SiteFrame } from "@/components/board/SiteFrame";
import { StateTag } from "@/components/board/StateTag";
import { VenuePanel } from "@/components/board/VenuePanel";
import { Button } from "@/components/ui/button";
import { buildWebUrl, useSurfaceCapabilities, type Capability } from "@/lib/surfaces";

type WebSurfaceGateProps = {
  capability: Capability;
  title: string;
  reason: string;
  children: ReactNode;
  destination?: string;
};

export function WebSurfaceGate({
  capability,
  title,
  reason,
  children,
  destination,
}: WebSurfaceGateProps) {
  const location = useLocation();
  const { can } = useSurfaceCapabilities();

  if (can(capability)) {
    return <>{children}</>;
  }

  const nextPath = destination || `${location.pathname}${location.search}${location.hash}`;

  return (
    <SiteFrame>
      <div className="board-page-width mx-auto">
        <VenuePanel
          eyebrow="Web authoring"
          title={title}
          description={reason}
          titleBarEnd={<StateTag tone="warning">web only</StateTag>}
        >
          <div className="flex flex-wrap gap-3">
            <OpenOnWebButton to={nextPath} label="Open on web" />
          </div>
        </VenuePanel>
      </div>
    </SiteFrame>
  );
}

type OpenOnWebButtonProps = {
  to: string;
  label?: string;
  variant?: "default" | "outline" | "hero";
};

export function OpenOnWebButton({
  to,
  label = "Open on web",
  variant = "outline",
}: OpenOnWebButtonProps) {
  const { openOnWeb } = useSurfaceCapabilities();

  return (
    <Button variant={variant} onClick={() => openOnWeb(to)}>
      <ExternalLink className="h-4 w-4" />
      {label}
    </Button>
  );
}

export function WebHandoffNotice({
  title,
  detail,
  to,
}: {
  title: string;
  detail: string;
  to: string;
}) {
  const href = buildWebUrl(to);

  return (
    <div className="border border-black/12 bg-white px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="board-rail-label text-black/55">Web editing</p>
          <p className="mt-2 text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{detail}</p>
        </div>
        <MonitorSmartphone className="h-5 w-5 text-black/45" />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <OpenOnWebButton to={to} />
        <a
          href={href}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground underline underline-offset-2"
          target="_blank"
          rel="noreferrer"
        >
          Copyable route
        </a>
      </div>
    </div>
  );
}
