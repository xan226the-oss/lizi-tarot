"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { ChatMessageList, type ChatDisplayMessage } from "./ChatMessageList";
import styles from "./Chat.module.css";
import { StarfieldParticles } from "./StarfieldParticles";

export function SingleCardChat({ cardId, cardName, openingLine }: { cardId: number; cardName: string; openingLine: string }) {
  const opening = { id: "opening", role: "assistant" as const, content: openingLine, isOpening: true };
  const [messages, setMessages] = useState<ChatDisplayMessage[]>([opening]);
  const [draft, setDraft] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [aiDisclosureConfirmed, setAiDisclosureConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastFailedMessage, setLastFailedMessage] = useState("");
  const controllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => () => { controllerRef.current?.abort(); requestIdRef.current += 1; }, []);

  const sendMessage = async (raw: string) => {
    const message = raw.trim();
    if (message.length < 2 || message.length > 600) { setError("请输入 2 至 600 个字符。"); return; }
    if (!ageConfirmed || !aiDisclosureConfirmed) { setError("请先完成本页声明与 AI 数据处理确认。"); return; }
    controllerRef.current?.abort();
    const requestId = ++requestIdRef.current;
    const historyForRequest = messages.filter((item) => !item.isOpening).slice(-8).map((item) => ({ role: item.role, content: item.content }));
    setMessages((previous) => [...previous, { id: `u-${requestId}`, role: "user", content: message }]);
    setDraft(""); setError(""); setIsLoading(true);
    const controller = new AbortController(); controllerRef.current = controller;
    try {
      const response = await fetch(`/api/chat/${cardId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, history: historyForRequest, ageConfirmed, aiDisclosureConfirmed }), signal: controller.signal });
      const data = await response.json() as { message?: string; error?: string };
      if (!response.ok || !data.message) throw new Error(data.error || "聊天服务暂时不可用，请稍后再试。");
      if (requestId === requestIdRef.current) setMessages((previous) => [...previous, { id: `a-${requestId}`, role: "assistant", content: data.message! }]);
    } catch (cause) {
      if (requestId === requestIdRef.current && !(cause instanceof DOMException && cause.name === "AbortError")) { setError(cause instanceof Error ? cause.message : "聊天服务暂时不可用，请稍后再试。"); setLastFailedMessage(message); }
    } finally { if (requestId === requestIdRef.current) { controllerRef.current = null; setIsLoading(false); } }
  };

  const reset = () => { controllerRef.current?.abort(); requestIdRef.current += 1; setMessages([opening]); setDraft(""); setError(""); setLastFailedMessage(""); setIsLoading(false); };

  return <section className={styles.chatViewport}>
    <StarfieldParticles />
    <div className={styles.chatScrollArea}>
      <div className={styles.chatShell}>
        <ChatMessageList messages={messages} cardName={cardName} isLoading={isLoading} />
        {(!ageConfirmed || !aiDisclosureConfirmed) ? <div className={styles.consentPanel}>
          <label><input type="checkbox" checked={ageConfirmed} onChange={(event) => setAgeConfirmed(event.target.checked)} /> 我已满 18 周岁（仅当前页面声明，不是年龄验证）</label>
          <label><input type="checkbox" checked={aiDisclosureConfirmed} onChange={(event) => setAiDisclosureConfirmed(event.target.checked)} /> 我理解本轮消息与最近 8 条对话将发送给 AI 服务处理。</label>
        </div> : null}
        {error ? <p className={styles.error} role="alert" aria-live="polite">{error}</p> : null}
      </div>
    </div>
    <form className={styles.composer} onSubmit={(event: FormEvent) => { event.preventDefault(); void sendMessage(draft); }}>
      <label className={styles.srOnly} htmlFor="chat-draft">想对{cardName}说什么？</label>
      <div className={styles.inputRow}><textarea id="chat-draft" value={draft} onChange={(event) => setDraft(event.target.value)} aria-describedby="chat-help" maxLength={600} placeholder="把此刻的感受、疑问或处境留在这里…" /><button type="submit" aria-label="发送消息" disabled={isLoading || draft.trim().length < 2 || !ageConfirmed || !aiDisclosureConfirmed}>发送</button></div>
      <div className={styles.composerFooter}><small id="chat-help">{draft.length}/600 · 塔罗仅作象征性陪伴</small><span>{lastFailedMessage ? <button type="button" onClick={() => void sendMessage(lastFailedMessage)} disabled={isLoading}>重试</button> : null}<button type="button" onClick={reset}>开始新话题</button></span></div>
    </form>
  </section>;
}
