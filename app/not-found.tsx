import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center space-y-8 max-w-2xl">
        <div className="space-y-4">
          <div className="font-display text-money text-[clamp(5rem,15vw,10rem)] leading-none">
            £404
          </div>
          <h1 className="font-display text-4xl text-white">Game not found</h1>
          <p className="text-xl text-white/60">
            This game doesn&apos;t exist or has been deleted.
          </p>
        </div>

        <Link
          href="/"
          className="btn btn-gold px-8 py-4 text-xl font-bold"
        >
          Go to homepage
        </Link>
      </div>
    </div>
  );
}