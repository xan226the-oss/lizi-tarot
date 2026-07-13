"use client";

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getTarotCardById,
  tarotCards,
  type TarotCard,
  type TarotOrientation
} from "@/lib/tarot-cards";
import {
  isValidDailyDrawRecord,
  type DailyDrawRecord
} from "@/lib/daily-draw-record";

type DateContext = {
  weekday: number;
  season: "spring" | "summer" | "autumn" | "winter";
};

type WeatherContext = {
  condition?: string;
  temperature?: number;
} | null;

type CardRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type DailyDrawModal = {
  cardId: number;
  originRect: CardRect;
};

const DAILY_DRAW_KEY = "particle_daily_draw";
const ANON_ID_KEY = "particle_anon_id";

const weekdayTemplates = [
  "周日的节奏适合慢慢整理，把注意力放回真正重要的事。",
  "新的一周刚刚开始，先做一个清晰的小决定。",
  "周二适合稳定推进，让行动替代反复犹豫。",
  "一周行至中段，今天适合校准方向并保留余力。",
  "周四的积累正在显形，把耐心放在最值得的位置。",
  "一周将近尾声，适合收束杂念，确认真正想带走的答案。",
  "难得的松弛时刻，允许自己在安静里恢复判断。"
];

const seasonTemplates: Record<DateContext["season"], string> = {
  spring: "在这个万物生长的春天，新的可能正在悄悄发芽。",
  summer: "在这个盛夏的热烈里，能量会回应你的主动与坦诚。",
  autumn: "在这个逐渐沉静的秋天，取舍会让道路变得更清楚。",
  winter: "在这个适合蓄力的冬天，慢一点反而能看得更深。"
};

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createAnonymousId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function ensureAnonymousId() {
  const existing = window.localStorage.getItem(ANON_ID_KEY);
  if (existing) return existing;

  const nextId = createAnonymousId();
  window.localStorage.setItem(ANON_ID_KEY, nextId);
  return nextId;
}

function pickThreeCards() {
  const ids = tarotCards.map((card) => card.id);

  for (let index = ids.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [ids[index], ids[target]] = [ids[target], ids[index]];
  }

  return ids.slice(0, 3);
}

function createFreshRecord(date: string): DailyDrawRecord {
  return {
    date,
    shownCardIds: pickThreeCards(),
    selectedCardId: null,
    orientation: null
  };
}

function loadTodayRecord() {
  const date = todayKey();
  ensureAnonymousId();

  try {
    const stored = window.localStorage.getItem(DAILY_DRAW_KEY);
    const parsed = stored ? JSON.parse(stored) : null;

    if (isValidDailyDrawRecord(parsed, date)) {
      return parsed;
    }
  } catch {
    window.localStorage.removeItem(DAILY_DRAW_KEY);
  }

  const freshRecord = createFreshRecord(date);
  window.localStorage.setItem(DAILY_DRAW_KEY, JSON.stringify(freshRecord));
  return freshRecord;
}

function getDateContext(date = new Date()): DateContext {
  const month = date.getMonth() + 1;
  const season =
    month >= 3 && month <= 5
      ? "spring"
      : month >= 6 && month <= 8
        ? "summer"
        : month >= 9 && month <= 11
          ? "autumn"
          : "winter";

  return {
    weekday: date.getDay(),
    season
  };
}

function compactMeaning(text: string) {
  const cleanText = text.trim();
  const firstSentence = cleanText.split(/[。！？]/)[0] || cleanText;

  if (firstSentence.length <= 34) return firstSentence;
  return `${firstSentence.slice(0, 34)}...`;
}

export function generateDailyMessage(
  card: TarotCard,
  orientation: TarotOrientation,
  dateContext: DateContext,
  weatherContext?: WeatherContext
) {
  const source = orientation === "upright" ? card.meaning_upright : card.meaning_reversed;
  const summary = compactMeaning(source);
  const weekdayMessage = weekdayTemplates[dateContext.weekday] ?? weekdayTemplates[0];
  const seasonMessage = seasonTemplates[dateContext.season];

  void weatherContext;

  return `${card.name_cn} · ${summary}。${seasonMessage}${weekdayMessage}`;
}

function getOrientationLabel(orientation: TarotOrientation) {
  return orientation === "upright" ? "正位" : "逆位";
}

