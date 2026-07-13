import type { PointerPosition } from "@/lib/gesture/types";

type HandPoint = {
  x: number;
  y: number;
};

export function distanceBetweenPoints(a: HandPoint, b: HandPoint) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
export function calculatePalmScaleFromPoints(points: HandPoint[]) {
  if (points.length < 2) return 0;

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);

  return Math.max(width * height, 0);
}

export function normalizeClientPointer(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">
): PointerPosition {
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = ((clientY - rect.top) / rect.height) * 2 - 1;

  return {
    x: Math.min(1, Math.max(-1, x)),
    y: Math.min(1, Math.max(-1, y))
  };
}
