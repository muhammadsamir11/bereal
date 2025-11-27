import React, { useRef, useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useDeviceOrientation } from "../hooks/useDeviceOrientation";
import { segmentPerson } from "../utils/personSegmentation";

interface DepthPhoto3DProps {
  src: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  tiltIntensity?: number;
  depthIntensity?: number;
  onReady?: () => void;
}

/**
 * 3D Spatial Photo Component
 * Cuts the person from the background and displays them as separate layers
 */
const DepthPhoto3D: React.FC<DepthPhoto3DProps> = ({
  src,
  alt = "Profile photo",
  className = "",
  width = 128,
  height = 176,
  tiltIntensity = 0.8,
  depthIntensity = 1.5,
  onReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [personMask, setPersonMask] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Get device orientation
  const orientation = useDeviceOrientation(containerRef, {
    smoothing: 0.08,
    sensitivity: 2.0,
    enableMouse: true,
  });

  // Generate segmentation and create separated layers
  useEffect(() => {
    let cancelled = false;

    const processImage = async () => {
      try {
        // Get AI segmentation mask
        const mask = await segmentPerson(
          src,
          512,
          Math.round(512 * (height / width))
        );

        if (cancelled) return;

        if (mask) {
          setPersonMask(mask);

          // Create background with person removed (filled/blurred)
          const bgImage = await createBackgroundWithPersonRemoved(src, mask);
          if (!cancelled) {
            setBackgroundImage(bgImage);
          }
        }

        setIsLoaded(true);
        onReady?.();
      } catch (error) {
        console.error("Segmentation error:", error);
        if (!cancelled) {
          setIsLoaded(true);
          onReady?.();
        }
      }
    };

    processImage();
    return () => {
      cancelled = true;
    };
  }, [src, width, height, onReady]);

  // Parallax offsets - person moves forward, background moves back
  const personOffset = useMemo(
    () => ({
      x: orientation.x * 18 * depthIntensity,
      y: orientation.y * 18 * depthIntensity,
    }),
    [orientation.x, orientation.y, depthIntensity]
  );

  const backgroundOffset = useMemo(
    () => ({
      x: orientation.x * -6 * depthIntensity,
      y: orientation.y * -6 * depthIntensity,
    }),
    [orientation.x, orientation.y, depthIntensity]
  );

  // 3D rotation
  const rotateX = -orientation.y * 10 * tiltIntensity;
  const rotateY = orientation.x * 10 * tiltIntensity;

  // Show simple fallback while loading or if no mask
  if (!isLoaded || !personMask) {
    return (
      <motion.div
        ref={containerRef}
        className={`relative overflow-hidden ${className}`}
        style={{ width, height, perspective: 600 }}
      >
        <motion.img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          animate={{
            rotateX: -orientation.y * 8,
            rotateY: orientation.x * 8,
            x: orientation.x * 5,
            y: orientation.y * 5,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        />
        {!isLoaded && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        width,
        height,
        perspective: 800,
        transformStyle: "preserve-3d",
      }}
    >
      {/* Main 3D container */}
      <motion.div
        className="w-full h-full relative"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateX, rotateY }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
          mass: 0.3,
        }}
      >
        {/* BACKGROUND LAYER - Only background, person area filled */}
        <motion.div
          className="absolute inset-0"
          style={{
            transform: "translateZ(-25px)",
            transformOrigin: "center center",
          }}
          animate={{
            x: backgroundOffset.x,
            y: backgroundOffset.y,
            scale: 1.25,
          }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        >
          {backgroundImage ? (
            <img
              src={backgroundImage}
              alt=""
              className="w-full h-full object-cover"
              aria-hidden="true"
            />
          ) : (
            <img
              src={src}
              alt=""
              className="w-full h-full object-cover blur-sm"
              aria-hidden="true"
            />
          )}
        </motion.div>

        {/* PERSON LAYER - Only the person, background is transparent */}
        <motion.div
          className="absolute inset-0"
          style={{
            transform: "translateZ(30px)",
            transformOrigin: "center center",
          }}
          animate={{
            x: personOffset.x,
            y: personOffset.y,
            scale: 1.0,
          }}
          transition={{
            type: "spring",
            stiffness: 350,
            damping: 28,
            mass: 0.4,
          }}
        >
          {/* Canvas with transparent background showing only the person */}
          <PersonCutout src={src} mask={personMask} alt={alt} />
        </motion.div>

        {/* HOLOGRAPHIC SHINE */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: "translateZ(35px)",
            mixBlendMode: "soft-light",
          }}
          animate={{
            background: `linear-gradient(
              ${125 + orientation.x * 70}deg,
              transparent 0%,
              transparent 40%,
              rgba(255,255,255,${0.25 + Math.abs(orientation.x) * 0.2}) 50%,
              transparent 60%,
              transparent 100%
            )`,
          }}
          transition={{ duration: 0.05 }}
        />

        {/* EDGE DEPTH SHADOW */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: "translateZ(32px)",
            boxShadow: `
              inset ${orientation.x * 8}px ${
              orientation.y * 8
            }px 25px rgba(255,255,255,0.12),
              inset ${-orientation.x * 6}px ${
              -orientation.y * 6
            }px 20px rgba(0,0,0,0.2)
            `,
            borderRadius: "inherit",
          }}
        />
      </motion.div>
    </motion.div>
  );
};

