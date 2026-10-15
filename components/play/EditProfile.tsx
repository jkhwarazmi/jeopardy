"use client";

import { useState } from "react";
import type { Player } from "@/lib/types";
import PlayerAvatar from "@/components/shared/PlayerAvatar";
import SelfieCapture from "./SelfieCapture";

interface EditProfileProps {
  self: Player;
  onSave: (updates: { name?: string; photoBase64?: string }) => Promise<void>;
  onClose: () => void;
}

export default function EditProfile({ self, onSave, onClose }: EditProfileProps) {
  const [name, setName] = useState(self.name);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [showSelfieCapture, setShowSelfieCapture] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const currentPhoto = pendingPhoto !== null ? pendingPhoto : self.photoBase64;
  const hasPhoto = currentPhoto !== "";

  const handleSave = async () => {
    const trimmedName = name.trim();
    const updates: { name?: string; photoBase64?: string } = {};

    // blank name means keep the current one
    if (trimmedName.length > 0 && trimmedName !== self.name) {
      updates.name = trimmedName;
    }

    if (pendingPhoto !== null && pendingPhoto !== self.photoBase64) {
      updates.photoBase64 = pendingPhoto;
    }

    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSave(updates);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePhoto = () => {
    setShowSelfieCapture(true);
  };

  const handleRemovePhoto = () => {
    setPendingPhoto("");
  };

  const handleSelfieCapture = (photoBase64: string) => {
    setPendingPhoto(photoBase64);
    setShowSelfieCapture(false);
  };

  const handleCancelSelfie = () => {
    setShowSelfieCapture(false);
  };

  if (showSelfieCapture) {
    return (
      <div className="card p-6 max-w-md w-full">
        <h2 className="font-display text-jeopardy-gold text-2xl mb-6 text-center uppercase">
          Change Photo
        </h2>
        <SelfieCapture
          skipLabel="Remove photo"
          onCapture={handleSelfieCapture}
          onCancel={handleCancelSelfie}
        />
      </div>
    );
  }

  return (
    <div className="card p-6 max-w-md w-full space-y-6">
      <h2 className="font-display text-jeopardy-gold text-2xl text-center uppercase">
        Edit Profile
      </h2>

      {error && (
        <div className="bg-red-900/50 border-2 border-red-500 text-red-200 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block">
          <span className="text-white font-semibold mb-2 block">Your Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input w-full"
            placeholder="Enter your name"
            required
            maxLength={30}
            disabled={saving}
          />
        </label>
      </div>

      <div>
        <span className="text-white font-semibold mb-3 block">Your Photo</span>
        <div className="flex items-center gap-4">
          <PlayerAvatar
            player={{ name: self.name, photoBase64: currentPhoto }}
            size="lg"
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleChangePhoto}
              disabled={saving}
              className="btn btn-sm btn-ghost"
            >
              Change Photo
            </button>
            {hasPhoto && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={saving}
                className="btn btn-sm btn-ghost"
              >
                Remove Photo
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="btn btn-ghost flex-1"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn btn-gold flex-1"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
