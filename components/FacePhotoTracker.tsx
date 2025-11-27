import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useGazeTracking, GAZE_CONFIG } from "../hooks/useGazeTracking";
import { FACE_ASSETS_URL } from "../constants";

interface FacePhotoTrackerProps {
  basePath?: string; // Path to faces folder (default: "/faces/")
  className?: string;
  width?: number;
  height?: number;
  showDebug?: boolean; // Show gaze coordinates overlay
  fallbackImage?: string; // Image to show when faces aren't available
}

/**
 * FacePhotoTracker - AI-powered gaze-tracking face component
 *
 * Displays pre-generated face images that follow the user's cursor or device orientation.
 * Based on: https://github.com/kylan02/face_looker
 *
 * Usage:
 * 1. Generate face images using Replicate's expression-editor model
 * 2. Place images in /public/faces/ with naming: gaze_px{X}_py{Y}_256.webp
 * 3. Use this component to display the interactive face
 */
const FacePhotoTracker: React.FC<FacePhotoTrackerProps> = ({
  basePath = FACE_ASSETS_URL,
  className = "",
  width = 128,
  height = 176,
  showDebug = false,
  fallbackImage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // Track the last successfully loaded image to prevent black flashes
  const [displayedImage, setDisplayedImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const preloadingRef = useRef<HTMLImageElement | null>(null);

  const { px, py, imagePath, isLoading, hasImages } = useGazeTracking(
    containerRef,
    { basePath, smoothing: 0.2 }
  );

  // Preload new image before switching - prevents black flash
  useEffect(() => {
    if (!imagePath || !hasImages) return;

    // If this is the first image, load it directly
    if (!displayedImage) {
      const img = new Image();
      img.onload = () => setDisplayedImage(imagePath);
      img.onerror = () => {
        // On error, try fallback
        if (fallbackImage) setDisplayedImage(fallbackImage);
      };
      img.src = imagePath;
      return;
    }

    // For subsequent images, preload before switching
    if (imagePath !== displayedImage) {
      setIsTransitioning(true);

      // Cancel previous preload
      if (preloadingRef.current) {
        preloadingRef.current.onload = null;
        preloadingRef.current.onerror = null;
      }

      const img = new Image();
      preloadingRef.current = img;

      img.onload = () => {
        setDisplayedImage(imagePath);
        setIsTransitioning(false);
      };
      img.onerror = () => {
        // Keep current image on error, don't go black
        setIsTransitioning(false);
      };
      img.src = imagePath;
    }
  }, [imagePath, hasImages, displayedImage, fallbackImage]);

  // Show fallback when images aren't available
  if (!hasImages && !isLoading) {
    return (
      <FallbackDisplay
        containerRef={containerRef}
        className={className}
        width={width}
        height={height}
        fallbackImage={fallbackImage}
        showDebug={showDebug}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Loading state - only show on initial load */}
      {isLoading && !displayedImage && (
        <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center z-10">
          <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Main face image - always visible once loaded */}
      {displayedImage && (
        <img
          src={displayedImage}
          alt="Interactive face"
          className="w-full h-full object-cover"
          draggable={false}
          style={{ userSelect: "none", pointerEvents: "none" }}
        />
      )}

      {/* Fallback if no image loaded yet */}
      {!displayedImage && fallbackImage && !isLoading && (
        <img
          src={fallbackImage}
          alt="Profile"
          className="w-full h-full object-cover"
        />
      )}

      {/* Debug overlay */}
      {showDebug && (
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-mono z-20">
          <div>px: {px}</div>
          <div>py: {py}</div>
          <div className="text-[10px] text-white/60 mt-1">
            {GAZE_CONFIG.getImageFilename(px, py)}
          </div>
          {isTransitioning && (
            <div className="text-yellow-400 text-[10px]">loading...</div>
          )}
        </div>
      )}

      {/* Subtle shine overlay for depth effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ mixBlendMode: "soft-light" }}
        animate={{
          background: `linear-gradient(
            ${135 + (px / 15) * 45}deg,
            transparent 30%,
            rgba(255,255,255,0.15) 50%,
            transparent 70%
          )`,
        }}
        transition={{ duration: 0.1 }}
      />
    </div>
  );
};

/**
 * Fallback display when face images aren't available
 * Shows a static image with subtle CSS rotation effect
 */
const FallbackDisplay: React.FC<{
  containerRef: React.RefObject<HTMLDivElement>;
  className: string;
  width: number;
  height: number;
  fallbackImage?: string;
  showDebug?: boolean;
}> = ({ containerRef, className, width, height, fallbackImage, showDebug }) => {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const rotateY = ((event.clientX - centerX) / window.innerWidth) * 15;
      const rotateX = ((event.clientY - centerY) / window.innerHeight) * -10;

      setRotation({ x: rotateX, y: rotateY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [containerRef]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height, perspective: 600 }}
    >
      <motion.div
        className="w-full h-full"
        animate={{
          rotateX: rotation.x,
          rotateY: rotation.y,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {fallbackImage ? (
          <img
            src={fallbackImage}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <div className="text-center text-white/80 p-4">
              <svg
                className="w-8 h-8 mx-auto mb-2 opacity-60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <p className="text-[10px] leading-tight">
                Face images
                <br />
                not generated
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Info badge */}
      {showDebug && (
        <div className="absolute bottom-2 left-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded font-mono">
          <div className="text-yellow-400">⚠ Faces not found</div>
          <div className="text-white/60 mt-0.5">
            Add images to /public/faces/
          </div>
        </div>
      )}

      {/* Subtle shine */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(
            ${135 + rotation.y * 3}deg,
            transparent 40%,
            rgba(255,255,255,0.1) 50%,
            transparent 60%
          )`,
          mixBlendMode: "overlay",
        }}
      />
    </div>
  );
};

export default FacePhotoTracker;
