import React, { useRef, useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useDeviceOrientation } from "../hooks/useDeviceOrientation";

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
 * 3D Depth Photo Component with Gaussian Splatting-like parallax
 * Creates layered depth effect by separating foreground from background
 */
const DepthPhoto3D: React.FC<DepthPhoto3DProps> = ({
  src,
  alt = "Profile photo",
  className = "",
  width = 128,
  height = 176,
  tiltIntensity = 0.7,
  depthIntensity = 1.0,
  onReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [depthMask, setDepthMask] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Get device orientation (gyroscope on mobile, mouse on desktop)
  const orientation = useDeviceOrientation(containerRef, {
    smoothing: 0.1,
    sensitivity: 1.5,
    enableMouse: true,
  });

  // Generate depth mask for subject isolation
  useEffect(() => {
    const generateDepthMask = async () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const img = new Image();
        img.crossOrigin = "anonymous";

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = src;
        });

        // Higher resolution for better mask quality
        canvas.width = 256;
        canvas.height = Math.round(256 * (height / width));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Create depth map based on:
        // 1. Radial distance from face center (portrait assumption)
        // 2. Skin tone detection
        // 3. Edge detection for subject boundaries
        const centerX = canvas.width / 2;
        const centerY = canvas.height * 0.35; // Face typically in upper portion
        const maxRadius = Math.max(canvas.width, canvas.height) * 0.6;

        // First pass: detect skin tones and luminance
        const depthValues: number[] = new Array(data.length / 4);

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const pixelIndex = i / 4;
          const x = pixelIndex % canvas.width;
          const y = Math.floor(pixelIndex / canvas.width);

          // Distance from face center
          const dx = x - centerX;
          const dy = y - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const radialDepth = 1 - Math.min(distance / maxRadius, 1);

          // Skin tone detection (works for various skin tones)
          const isSkinTone = detectSkinTone(r, g, b);
          const skinBoost = isSkinTone ? 0.3 : 0;

          // Luminance-based depth (brighter = closer for portraits)
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          const luminanceDepth = luminance * 0.3;

          // Saturation-based (subjects often more saturated)
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const saturation = max === 0 ? 0 : (max - min) / max;
          const saturationBoost = saturation * 0.15;

          // Combine factors with weights
          let depth =
            radialDepth * 0.5 + luminanceDepth + skinBoost + saturationBoost;

          // Apply sigmoid for sharper separation
          depth = sigmoid(depth * 2 - 1) * 1.2;
          depthValues[pixelIndex] = Math.min(1, Math.max(0, depth));
        }

        // Apply edge-aware smoothing
        const smoothedDepth = edgeAwareSmooth(
          depthValues,
          canvas.width,
          canvas.height,
          data
        );

        // Create the mask image
        const maskCanvas = document.createElement("canvas");
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        const maskCtx = maskCanvas.getContext("2d")!;
        const maskData = maskCtx.createImageData(canvas.width, canvas.height);

        for (let i = 0; i < smoothedDepth.length; i++) {
          const value = Math.round(smoothedDepth[i] * 255);
          maskData.data[i * 4] = value;
          maskData.data[i * 4 + 1] = value;
          maskData.data[i * 4 + 2] = value;
          maskData.data[i * 4 + 3] = 255;
        }

        maskCtx.putImageData(maskData, 0, 0);

        // Apply Gaussian blur for smoother transitions
        maskCtx.filter = "blur(4px)";
        maskCtx.drawImage(maskCanvas, 0, 0);
        maskCtx.filter = "none";

        setDepthMask(maskCanvas.toDataURL());
        setIsLoaded(true);
        onReady?.();
      } catch (error) {
        console.warn("Depth mask generation failed:", error);
        setIsLoaded(true);
        onReady?.();
      }
    };

    generateDepthMask();
  }, [src, width, height, onReady]);

  // Calculate parallax offsets for different depth layers
  const foregroundOffset = useMemo(
    () => ({
      x: orientation.x * 12 * depthIntensity,
      y: orientation.y * 12 * depthIntensity,
      z: 30,
    }),
    [orientation.x, orientation.y, depthIntensity]
  );

  const midgroundOffset = useMemo(
    () => ({
      x: orientation.x * 6 * depthIntensity,
      y: orientation.y * 6 * depthIntensity,
      z: 15,
    }),
    [orientation.x, orientation.y, depthIntensity]
  );

  const backgroundOffset = useMemo(
    () => ({
      x: orientation.x * -3 * depthIntensity,
      y: orientation.y * -3 * depthIntensity,
      z: 0,
    }),
    [orientation.x, orientation.y, depthIntensity]
  );

  // 3D rotation
  const rotateX = -orientation.y * 15 * tiltIntensity;
  const rotateY = orientation.x * 15 * tiltIntensity;

  return (
    <motion.div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        width,
        height,
        perspective: 600,
        transformStyle: "preserve-3d",
      }}
    >
      {/* Main 3D container */}
      <motion.div
        className="w-full h-full relative"
        style={{ transformStyle: "preserve-3d" }}
        animate={{
          rotateX,
          rotateY,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
          mass: 0.3,
        }}
      >
        {/* Background layer - moves opposite direction (parallax) */}
        <motion.div
          className="absolute inset-0"
          style={{
            transformStyle: "preserve-3d",
            transform: `translateZ(${backgroundOffset.z}px)`,
          }}
          animate={{
            x: backgroundOffset.x,
            y: backgroundOffset.y,
            scale: 1.15, // Slightly larger to prevent edges showing
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25,
          }}
        >
          <img
            src={src}
            alt=""
            className="w-full h-full object-cover"
            style={{
              filter: "blur(1px) brightness(0.9)",
            }}
            aria-hidden="true"
          />
        </motion.div>

        {/* Midground layer */}
        <motion.div
          className="absolute inset-0"
          style={{
            transformStyle: "preserve-3d",
            transform: `translateZ(${midgroundOffset.z}px)`,
          }}
          animate={{
            x: midgroundOffset.x,
            y: midgroundOffset.y,
            scale: 1.08,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25,
          }}
        >
          {depthMask && (
            <div
              className="w-full h-full"
              style={{
                maskImage: `url(${depthMask})`,
                WebkitMaskImage: `url(${depthMask})`,
                maskSize: "cover",
                WebkitMaskSize: "cover",
                maskPosition: "center",
                WebkitMaskPosition: "center",
              }}
            >
              <img
                src={src}
                alt=""
                className="w-full h-full object-cover"
                style={{ filter: "brightness(0.95)" }}
                aria-hidden="true"
              />
            </div>
          )}
        </motion.div>

        {/* Foreground layer - subject/face (moves most) */}
        <motion.div
          className="absolute inset-0"
          style={{
            transformStyle: "preserve-3d",
            transform: `translateZ(${foregroundOffset.z}px)`,
          }}
          animate={{
            x: foregroundOffset.x,
            y: foregroundOffset.y,
            scale: 1.02,
          }}
          transition={{
            type: "spring",
            stiffness: 350,
            damping: 28,
          }}
        >
          {depthMask ? (
            <div
              className="w-full h-full"
              style={{
                maskImage: `url(${depthMask})`,
                WebkitMaskImage: `url(${depthMask})`,
                maskSize: "cover",
                WebkitMaskSize: "cover",
                maskPosition: "center",
                WebkitMaskPosition: "center",
              }}
            >
              <img src={src} alt={alt} className="w-full h-full object-cover" />
            </div>
          ) : (
            <img src={src} alt={alt} className="w-full h-full object-cover" />
          )}
        </motion.div>

        {/* Holographic shine overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: "translateZ(40px)",
            mixBlendMode: "overlay",
          }}
          animate={{
            background: `linear-gradient(
              ${135 + orientation.x * 60}deg,
              rgba(255,255,255,0) 0%,
              rgba(255,255,255,${0.12 + Math.abs(orientation.x) * 0.12}) 45%,
              rgba(255,255,255,0) 55%,
              rgba(255,255,255,0) 100%
            )`,
          }}
          transition={{ duration: 0.05 }}
        />

        {/* Depth-based ambient occlusion */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: "translateZ(35px)",
            boxShadow: `
              inset ${orientation.x * 5}px ${
              orientation.y * 5
            }px 15px rgba(255,255,255,0.2),
              inset ${-orientation.x * 4}px ${
              -orientation.y * 4
            }px 12px rgba(0,0,0,0.3)
            `,
            borderRadius: "inherit",
          }}
        />
      </motion.div>

      {/* Loading state */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-900 animate-pulse" />
      )}
    </motion.div>
  );
};

