"use client";

import { useEffect, useRef } from "react";
import type {
  HandLandmarker,
  HandLandmarkerResult,
  NormalizedLandmark
} from "@mediapipe/tasks-vision";
import type { GestureFrame, GestureKind } from "@/lib/gesture/types";

type GestureEngineProps = {
  enabled: boolean;
  onFrame: (frame: GestureFrame) => void;
  onFallbackMode: (message: string) => void;
};

type HandMetrics = {
  kind: GestureKind;
  confidence: number;
  debugLabel: string;
  pointer: { x: number; y: number };
  palmScale: number;
};

const WASM_ROOT = "/vendor/mediapipe/tasks-vision/wasm";
const HAND_MODEL_URL = "/vendor/mediapipe/hand_landmarker.task";
const CAMERA_REQUEST_TIMEOUT_MS = 10000;

const FINGER_TIPS = [4, 8, 12, 16, 20] as const;
function distance(a: NormalizedLandmark, b: NormalizedLandmark) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getTipSpread(landmarks: NormalizedLandmark[]) {
  let total = 0;
  let pairs = 0;

  FINGER_TIPS.forEach((tipIndex, index) => {
    FINGER_TIPS.slice(index + 1).forEach((otherTipIndex) => {
      total += distance(landmarks[tipIndex], landmarks[otherTipIndex]);
      pairs += 1;
    });
  });

  return pairs === 0 ? 0 : total / pairs;
}

function normalizePointerFromIndexTip(indexTip: NormalizedLandmark) {
  return {
    x: Math.min(1, Math.max(-1, (1 - indexTip.x) * 2 - 1)),
    y: Math.min(1, Math.max(-1, indexTip.y * 2 - 1))
  };
}

function classifyPrimaryHand(landmarks: NormalizedLandmark[]): HandMetrics {
  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const palmWidth = Math.max(distance(landmarks[5], landmarks[17]), 0.045);
  const tipDistances = FINGER_TIPS.map((tipIndex) => distance(landmarks[tipIndex], wrist));
  const averageTipToWrist = average(tipDistances);
  const tipSpread = getTipSpread(landmarks);
  const pinchDistance = distance(thumbTip, indexTip);
  const pointer = normalizePointerFromIndexTip(indexTip);
  const fistRatio = averageTipToWrist / palmWidth;
  const spreadRatio = tipSpread / palmWidth;
  const pinchRatio = pinchDistance / palmWidth;

  if (pinchRatio < 0.35) {
    return {
      kind: "pinch",
      confidence: Math.min(0.98, 0.72 + (0.35 - pinchRatio)),
      debugLabel: "PINCH",
      pointer,
      palmScale: palmWidth
    };
  }

  if (fistRatio < 1.18 && spreadRatio < 1.75) {
    return {
      kind: "fist",
      confidence: Math.min(0.96, 0.66 + (1.18 - fistRatio) * 0.4),
      debugLabel: "FIST",
      pointer,
      palmScale: palmWidth
    };
  }

  if (fistRatio > 1.58 && spreadRatio > 2.55) {
    return {
      kind: "openPalm",
      confidence: Math.min(0.96, 0.64 + Math.min(spreadRatio - 2.55, 0.5)),
      debugLabel: "OPEN_PALM",
      pointer,
      palmScale: palmWidth
    };
  }

  return {
    kind: "pointing",
    confidence: 0.68,
    debugLabel: "POINTING",
    pointer,
    palmScale: palmWidth
  };
}

function classifyHands(landmarksList: NormalizedLandmark[][]): HandMetrics {
  if (landmarksList.length === 0) {
    return {
      kind: "unknown",
      confidence: 0,
      debugLabel: "NO_HAND",
      pointer: { x: 0, y: 0 },
      palmScale: 0
    };
  }

  const primary = classifyPrimaryHand(landmarksList[0]);

  if (landmarksList.length >= 2) {
    const firstPalmCenter = landmarksList[0][9];
    const secondPalmCenter = landmarksList[1][9];
    const firstPalmWidth = Math.max(distance(landmarksList[0][5], landmarksList[0][17]), 0.045);
    const secondPalmWidth = Math.max(distance(landmarksList[1][5], landmarksList[1][17]), 0.045);
    const palmsDistance = distance(firstPalmCenter, secondPalmCenter);
    const averagePalmWidth = (firstPalmWidth + secondPalmWidth) / 2;

    if (palmsDistance < averagePalmWidth * 1.28) {
      return {
        ...primary,
        kind: "fist",
        confidence: 0.9,
        debugLabel: "PRAYER_SHUFFLE"
      };
    }
  }

  return primary;
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function getCameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "摄像头权限被拒绝。请在浏览器地址栏和 macOS「隐私与安全性 > 摄像头」允许 Electron/当前浏览器，然后点“重试摄像头”";
    }
    if (error.name === "NotFoundError") return "没有检测到可用摄像头，已切换到点击模式";
    if (error.name === "NotReadableError") return "摄像头被其他应用占用，已切换到点击模式";
  }

  if (error instanceof Error && /fetch|failed to load|network|wasm/i.test(error.message)) {
    return "摄像头已打开，但手势识别模型加载失败。请确认本地 MediaPipe 资源可访问后点“重试摄像头”";
  }

  return "摄像头初始化失败，已切换到点击模式";
}

