"use client";

import { ROUTE_COLORS, ROUTE_LABELS, ROUTES, type Route } from "@/lib/domain/routes";
import { cn } from "@/lib/utils";

export function RoutePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Route;
  onChange: (route: Route) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border">
        {ROUTES.map((route) => {
          const selected = route === value;
          const color = ROUTE_COLORS[route];
          return (
            <button
              aria-pressed={selected}
              className={cn(
                "selection-flow flex min-h-9 items-center justify-center gap-1.5 bg-surface-raised px-1.5 text-sm font-bold transition duration-200 ease-out focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary",
                selected ? "border-transparent" : "text-foreground hover:bg-surface",
              )}
              key={route}
              onClick={() => onChange(route)}
              style={
                selected
                  ? {
                      background: color.fill,
                      color: color.textOnFill === "white" ? "white" : "black",
                      outlineColor: color.ring,
                    }
                  : undefined
              }
              type="button"
            >
              <span
                aria-hidden="true"
                className={cn("rounded-full transition duration-200 ease-out", selected ? "size-2.5 bg-white" : "size-2")}
                style={!selected ? { background: color.fill } : undefined}
              />
              {ROUTE_LABELS[route]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
