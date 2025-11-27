/**
 * Depth Estimation Utility
 * Generates depth maps for 3D parallax effects
 * Uses TensorFlow.js when available, with fallback to radial gradient
 */

// Cache for generated depth maps
const depthMapCache = new Map<string, HTMLCanvasElement>();
let depthEstimator: any = null;
let isModelLoading = false;
let modelLoadFailed = false;

// Cache WebGL availability check (only check once)
let webGLAvailabilityCache: boolean | null = null;

/**
 * Attempt to load TensorFlow.js depth estimation model
 */
export const loadDepthModel = async (): Promise<any> => {
  if (depthEstimator) return depthEstimator;
  if (modelLoadFailed) return null;

  if (isModelLoading) {
    // Wait for existing load
    return new Promise((resolve) => {
      const checkLoaded = setInterval(() => {
        if (depthEstimator || !isModelLoading) {
          clearInterval(checkLoaded);
          resolve(depthEstimator);
        }
      }, 100);
    });
  }

  isModelLoading = true;

  try {
    // Dynamically import TensorFlow.js
    const tf = await import("@tensorflow/tfjs");

    // Try to set up WebGL backend
    await tf.setBackend("webgl");
    await tf.ready();

    // Try to load depth estimation model
    const depthEstimation = await import("@tensorflow-models/depth-estimation");

    // Check available models
    const supportedModels = depthEstimation.SupportedModels;

    // Try ARPortraitDepth first, then fall back to others
    const modelToUse =
      supportedModels?.ARPortraitDepth ||
      Object.values(supportedModels || {})[0];

    if (modelToUse) {
      depthEstimator = await depthEstimation.createEstimator(modelToUse, {
        runtime: "tfjs",
        minDepth: 0,
        maxDepth: 1,
      });
    }

    isModelLoading = false;
    return depthEstimator;
  } catch (error) {
    console.warn("TensorFlow depth model unavailable, using fallback:", error);
    isModelLoading = false;
    modelLoadFailed = true;
    return null;
  }
};

/**
 * Generate a depth map from an image
 * Uses AI when available, falls back to smart radial gradient
 */
export const generateDepthMap = async (
  imageUrl: string,
  width: number = 256,
  height: number = 256
): Promise<HTMLCanvasElement> => {
  // Check cache first
  const cacheKey = `${imageUrl}_${width}_${height}`;
  if (depthMapCache.has(cacheKey)) {
    return depthMapCache.get(cacheKey)!;
  }

  // Create canvas for output
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  try {
    // Load the image first
    const image = await loadImage(imageUrl);

    // Try AI depth estimation
    const estimator = await loadDepthModel();

    if (estimator) {
      try {
        // Create a temporary canvas with the loaded image
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext("2d")!;
        tempCtx.drawImage(image, 0, 0, width, height);

        // Estimate depth with config
        const depthResult = await estimator.estimateDepth(tempCanvas, {
          minDepth: 0,
          maxDepth: 1,
        });

        if (depthResult && depthResult.toCanvasImageSource) {
          const depthImageSource = await depthResult.toCanvasImageSource();
          ctx.drawImage(depthImageSource, 0, 0, width, height);
          enhanceDepthMap(ctx, width, height);
        } else if (depthResult && depthResult.toArray) {
          // Handle array output
          const depthArray = await depthResult.toArray();
          drawDepthArray(ctx, depthArray, width, height);
        } else {
          throw new Error("Unexpected depth result format");
        }
      } catch (estimateError) {
        console.warn("Depth estimation failed:", estimateError);
        generateSmartDepthMap(ctx, image, width, height);
      }
    } else {
      // Use smart fallback
      generateSmartDepthMap(ctx, image, width, height);
    }
  } catch (error) {
    console.warn("Depth generation failed, using basic fallback:", error);
    generateRadialDepthMap(ctx, width, height);
  }

  // Cache the result
  depthMapCache.set(cacheKey, canvas);
  return canvas;
};

/**
 * Load an image and return a promise
 */
const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
};

/**
 * Draw depth array to canvas
 */
