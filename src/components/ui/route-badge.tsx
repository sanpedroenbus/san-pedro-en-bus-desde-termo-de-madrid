import { ROUTE_COLORS, ROUTE_LABELS, type Route } from "@/lib/domain/routes";
import { cn } from "@/lib/utils";

export function RouteBadge({
  route,
  className,
}: {
  route: Route;
  className?: string;
}) {
  return (
    <span
      className={cn("rounded-sm px-1.5 py-1 text-xs font-bold", className)}
      style={{
        background: ROUTE_COLORS[route].fill,
        color: ROUTE_COLORS[route].textOnFill,
      }}
    >
      {ROUTE_LABELS[route]}
    </span>
  );
}
