import { useState, useEffect, useCallback, useRef, RefObject } from "react";

// Configuration - must match face generation parameters
const P_MIN = -15; // Minimum gaze value
const P_MAX = 15; // Maximum gaze value
const STEP = 3; // Step size between images
const SIZE = 256; // Image size

interface GazeState {
  px: number; // Current gaze X (-15 to 15, snapped to step)
  py: number; // Current gaze Y (-15 to 15, snapped to step)
  imagePath: string; // Current image path
  isLoading: boolean;
  hasImages: boolean; // Whether face images are available
}

interface UseGazeTrackingOptions {
  basePath?: string; // Path to faces folder
  smoothing?: number; // 0-1, higher = smoother
}

// Snap value to nearest step
const snapToStep = (value: number): number => {
  const snapped = Math.round(value / STEP) * STEP;
  return Math.max(P_MIN, Math.min(P_MAX, snapped));
};

// Lerp helper for smooth interpolation
const lerp = (start: number, end: number, factor: number): number => {
  return start + (end - start) * factor;
};

// Clamp helper
const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

// Generate image filename from gaze coordinates
// Format: gaze_px{X}p0_py{Y}p0_256.webp (negative values use 'm' prefix)
const getImageFilename = (px: number, py: number): string => {
  // Handle negative values with 'm' prefix, add 'p0' suffix for decimal notation
  const pxStr = px < 0 ? `m${Math.abs(px)}p0` : `${px}p0`;
  const pyStr = py < 0 ? `m${Math.abs(py)}p0` : `${py}p0`;
  return `gaze_px${pxStr}_py${pyStr}_${SIZE}.webp`;
};

export const useGazeTracking = (
  containerRef: RefObject<HTMLElement | null>,
  options: UseGazeTrackingOptions = {}
): GazeState => {
  const { basePath = "/faces/", smoothing = 0.15 } = options;

  const [state, setState] = useState<GazeState>({
    px: 0,
    py: 0,
    imagePath: `${basePath}${getImageFilename(0, 0)}`,
    isLoading: true,
    hasImages: false,
  });

  // Track raw and smoothed values
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const isGyroscopeActiveRef = useRef(false);
  const loadedImagesRef = useRef<Set<string>>(new Set());

  // Check if images exist on mount (using Image to avoid CORS issues with fetch)
  useEffect(() => {
    const testPath = `${basePath}${getImageFilename(0, 0)}`;
    const img = new Image();

    img.onload = () => {
      setState((prev) => ({
        ...prev,
        hasImages: true,
        isLoading: false,
      }));
    };

    img.onerror = () => {
      setState((prev) => ({
        ...prev,
        hasImages: false,
        isLoading: false,
      }));
    };

    img.src = testPath;
  }, [basePath]);

  // Preload nearby images for smooth transitions
  const preloadNearbyImages = useCallback(
    (px: number, py: number) => {
      const offsets = [-STEP, 0, STEP];
      offsets.forEach((dx) => {
        offsets.forEach((dy) => {
          const newPx = clamp(px + dx, P_MIN, P_MAX);
          const newPy = clamp(py + dy, P_MIN, P_MAX);
          const filename = getImageFilename(newPx, newPy);
          const path = `${basePath}${filename}`;

          if (!loadedImagesRef.current.has(path)) {
            const img = new Image();
            img.src = path;
            loadedImagesRef.current.add(path);
          }
        });
      });
    },
    [basePath]
  );

  // Animation loop for smooth interpolation
  const animate = useCallback(() => {
    currentRef.current.x = lerp(
      currentRef.current.x,
      targetRef.current.x,
      smoothing
    );
    currentRef.current.y = lerp(
      currentRef.current.y,
      targetRef.current.y,
      smoothing
    );

    // Convert normalized (-1 to 1) to gaze coordinates
    const rawPx = currentRef.current.x * P_MAX;
    const rawPy = currentRef.current.y * P_MAX;

    // Snap to step
    const px = snapToStep(rawPx);
    const py = snapToStep(rawPy);

    // Only update if gaze position changed
    setState((prev) => {
      if (prev.px !== px || prev.py !== py) {
        const filename = getImageFilename(px, py);
        preloadNearbyImages(px, py);
        return {
          ...prev,
          px,
          py,
          imagePath: `${basePath}${filename}`,
        };
      }
      return prev;
    });

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [smoothing, basePath, preloadNearbyImages]);

  // Handle gyroscope orientation
  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    const beta = event.beta ?? 0;
    const gamma = event.gamma ?? 0;

    // Map gyroscope to -1 to 1 range
    const normalizedY = clamp((beta - 45) / 45, -1, 1);
    const normalizedX = clamp(gamma / 45, -1, 1);

    targetRef.current = {
      x: normalizedX,
      y: -normalizedY, // Invert Y for natural feel
    };

    isGyroscopeActiveRef.current = true;
  }, []);

  // Handle mouse movement
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (isGyroscopeActiveRef.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate offset from center, normalized to -1 to 1
      const normalizedX = clamp(
        (event.clientX - centerX) / (window.innerWidth / 3),
        -1,
        1
      );
      const normalizedY = clamp(
        (event.clientY - centerY) / (window.innerHeight / 3),
        -1,
        1
      );

      targetRef.current = {
        x: normalizedX,
        y: normalizedY,
      };
    },
    [containerRef]
  );

  // Handle mouse leave - reset to center
  const handleMouseLeave = useCallback(() => {
    if (isGyroscopeActiveRef.current) return;
    targetRef.current = { x: 0, y: 0 };
  }, []);

  // Request gyroscope permission (iOS 13+)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof (DeviceOrientationEvent as any).requestPermission === "function"
    ) {
      try {
        const permission = await (
          DeviceOrientationEvent as any
        ).requestPermission();
        return permission === "granted";
      } catch {
        return false;
      }
    }
    return true;
  }, []);

  // Initialize tracking
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Try gyroscope first
      const hasGyroscope = typeof DeviceOrientationEvent !== "undefined";

      if (hasGyroscope) {
        const permitted = await requestPermission();
        if (permitted && mounted) {
          window.addEventListener("deviceorientation", handleOrientation);
        }
      }

      // Always set up mouse fallback
      if (mounted) {
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseleave", handleMouseLeave);
      }

      // Start animation loop
      if (mounted) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    init();

    return () => {
      mounted = false;
      window.removeEventListener("deviceorientation", handleOrientation);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    handleOrientation,
    handleMouseMove,
    handleMouseLeave,
    requestPermission,
    animate,
  ]);

  return state;
};

// Export configuration for reference
export const GAZE_CONFIG = {
  P_MIN,
  P_MAX,
  STEP,
  SIZE,
  getImageFilename,
};

export default useGazeTracking;
