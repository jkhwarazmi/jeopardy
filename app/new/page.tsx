"use client";

import { useState, useRef, useEffect } from "react";
import QRCode from "qrcode";
import type { CreateGameRequest, CreateGameResponse } from "@/lib/types";
import sampleGame from "@/sample-game.json";

export default function NewGamePage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [configText, setConfigText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{
    gameId: string;
    joinCode: string;
  } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending copied-feedback timer on unmount
  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  // Generate QR code when game is created
  useEffect(() => {
    if (!created) return;

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const playUrl = `${origin}/play/${created.gameId}`;

    QRCode.toDataURL(playUrl, {
      width: 512,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(""));
  }, [created]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setConfigText(text);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setConfigText(JSON.stringify(sampleGame, null, 2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    if (!configText.trim()) {
      setError("Game configuration is required");
      return;
    }

    let config: unknown;
    try {
      config = JSON.parse(configText);
    } catch (err) {
      setError("Invalid JSON: " + (err instanceof Error ? err.message : "parse error"));
      return;
    }

    setLoading(true);
    try {
      const req: CreateGameRequest = { password, config };
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });

      const data: CreateGameResponse = await res.json();

      if (!data.ok || !data.gameId || !data.joinCode) {
        setError(data.error || "Failed to create game");
        return;
      }

      setCreated({ gameId: data.gameId, joinCode: data.joinCode });
    } catch (err) {
      setError("Network error: " + (err instanceof Error ? err.message : "unknown"));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopiedKey(null), 1500);
  };

  if (created) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const hostUrl = `${origin}/host/${created.gameId}`;
    const adminUrl = `${origin}/admin/${created.gameId}`;
    const playUrl = `${origin}/play/${created.gameId}`;

    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="bg-jeopardy-blue-dark rounded-lg p-8 max-w-2xl w-full space-y-6">
          <h1 className="font-display text-4xl text-jeopardy-gold text-center">
            Game Created!
          </h1>

          {qrDataUrl && (
            <div className="flex flex-col items-center">
              <div className="bg-white p-3 rounded-lg">
                <img
                  src={qrDataUrl}
                  alt="QR code to join"
                  className="w-40 h-40 mx-auto"
                />
              </div>
              <p className="text-white/70 text-sm mt-2">Scan to join</p>
            </div>
          )}

          <div className="bg-jeopardy-dark rounded p-6 text-center">
            <p className="text-white/70 text-sm mb-2">Join Code</p>
            <div className="flex items-center justify-center gap-4">
              <p className="font-display text-5xl text-jeopardy-gold tracking-widest">
                {created.joinCode}
              </p>
              <button
                onClick={() => copyToClipboard(created.joinCode, "code")}
                className="px-3 py-1 bg-jeopardy-blue hover:bg-jeopardy-blue-dark text-white text-sm rounded transition-colors whitespace-nowrap"
              >
                {copiedKey === "code" ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-jeopardy-gold font-semibold text-sm">
              Save these links — especially the admin one:
            </p>

            <LinkCard
              label="Host Board (for laptop/screen share)"
              url={hostUrl}
              onCopy={() => copyToClipboard(hostUrl, "host")}
              copied={copiedKey === "host"}
            />
            <LinkCard
              label="Admin Panel (your phone)"
              url={adminUrl}
              onCopy={() => copyToClipboard(adminUrl, "admin")}
              copied={copiedKey === "admin"}
            />
            <LinkCard
              label="Player Join Link"
              url={playUrl}
              onCopy={() => copyToClipboard(playUrl, "play")}
              copied={copiedKey === "play"}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-start px-6 py-12 overflow-y-auto">
      <div className="w-full max-w-2xl space-y-8">
        <h1 className="font-display text-4xl md:text-5xl text-jeopardy-gold text-center">
          Create New Game
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-jeopardy-blue-dark rounded-lg p-6 space-y-4">
            <label className="block">
              <span className="text-white font-semibold mb-2 block">
                Admin Password
              </span>
              <div className="flex gap-2">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 px-4 py-3 bg-jeopardy-dark text-white rounded border-2 border-jeopardy-blue focus:border-jeopardy-gold focus:outline-none"
                  placeholder="Minimum 4 characters"
                  required
                  minLength={4}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-4 py-3 bg-jeopardy-blue hover:bg-jeopardy-blue-dark text-white rounded transition-colors"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <div>
              <p className="text-white font-semibold mb-2">Game Configuration</p>
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="px-4 py-2 bg-jeopardy-gold hover:bg-jeopardy-gold-dark text-jeopardy-dark font-semibold rounded transition-colors text-sm"
                >
                  Load Sample Game
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-jeopardy-blue hover:bg-jeopardy-blue-dark text-white rounded transition-colors text-sm"
                >
                  Upload JSON File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              <textarea
                value={configText}
                onChange={(e) => setConfigText(e.target.value)}
                className="w-full h-64 px-4 py-3 bg-jeopardy-dark text-white rounded border-2 border-jeopardy-blue focus:border-jeopardy-gold focus:outline-none font-mono text-sm"
                placeholder="Paste game config JSON or use buttons above..."
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-900/50 border-2 border-red-500 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-jeopardy-gold hover:bg-jeopardy-gold-dark disabled:bg-gray-600 text-jeopardy-dark font-bold text-xl py-4 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-jeopardy-gold/50"
          >
            {loading ? "Creating..." : "Create Game"}
          </button>
        </form>
      </div>
    </div>
  );
}

function LinkCard({
  label,
  url,
  onCopy,
  copied,
}: {
  label: string;
  url: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="bg-jeopardy-dark rounded p-4">
      <p className="text-white/70 text-xs mb-1">{label}</p>
      <div className="flex gap-2 items-center">
        <p className="flex-1 text-white text-sm font-mono truncate">{url}</p>
        <button
          onClick={onCopy}
          className="px-3 py-1 bg-jeopardy-blue hover:bg-jeopardy-blue-dark text-white text-sm rounded transition-colors whitespace-nowrap"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
