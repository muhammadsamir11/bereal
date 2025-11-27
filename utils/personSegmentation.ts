/**
 * AI-Powered Person Segmentation
 * Uses TensorFlow.js Body Segmentation with MediaPipe Selfie Segmentation
 * for accurate face/body separation from background
 */

import * as bodySegmentation from "@tensorflow-models/body-segmentation";
import * as tf from "@tensorflow/tfjs";

// Ensure TF.js is ready
tf.ready();

// Segmenter instance (cached)
let segmenter: bodySegmentation.BodySegmenter | null = null;
let isLoading = false;
let loadFailed = false;

// Cache for segmentation masks
const maskCache = new Map<string, string>();

/**
 * Initialize the body segmentation model
 */
export const initSegmenter = async (): Promise<bodySegmentation.BodySegmenter | null> => {
  if (segmenter) return segmenter;
  if (loadFailed) return null;

  if (isLoading) {
    // Wait for existing load
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (segmenter || !isLoading) {
          clearInterval(check);
          resolve(segmenter);
        }
      }, 100);
    });
  }

  isLoading = true;

  try {
    // Ensure TensorFlow.js is ready with WebGL backend
    await tf.setBackend("webgl");
    await tf.ready();
    
    // Use MediaPipe Selfie Segmentation with TF.js runtime
    const model = bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation;
    
    segmenter = await bodySegmentation.createSegmenter(model, {
      runtime: "tfjs",
      modelType: "general", // 'general' for full body
    });

    isLoading = false;
    console.log("Person segmentation model loaded successfully");
    return segmenter;
  } catch (error) {
    console.warn("MediaPipe segmentation failed:", error);
    
    try {
      // Try BodyPix as fallback
      const bodyPixModel = bodySegmentation.SupportedModels.BodyPix;
      
      segmenter = await bodySegmentation.createSegmenter(bodyPixModel, {
        architecture: "MobileNetV1",
        outputStride: 16,
        multiplier: 0.75,
        quantBytes: 2,
      });

      isLoading = false;
      console.log("BodyPix segmentation model loaded");
      return segmenter;
    } catch (fallbackError) {
      console.error("All segmentation methods failed:", fallbackError);
      isLoading = false;
      loadFailed = true;
      return null;
    }
  }
};

/**
 * Segment a person from an image and return a mask
 */
export const segmentPerson = async (
  imageUrl: string,
  outputWidth: number = 256,
  outputHeight: number = 256
): Promise<string | null> => {
  // Check cache
  const cacheKey = `${imageUrl}_${outputWidth}_${outputHeight}`;
  if (maskCache.has(cacheKey)) {
    return maskCache.get(cacheKey)!;
  }

  try {
    // Load the image
    const image = await loadImage(imageUrl);
    
    // Initialize segmenter
    const seg = await initSegmenter();
    
    if (!seg) {
      console.warn("Segmenter not available, using fallback");
      return createFallbackMask(image, outputWidth, outputHeight);
    }

    // Perform segmentation
    const segmentation = await seg.segmentPeople(image, {
      flipHorizontal: false,
      multiSegmentation: false,
      segmentBodyParts: false,
    });

    if (!segmentation || segmentation.length === 0) {
      console.warn("No person detected, using fallback");
      return createFallbackMask(image, outputWidth, outputHeight);
    }

    // Convert segmentation mask to image
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = outputWidth;
    maskCanvas.height = outputHeight;
    const maskCtx = maskCanvas.getContext("2d")!;

    // Get the mask data
    const mask = segmentation[0].mask;
    
    if (mask) {
      // Convert mask to ImageData
      const maskImageData = await mask.toImageData();
      
      // Create a temporary canvas for the original mask size
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = maskImageData.width;
      tempCanvas.height = maskImageData.height;
      const tempCtx = tempCanvas.getContext("2d")!;
      
      // Process the mask data - extract alpha channel as grayscale
      const processedData = tempCtx.createImageData(maskImageData.width, maskImageData.height);
      
      for (let i = 0; i < maskImageData.data.length; i += 4) {
        // The mask has person probability - white = person, black = background
        const personProbability = maskImageData.data[i + 3]; // Alpha channel contains the mask
        const confidence = maskImageData.data[i]; // Or red channel depending on model
        
        // Use whichever has more information
        const value = Math.max(personProbability, confidence);
        
        processedData.data[i] = value;     // R
        processedData.data[i + 1] = value; // G
        processedData.data[i + 2] = value; // B
        processedData.data[i + 3] = 255;   // A
      }
      
      tempCtx.putImageData(processedData, 0, 0);
      
      // Scale to output size
      maskCtx.drawImage(tempCanvas, 0, 0, outputWidth, outputHeight);
      
      // Apply smoothing for cleaner edges
      maskCtx.filter = "blur(2px)";
      maskCtx.drawImage(maskCanvas, 0, 0);
      maskCtx.filter = "none";
      
      // Enhance contrast
      enhanceMaskContrast(maskCtx, outputWidth, outputHeight);
    } else {
      // Fallback if mask conversion fails
      return createFallbackMask(image, outputWidth, outputHeight);
    }

    const maskDataUrl = maskCanvas.toDataURL();
    maskCache.set(cacheKey, maskDataUrl);
    
    return maskDataUrl;
  } catch (error) {
    console.error("Segmentation failed:", error);
    return null;
  }
};