// Skin tone detection using color thresholds
function detectSkinTone(r: number, g: number, b: number): boolean {
  // Multiple skin tone detection methods for diverse skin colors

  // Method 1: RGB ratios
  const rgRatio = r / (g + 1);
  const rbRatio = r / (b + 1);
  const isRGBSkin =
    r > 60 &&
    g > 40 &&
    b > 20 &&
    r > g &&
    r > b &&
    rgRatio > 1.0 &&
    rgRatio < 1.8 &&
    rbRatio > 1.0 &&
    rbRatio < 2.5;

  // Method 2: YCbCr color space approximation
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  const isYCbCrSkin = y > 80 && cb > 85 && cb < 135 && cr > 135 && cr < 180;

  // Method 3: HSV-based detection for darker skin tones
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  let h = 0;
  if (diff !== 0) {
    if (max === r) h = ((g - b) / diff) % 6;
    else if (max === g) h = (b - r) / diff + 2;
    else h = (r - g) / diff + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : diff / max;
  const isHSVSkin = h >= 0 && h <= 50 && s >= 0.1 && s <= 0.7;

  return isRGBSkin || isYCbCrSkin || isHSVSkin;
}

// Sigmoid function for sharper depth transitions
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x * 4));
}

// Edge-aware smoothing to preserve subject boundaries
function edgeAwareSmooth(
  depth: number[],
  width: number,
  height: number,
  imageData: Uint8ClampedArray
): number[] {
  const result = new Array(depth.length);
  const kernel = 3;
  const halfKernel = Math.floor(kernel / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      let sum = 0;
      let weightSum = 0;

      const centerR = imageData[idx * 4];
      const centerG = imageData[idx * 4 + 1];
      const centerB = imageData[idx * 4 + 2];

      for (let ky = -halfKernel; ky <= halfKernel; ky++) {
        for (let kx = -halfKernel; kx <= halfKernel; kx++) {
          const nx = x + kx;
          const ny = y + ky;

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx;

            // Color similarity weight (edge-aware)
            const nR = imageData[nIdx * 4];
            const nG = imageData[nIdx * 4 + 1];
            const nB = imageData[nIdx * 4 + 2];

            const colorDiff =
              Math.sqrt(
                Math.pow(centerR - nR, 2) +
                  Math.pow(centerG - nG, 2) +
                  Math.pow(centerB - nB, 2)
              ) / 441.67; // Normalize by max possible diff

            const colorWeight = Math.exp(-colorDiff * 5);

            // Spatial weight
            const spatialDist = Math.sqrt(kx * kx + ky * ky);
            const spatialWeight = Math.exp(-spatialDist / 2);

            const weight = colorWeight * spatialWeight;
            sum += depth[nIdx] * weight;
            weightSum += weight;
          }
        }
      }

      result[idx] = weightSum > 0 ? sum / weightSum : depth[idx];
    }
  }

  return result;
}

export default DepthPhoto3D;
