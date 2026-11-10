import { cn } from "@/lib/utils";

// lucide-react v1 dropped brand icons; this matches its 24px / 2px-stroke
// outline style so it sits naturally next to the lucide icons.
export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <rect height="20" rx="5" ry="5" width="20" x="2" y="2" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
