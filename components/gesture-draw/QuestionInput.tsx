"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Camera, PenLine, Sparkles } from "lucide-react";
import { AmbientTarotBackdrop } from "@/components/hub/AmbientTarotBackdrop";
import { ParticleField } from "@/components/ui/ParticleField";
import { ConstellationLogo } from "@/components/ui/ConstellationLogo";
import { cn } from "@/lib/utils";
import type { InteractionMode } from "@/lib/gesture/types";
import styles from "./QuestionInput.module.css";

type QuestionInputProps = {
  mode: InteractionMode;
  cameraError: string | null;
  onSubmit: (question: string) => void;
  onUseClickMode: () => void;
  onUseGestureMode: () => void;
};

const examples = [
  "未来三个月，我应该把事业重心放在哪里？",
  "这段关系里，我最需要看清什么？",
  "面对这个选择，我忽略了哪种内在声音？"
];

const questionHint = "把此刻最想确认的命题，交给星域";

function getQuestionError(question: string) {
  const trimmed = question.trim();
  const compact = trimmed.replace(/\s/g, "");

  if (compact.length < 8) return "请写下一个更完整的问题";
  if (/^\d+$/.test(compact)) return "星域需要真实问题，而不是数字代号";
  if (!/[A-Za-z0-9\u4e00-\u9fff]/.test(compact)) return "请用文字描述你想询问的事";

  const uniqueCharacters = new Set(Array.from(compact)).size;
  if (uniqueCharacters === 1 && compact.length >= 6) return "重复字符无法形成清晰星图";

  const uniqueRatio = uniqueCharacters / compact.length;
  if (compact.length >= 8 && uniqueRatio < 0.28) {
    return "请让问题更具体一些";
  }

  return null;
}

