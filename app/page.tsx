import Link from "next/link";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <main className="flex flex-col items-center text-center max-w-2xl w-full gap-12">
        <h1 className="font-display text-money text-[clamp(3.5rem,12vw,9rem)] animate-rise-in">
          JEOPARDY!
        </h1>
        <p className="text-xl md:text-2xl text-white/90 max-w-md">
          The live quiz show — grab your phone and buzz in
        </p>

        <div className="flex flex-col sm:flex-row gap-6 w-full max-w-md">
          <Link
            href="/join"
            className="flex-1 btn btn-gold py-6 px-8 text-xl font-bold"
          >
            Join a Game
          </Link>
          <Link
            href="/new"
            className="flex-1 btn btn-blue py-6 px-8 text-xl font-bold"
          >
            Host a New Game
          </Link>
        </div>
      </main>
    </div>
  );
}