function CardBack() {
  return (
    <span className="tarot-card-side tarot-card-back">
      <span className="tarot-back-orbit" />
      <span className="font-cinzel text-[10px] tracking-[0.32em] text-accent-gold-70 sm:text-xs">
        PARTICLE
      </span>
      <span className="mt-3 h-px w-12 bg-accent-gold-50" />
    </span>
  );
}

function CardFace({
  card,
  orientation,
  message,
  compact = false,
  showMessageLabel = false
}: {
  card: TarotCard;
  orientation: TarotOrientation;
  message: string;
  compact?: boolean;
  showMessageLabel?: boolean;
}) {
  return (
    <span className={cn("tarot-card-side tarot-card-face", compact && "tarot-card-face-compact")}>
      <span className="tarot-face-kicker text-[10px] tracking-[0.24em] text-accent-gold-70">
        {orientation.toUpperCase()}
      </span>
      <span className="tarot-face-title mt-2 font-serif text-base font-semibold text-text-primary sm:text-lg">
        {card.name_cn}
      </span>
      <span className="tarot-face-subtitle mt-1 font-cinzel text-[10px] uppercase tracking-[0.18em] text-text-secondary">
        {card.name_en}
      </span>
      <span className="tarot-face-orientation mt-3 rounded-full border border-accent-gold-30 bg-accent-gold-10 px-3 py-1 text-xs text-accent-gold">
        {getOrientationLabel(orientation)}
      </span>
      <span className="tarot-face-divider my-3 h-px w-10 bg-accent-gold-50" />
      {showMessageLabel ? (
        <span className="tarot-face-message-label mb-2 text-xs tracking-[0.22em] text-accent-gold-70">
          今日启示
        </span>
      ) : null}
      <span className="tarot-face-insight px-2 text-xs leading-5 text-text-secondary">
        {compact ? "已查看" : message}
      </span>
    </span>
  );
}

