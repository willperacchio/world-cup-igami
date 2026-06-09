import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f0d] text-white px-6">
      <div className="text-center max-w-md space-y-4">
        <h1 className="font-display text-6xl font-bold text-amber-400">404</h1>
        <h2 className="text-xl font-semibold">Page not found</h2>
        <p className="text-stone-400 text-sm">
          This scoreline has never happened — and neither has this page.
        </p>
        <Link
          href="/"
          className="inline-block mt-4 px-5 py-2.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors text-sm font-medium"
        >
          Back to the heatmap
        </Link>
      </div>
    </div>
  );
}
