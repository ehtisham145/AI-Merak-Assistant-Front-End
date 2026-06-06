"use client";
import ReactMarkdown from "react-markdown";
import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

type Message = {
  role: "user" | "bot";
  text: string;
};

type Screen = "register" | "chat";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>("register");
  const [sessionId, setSessionId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API = "https://tax-data-assistant-backend-production.up.railway.app";
  const suggestions = [
    "What is the primary objective of the UAE's E-invoicing System?",
    "What is E-Numerak?",
    "What is a TRN?",
  ];

  useEffect(() => {
    const existing = localStorage.getItem("chat_session_id");
    if (existing) {
      setSessionId(existing);
    } else {
      const newId = uuidv4();
      localStorage.setItem("chat_session_id", newId);
      setSessionId(newId);
    }

    const registered = localStorage.getItem("chat_registered");
    const savedName = localStorage.getItem("chat_user_name");
    const savedEmail = localStorage.getItem("chat_user_email");

    if (registered === "true" && savedName && savedEmail) {
      setScreen("chat");
      setMessages([
        {
          role: "bot",
          text: `Welcome back, **${savedName}!** 👋 How can I assist you with UAE tax today?`,
        },
      ]);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleRegister = async () => {
    setRegisterError("");
    if (!sessionId) return setRegisterError("Please wait and try again.");
    if (!name.trim()) return setRegisterError("Please enter your name.");
    if (!email.trim() || !email.includes("@"))
      return setRegisterError("Please enter a valid email.");

    setRegisterLoading(true);
    try {
      const res = await fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          session_id: sessionId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("chat_registered", "true");
        localStorage.setItem("chat_user_name", name.trim());
        localStorage.setItem("chat_user_email", email.trim());
        setScreen("chat");
        setMessages([
          {
            role: "bot",
            text: `Hello **${name.trim()}!** 👋 I'm your E-Numerak Tax Assistant. How can I help you today?`,
          },
        ]);
      } else {
        setRegisterError(data.detail || "Registration failed. Please try again.");
      }
    } catch {
      setRegisterError("Connection failed. Please check your internet.");
    } finally {
      setRegisterLoading(false);
    }
  };

  const sendMessage = async (text?: string) => {
    const userMessage = text || input;
    if (!userMessage.trim() || loading || !sessionId) return;

    const savedEmail = localStorage.getItem("chat_user_email") || "";

    if (!savedEmail) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "⚠️ Session expired. Please register again." },
      ]);
      localStorage.removeItem("chat_registered");
      setScreen("register");
      return;
    }

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          session_id: sessionId,
          email: savedEmail,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: `⚠️ ${errData.detail || "Something went wrong. Please try again."}`,
          },
        ]);
        setLoading(false);
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let botReply = "";
      setMessages((prev) => [...prev, { role: "bot", text: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        botReply += decoder.decode(value);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "bot", text: botReply };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "⚠️ Connection error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = async () => {
    await fetch(`${API}/clear-memory/${sessionId}`, { method: "POST" });
    setMessages([{ role: "bot", text: "New conversation started! How can I help you? 😊" }]);
  };

  const handleLogout = () => {
    localStorage.removeItem("chat_registered");
    localStorage.removeItem("chat_user_name");
    localStorage.removeItem("chat_user_email");
    localStorage.removeItem("chat_session_id");
    setSessionId("");
    setScreen("register");
    setName("");
    setEmail("");
    setMessages([]);
    const newId = uuidv4();
    localStorage.setItem("chat_session_id", newId);
    setSessionId(newId);
  };

  return (
    <>
      {/* Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@600;700;800&display=swap');

        .chat-widget * { font-family: 'DM Sans', sans-serif; }
        .chat-widget-title { font-family: 'Syne', sans-serif; }

        .chat-bubble-in {
          animation: bubbleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes bubbleIn {
          from { opacity: 0; transform: scale(0.85) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .widget-open {
          animation: widgetOpen 0.3s cubic-bezier(0.34, 1.4, 0.64, 1);
          transform-origin: bottom right;
        }
        @keyframes widgetOpen {
          from { opacity: 0; transform: scale(0.7) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .dot-bounce { animation: dotBounce 1.2s infinite ease-in-out; }
        .dot-bounce:nth-child(2) { animation-delay: 0.2s; }
        .dot-bounce:nth-child(3) { animation-delay: 0.4s; }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }

        .fab-pulse::after {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: rgba(99,102,241,0.35);
          animation: fabPulse 2s ease-out infinite;
        }
        @keyframes fabPulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }

        .suggestion-pill {
          transition: all 0.18s ease;
          border: 1.5px solid #c7d2fe;
          background: #eef2ff;
          color: #4338ca;
        }
        .suggestion-pill:hover {
          background: #4f46e5;
          color: white;
          border-color: #4f46e5;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(79,70,229,0.25);
        }

        .send-btn {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          transition: all 0.18s ease;
        }
        .send-btn:hover:not(:disabled) {
          transform: scale(1.08);
          box-shadow: 0 4px 14px rgba(79,70,229,0.45);
        }

        .input-field:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }

        .prose-bot p { margin-bottom: 0.4rem; }
        .prose-bot p:last-child { margin-bottom: 0; }
        .prose-bot ul { list-style: none; padding: 0; margin: 0.4rem 0; }
        .prose-bot ul li { padding-left: 1.2rem; position: relative; margin-bottom: 0.25rem; }
        .prose-bot ul li::before { content: '›'; position: absolute; left: 0; color: #6366f1; font-weight: 700; }
        .prose-bot ol { padding-left: 1.4rem; margin: 0.4rem 0; }
        .prose-bot ol li { margin-bottom: 0.25rem; }
        .prose-bot strong { color: #1e1b4b; font-weight: 600; }
        .prose-bot h1, .prose-bot h2 { font-family: 'Syne', sans-serif; font-weight: 700; margin: 0.6rem 0 0.3rem; color: #1e1b4b; font-size: 0.95rem; }
        .prose-bot h3 { font-weight: 600; margin: 0.4rem 0 0.2rem; color: #312e81; font-size: 0.875rem; }
        .prose-bot code { background: #e0e7ff; color: #3730a3; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.8rem; }
      `}</style>

      <div className="chat-widget fixed bottom-6 right-6 z-50">
        {/* Chat Window */}
        {isOpen && (
          <div
            className="widget-open mb-4 flex flex-col rounded-3xl overflow-hidden bg-white"
            style={{
              width: "370px",
              height: "560px",
              boxShadow: "0 24px 60px rgba(79,70,229,0.18), 0 4px 16px rgba(0,0,0,0.08)",
              border: "1px solid rgba(99,102,241,0.15)",
            }}
          >
            {/* ── Header ── */}
            <div
              className="relative px-4 py-3 flex items-center gap-3 flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #1e1b4b 0%, #4f46e5 60%, #7c3aed 100%)",
              }}
            >
              {/* Decorative circles */}
              <div style={{
                position: "absolute", top: -20, right: -20,
                width: 80, height: 80, borderRadius: "50%",
                background: "rgba(255,255,255,0.05)"
              }} />
              <div style={{
                position: "absolute", bottom: -30, left: 60,
                width: 60, height: 60, borderRadius: "50%",
                background: "rgba(255,255,255,0.04)"
              }} />

              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(8px)",
                border: "1.5px solid rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, flexShrink: 0, position: "relative", zIndex: 1
              }}>
                🤖
              </div>

              <div className="flex-1 min-w-0" style={{ position: "relative", zIndex: 1 }}>
                <p className="chat-widget-title text-white font-bold leading-tight" style={{ fontSize: "0.95rem", letterSpacing: "-0.01em" }}>
                  E-Numerak AI Assistant
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: "#4ade80",
                    boxShadow: "0 0 6px #4ade80",
                    display: "inline-block"
                  }} />
                  <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.7rem" }}>
                    Online · UAE Tax Expert
                  </span>
                </div>
              </div>

              {screen === "chat" && (
                <div className="flex items-center gap-1.5" style={{ position: "relative", zIndex: 1 }}>
                  <button
                    onClick={handleNewChat}
                    style={{
                      color: "rgba(255,255,255,0.75)",
                      fontSize: "0.68rem",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: 20,
                      padding: "2px 10px",
                      background: "rgba(255,255,255,0.08)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseOver={e => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
                    onMouseOut={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                  >
                    New
                  </button>
                  <button
                    onClick={handleLogout}
                    style={{
                      color: "rgba(255,255,255,0.75)",
                      fontSize: "0.68rem",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: 20,
                      padding: "2px 10px",
                      background: "rgba(255,255,255,0.08)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseOver={e => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
                    onMouseOut={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                  >
                    Exit
                  </button>
                </div>
              )}

              <button
                onClick={() => setIsOpen(false)}
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 22,
                  lineHeight: 1,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0 0 0 4px",
                  position: "relative",
                  zIndex: 1,
                  transition: "color 0.15s",
                }}
                onMouseOver={e => (e.currentTarget.style.color = "white")}
                onMouseOut={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
              >
                ×
              </button>
            </div>

            {/* ── Register Screen ── */}
            {screen === "register" && (
              <div className="flex-1 flex flex-col justify-center px-6 py-5 overflow-y-auto"
                style={{ background: "linear-gradient(160deg, #f8f7ff 0%, #eef2ff 100%)" }}>
                <div className="text-center mb-5">
                  <div style={{
                    width: 60, height: 60, borderRadius: "50%",
                    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 26, margin: "0 auto 12px",
                    boxShadow: "0 8px 24px rgba(79,70,229,0.3)"
                  }}>
                    🤖
                  </div>
                  <h2 className="chat-widget-title text-gray-900 font-bold" style={{ fontSize: "1.1rem", letterSpacing: "-0.02em" }}>
                    Welcome to E-Numerak
                  </h2>
                  <p style={{ color: "#6b7280", fontSize: "0.75rem", marginTop: 4 }}>
                    Your UAE Tax Assistant · Available 24/7
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Name field */}
                  <div>
                    <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                      Full Name
                    </label>
                    <div style={{
                      display: "flex", alignItems: "center",
                      border: "1.5px solid #e0e7ff", borderRadius: 14,
                      background: "white", padding: "9px 14px", gap: 8,
                      transition: "border-color 0.2s",
                    }}
                      onFocus={() => {}}
                    >
                      <span style={{ fontSize: 15 }}>👤</span>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                        placeholder="Enter your full name"
                        style={{
                          flex: 1, border: "none", outline: "none",
                          fontSize: "0.83rem", color: "#111827",
                          background: "transparent",
                        }}
                      />
                    </div>
                  </div>

                  {/* Email field */}
                  <div>
                    <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                      Email Address
                    </label>
                    <div style={{
                      display: "flex", alignItems: "center",
                      border: "1.5px solid #e0e7ff", borderRadius: 14,
                      background: "white", padding: "9px 14px", gap: 8,
                    }}>
                      <span style={{ fontSize: 15 }}>✉️</span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                        placeholder="Enter your email"
                        style={{
                          flex: 1, border: "none", outline: "none",
                          fontSize: "0.83rem", color: "#111827",
                          background: "transparent",
                        }}
                      />
                    </div>
                  </div>

                  {registerError && (
                    <div style={{
                      background: "#fef2f2", border: "1px solid #fecaca",
                      borderRadius: 10, padding: "7px 12px",
                      color: "#dc2626", fontSize: "0.75rem", textAlign: "center"
                    }}>
                      {registerError}
                    </div>
                  )}

                  <button
                    onClick={handleRegister}
                    disabled={registerLoading}
                    style={{
                      background: registerLoading
                        ? "#a5b4fc"
                        : "linear-gradient(135deg, #4f46e5, #7c3aed)",
                      color: "white",
                      border: "none",
                      borderRadius: 14,
                      padding: "11px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: registerLoading ? "not-allowed" : "pointer",
                      marginTop: 4,
                      boxShadow: registerLoading ? "none" : "0 4px 16px rgba(79,70,229,0.35)",
                      transition: "all 0.2s",
                      letterSpacing: "0.01em",
                    }}
                  >
                    {registerLoading ? "Starting..." : "Start Chatting →"}
                  </button>
                </div>

                <p style={{ textAlign: "center", fontSize: "0.7rem", color: "#9ca3af", marginTop: 14 }}>
                  🔒 Your data is safe and private
                </p>
              </div>
            )}

            {/* ── Chat Screen ── */}
            {screen === "chat" && (
              <>
                {/* Messages */}
                <div
                  className="flex-1 overflow-y-auto"
                  style={{
                    padding: "14px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    background: "linear-gradient(160deg, #f8f7ff 0%, #eef2ff 100%)",
                  }}
                >
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className="chat-bubble-in"
                      style={{
                        display: "flex",
                        justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                        alignItems: "flex-end",
                        gap: 7,
                      }}
                    >
                      {msg.role === "bot" && (
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, flexShrink: 0,
                          boxShadow: "0 2px 8px rgba(79,70,229,0.3)"
                        }}>
                          🤖
                        </div>
                      )}

                      <div
                        style={{
                          maxWidth: "78%",
                          padding: "9px 13px",
                          fontSize: "0.82rem",
                          lineHeight: 1.55,
                          borderRadius: msg.role === "user"
                            ? "18px 18px 4px 18px"
                            : "18px 18px 18px 4px",
                          background: msg.role === "user"
                            ? "linear-gradient(135deg, #4f46e5, #6d28d9)"
                            : "white",
                          color: msg.role === "user" ? "white" : "#1f2937",
                          boxShadow: msg.role === "user"
                            ? "0 4px 14px rgba(79,70,229,0.3)"
                            : "0 2px 10px rgba(0,0,0,0.07)",
                          border: msg.role === "bot" ? "1px solid rgba(99,102,241,0.1)" : "none",
                        }}
                      >
                        {msg.text ? (
                          msg.role === "bot" ? (
                            <div className="prose-bot">
                              <ReactMarkdown
                                components={{
                                  p: ({ children }) => <p>{children}</p>,
                                  strong: ({ children }) => <strong>{children}</strong>,
                                  ul: ({ children }) => <ul>{children}</ul>,
                                  ol: ({ children }) => <ol>{children}</ol>,
                                  li: ({ children }) => <li>{children}</li>,
                                  h1: ({ children }) => <h1>{children}</h1>,
                                  h2: ({ children }) => <h2>{children}</h2>,
                                  h3: ({ children }) => <h3>{children}</h3>,
                                  code: ({ children }) => <code>{children}</code>,
                                }}
                              >
                                {msg.text}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            msg.text
                          )
                        ) : (
                          <span style={{ display: "flex", gap: 4, alignItems: "center", height: 16 }}>
                            <span className="dot-bounce" style={{ width: 6, height: 6, borderRadius: "50%", background: "#818cf8", display: "inline-block" }} />
                            <span className="dot-bounce" style={{ width: 6, height: 6, borderRadius: "50%", background: "#818cf8", display: "inline-block" }} />
                            <span className="dot-bounce" style={{ width: 6, height: 6, borderRadius: "50%", background: "#818cf8", display: "inline-block" }} />
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Suggestions */}
                {messages.length <= 1 && (
                  <div style={{
                    padding: "8px 12px",
                    display: "flex", gap: 6, flexWrap: "wrap",
                    background: "white",
                    borderTop: "1px solid #e0e7ff",
                  }}>
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(s)}
                        className="suggestion-pill"
                        style={{
                          fontSize: "0.7rem",
                          padding: "5px 11px",
                          borderRadius: 20,
                          cursor: "pointer",
                          fontWeight: 500,
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input area */}
                <div style={{
                  padding: "10px 12px",
                  borderTop: "1px solid #e0e7ff",
                  display: "flex", gap: 8, alignItems: "center",
                  background: "white",
                }}>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Ask about VAT, invoices, TRN..."
                    className="input-field"
                    style={{
                      flex: 1,
                      fontSize: "0.82rem",
                      color: "#1f2937",
                      border: "1.5px solid #e0e7ff",
                      borderRadius: 50,
                      padding: "9px 16px",
                      outline: "none",
                      background: "#f8f7ff",
                      transition: "all 0.2s",
                    }}
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={loading}
                    className="send-btn"
                    style={{
                      width: 38, height: 38,
                      borderRadius: "50%",
                      border: "none",
                      color: "white",
                      fontSize: 15,
                      cursor: loading ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                      opacity: loading ? 0.5 : 1,
                    }}
                  >
                    ➤
                  </button>
                </div>

                {/* Footer */}
                <div style={{
                  textAlign: "center",
                  fontSize: "0.65rem",
                  color: "#9ca3af",
                  padding: "5px",
                  background: "white",
                  borderTop: "1px solid #f3f4f6",
                  letterSpacing: "0.02em",
                }}>
                  ⚡ Powered by <span style={{ color: "#6366f1", fontWeight: 600 }}>E-Numerak AI</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── FAB Button ── */}
        <div style={{ position: "relative", display: "inline-block" }}>
          {!isOpen && <div className="fab-pulse" style={{ position: "absolute", inset: 0, borderRadius: "50%", pointerEvents: "none" }} />}
          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              color: "white",
              border: "none",
              borderRadius: "50%",
              width: 56, height: 56,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22,
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(79,70,229,0.45)",
              transition: "transform 0.2s, box-shadow 0.2s",
              position: "relative",
              zIndex: 1,
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = "scale(1.1)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(79,70,229,0.55)";
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(79,70,229,0.45)";
            }}
          >
            {isOpen ? "×" : "💬"}
          </button>
        </div>
      </div>
    </>
  );
}