/**
 * Create background image with the person area filled/inpainted
 */
async function createBackgroundWithPersonRemoved(
  imageSrc: string,
  maskDataUrl: string
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Load mask
      const maskImg = new Image();
      maskImg.onload = () => {
        // Create mask canvas at same size as image
        const maskCanvas = document.createElement("canvas");
        maskCanvas.width = img.width;
        maskCanvas.height = img.height;
        const maskCtx = maskCanvas.getContext("2d")!;
        maskCtx.drawImage(maskImg, 0, 0, img.width, img.height);

        const maskData = maskCtx.getImageData(0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);

        // Fill person area with blurred/averaged background colors
        const blurRadius = 20;
        const data = imageData.data;
        const mask = maskData.data;

        // First pass: get average background color
        let bgR = 0,
          bgG = 0,
          bgB = 0,
          bgCount = 0;
        for (let i = 0; i < mask.length; i += 4) {
          if (mask[i] < 128) {
            // Background pixel
            bgR += data[i];
            bgG += data[i + 1];
            bgB += data[i + 2];
            bgCount++;
          }
        }
        if (bgCount > 0) {
          bgR = Math.round(bgR / bgCount);
          bgG = Math.round(bgG / bgCount);
          bgB = Math.round(bgB / bgCount);
        }

        // Second pass: for each person pixel, sample from nearby background
        for (let y = 0; y < img.height; y++) {
          for (let x = 0; x < img.width; x++) {
            const idx = (y * img.width + x) * 4;
            const maskValue = mask[idx];

            if (maskValue > 50) {
              // Person pixel - need to fill with background
              // Sample from nearby non-person pixels
              let sumR = 0,
                sumG = 0,
                sumB = 0,
                count = 0;

              for (let dy = -blurRadius; dy <= blurRadius; dy++) {
                for (let dx = -blurRadius; dx <= blurRadius; dx++) {
                  const nx = x + dx;
                  const ny = y + dy;
                  if (nx >= 0 && nx < img.width && ny >= 0 && ny < img.height) {
                    const nIdx = (ny * img.width + nx) * 4;
                    if (mask[nIdx] < 50) {
                      // Background pixel
                      const dist = Math.sqrt(dx * dx + dy * dy);
                      const weight = 1 / (1 + dist * 0.5);
                      sumR += data[nIdx] * weight;
                      sumG += data[nIdx + 1] * weight;
                      sumB += data[nIdx + 2] * weight;
                      count += weight;
                    }
                  }
                }
              }

              if (count > 0) {
                data[idx] = Math.round(sumR / count);
                data[idx + 1] = Math.round(sumG / count);
                data[idx + 2] = Math.round(sumB / count);
              } else {
                // Fallback to average background color
                data[idx] = bgR;
                data[idx + 1] = bgG;
                data[idx + 2] = bgB;
              }
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);

        // Apply blur to smooth the filled areas
        ctx.filter = "blur(8px)";
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = "none";

        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      maskImg.src = maskDataUrl;
    };

    img.src = imageSrc;
  });
}

/**
 * Component that renders only the person with transparent background
 */
function PersonCutout({
  src,
  mask,
  alt,
}: {
  src: string;
  mask: string;
  alt: string;
}) {
  const [cutoutImage, setCutoutImage] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Create image with transparent background using the mask
    const createCutout = async () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      // Load original image
      const img = await loadImageAsync(src);
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Load mask
      const maskImg = await loadImageAsync(mask);

      // Create mask canvas at same size
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = img.width;
      maskCanvas.height = img.height;
      const maskCtx = maskCanvas.getContext("2d")!;
      maskCtx.drawImage(maskImg, 0, 0, img.width, img.height);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const maskData = maskCtx.getImageData(0, 0, canvas.width, canvas.height);

      // Apply mask to alpha channel - person is visible, background is transparent
      for (let i = 0; i < imageData.data.length; i += 4) {
        const maskValue = maskData.data[i]; // Red channel of mask
        // Where mask is white (255) = person = visible
        // Where mask is black (0) = background = transparent
        imageData.data[i + 3] = maskValue; // Set alpha to mask value
      }

      ctx.putImageData(imageData, 0, 0);
      setCutoutImage(canvas.toDataURL("image/png"));
    };

    createCutout();
  }, [src, mask]);

  if (!cutoutImage) {
    return <div className="w-full h-full animate-pulse bg-transparent" />;
  }

  return (
    <img src={cutoutImage} alt={alt} className="w-full h-full object-cover" />
  );
}

/**
 * Helper to load image as promise
 */
function loadImageAsync(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export default DepthPhoto3D;
