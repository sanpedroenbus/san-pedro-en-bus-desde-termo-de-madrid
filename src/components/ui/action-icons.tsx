import { ChartColumnIncreasing } from "lucide-react";
import { cn } from "@/lib/utils";

// A CSS mask over currentColor, so the custom sign icon takes the text colour
// like the lucide icons next to it.
export function ReportActionIcon({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("report-action-icon shrink-0", className)} />;
}

export function ExploreActionIcon({ className }: { className?: string }) {
  return <ChartColumnIncreasing aria-hidden="true" className={cn("shrink-0", className)} />;
}
