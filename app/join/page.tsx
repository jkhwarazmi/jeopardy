"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCodeChange = (value: string) => {
    const upper = value.toUpperCase().slice(0, 6);
    setCode(upper);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (code.length !== 6) {
      setError("Enter a 6-character code");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/games/lookup?code=${encodeURIComponent(code)}`);

      if (!res.ok) {
        if (res.status === 404) {
          setError("Game not found. Check the code and try again.");
        } else {
          setError("Unable to find game. Please try again.");
        }
        return;
      }

      const data = await res.json();
      if (data.gameId) {
        router.push(`/play/${data.gameId}`);
      } else {
        setError("Invalid response from server");
      }
    } catch (err) {
      setError("Network error: " + (err instanceof Error ? err.message : "unknown"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        <h1 className="font-display text-money text-4xl md:text-5xl text-center">
          Join Game
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card p-6 space-y-4">
            <label className="block">
              <span className="text-white font-semibold mb-3 block text-center">
                Enter Game Code
              </span>
              <input
                type="text"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                className="input w-full py-6 text-center font-display text-4xl tracking-widest uppercase"
                placeholder="ABCDEF"
                maxLength={6}
                required
              />
            </label>
          </div>

          {error && (
            <div className="bg-red-900/50 border-2 border-red-500 text-red-200 px-4 py-3 rounded-lg text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="btn btn-gold w-full py-4 text-xl font-bold"
          >
            {loading ? "Joining..." : "Join Game"}
          </button>
        </form>
      </div>
    </div>
  );
}