export function DailyDraw() {
  const [record, setRecord] = useState<DailyDrawRecord | null>(null);
  const [modal, setModal] = useState<DailyDrawModal | null>(null);
  const [modalContentVisible, setModalContentVisible] = useState(false);
  const [nudgeCardId, setNudgeCardId] = useState<number | null>(null);
  const cardRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const nudgeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setRecord(loadTodayRecord());

    return () => {
      if (nudgeTimerRef.current) {
        window.clearTimeout(nudgeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!modal) return;

    const timeoutId = window.setTimeout(() => {
      setModalContentVisible(true);
    }, 1240);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [modal]);

  const selectedCard = useMemo(() => {
    if (!record?.selectedCardId) return null;
    return getTarotCardById(record.selectedCardId);
  }, [record]);

  const dateContext = useMemo(() => getDateContext(), []);

  const selectedMessage = useMemo(() => {
    if (!selectedCard || !record?.orientation) return null;
    return generateDailyMessage(selectedCard, record.orientation, dateContext);
  }, [dateContext, record, selectedCard]);

  const openModalFromCard = (cardId: number) => {
    const element = cardRefs.current[cardId];
    if (!element) return;

    const rect = element.getBoundingClientRect();
    setModalContentVisible(false);
    setModal({
      cardId,
      originRect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      }
    });
  };

  const showLockedFeedback = (cardId: number) => {
    setNudgeCardId(cardId);

    if (nudgeTimerRef.current) {
      window.clearTimeout(nudgeTimerRef.current);
    }

    nudgeTimerRef.current = window.setTimeout(() => {
      setNudgeCardId(null);
    }, 900);
  };

  const handleCardClick = (cardId: number) => {
    if (!record) return;

    if (record.selectedCardId === cardId) {
      openModalFromCard(cardId);
      return;
    }

    if (record.selectedCardId !== null) {
      showLockedFeedback(cardId);
      return;
    }

    const nextRecord: DailyDrawRecord = {
      ...record,
      selectedCardId: cardId,
      orientation: Math.random() > 0.5 ? "upright" : "reversed"
    };

    window.localStorage.setItem(DAILY_DRAW_KEY, JSON.stringify(nextRecord));
    setRecord(nextRecord);
    window.requestAnimationFrame(() => openModalFromCard(cardId));
  };

  const modalCard = modal ? getTarotCardById(modal.cardId) : null;
  const modalOrientation =
    modal && record?.selectedCardId === modal.cardId ? record.orientation : null;
  const modalMessage =
    modalCard && modalOrientation
      ? generateDailyMessage(modalCard, modalOrientation, dateContext)
      : null;

  const closeModal = () => {
    setModal(null);
    setModalContentVisible(false);
  };

  if (!record) {
    return (
      <div className="daily-draw-shell flex h-full min-h-[320px] w-full items-center justify-center">
        <div className="h-44 w-32 animate-pulse rounded-md border border-accent-gold-30 bg-glass-bg" />
      </div>
    );
  }

  return (
    <>
      <div className="daily-draw-shell flex h-full min-h-[320px] w-full flex-col items-center justify-center gap-5 px-3 py-5">
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-sm border border-accent-gold-30 bg-bg-base-56 text-accent-gold shadow-gold-soft">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-text-primary sm:text-3xl">
            每日一签
          </h1>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {selectedCard && record.orientation && selectedMessage
              ? "今日牌面已锁定，可点击已查看卡牌回顾"
              : "从三张牌中选择一张，翻开今天的提示"}
          </p>
        </div>

        <div className="grid w-full max-w-[640px] grid-cols-3 items-center gap-3 sm:gap-5">
          {record.shownCardIds.map((cardId, index) => {
            const card = getTarotCardById(cardId);
            const isSelected = record.selectedCardId === cardId;
            const isLockedBack = record.selectedCardId !== null && !isSelected;

            return (
              <button
                key={cardId}
                ref={(element) => {
                  cardRefs.current[cardId] = element;
                }}
                type="button"
                onClick={() => handleCardClick(cardId)}
                aria-disabled={isLockedBack}
                className={cn(
                  "daily-draw-card group relative mx-auto aspect-[5/7] w-full max-w-[132px] outline-none sm:max-w-[152px]",
                  index === 1 && "sm:max-w-[176px]",
                  isSelected && "is-viewed",
                  isLockedBack && "is-locked-back cursor-not-allowed opacity-65",
                  nudgeCardId === cardId && "is-nudging",
                  !record.selectedCardId && "cursor-pointer"
                )}
                aria-label={
                  isSelected && card
                    ? `已查看：${card.name_cn}`
                    : isLockedBack
                      ? "今日已选，明天再来"
                      : `候选牌 ${index + 1}`
                }
              >
                <span className="daily-draw-inner">
                  {isSelected && card && record.orientation && selectedMessage ? (
                    <CardFace
                      card={card}
                      orientation={record.orientation}
                      message={selectedMessage}
                      compact
                    />
                  ) : (
                    <CardBack />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <p
          className={cn(
            "h-5 text-center text-xs text-accent-gold transition-opacity duration-base",
            nudgeCardId ? "opacity-100" : "opacity-0"
          )}
          aria-live="polite"
        >
          今日已选，明天再来
        </p>
      </div>

      {modal && modalCard && modalOrientation && modalMessage ? (
        <div
          className="daily-draw-modal fixed inset-0 z-30 flex items-center justify-center bg-bg-base-70 px-5 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="今日一签结果"
          onClick={closeModal}
        >
          <button
            type="button"
            className="daily-draw-modal-close absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-sm border border-accent-gold-30 bg-bg-base-70 text-xl leading-none text-text-primary transition duration-base hover:border-accent-gold hover:text-accent-gold"
            onClick={(event) => {
              event.stopPropagation();
              closeModal();
            }}
            aria-label="关闭每日一签结果"
          >
            ✕
          </button>
          <div
            className={cn(
              "daily-draw-lightbox-card",
              modalContentVisible && "is-content-visible"
            )}
            style={
              {
                "--origin-left": `${modal.originRect.left}px`,
                "--origin-top": `${modal.originRect.top}px`,
                "--origin-center-x": `${modal.originRect.left + modal.originRect.width / 2}px`,
                "--origin-center-y": `${modal.originRect.top + modal.originRect.height / 2}px`,
                "--origin-width": `${modal.originRect.width}px`,
                "--origin-height": `${modal.originRect.height}px`
              } as CSSProperties
            }
            onClick={(event) => event.stopPropagation()}
          >
            <span className="daily-draw-lightbox-back">
              <CardBack />
            </span>
            <span className="daily-draw-lightbox-content">
              <CardFace
                card={modalCard}
                orientation={modalOrientation}
                message={modalMessage}
                showMessageLabel
              />
            </span>
          </div>
        </div>
      ) : null}
    </>
  );
}