function createTimeoutError(message: string) {
  return new DOMException(message, "TimeoutError");
}

export function GestureEngine({
  enabled,
  onFrame,
  onFallbackMode
}: GestureEngineProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const stoppedRef = useRef(false);
  const onFrameRef = useRef(onFrame);
  const onFallbackModeRef = useRef(onFallbackMode);

  useEffect(() => {
    onFrameRef.current = onFrame;
    onFallbackModeRef.current = onFallbackMode;
  }, [onFallbackMode, onFrame]);

  useEffect(() => {
    if (!enabled) {
      stopStream(streamRef.current);
      streamRef.current = null;
      return;
    }

    stoppedRef.current = false;

    async function startCamera() {
      const video = videoRef.current;
      if (!video) return;
      let cameraRequestTimedOut = false;

      const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1"]);
      if (!window.isSecureContext && !loopbackHosts.has(window.location.hostname)) {
        const message = "摄像头只能在 HTTPS 或 localhost 下使用。请用 localhost 打开本地页面，或切换到点击模式";
        onFallbackModeRef.current(message);
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        const message = "当前浏览器不支持摄像头访问，已切换到点击模式";
        onFallbackModeRef.current(message);
        return;
      }

      try {
        let requestTimeoutId: number | null = null;
        const cameraRequest = navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });

        const stream = await Promise.race([
          cameraRequest,
          new Promise<never>((_, reject) => {
            requestTimeoutId = window.setTimeout(() => {
              cameraRequestTimedOut = true;
              reject(createTimeoutError("摄像头授权请求超时"));
            }, CAMERA_REQUEST_TIMEOUT_MS);
          })
        ]);
        if (requestTimeoutId !== null) window.clearTimeout(requestTimeoutId);

        cameraRequest
          .then((lateStream) => {
            if (cameraRequestTimedOut || stoppedRef.current) stopStream(lateStream);
          })
          .catch(() => {
            // The raced request is handled by the main catch path below.
          });

        if (stoppedRef.current) {
          stopStream(stream);
          return;
        }

        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();

        const { FilesetResolver, HandLandmarker: HandLandmarkerClass } = await import(
          "@mediapipe/tasks-vision"
        );
        const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
        const handLandmarker = await HandLandmarkerClass.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: HAND_MODEL_URL
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.55,
          minTrackingConfidence: 0.55
        });

        if (stoppedRef.current) {
          handLandmarker.close();
          return;
        }

        landmarkerRef.current = handLandmarker;

        const detectFrame = (timestamp: number) => {
          if (stoppedRef.current) return;

          const landmarker = landmarkerRef.current;
          if (!video || !landmarker || video.readyState < 2) {
            frameRef.current = window.requestAnimationFrame(detectFrame);
            return;
          }

          if (video.currentTime !== lastVideoTimeRef.current) {
            const result: HandLandmarkerResult = landmarker.detectForVideo(video, timestamp);
            const landmarks = result.landmarks ?? [];
            const metrics = classifyHands(landmarks);
            const frame: GestureFrame = {
              kind: metrics.kind,
              confidence: metrics.confidence,
              pointer: metrics.pointer,
              palmScale: metrics.palmScale,
              timestamp,
              handCount: landmarks.length,
              debugLabel: metrics.debugLabel
            };

            onFrameRef.current(frame);
            lastVideoTimeRef.current = video.currentTime;
          }

          frameRef.current = window.requestAnimationFrame(detectFrame);
        };

        frameRef.current = window.requestAnimationFrame(detectFrame);
      } catch (error) {
        landmarkerRef.current?.close();
        landmarkerRef.current = null;
        stopStream(streamRef.current);
        streamRef.current = null;
        const message =
          error instanceof DOMException && error.name === "TimeoutError"
            ? "摄像头请求超时，请确认浏览器和系统都允许 Electron/浏览器访问摄像头，然后点“重试摄像头”"
            : getCameraErrorMessage(error);
        onFallbackModeRef.current(message);
      }
    }

    startCamera();

    return () => {
      stoppedRef.current = true;
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = null;
      lastVideoTimeRef.current = -1;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <video
      ref={videoRef}
      className="gesture-camera-sensor"
      playsInline
      muted
      autoPlay
      aria-hidden="true"
    />
  );
}
