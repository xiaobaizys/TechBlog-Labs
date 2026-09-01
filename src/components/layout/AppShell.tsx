"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { DataLoader } from "@/components/ui/DataLoader";
import { useHideAIChat } from "@/hooks/useHideAIChat";

const AIChatButton = dynamic(
  () => import("@/components/ai/AIChatButton").then((m) => m.AIChatButton),
  { ssr: false }
);

const CursorGlow = dynamic(
  () => import("@/components/ui/CursorGlow").then((m) => m.CursorGlow),
  { ssr: false }
);

export function AppShell({ children }: { children: React.ReactNode }) {
  const [showLoader, setShowLoader] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("vitalog_visited") !== "true";
    } catch {
      return false;
    }
  });

  const hideAIChat = useHideAIChat();

  return (
    <>
      {children}
      {showLoader && (
        <DataLoader
          onComplete={() => setShowLoader(false)}
          maxDuration={3000}
        />
      )}
      {!hideAIChat && <AIChatButton />}
      <CursorGlow />
    </>
  );
}