const drawDepthArray = (
  ctx: CanvasRenderingContext2D,
  depthArray: number[][],
  width: number,
  height: number
): void => {
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  // Find min/max for normalization
  let min = Infinity;
  let max = -Infinity;
  for (const row of depthArray) {
    for (const value of row) {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }

  const range = max - min || 1;

  for (let y = 0; y < height && y < depthArray.length; y++) {
    for (let x = 0; x < width && x < (depthArray[y]?.length || 0); x++) {
      const idx = (y * width + x) * 4;
      const normalized = ((depthArray[y][x] - min) / range) * 255;
      data[idx] = normalized;
      data[idx + 1] = normalized;
      data[idx + 2] = normalized;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

/**
 * Enhance depth map contrast for better 3D effect
 */
const enhanceDepthMap = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Find min/max values
  let min = 255;
  let max = 0;
  for (let i = 0; i < data.length; i += 4) {
    const value = data[i];
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  // Normalize to full 0-255 range
  const range = max - min || 1;
  for (let i = 0; i < data.length; i += 4) {
    const normalized = ((data[i] - min) / range) * 255;
    // Apply gamma correction for better depth perception
    const enhanced = Math.pow(normalized / 255, 0.8) * 255;
    data[i] = enhanced;
    data[i + 1] = enhanced;
    data[i + 2] = enhanced;
  }

  ctx.putImageData(imageData, 0, 0);
};

/**
 * Generate a smart depth map using luminance and edge detection
 * Better than pure radial gradient for portraits
 */
const generateSmartDepthMap = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number
): void => {
  // First draw the image
  ctx.drawImage(image, 0, 0, width, height);

  // Get image data
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Create a depth array based on luminance (brighter = closer for faces)
  // Combined with radial falloff for portrait assumption
  const centerX = width / 2;
  const centerY = height * 0.35; // Face typically in upper third
  const maxRadius = Math.max(width, height) * 0.7;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Calculate luminance from RGB
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

      // Calculate radial distance from face center
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const radialDepth = 1 - Math.min(distance / maxRadius, 1);

      // Combine luminance and radial (weighted blend)
      // Luminance-based depth: skin tones are typically lighter
      const luminanceDepth = luminance / 255;

      // Blend: 60% radial (composition), 40% luminance (detail)
      const combinedDepth = radialDepth * 0.6 + luminanceDepth * 0.4;

      // Apply S-curve for better contrast
      const enhanced = Math.pow(combinedDepth, 0.9) * 255;

      data[idx] = enhanced;
      data[idx + 1] = enhanced;
      data[idx + 2] = enhanced;
      // Alpha stays 255
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Apply slight blur for smoother depth transitions
  ctx.filter = "blur(3px)";
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.filter = "none";
};

/**
 * Generate a simple radial depth map (basic fallback)
 * Assumes face/subject is centered
 */
const generateRadialDepthMap = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void => {
  const centerX = width / 2;
  const centerY = height * 0.4;
  const maxRadius = Math.max(width, height) * 0.8;

  // Create radial gradient
  const gradient = ctx.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    maxRadius
  );

  // White = foreground/close, Black = background/far
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.25, "#e0e0e0");
  gradient.addColorStop(0.5, "#888888");
  gradient.addColorStop(0.75, "#444444");
  gradient.addColorStop(1, "#000000");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add subtle noise for natural feel
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 15;
    const value = Math.max(0, Math.min(255, data[i] + noise));
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }

  ctx.putImageData(imageData, 0, 0);
};

/**
 * Check if WebGL is available (cached to prevent context exhaustion)
 */
export const isWebGLAvailable = (): boolean => {
  // Return cached result if available
  if (webGLAvailabilityCache !== null) {
    return webGLAvailabilityCache;
  }

  try {
    // Only check for WebGLRenderingContext existence without creating a context
    // This prevents context exhaustion
    webGLAvailabilityCache = typeof WebGLRenderingContext !== "undefined";
    return webGLAvailabilityCache;
  } catch {
    webGLAvailabilityCache = false;
    return false;
  }
};

/**
 * Clear the depth map cache
 */
export const clearDepthCache = (): void => {
  depthMapCache.clear();
};

export default {
  loadDepthModel,
  generateDepthMap,
  clearDepthCache,
  isWebGLAvailable,
};
