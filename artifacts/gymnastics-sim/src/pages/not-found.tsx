import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center">
      <div className="glass-panel p-12 text-center rounded-3xl max-w-md w-full">
        <div className="text-6xl font-display font-bold text-amber-500 mb-4">404</div>
        <h1 className="text-2xl font-bold text-white mb-2">Routine Not Found</h1>
        <p className="mt-2 text-slate-400 mb-8">
          The page you are looking for seems to have stepped out of bounds.
        </p>
        <Link href="/">
          <button className="px-6 py-3 bg-amber-500 text-slate-950 font-bold rounded-xl hover:bg-amber-400 transition-colors uppercase tracking-widest text-sm">
            Return to Podium
          </button>
        </Link>
      </div>
    </div>
  );
}
