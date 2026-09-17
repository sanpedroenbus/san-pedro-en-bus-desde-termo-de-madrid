export default function ExploreLoading() {
  return (
    <main className="min-h-dvh">
      <div className="mx-auto max-w-3xl px-4 pb-5">
        <div className="sticky top-[80px] z-[var(--z-sticky)] -mx-4 px-4 py-3">
          <div className="rounded-lg border border-border bg-[var(--drawer-surface)] px-3 py-2 shadow-[var(--shadow-popover)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[var(--drawer-surface)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="h-3 w-24 animate-pulse rounded-sm bg-surface" />
                <div className="mt-2 h-4 w-32 animate-pulse rounded-sm bg-surface" />
              </div>
              <div className="h-10 w-24 animate-pulse rounded-md bg-surface" />
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="py-6">
          <div className="mx-auto h-8 w-48 animate-pulse rounded-sm bg-surface" />
        </div>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 6 }, (_, index) => (
            <section className="rounded-md border border-border bg-surface-raised p-4" key={index}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="h-5 w-40 animate-pulse rounded-sm bg-surface" />
                  <div className="mt-2 h-3 w-20 animate-pulse rounded-sm bg-surface" />
                </div>
                <div className="size-9 animate-pulse rounded-md bg-surface" />
              </div>
              <div className="h-56 animate-pulse rounded-md bg-surface" />
              <div className="mt-4 h-4 w-2/3 animate-pulse rounded-sm bg-surface" />
            </section>
          ))}
        </div>
        <section className="grid gap-3 pt-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="rounded-md border border-border bg-surface-raised p-4" key={index}>
              <div className="flex items-center justify-between">
                <div className="h-6 w-24 animate-pulse rounded-sm bg-surface" />
                <div className="h-8 w-10 animate-pulse rounded-sm bg-surface" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {Array.from({ length: 2 }, (_, item) => (
                  <div className="h-10 animate-pulse rounded-sm bg-surface" key={item} />
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
