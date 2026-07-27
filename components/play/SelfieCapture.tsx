"use client";

import { useState, useRef, useEffect } from "react";
import { blobToSelfieDataUrl, canvasToSelfieDataUrl } from "@/lib/selfie";

interface SelfieCaptureProps {
  onCapture: (photoBase64: string) => void;
}

export default function SelfieCapture({ onCapture }: SelfieCaptureProps) {
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [preview, setPreview] = useState<string | null>(null);
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
    setPreview(dataUrl);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await blobToSelfieDataUrl(file);
      setPreview(dataUrl);
      setError("");
    } catch (err) {
      setError("Failed to process image: " + (err instanceof Error ? err.message : "unknown"));
    }
  };

  const handleRetake = () => {
    setPreview(null);
    if (!error) {
      setMode("camera");
    }
  };

  const handleUse = () => {
    if (preview) {
      onCapture(preview);
    }
  };

  if (preview) {
    return (
      <div className="space-y-4">
        <div className="bg-jeopardy-blue-dark rounded-lg p-4">
          <img
            src={preview}
            alt="Your selfie"
            className="w-64 h-64 mx-auto rounded-lg border-4 border-jeopardy-gold object-cover"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRetake}
            className="flex-1 py-3 bg-jeopardy-blue hover:bg-jeopardy-blue-dark text-white font-semibold rounded-lg transition-colors"
          >
            Retake
          </button>
          <button
            onClick={handleUse}
            className="flex-1 py-3 bg-jeopardy-gold hover:bg-jeopardy-gold-dark text-jeopardy-dark font-bold rounded-lg transition-colors"
          >
            Use This Photo
          </button>
        </div>
        <button
          onClick={() => onCapture("")}
          className="w-full py-2 text-white/70 hover:text-white transition-colors text-sm"
        >
          Continue without photo
        </button>
      </div>
    );
  }

  if (mode === "camera" && !error) {
    return (
      <div className="space-y-4">
        <div className="bg-jeopardy-blue-dark rounded-lg p-4 relative overflow-hidden">
          <div className="w-64 h-64 mx-auto relative overflow-hidden rounded-lg">
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
          className="w-full py-4 bg-jeopardy-gold hover:bg-jeopardy-gold-dark text-jeopardy-dark font-bold text-lg rounded-lg transition-colors"
        >
          Snap
        </button>

        <button
          onClick={() => setMode("upload")}
          className="w-full py-2 text-white/70 hover:text-white transition-colors text-sm"
        >
          Upload a photo instead
        </button>

        <button
          onClick={() => onCapture("")}
          className="w-full py-2 text-white/70 hover:text-white transition-colors text-sm"
        >
          Continue without photo
        </button>
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

      <div className="bg-jeopardy-blue-dark rounded-lg p-6">
        <label className="block">
          <span className="text-white font-semibold mb-3 block text-center">
            Choose a photo
          </span>
          <input
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleFileUpload}
            className="w-full text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-jeopardy-gold file:text-jeopardy-dark file:font-semibold hover:file:bg-jeopardy-gold-dark file:cursor-pointer"
          />
        </label>
      </div>

      {!error && (
        <button
          onClick={() => setMode("camera")}
          className="w-full py-2 text-white/70 hover:text-white transition-colors text-sm"
        >
          Use camera instead
        </button>
      )}

      <button
        onClick={() => onCapture("")}
        className="w-full py-2 text-white/70 hover:text-white transition-colors text-sm"
      >
        Continue without photo
      </button>
    </div>
  );
}
