import styles from "./Chat.module.css";

export type ChatDisplayMessage = { id: string; role: "assistant" | "user"; content: string; isOpening?: boolean };

export function ChatMessageList({ messages, cardName, isLoading }: { messages: readonly ChatDisplayMessage[]; cardName: string; isLoading: boolean }) {
  return <ol className={styles.messageList} aria-label="对话记录">
    {messages.map((message) => <li key={message.id} className={message.role === "assistant" ? styles.assistantMessage : styles.userMessage}>
      {message.role === "assistant" ? <span className={styles.roleWhisper}>{cardName}</span> : null}
      <p>{message.content}</p>
    </li>)}
    {isLoading ? <li className={styles.loadingMessage} aria-live="polite">{cardName} 正在整理回应…</li> : null}
  </ol>;
}
