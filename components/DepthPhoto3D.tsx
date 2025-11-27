import React, { useRef } from "react";
import { motion } from "framer-motion";
import { useDeviceOrientation } from "../hooks/useDeviceOrientation";

interface DepthPhoto3DProps {
  src: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  tiltIntensity?: number;
  onReady?: () => void;
}

/**
 * 3D Photo Component with Gyroscope/Mouse-based tilt effect
 * Uses CSS 3D transforms for reliable cross-browser performance
 */
const DepthPhoto3D: React.FC<DepthPhoto3DProps> = ({
  src,
  alt = "Profile photo",
  className = "",
  width = 128,
  height = 176,
  tiltIntensity = 0.7,
  onReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Get device orientation (gyroscope on mobile, mouse on desktop)
  const orientation = useDeviceOrientation(containerRef, {
    smoothing: 0.12,
    sensitivity: 1.2,
    enableMouse: true,
  });

  // Calculate 3D transforms based on orientation
  const rotateX = -orientation.y * 20 * tiltIntensity;
  const rotateY = orientation.x * 20 * tiltIntensity;

  // Subtle parallax shift for depth illusion
  const translateX = orientation.x * 5 * tiltIntensity;
  const translateY = orientation.y * 5 * tiltIntensity;

  // Notify parent when ready
  React.useEffect(() => {
    onReady?.();
  }, [onReady]);

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
      {/* 3D Tilt Container */}
      <motion.div
        className="w-full h-full relative"
        style={{ transformStyle: "preserve-3d" }}
        animate={{
          rotateX,
          rotateY,
          translateX,
          translateY,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 25,
          mass: 0.5,
        }}
      >
        {/* Main Image */}
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          style={{
            transform: "translateZ(0)",
          }}
        />

        {/* Holographic shine overlay - moves opposite to tilt */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            background: `linear-gradient(
              ${135 + orientation.x * 45}deg,
              rgba(255,255,255,0) 0%,
              rgba(255,255,255,${0.08 + Math.abs(orientation.x) * 0.08}) 50%,
              rgba(255,255,255,0) 100%
            )`,
          }}
          transition={{ duration: 0.1 }}
          style={{ mixBlendMode: "overlay" }}
        />

        {/* Dynamic edge lighting based on tilt */}
        <div
          className="absolute inset-0 pointer-events-none rounded-inherit"
          style={{
            boxShadow: `
              inset ${orientation.x * 4}px ${
              orientation.y * 4
            }px 12px rgba(255,255,255,0.15),
              inset ${-orientation.x * 3}px ${
              -orientation.y * 3
            }px 8px rgba(0,0,0,0.25)
            `,
          }}
        />

        {/* Subtle depth shadow on the "back" side */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(
              ellipse at ${50 - orientation.x * 30}% ${
              50 - orientation.y * 30
            }%,
              transparent 40%,
              rgba(0,0,0,${
                0.1 + Math.abs(orientation.x + orientation.y) * 0.05
              }) 100%
            )`,
          }}
        />
      </motion.div>

      {/* Ambient glow behind the photo */}
      <motion.div
        className="absolute inset-0 -z-10 blur-xl opacity-30"
        animate={{
          scale: 1.2,
          x: -orientation.x * 10,
          y: -orientation.y * 10,
        }}
        transition={{ type: "spring", stiffness: 200, damping: 30 }}
      >
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover"
          aria-hidden="true"
        />
      </motion.div>
    </motion.div>
  );
};

export default DepthPhoto3D;