/**
 * Load an image from URL
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
 * Create a fallback mask using face detection heuristics
 */
const createFallbackMask = async (
  image: HTMLImageElement,
  width: number,
  height: number
): Promise<string> => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Draw image to analyze
  ctx.drawImage(image, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Create mask based on multiple heuristics
  const maskData = ctx.createImageData(width, height);
  
  // Assume face is in upper-center region
  const centerX = width / 2;
  const centerY = height * 0.35;
  const faceRadius = Math.min(width, height) * 0.35;
  const bodyRadius = Math.min(width, height) * 0.7;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Distance from face center
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Skin tone detection
      const isSkin = detectSkinTone(r, g, b);
      
      // Radial falloff for face region
      const faceWeight = Math.max(0, 1 - distance / faceRadius);
      
      // Body region (below face, wider)
      const bodyY = height * 0.5;
      const bodyDist = Math.sqrt(dx * dx + Math.pow((y - bodyY) * 0.7, 2));
      const bodyWeight = y > centerY ? Math.max(0, 1 - bodyDist / bodyRadius) : 0;

      // Combine weights
      let personWeight = Math.max(faceWeight, bodyWeight * 0.7);
      
      // Boost for skin tones
      if (isSkin) {
        personWeight = Math.min(1, personWeight + 0.4);
      }

      // Apply sigmoid for sharper boundaries
      personWeight = 1 / (1 + Math.exp(-(personWeight - 0.4) * 10));

      const value = Math.round(personWeight * 255);
      maskData.data[idx] = value;
      maskData.data[idx + 1] = value;
      maskData.data[idx + 2] = value;
      maskData.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(maskData, 0, 0);
  
  // Smooth the mask
  ctx.filter = "blur(4px)";
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = "none";
  
  return canvas.toDataURL();
};

/**
 * Detect skin tones
 */
function detectSkinTone(r: number, g: number, b: number): boolean {
  // YCbCr-based skin detection (works well for diverse skin tones)
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

  // Thresholds for skin tones in YCbCr space
  return y > 80 && cb > 77 && cb < 127 && cr > 133 && cr < 173;
}

/**
 * Enhance mask contrast for cleaner segmentation
 */
function enhanceMaskContrast(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Find min/max
  let min = 255, max = 0;
  for (let i = 0; i < data.length; i += 4) {
    min = Math.min(min, data[i]);
    max = Math.max(max, data[i]);
  }

  // Normalize and apply contrast
  const range = max - min || 1;
  for (let i = 0; i < data.length; i += 4) {
    let value = ((data[i] - min) / range) * 255;
    
    // Apply sigmoid for sharper edges
    value = 255 / (1 + Math.exp(-(value / 255 - 0.5) * 8));
    
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Clear the mask cache
 */
export const clearMaskCache = (): void => {
  maskCache.clear();
};

export default {
  initSegmenter,
  segmentPerson,
  clearMaskCache,
};

