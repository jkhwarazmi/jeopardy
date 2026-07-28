import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-jeopardy-dark px-6">
      <div className="text-center space-y-8 max-w-2xl">
        <div className="space-y-4">
          <div className="font-display text-9xl text-jeopardy-gold leading-none">
            $404
          </div>
          <h1 className="text-4xl font-bold text-white">Game not found</h1>
          <p className="text-xl text-white/70">
            This game doesn&apos;t exist or has been deleted.
          </p>
        </div>

        <Link
          href="/"
          className="inline-block bg-jeopardy-gold hover:bg-jeopardy-gold-dark text-jeopardy-dark font-bold text-xl px-8 py-4 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-jeopardy-gold/50"
        >
          Go to homepage
        </Link>
      </div>
    </div>
  );
}