export function QuestionInput({
  mode,
  cameraError,
  onSubmit,
  onUseClickMode,
  onUseGestureMode
}: QuestionInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [question, setQuestion] = useState("");
  const [touched, setTouched] = useState(false);
  const [textareaPaddingBlock, setTextareaPaddingBlock] = useState("0px");
  const trimmedQuestion = question.trim();
  const validationError = useMemo(() => getQuestionError(question), [question]);
  const hasError = touched && Boolean(validationError);

  const updateTextareaPosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const targetHeight = textarea.getBoundingClientRect().height;
    const previousHeight = textarea.style.height;
    const previousMinHeight = textarea.style.minHeight;
    const previousPaddingTop = textarea.style.paddingTop;
    const previousPaddingBottom = textarea.style.paddingBottom;

    textarea.style.height = "auto";
    textarea.style.minHeight = "0px";
    textarea.style.paddingTop = "0px";
    textarea.style.paddingBottom = "0px";

    const contentHeight = textarea.scrollHeight;

    textarea.style.height = previousHeight;
    textarea.style.minHeight = previousMinHeight;
    textarea.style.paddingTop = previousPaddingTop;
    textarea.style.paddingBottom = previousPaddingBottom;

    const nextPadding = Math.max(0, (targetHeight - contentHeight) / 2);
    setTextareaPaddingBlock(`${Math.round(nextPadding * 100) / 100}px`);
  }, []);

  useLayoutEffect(() => {
    updateTextareaPosition();
  }, [question, updateTextareaPosition]);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    window.addEventListener("resize", updateTextareaPosition);

    return () => {
      window.removeEventListener("resize", updateTextareaPosition);
    };
  }, [updateTextareaPosition]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);

    if (validationError) return;
    onSubmit(trimmedQuestion);
  };

  return (
    <main className={styles.page}>
      <Image
        src="/images/hub-starfield.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className={styles.backgroundImage}
        aria-hidden="true"
      />
      <AmbientTarotBackdrop className={styles.ambientCards} />
      <div className={styles.atmosphere} aria-hidden="true" />
      <ParticleField className={styles.particles} count={240} />

      <form
        className={styles.shell}
        onSubmit={handleSubmit}
      >
        <header className={styles.header}>
          <div className={styles.navRow}>
            <Link href="/" className={styles.brandLink} aria-label="粒子首页">
              <ConstellationLogo className={styles.brandLogo} />
              <span>粒子</span>
            </Link>

            <div className={styles.navActions}>
              <Link href="/" className={styles.navButton} aria-label="返回首页">
                <ArrowLeft className={styles.actionIcon} aria-hidden="true" />
                返回首页
              </Link>

              {mode === "gesture" ? (
                <button
                  type="button"
                  className={styles.modePill}
                  onClick={onUseClickMode}
                  aria-label="改用点击模式"
                >
                  <Camera className={styles.actionIcon} aria-hidden="true" />
                  改用点击模式
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.modePill}
                  onClick={onUseGestureMode}
                  aria-label="重试摄像头"
                >
                  <Camera className={styles.actionIcon} aria-hidden="true" />
                  重试摄像头
                </button>
              )}
            </div>
          </div>
        </header>

        <section className={styles.stage} aria-label="星域问题记录">
          <div className={styles.recorder}>
            <div className={styles.titleBlock}>
              <span className={styles.titleSigil} aria-hidden="true">
                <Sparkles className={styles.titleIcon} />
              </span>
              <h1>将你的问题交给星域</h1>
              <p className={styles.spreadBadge}>真实摄像头手势感应</p>
            </div>

            {cameraError ? (
              <div className="mt-4 rounded-sm border border-[color:var(--state-error-border)] bg-bg-base-70 px-4 py-3 text-sm leading-6 text-[color:var(--state-error-text)]">
                {cameraError}
              </div>
            ) : null}

            <div className={styles.recorderHeader}>
              <span className={styles.headerLine} aria-hidden="true" />
              <span className={styles.recorderTitle}>
                <PenLine className={styles.penIcon} aria-hidden="true" />
                星图记录
              </span>
              <span className={styles.headerLine} aria-hidden="true" />
            </div>

            <div
              className={styles.textField}
              data-has-value={question ? "true" : undefined}
              data-invalid={hasError ? "true" : undefined}
            >
              <span className={styles.fieldAura} aria-hidden="true" />
              <span className={styles.fieldStars} aria-hidden="true" />
              <span className={styles.fieldOrbit} aria-hidden="true" />
              <div className={styles.fieldInner}>
                <label htmlFor="gesture-question" className="sr-only">
                  向星域提出的问题
                </label>
                {!question && (
                  <span className={styles.placeholderText} aria-hidden="true">
                    {questionHint}
                  </span>
                )}
                <textarea
                  ref={textareaRef}
                  id="gesture-question"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  onBlur={() => setTouched(true)}
                  rows={1}
                  className={styles.textarea}
                  style={{
                    paddingBottom: textareaPaddingBlock,
                    paddingTop: textareaPaddingBlock
                  }}
                  aria-describedby="gesture-question-help gesture-question-error"
                  aria-invalid={hasError}
                />
              </div>
            </div>

            <div className={styles.feedbackRow}>
              <p id="gesture-question-help">
                问题将成为本次抽牌的星图坐标。
              </p>
              <p
                id="gesture-question-error"
                className={cn(styles.errorText, hasError && styles.errorTextVisible)}
                aria-live="polite"
              >
                {hasError ? validationError : ""}
              </p>
            </div>

            <div className={styles.examples} aria-label="示例问题">
              {examples.map((example) => (
                <button
                  key={example}
                  type="button"
                  className={styles.exampleNode}
                  onClick={() => {
                    setQuestion(example);
                    setTouched(false);
                  }}
                >
                  <span aria-hidden="true" />
                  {example}
                </button>
              ))}
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              data-ready={trimmedQuestion.length > 0 ? "true" : undefined}
            >
              <span className={styles.submitDust} aria-hidden="true" />
              <Sparkles className={styles.submitIcon} aria-hidden="true" />
              <span className={styles.submitLabel}>刻入星域</span>
            </button>
          </div>
        </section>

        <footer className={styles.footer}>
          <span aria-hidden="true" />
          <p>进入星域前，请只保留一个真正想确认的问题</p>
          <span aria-hidden="true" />
        </footer>
      </form>
    </main>
  );
}
