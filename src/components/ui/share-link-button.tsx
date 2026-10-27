"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Shares the current page: the native share sheet on phones, clipboard elsewhere.
export function ShareLinkButton({ label, copiedLabel, title }: { label: string; copiedLabel: string; title: string }) {
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast(copiedLabel);
    } catch {
      // The rider closed the share sheet, or the clipboard is blocked -- nothing to report.
    }
  }

  return (
    <Button onClick={() => void share()} type="button" variant="secondary">
      <Share2 aria-hidden="true" className="size-4" />
      {label}
    </Button>
  );
}
