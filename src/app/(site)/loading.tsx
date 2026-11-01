export default function Loading() {
  return (
    <div role="status" aria-label="Loading page" className="mx-auto min-h-[65vh] max-w-site px-4 pt-28 pb-16 sm:px-6">
      <div className="motion-safe:animate-pulse">
        <div className="mb-5 h-3 w-28 rounded-full bg-line/60" />
        <div className="h-12 w-2/3 max-w-lg rounded-xl bg-line/50" />
        <div className="mt-8 h-60 rounded-2xl bg-line/30 sm:h-80" />
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-line/30" />)}
        </div>
      </div>
      <span className="sr-only">Loading page…</span>
    </div>
  );
}
