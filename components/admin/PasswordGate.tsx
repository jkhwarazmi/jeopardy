"use client";

import { useState } from "react";

interface PasswordGateProps {
  onSubmit: (password: string) => void;
}

export default function PasswordGate({ onSubmit }: PasswordGateProps) {
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onSubmit(password.trim());
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-display text-4xl text-jeopardy-gold">
            Admin Control
          </h1>
          <p className="text-white/70">Enter the admin password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-jeopardy-blue-dark rounded-lg p-6 space-y-4">
            <label className="block">
              <span className="text-white font-semibold mb-2 block">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-jeopardy-dark text-white rounded border-2 border-jeopardy-blue focus:border-jeopardy-gold focus:outline-none"
                placeholder="Enter admin password"
                required
                autoFocus
              />
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-jeopardy-gold hover:bg-jeopardy-gold-dark text-jeopardy-dark font-bold text-xl py-4 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-jeopardy-gold/50"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
