"use client";
import { useEffect, useRef, useState } from "react";

type Msg = { id: number; sender: "traveler" | "scout"; body: string; createdAt: string };

const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
const POLL_MS = 2000;

/**
 * Pre-booking chat. New scout messages arrive by polling and are announced through a
 * dedicated polite live region ("New message from Inês: …"), rather than making the
 * whole thread live, so screen-reader users hear each incoming message once and
 * never hear their own messages echoed back.
 */
export function Chat({ scoutSlug, scoutFirstName, initial }: { scoutSlug: string; scoutFirstName: string; initial: Msg[] }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const lastId = useRef(initial.at(-1)?.id ?? 0);
  const threadRef = useRef<HTMLOListElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function merge(incoming: Msg[]) {
    if (!incoming.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
    lastId.current = Math.max(lastId.current, ...incoming.map((m) => m.id));
    const fromScout = incoming.filter((m) => m.sender === "scout");
    if (fromScout.length) {
      setAnnouncement(fromScout.map((m) => `New message from ${scoutFirstName}: ${m.body}`).join(" "));
    }
  }

  useEffect(() => {
    let stopped = false;
    async function poll() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/messages?scout=${encodeURIComponent(scoutSlug)}&after=${lastId.current}`, {
          cache: "no-store",
        });
        if (!res.ok || stopped) return;
        const data = (await res.json()) as { messages: Msg[] };
        merge(data.messages);
      } catch {
        /* offline: try again next tick */
      }
    }
    const t = setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoutSlug]);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) {
      setError("Write a message before sending");
      inputRef.current?.focus();
      return;
    }
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scout: scoutSlug, body: draft }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Your message wasn't sent. Try again.");
        inputRef.current?.focus();
        return;
      }
      setDraft("");
      // Mark as seen without bumping lastId past an unseen scout reply.
      setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
      setAnnouncement("Message sent.");
      inputRef.current?.focus();
    } catch {
      setError("You appear to be offline. Your message wasn't sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <section aria-labelledby="conversation-heading">
        <h2 id="conversation-heading">Conversation</h2>
        {messages.length === 0 ? (
          <p className="muted" id="empty-thread">
            No messages yet. Say hello and describe your trip.
          </p>
        ) : null}
        <ol className="thread" ref={threadRef} tabIndex={0} aria-label={`Messages with ${scoutFirstName}`} hidden={messages.length === 0}>
          {messages.map((m) => (
            <li key={m.id} className={`msg msg-${m.sender}`}>
              <p className="msg-meta">
                <span>{m.sender === "traveler" ? "You" : scoutFirstName}</span>
                {", "}
                <time dateTime={m.createdAt}>{timeFmt.format(new Date(m.createdAt))}</time>
              </p>
              <p>{m.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      <form onSubmit={send} noValidate className="card">
        <div className="field">
          <label htmlFor="message">Your message to {scoutFirstName}</label>
          <p className="hint" id="message-hint">
            Don&apos;t share payment details here. Press Send, or Control and Enter, to send.
          </p>
          {error && (
            <p className="field-error" id="message-error">
              <span className="visually-hidden">Error:</span> {error}
            </p>
          )}
          <textarea
            id="message"
            ref={inputRef}
            value={draft}
            maxLength={1000}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(e);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={`message-hint${error ? " message-error" : ""}`}
          />
        </div>
        <button type="submit" className="btn" disabled={sending}>
          {sending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}
