"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f0d] text-white px-6">
      <div className="text-center max-w-md space-y-4">
        <h1 className="font-display text-5xl font-bold text-red-400">Offside!</h1>
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-stone-400 text-sm">
          An unexpected error occurred. The ref is reviewing the play.
        </p>
        <button
          onClick={reset}
          className="inline-block mt-4 px-5 py-2.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors text-sm font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
