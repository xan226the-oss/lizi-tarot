import { tarotCards } from "../tarot-cards.ts";
import { ORBIT_CONFIG } from "./config.ts";
import type { OrbitCardSlot, OrbitFrame, PointerPosition } from "./types.ts";

type OrbitMotionInput = {
  offset: number;
  speed: number;
  pointer: PointerPosition;
  deltaSeconds: number;
  excludedCardIds?: string[];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getOrbitEdgeVisibility(localPosition: number, half: number) {
  const distance = Math.abs(localPosition);
  const fadeStart = half - 1.5;
  const fadeEnd = half + 0.5;
  return clamp((fadeEnd - distance) / (fadeEnd - fadeStart), 0, 1);
}

export function wrapTarotIndex(index: number) {
  const length = tarotCards.length;
  return ((index % length) + length) % length;
}

export function normalizePointer(pointer: PointerPosition): PointerPosition {
  return {
    x: clamp(pointer.x, -1, 1),
    y: clamp(pointer.y, -1, 1)
  };
}

export function pointerToOrbitAngle(pointer: PointerPosition) {
  const normalized = normalizePointer(pointer);
  return normalized.x * ORBIT_CONFIG.pointerAngleRange;
}

export function getVisibleOrbitCards(offset: number): OrbitCardSlot[] {
  const visibleCount = ORBIT_CONFIG.visibleCards;
  const half = Math.floor(visibleCount / 2);
  const center = Math.round(offset);
  const fractional = offset - center;

  return Array.from({ length: visibleCount }, (_, index) => {
    const slotIndex = index - half;
    const virtualIndex = center + slotIndex;
    const wrappedIndex = wrapTarotIndex(virtualIndex);
    const localPosition = slotIndex - fractional;
    const angle = localPosition * ORBIT_CONFIG.angleStep;
    const distance = Math.abs(localPosition);
    const depth = Math.max(0, 1 - distance / (half + 1));
    const scale = 0.8 + depth * 0.3;
    const edgeVisibility = getOrbitEdgeVisibility(localPosition, half);
    const opacity = (0.42 + depth * 0.58) * edgeVisibility;
    const stageY = 1 + (1 - depth) * 13;

    return {
      cardId: String(tarotCards[wrappedIndex].id),
      virtualIndex,
      slotIndex,
      angle,
      depth,
      scale,
      opacity,
      x: Math.sin(angle) * 44,
      y: stageY,
      zIndex: 40 + Math.round(depth * 90)
    };
  });
}

export function getNearestOrbitCard(
  pointer: PointerPosition,
  offset: number,
  excludedCardIds: string[] = []
) {
  const pointerAngle = pointerToOrbitAngle(pointer);
  const slots = getVisibleOrbitCards(offset);
  const excluded = new Set(excludedCardIds);
  const selectableSlots = slots.filter((slot) => !excluded.has(slot.cardId));
  const candidates = selectableSlots.length > 0 ? selectableSlots : slots;

  return candidates.reduce((nearest, slot) => {
    const nearestDistance = Math.abs(nearest.angle - pointerAngle);
    const slotDistance = Math.abs(slot.angle - pointerAngle);

    if (slotDistance < nearestDistance) return slot;
    if (slotDistance === nearestDistance && slot.virtualIndex < nearest.virtualIndex) return slot;
    return nearest;
  }, candidates[0]);
}

export function getPointerForOrbitCard(slot: Pick<OrbitCardSlot, "x" | "y">): PointerPosition {
  return {
    x: clamp(slot.x / 44, -1, 1),
    y: clamp((slot.y - 8) / 16, -1, 1)
  };
}

export function getOrbitCardAtPointer(
  pointer: PointerPosition,
  offset: number,
  excludedCardIds: string[] = []
) {
  const normalized = normalizePointer(pointer);
  const pointerStageX = normalized.x * 44;
  const pointerStageY = normalized.y * 16 + 8;
  const slots = getVisibleOrbitCards(offset);
  const excluded = new Set(excludedCardIds);
  const selectableSlots = slots.filter((slot) => !excluded.has(slot.cardId));
  const candidates = selectableSlots.length > 0 ? selectableSlots : slots;

  return candidates.reduce((nearest, slot) => {
    const nearestDx = nearest.x - pointerStageX;
    const nearestDy = nearest.y - pointerStageY;
    const slotDx = slot.x - pointerStageX;
    const slotDy = slot.y - pointerStageY;
    const nearestDistance = nearestDx * nearestDx + nearestDy * nearestDy * 0.42;
    const slotDistance = slotDx * slotDx + slotDy * slotDy * 0.42;

    if (slotDistance < nearestDistance) return slot;
    if (slotDistance === nearestDistance && slot.virtualIndex < nearest.virtualIndex) return slot;
    return nearest;
  }, candidates[0]);
}

export function advanceOrbitFrame(input: OrbitMotionInput): OrbitFrame {
  const pointer = normalizePointer(input.pointer);
  const activeX = Math.abs(pointer.x) < ORBIT_CONFIG.pointerDeadZone ? 0 : pointer.x;
  const targetSpeed =
    activeX * ORBIT_CONFIG.maxOrbitSpeed * ORBIT_CONFIG.pointerSensitivity;
  const damping = 1 - Math.exp(-ORBIT_CONFIG.orbitDamping * input.deltaSeconds);
  const speed = input.speed + (targetSpeed - input.speed) * damping;
  const offset = input.offset + speed * input.deltaSeconds;
  const selected = getOrbitCardAtPointer(pointer, offset, input.excludedCardIds);

  return {
    offset,
    speed,
    selectedCardId: selected.cardId,
    selectedVirtualIndex: selected.virtualIndex,
    selectedAngle: selected.angle,
    pointerAngle: pointerToOrbitAngle(pointer)
  };
}
