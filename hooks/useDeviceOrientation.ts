import { useState, useEffect, useCallback, useRef } from 'react';

interface OrientationState {
  x: number; // Normalized -1 to 1 (left/right tilt)
  y: number; // Normalized -1 to 1 (forward/backward tilt)
  isSupported: boolean;
  isEnabled: boolean;
}

interface UseDeviceOrientationOptions {
  smoothing?: number; // 0-1, higher = smoother but slower response
  sensitivity?: number; // Multiplier for tilt effect
  enableMouse?: boolean; // Enable mouse fallback on desktop
}

// Lerp helper for smooth interpolation
const lerp = (start: number, end: number, factor: number): number => {
  return start + (end - start) * factor;
};

// Clamp helper
const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const useDeviceOrientation = (
  elementRef: React.RefObject<HTMLElement | null>,
  options: UseDeviceOrientationOptions = {}
): OrientationState => {
  const {
    smoothing = 0.15,
    sensitivity = 1,
    enableMouse = true,
  } = options;

  const [state, setState] = useState<OrientationState>({
    x: 0,
    y: 0,
    isSupported: false,
    isEnabled: false,
  });

  // Track raw values for smoothing
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const isGyroscopeActiveRef = useRef(false);

  // Animation loop for smooth interpolation
  const animate = useCallback(() => {
    currentRef.current.x = lerp(currentRef.current.x, targetRef.current.x, smoothing);
    currentRef.current.y = lerp(currentRef.current.y, targetRef.current.y, smoothing);

    // Only update state if values changed significantly (perf optimization)
    const threshold = 0.001;
    if (
      Math.abs(currentRef.current.x - state.x) > threshold ||
      Math.abs(currentRef.current.y - state.y) > threshold
    ) {
      setState(prev => ({
        ...prev,
        x: currentRef.current.x,
        y: currentRef.current.y,
      }));
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [smoothing, state.x, state.y]);

  // Handle gyroscope orientation
  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    // beta: front-to-back tilt (-180 to 180)
    // gamma: left-to-right tilt (-90 to 90)
    const beta = event.beta ?? 0;
    const gamma = event.gamma ?? 0;

    // Normalize to -1 to 1 range
    // Beta: typically phone held at ~45-90 degrees, map 0-90 to -1 to 1
    // Gamma: -90 to 90 maps to -1 to 1
    const normalizedY = clamp((beta - 45) / 45, -1, 1) * sensitivity;
    const normalizedX = clamp(gamma / 45, -1, 1) * sensitivity;

    targetRef.current = {
      x: normalizedX,
      y: normalizedY,
    };

    isGyroscopeActiveRef.current = true;
  }, [sensitivity]);

  // Handle mouse movement (desktop fallback)
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isGyroscopeActiveRef.current || !elementRef.current) return;

    const rect = elementRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate offset from center, normalized to -1 to 1
    // Use window dimensions for wider range of motion
    const normalizedX = clamp(((event.clientX - centerX) / (window.innerWidth / 2)) * sensitivity, -1, 1);
    const normalizedY = clamp(((event.clientY - centerY) / (window.innerHeight / 2)) * sensitivity, -1, 1);

    targetRef.current = {
      x: normalizedX,
      y: normalizedY,
    };
  }, [elementRef, sensitivity]);

  // Handle mouse leave - reset to center
  const handleMouseLeave = useCallback(() => {
    if (isGyroscopeActiveRef.current) return;
    targetRef.current = { x: 0, y: 0 };
  }, []);

  // Request gyroscope permission (iOS 13+)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    // Check if DeviceOrientationEvent exists and has requestPermission
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        return permission === 'granted';
      } catch (err) {
        console.warn('Gyroscope permission denied:', err);
        return false;
      }
    }
    // Permission not required (Android, older iOS, desktop)
    return true;
  }, []);

  // Initialize
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Check if gyroscope is supported
      const hasGyroscope = typeof DeviceOrientationEvent !== 'undefined';
      
      if (hasGyroscope) {
        const permitted = await requestPermission();
        if (permitted && mounted) {
          window.addEventListener('deviceorientation', handleOrientation);
          setState(prev => ({ ...prev, isSupported: true, isEnabled: true }));
        }
      }

      // Set up mouse fallback
      if (enableMouse && mounted) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);
        setState(prev => ({ ...prev, isEnabled: true }));
      }

      // Start animation loop
      if (mounted) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    init();

    return () => {
      mounted = false;
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [handleOrientation, handleMouseMove, handleMouseLeave, enableMouse, requestPermission, animate]);

  return state;
};

export default useDeviceOrientation;


