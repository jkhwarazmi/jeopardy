"use client";

import { useState, useRef, useEffect } from "react";
import { blobToSelfieDataUrl, canvasToSelfieDataUrl } from "@/lib/selfie";

interface SelfieCaptureProps {
  onCapture: (photoBase64: string) => void;
  skipLabel?: string;
  onCancel?: () => void;
}

export default function SelfieCapture({ onCapture, skipLabel = "Continue without photo", onCancel }: SelfieCaptureProps) {
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [preview, setPreview] = useState<string | null>(null);
  /** How the current preview was produced — drives the redo-button labels. */
  const [source, setSource] = useState<"camera" | "upload" | null>(null);
  const [error, setError] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Camera lifecycle: acquire stream when mode=camera and no preview; cleanup stops tracks
  useEffect(() => {
    if (mode !== "camera" || preview !== null) return;

    let mounted = true;
    let effectStream: MediaStream | null = null;

    const initCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });

        if (!mounted) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        effectStream = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setError("");
      } catch (err) {
        console.error("Camera error:", err);
        setError("Camera unavailable. Please use upload instead.");
        setMode("upload");
      }
    };

    initCamera();

    return () => {
      mounted = false;
      if (effectStream) {
        effectStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [mode, preview]);

  const handleSnap = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas to square dimensions (256x256 for preview)
    const size = 256;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Calculate crop to center square
    const videoAspect = video.videoWidth / video.videoHeight;
    let sx = 0;
    let sy = 0;
    let sWidth = video.videoWidth;
    let sHeight = video.videoHeight;

    if (videoAspect > 1) {
      // Landscape: crop sides
      sWidth = video.videoHeight;
      sx = (video.videoWidth - sWidth) / 2;
    } else {
      // Portrait: crop top/bottom
      sHeight = video.videoWidth;
      sy = (video.videoHeight - sHeight) / 2;
    }

    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, size, size);

    const dataUrl = canvasToSelfieDataUrl(canvas);
    setSource("camera");
    setPreview(dataUrl);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await blobToSelfieDataUrl(file);
      setSource("upload");
      setPreview(dataUrl);
      setError("");
    } catch (err) {
      setError("Failed to process image: " + (err instanceof Error ? err.message : "unknown"));
    }
  };

  const handleRetake = () => {
    setError("");
    setPreview(null);
    setMode("camera");
  };

  const handleUploadInstead = () => {
    setPreview(null);
    setMode("upload");
  };

  const handleUse = () => {
    if (preview) {
      onCapture(preview);
    }
  };

  if (preview) {
    return (
      <div className="space-y-4">
        <div className="flex justify-center">
          <img
            src={preview}
            alt="Your selfie"
            className="w-64 h-64 rounded-2xl border-2 border-jeopardy-gold object-cover"
          />
        </div>
        <div className="flex gap-3">
          {source === "upload" ? (
            <>
              <button
                onClick={handleUploadInstead}
                className="btn btn-ghost flex-1"
              >
                Choose Different
              </button>
              <button
                onClick={handleRetake}
                className="btn btn-ghost flex-1"
              >
                Use Camera
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleRetake}
                className="btn btn-ghost flex-1"
              >
                Retake
              </button>
              <button
                onClick={handleUploadInstead}
                className="btn btn-ghost flex-1"
              >
                Upload Instead
              </button>
            </>
          )}
        </div>
        <button
          onClick={handleUse}
          className="btn btn-gold w-full"
        >
          Use This Photo
        </button>
        <button
          onClick={() => onCapture("")}
          className="w-full py-2 text-white/70 hover:text-white transition-colors text-sm"
        >
          {skipLabel}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full py-2 text-white/70 hover:text-white transition-colors text-sm"
          >
            Cancel
          </button>
        )}
      </div>
    );
  }

  if (mode === "camera" && !error) {
    return (
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-2xl">
          <div className="w-64 h-64 mx-auto relative overflow-hidden rounded-2xl border-2 border-jeopardy-gold">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            />
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <button
          onClick={handleSnap}
          className="btn btn-gold w-full"
        >
          Snap
        </button>

        <button
          onClick={() => setMode("upload")}
          className="btn btn-ghost w-full"
        >
          Upload a photo instead
        </button>

        <button
          onClick={() => onCapture("")}
          className="w-full py-2 text-white/70 hover:text-white transition-colors text-sm"
        >
          {skipLabel}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full py-2 text-white/70 hover:text-white transition-colors text-sm"
          >
            Cancel
          </button>
        )}
      </div>
    );
  }

  // Upload mode or camera error fallback
  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-yellow-900/50 border-2 border-yellow-500 text-yellow-200 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <div className="text-center">
        <label className="block">
          <span className="text-white font-semibold mb-3 block">
            Choose a photo
          </span>
          <input
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleFileUpload}
            className="w-full text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-jeopardy-gold file:text-jeopardy-dark file:font-semibold hover:file:bg-jeopardy-gold-dark file:cursor-pointer file:transition-colors"
          />
        </label>
      </div>

      {!error && (
        <button
          onClick={() => setMode("camera")}
          className="btn btn-ghost w-full"
        >
          Use camera instead
        </button>
      )}

      <button
        onClick={() => onCapture("")}
        className="w-full py-2 text-white/70 hover:text-white transition-colors text-sm"
      >
        {skipLabel}
      </button>
      {onCancel && (
        <button
          onClick={onCancel}
          className="w-full py-2 text-white/70 hover:text-white transition-colors text-sm"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
