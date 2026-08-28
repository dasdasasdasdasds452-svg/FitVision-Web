import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background-dark text-slate-100 font-sans p-4">
      <h1 className="text-9xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-b from-primary to-green-800 drop-shadow-[0_0_15px_rgba(57,255,20,0.5)] mb-4">
        404
      </h1>
      <div className="flex items-center gap-3 mb-8">
        <span className="material-symbols-outlined text-primary text-2xl">
          search_off
        </span>
        <h2 className="text-2xl font-bold text-white">Page not found</h2>
      </div>
      <p className="text-slate-400 mb-8 max-w-md text-center">
        The page you are looking for has been spotted doing cardio outside the Matrix. 
        Let's get you back to lifting.
      </p>
      
      <Link 
        href="/"
        className="px-8 py-3 bg-primary text-black font-bold rounded-xl hover:bg-white hover:scale-105 transition-all shadow-neon flex items-center gap-2"
      >
        <span className="material-symbols-outlined text-sm">dashboard</span>
        Back to Dashboard
      </Link>
    </div>
  );
}
