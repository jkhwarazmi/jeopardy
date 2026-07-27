import Link from "next/link";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <main className="flex flex-col items-center text-center max-w-2xl w-full gap-12">
        <h1 className="font-display text-6xl md:text-8xl text-jeopardy-gold tracking-wider">
          JEOPARDY!
        </h1>
        <p className="text-xl md:text-2xl text-white/90 max-w-md">
          Real-time icebreaker game
        </p>

        <div className="flex flex-col sm:flex-row gap-6 w-full max-w-md">
          <Link
            href="/join"
            className="flex-1 bg-jeopardy-gold hover:bg-jeopardy-gold-dark text-jeopardy-dark font-bold text-xl py-6 px-8 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-jeopardy-gold/50"
          >
            Join a Game
          </Link>
          <Link
            href="/new"
            className="flex-1 bg-jeopardy-blue hover:bg-jeopardy-blue-dark text-white font-bold text-xl py-6 px-8 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-jeopardy-blue/50"
          >
            Host a New Game
          </Link>
        </div>
      </main>
    </div>
  );
}
