export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-background-dark p-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center mb-8">
        <div className="h-10 w-48 bg-surface-darker rounded-xl"></div>
        <div className="h-10 w-32 bg-surface-darker rounded-full"></div>
      </div>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Video/Camera area) */}
        <div className="lg:col-span-2">
          <div className="w-full aspect-video bg-surface-darker rounded-2xl mb-6 flex items-center justify-center border border-white/5">
             <div className="flex flex-col items-center gap-4">
                <span className="material-symbols-outlined text-primary/30 text-5xl">fitness_center</span>
                <div className="h-4 w-32 bg-surface-dark rounded-full"></div>
             </div>
          </div>
          <div className="flex gap-4">
            <div className="h-14 flex-1 bg-surface-darker rounded-xl border border-white/5"></div>
            <div className="h-14 flex-1 bg-surface-darker rounded-xl border border-white/5"></div>
          </div>
        </div>

        {/* Right Column (Stats area) */}
        <div className="space-y-6">
          <div className="h-32 w-full bg-surface-darker rounded-2xl border border-white/5"></div>
          <div className="h-32 w-full bg-surface-darker rounded-2xl border border-white/5"></div>
          <div className="h-64 w-full bg-surface-darker rounded-2xl border border-white/5"></div>
        </div>
      </div>
    </div>
  );
}
