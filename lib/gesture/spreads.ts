import type { ReadingSpread, SpreadSlot } from "@/lib/gesture/types";

export const SPREAD_LAYOUTS: Record<
  ReadingSpread,
  { title: string; subtitle: string; slots: SpreadSlot[] }
> = {
  three: {
    title: "抽三张",
    subtitle: "过去 / 现在 / 未来",
    slots: [
      { id: "past", label: "过去", x: 25, y: 50 },
      { id: "present", label: "现在", x: 50, y: 50 },
      { id: "future", label: "未来", x: 75, y: 50 }
    ]
  },
  five: {
    title: "抽五张",
    subtitle: "身 / 心 / 灵 / 情感 / 环境",
    slots: [
      { id: "body", label: "身", x: 50, y: 10 },
      { id: "mind", label: "心", x: 88, y: 38 },
      { id: "spirit", label: "灵", x: 74, y: 82 },
      { id: "emotion", label: "情感", x: 27, y: 82 },
      { id: "environment", label: "环境", x: 12, y: 38 }
    ]
  }
};

export function getSpreadSlots(spread: ReadingSpread | null) {
  return spread ? SPREAD_LAYOUTS[spread].slots : [];
}

export function getSpreadTitle(spread: ReadingSpread | null) {
  return spread ? SPREAD_LAYOUTS[spread].title : "未选择牌阵";
}
