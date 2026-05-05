import { useMemo } from "react";
import { useBaseContext } from "@/lib/base/BaseProvider";
import { getPublicEnv } from "@/lib/runtimeEnv";

export type PlatformSurface = "web" | "mobile" | "discord" | "world";

export type Capability =
  | "playQuick"
  | "playLive"
  | "spectate"
  | "hostLite"
  | "editSurfaceRules"
  | "uploadPackages"
  | "publishVariants"
  | "editWorldSettings"
  | "useWorkbench"
  | "useArena";

type CapabilityMap = Record<Capability, boolean>;

const CAPABILITY_MATRIX: Record<PlatformSurface, CapabilityMap> = {
  web: {
    playQuick: true,
    playLive: true,
    spectate: true,
    hostLite: true,
    editSurfaceRules: true,
    uploadPackages: true,
    publishVariants: true,
    editWorldSettings: true,
    useWorkbench: true,
    useArena: true,
  },
  mobile: {
    playQuick: true,
    playLive: true,
    spectate: true,
    hostLite: true,
    editSurfaceRules: false,
    uploadPackages: false,
    publishVariants: false,
    editWorldSettings: false,
    useWorkbench: false,
    useArena: false,
  },
  discord: {
    playQuick: true,
    playLive: true,
    spectate: true,
    hostLite: true,
    editSurfaceRules: false,
    uploadPackages: false,
    publishVariants: false,
    editWorldSettings: false,
    useWorkbench: false,
    useArena: false,
  },
  world: {
    playQuick: true,
    playLive: true,
    spectate: true,
    hostLite: true,
    editSurfaceRules: false,
    uploadPackages: false,
    publishVariants: false,
    editWorldSettings: false,
    useWorkbench: false,
    useArena: false,
  },
};

export function buildWebUrl(path = "/") {
  const origin =
    getPublicEnv("VITE_PUBLIC_APP_URL") ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const base = origin.replace(/\/+$/, "");
  const nextPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${nextPath}`;
}

export function useSurfaceCapabilities() {
  const { platform } = useBaseContext();

  return useMemo(() => {
    const capabilities = CAPABILITY_MATRIX[platform];

    return {
      platform,
      capabilities,
      isWeb: platform === "web",
      isMobile: platform === "mobile",
      isDiscord: platform === "discord",
      isWorld: platform === "world",
      isAuthoringSurface: platform === "web",
      can(capability: Capability) {
        return capabilities[capability];
      },
      openOnWeb(path: string) {
        const url = buildWebUrl(path);

        if (typeof window === "undefined") {
          return;
        }

        if (platform === "web") {
          window.location.assign(url);
          return;
        }

        window.open(url, "_blank", "noopener,noreferrer");
      },
    };
  }, [platform]);
}
