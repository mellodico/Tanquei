/** Esqueleto da lista e do mapa enquanto os postos carregam, no mesmo formato do conteúdo final. */
export function StationsSkeleton() {
  return (
    <div className="motion-safe:animate-pulse" role="status" aria-label="Carregando postos de combustível">
      <div className="mb-4 h-14 rounded-2xl bg-card" />
      <div className="mb-8 h-10 w-full max-w-md rounded-full bg-card" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="mb-4 h-7 w-48 rounded-lg bg-muted" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl bg-card p-5">
              <div className="mb-3 h-5 w-2/3 rounded bg-muted" />
              <div className="mb-5 h-4 w-5/6 rounded bg-muted" />
              <div className="flex items-end justify-between">
                <div className="h-9 w-28 rounded-lg bg-muted" />
                <div className="h-9 w-32 rounded-full bg-muted" />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden h-[600px] rounded-2xl bg-card lg:block" />
      </div>
    </div>
  );
}
