"use client";

import { useState } from "react";

interface PasswordGateProps {
  onSubmit: (password: string) => void;
}

export default function PasswordGate({ onSubmit }: PasswordGateProps) {
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password.trim()) {
      onSubmit(password.trim());
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-display text-money text-4xl">
            Admin Control
          </h1>
          <p className="text-white/70">Enter the admin password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card p-6 space-y-4">
            <label className="block">
              <span className="text-white font-semibold mb-2 block">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input w-full"
                placeholder="Enter admin password"
                required
                autoFocus
              />
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-lg btn-gold w-full"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}