export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="md:ml-64 px-4 md:px-10 pt-6 max-w-6xl flex flex-col gap-6 animate-pulse">
      <div className="h-8 w-64 max-w-full rounded-lg bg-white/[0.06]" />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-6">
        <div className="h-80 rounded-3xl bg-white/[0.04] border border-white/5" />
        <div className="flex flex-col gap-6">
          <div className="h-36 rounded-3xl bg-white/[0.04] border border-white/5" />
          <div className="h-36 rounded-3xl bg-white/[0.04] border border-white/5" />
        </div>
      </div>
    </div>
  );
}
