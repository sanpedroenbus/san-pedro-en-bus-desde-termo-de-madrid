"use client";

import * as Popover from "@radix-ui/react-popover";
import { ListTree, SlidersHorizontal } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ROUTE_COLORS, ROUTE_LABELS, ROUTES, type Route } from "@/lib/domain/routes";
import { TIME_RANGES, type TimeRange } from "@/lib/domain/ranges";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CenteredPopoverPanel, StickyUtilityBar } from "@/components/ui/popover-shell";

export function FilterBar({
  dictionary,
  locale,
  selectedRoutes,
  selectedRange,
  demoMode = false,
}: {
  dictionary: Dictionary;
  locale: Locale;
  selectedRoutes: Route[];
  selectedRange: TimeRange;
  demoMode?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [draftRoutes, setDraftRoutes] = useState<Route[]>(selectedRoutes);
  const [draftRange, setDraftRange] = useState<TimeRange>(selectedRange);

  useEffect(() => {
    if (!open && !navigationOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, navigationOpen]);

  function href(routes: Route[], range = selectedRange) {
    const params = new URLSearchParams();
    if (routes.length > 0) params.set("ruta", routes.join(","));
    if (range !== "all") params.set("rango", range);
    const basePath = demoMode ? "/demo/explorar" : `/${locale}/explorar`;
    return `${basePath}${params.size ? `?${params.toString()}` : ""}`;
  }

  function applyFilters() {
    setOpen(false);
    startTransition(() => {
      router.push(href(draftRoutes, draftRange));
    });
  }

  function clearFilters() {
    setDraftRoutes([]);
    setDraftRange("all");
  }

  function toggleRoute(route: Route) {
    setDraftRoutes((current) => (current.includes(route) ? current.filter((item) => item !== route) : [...current, route]));
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDraftRoutes(selectedRoutes);
      setDraftRange(selectedRange);
    }
    setOpen(nextOpen);
  }

  const selectedRouteLabel = getSelectedRouteLabel(selectedRoutes, dictionary);
  const activeRangeLabel = dictionary.explore.ranges[selectedRange];

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <StickyUtilityBar>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted">{dictionary.explore.filters.active}</p>
              <p className="truncate text-sm font-semibold">
                {[selectedRouteLabel, activeRangeLabel].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Popover.Root open={navigationOpen} onOpenChange={setNavigationOpen}>
                <Popover.Trigger asChild>
                  <Button aria-label={dictionary.explore.navigation.button} className="min-h-10 px-3 py-2" type="button" variant="secondary">
                    <ListTree aria-hidden="true" className="size-4" />
                    <span className="hidden sm:inline">{dictionary.explore.navigation.button}</span>
                  </Button>
                </Popover.Trigger>
                <Popover.Portal>
                  {navigationOpen ? (
                  <CenteredPopoverPanel closeLabel={dictionary.common.closeMenu} title={dictionary.explore.navigation.title}>
                    <nav aria-label={dictionary.explore.navigation.title} className="mt-4 grid gap-2">
                      {EXPLORE_SECTIONS.map((section) => (
                        <Popover.Close asChild key={section.id}>
                          <a
                            className="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm font-semibold transition duration-200 ease-out hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            href={`#${section.id}`}
                          >
                            {dictionary.explore.modules[section.module]}
                          </a>
                        </Popover.Close>
                      ))}
                    </nav>
                  </CenteredPopoverPanel>
                  ) : null}
                </Popover.Portal>
              </Popover.Root>
              <Popover.Trigger asChild>
                <Button className="min-h-10 px-3 py-2" type="button" variant="secondary">
                  <SlidersHorizontal aria-hidden="true" className="size-4" />
                  {dictionary.explore.filters.button}
                </Button>
              </Popover.Trigger>
            </div>
          </div>
      </StickyUtilityBar>
      <Popover.Portal>
        {open ? (
          <CenteredPopoverPanel closeLabel={dictionary.common.closeMenu} title={dictionary.explore.filters.title} widthClass="w-[min(calc(100vw-2rem),24rem)]">

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-muted">{dictionary.explore.filters.range}</p>
              <div className="flex flex-wrap items-stretch gap-1.5">
                {TIME_RANGES.map((range) => (
                  <button
                    aria-pressed={draftRange === range}
                    className={rangeClass(draftRange === range)}
                    key={range}
                    onClick={() => setDraftRange(range)}
                    type="button"
                  >
                    {dictionary.explore.ranges[range]}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold text-muted">{dictionary.explore.filters.route}</p>
              <div className="flex flex-wrap items-stretch gap-1.5">
                <button className={allRoutesClass(draftRoutes.length === 0)} onClick={() => setDraftRoutes([])} type="button">
                  {dictionary.explore.allRoutes}
                </button>
                {ROUTES.map((route) => (
                  <RouteSwatch active={draftRoutes.includes(route)} label={ROUTE_LABELS[route]} route={route} onClick={() => toggleRoute(route)} key={route} />
                ))}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-[auto_1fr] gap-2">
              <Button disabled={isPending} onClick={clearFilters} type="button" variant="secondary">
                {dictionary.explore.filters.clear}
              </Button>
              <Button disabled={isPending} onClick={applyFilters} type="button">
                {isPending ? dictionary.explore.filters.applying : dictionary.explore.filters.apply}
              </Button>
            </div>
          </CenteredPopoverPanel>
        ) : null}
      </Popover.Portal>
    </Popover.Root>
  );
}

const EXPLORE_SECTIONS = [
  { id: "report-volume", module: "volume" },
  { id: "problems", module: "problems" },
  { id: "categories", module: "categories" },
  { id: "trend", module: "trend" },
  { id: "worst-units", module: "worstUnits" },
  { id: "unit-explorer", module: "unitExplorer" },
  { id: "route-details", module: "routeDetails" },
] as const;

function RouteSwatch({
  active,
  label,
  route,
  onClick,
}: {
  active: boolean;
  label: string;
  route?: Route;
  onClick: () => void;
}) {
  const routeColor = route ? ROUTE_COLORS[route] : null;
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "filter-swatch filter-swatch-text selection-flow flex items-center justify-center gap-1 rounded-md border px-2 py-1 font-bold transition duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
        active ? "border-transparent" : "border-border bg-surface-raised text-foreground hover:bg-surface",
      )}
      onClick={onClick}
      style={
        active && routeColor
          ? {
              background: routeColor.fill,
              color: routeColor.textOnFill,
            }
          : undefined
      }
      type="button"
    >
      {routeColor ? (
        <span
          aria-hidden="true"
          className={cn("rounded-full transition duration-200 ease-out", active ? "size-2 bg-white" : "size-1.5")}
          style={!active ? { background: routeColor.fill } : undefined}
        />
      ) : null}
      {label}
    </button>
  );
}

function allRoutesClass(selected: boolean) {
  return cn(
    "filter-swatch filter-swatch-text flex items-center justify-center rounded-md border px-2 py-1 font-semibold transition duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    selected ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-border bg-surface-raised text-muted hover:bg-surface hover:text-foreground",
  );
}

function rangeClass(selected: boolean) {
  return cn(
    "filter-swatch filter-swatch-text rounded-md border px-2 py-1 font-semibold transition duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    selected ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-border bg-surface-raised text-muted hover:text-foreground",
  );
}

function getSelectedRouteLabel(selectedRoutes: Route[], dictionary: Dictionary) {
  if (selectedRoutes.length === 0) return dictionary.explore.allRoutes;
  if (selectedRoutes.length <= 3) return selectedRoutes.map((route) => ROUTE_LABELS[route]).join(", ");
  return dictionary.explore.filters.routeCount.replace("{count}", String(selectedRoutes.length));
}
