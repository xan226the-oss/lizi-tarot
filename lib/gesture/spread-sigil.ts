import type { ReadingSpread } from "./types.ts";

export type SpreadSigilGeometry = {
  label: string;
  orbit: "wide" | "round";
  viewBox: string;
  points: Array<{ x: number; y: number }>;
};

const GEOMETRY: Record<ReadingSpread, SpreadSigilGeometry> = {
  three: {
    label: "三张星轨",
    orbit: "wide",
    viewBox: "0 0 160 100",
    points: [
      { x: 34, y: 57 },
      { x: 80, y: 46 },
      { x: 126, y: 57 }
    ]
  },
  five: {
    label: "五芒星阵",
    orbit: "round",
    viewBox: "0 0 100 100",
    points: [
      { x: 50, y: 12 },
      { x: 86, y: 38 },
      { x: 72, y: 81 },
      { x: 28, y: 81 },
      { x: 14, y: 38 }
    ]
  }
};

export function getSpreadSigilGeometry(spread: ReadingSpread) {
  return GEOMETRY[spread];
}
