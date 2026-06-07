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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:wght@700;800&family=Cinzel:wght@700;800&display=swap');

        .cw * { box-sizing: border-box; }
        .cw { font-family: 'Outfit', sans-serif; }
        .cw-serif { font-family: 'Playfair Display', serif; }
        .cw-title { font-family: 'Cinzel', serif; letter-spacing: 0.03em; }

        /* Widget open animation */
        .cw-open {
          animation: cwOpen 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: bottom right;
        }
        @keyframes cwOpen {
          from { opacity: 0; transform: scale(0.8) translateY(24px); }
          to   { opacity: 1; transform: scale(1)   translateY(0);    }
        }

        /* Bubble in */
        .cw-bubble {
          animation: cwBubble 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes cwBubble {
          from { opacity: 0; transform: translateY(10px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }

        /* Typing dots */
        .cw-dot { animation: cwDot 1.4s infinite ease-in-out; }
        .cw-dot:nth-child(2) { animation-delay: 0.2s; }
        .cw-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes cwDot {
          0%, 60%, 100% { transform: translateY(0);    opacity: 0.3; }
          30%           { transform: translateY(-5px); opacity: 1;   }
        }

        /* FAB ring pulse */
        .cw-fab-ring {
          animation: cwRing 2.5s ease-out infinite;
        }
        @keyframes cwRing {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0;   }
        }

        /* Scrollbar */
        .cw-scroll::-webkit-scrollbar { width: 4px; }
        .cw-scroll::-webkit-scrollbar-track { background: transparent; }
        .cw-scroll::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.25); border-radius: 99px; }

        /* Input focus glow */
        .cw-input:focus { outline: none; border-color: #818cf8 !important; box-shadow: 0 0 0 3px rgba(129,140,248,0.15); }

        /* Suggestion hover */
        .cw-chip { transition: all 0.18s ease; }
        .cw-chip:hover {
          background: rgba(129,140,248,0.2) !important;
          border-color: #818cf8 !important;
          color: #c7d2fe !important;
          transform: translateY(-1px);
        }

        /* Send button */
        .cw-send { transition: all 0.18s ease; }
        .cw-send:hover:not(:disabled) {
          transform: scale(1.1) rotate(5deg);
          box-shadow: 0 6px 20px rgba(99,102,241,0.5) !important;
        }

        /* Header buttons */
        .cw-hbtn { transition: all 0.15s ease; }
        .cw-hbtn:hover { background: rgba(255,255,255,0.15) !important; color: white !important; }

        /* Bot message prose */
        .cw-prose { font-size: 1.08rem; line-height: 1.7; }
        .cw-prose p { margin: 0 0 0.55rem; }
        .cw-prose p:last-child { margin: 0; }
        .cw-prose ul { list-style: none; padding: 0; margin: 0.5rem 0; }
        .cw-prose ul li { padding-left: 1.5rem; position: relative; margin-bottom: 0.4rem; color: #c7d2fe; font-size: 1.08rem; }
        .cw-prose ul li::before { content: '▸'; position: absolute; left: 0; color: #818cf8; font-size: 0.9rem; top: 2px; }
        .cw-prose ol { padding-left: 1.5rem; margin: 0.5rem 0; }
        .cw-prose ol li { margin-bottom: 0.4rem; color: #c7d2fe; font-size: 1.08rem; }
        .cw-prose strong { color: #e0e7ff; font-weight: 700; }
        .cw-prose h1, .cw-prose h2 { font-family: 'Playfair Display', serif; font-weight: 700; margin: 0.9rem 0 0.35rem; color: #e0e7ff; font-size: 1.05rem; }
        .cw-prose h3 { font-weight: 600; margin: 0.6rem 0 0.25rem; color: #a5b4fc; font-size: 0.95rem; }
        .cw-prose code { background: rgba(99,102,241,0.2); color: #a5b4fc; padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.85rem; border: 1px solid rgba(99,102,241,0.3); }

        /* Register input focus */
        .cw-reg-wrap:focus-within {
          border-color: rgba(129,140,248,0.6) !important;
          box-shadow: 0 0 0 3px rgba(129,140,248,0.1);
        }

        /* Shimmer on register button */
        @keyframes cwShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .cw-reg-btn {
          background: linear-gradient(90deg, #4f46e5, #7c3aed, #6366f1, #4f46e5);
          background-size: 300% auto;
          transition: all 0.2s;
        }
        .cw-reg-btn:hover:not(:disabled) {
          animation: cwShimmer 1.5s linear infinite;
          box-shadow: 0 8px 28px rgba(99,102,241,0.5) !important;
          transform: translateY(-1px);
        }
      `}</style>

      <div className="cw" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999 }}>

        {/* ── Chat Window ── */}
        {isOpen && (
          <div
            className="cw-open"
            style={{
              marginBottom: 16,
              width: 460,
              height: 700,
              display: "flex",
              flexDirection: "column",
              borderRadius: 24,
              overflow: "hidden",
              background: "linear-gradient(160deg, #0f0e1a 0%, #13111f 50%, #0d0b18 100%)",
              border: "1px solid rgba(99,102,241,0.2)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >

            {/* ── Header ── */}
            <div style={{
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "linear-gradient(135deg, rgba(79,70,229,0.3) 0%, rgba(124,58,237,0.2) 100%)",
              borderBottom: "1px solid rgba(99,102,241,0.15)",
              backdropFilter: "blur(20px)",
              flexShrink: 0,
              position: "relative",
              overflow: "hidden",
            }}>
              {/* Decorative orb */}
              <div style={{
                position: "absolute", top: -40, right: -20,
                width: 120, height: 120, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)",
                pointerEvents: "none",
              }} />

              {/* Avatar */}
              <div style={{
                width: 42, height: 42, borderRadius: "50%",
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, flexShrink: 0,
                boxShadow: "0 0 0 2px rgba(129,140,248,0.3), 0 4px 16px rgba(79,70,229,0.4)",
                position: "relative", zIndex: 1,
              }}>
                🤖
              </div>

              {/* Title */}
              <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
                <p className="cw-title" style={{
                  color: "white", fontWeight: 700, fontSize: "1.05rem",
                  margin: 0, lineHeight: 1.2,
                }}>
                  E-Numerak <span style={{ color: "#a5b4fc" }}>Assistant</span>
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "#34d399",
                    boxShadow: "0 0 8px #34d399",
                    display: "inline-block", flexShrink: 0,
                  }} />
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.68rem", letterSpacing: "0.04em" }}>
                    UAE TAX EXPERT · ONLINE
                  </span>
                </div>
              </div>

              {/* Header actions */}
              {screen === "chat" && (
                <div style={{ display: "flex", gap: 6, position: "relative", zIndex: 1 }}>
                  <button onClick={handleNewChat} className="cw-hbtn" style={{
                    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.6)", fontSize: "0.67rem", fontFamily: "'Outfit', sans-serif",
                    fontWeight: 500, borderRadius: 20, padding: "3px 11px", cursor: "pointer",
                    letterSpacing: "0.03em",
                  }}>
                    NEW
                  </button>
                  <button onClick={handleLogout} className="cw-hbtn" style={{
                    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.6)", fontSize: "0.67rem", fontFamily: "'Outfit', sans-serif",
                    fontWeight: 500, borderRadius: 20, padding: "3px 11px", cursor: "pointer",
                    letterSpacing: "0.03em",
                  }}>
                    EXIT
                  </button>
                </div>
              )}

              {/* Close */}
              <button onClick={() => setIsOpen(false)} style={{
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.5)", width: 28, height: 28, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, cursor: "pointer", flexShrink: 0,
                transition: "all 0.15s", position: "relative", zIndex: 1,
              }}
                onMouseOver={e => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; e.currentTarget.style.color = "white"; }}
                onMouseOut={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
              >
                ×
              </button>
            </div>

            {/* ── Register Screen ── */}
            {screen === "register" && (
              <div style={{
                flex: 1, display: "flex", flexDirection: "column",
                justifyContent: "center", padding: "28px 24px",
                overflowY: "auto",
              }}>
                {/* Hero */}
                <div style={{ textAlign: "center", marginBottom: 28 }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: "50%",
                    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 30, margin: "0 auto 16px",
                    boxShadow: "0 0 0 8px rgba(79,70,229,0.1), 0 12px 32px rgba(79,70,229,0.4)",
                  }}>🤖</div>

                  <h2 className="cw-serif" style={{
                    color: "white", fontSize: "1.3rem", fontWeight: 700,
                    margin: "0 0 6px", letterSpacing: "-0.02em",
                  }}>
                    Welcome to E-Numerak
                  </h2>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem", margin: 0, letterSpacing: "0.02em" }}>
                    Your intelligent UAE tax companion
                  </p>
                </div>

                {/* Divider */}
                <div style={{
                  height: 1, background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent)",
                  marginBottom: 24,
                }} />

                {/* Fields */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Name */}
                  <div>
                    <label style={{
                      fontSize: "0.7rem", fontWeight: 600, color: "rgba(255,255,255,0.4)",
                      display: "block", marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase",
                    }}>Full Name</label>
                    <div className="cw-reg-wrap" style={{
                      display: "flex", alignItems: "center",
                      border: "1px solid rgba(99,102,241,0.2)", borderRadius: 14,
                      background: "rgba(255,255,255,0.04)", padding: "11px 16px", gap: 10,
                      transition: "all 0.2s",
                    }}>
                      <span style={{ fontSize: 16, opacity: 0.6 }}>👤</span>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                        placeholder="Enter your full name"
                        style={{
                          flex: 1, border: "none", outline: "none", background: "transparent",
                          fontSize: "0.85rem", color: "white",
                          fontFamily: "'Outfit', sans-serif",
                        }}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label style={{
                      fontSize: "0.7rem", fontWeight: 600, color: "rgba(255,255,255,0.4)",
                      display: "block", marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase",
                    }}>Email Address</label>
                    <div className="cw-reg-wrap" style={{
                      display: "flex", alignItems: "center",
                      border: "1px solid rgba(99,102,241,0.2)", borderRadius: 14,
                      background: "rgba(255,255,255,0.04)", padding: "11px 16px", gap: 10,
                      transition: "all 0.2s",
                    }}>
                      <span style={{ fontSize: 16, opacity: 0.6 }}>✉️</span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                        placeholder="Enter your email"
                        style={{
                          flex: 1, border: "none", outline: "none", background: "transparent",
                          fontSize: "0.85rem", color: "white",
                          fontFamily: "'Outfit', sans-serif",
                        }}
                      />
                    </div>
                  </div>

                  {registerError && (
                    <div style={{
                      background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
                      borderRadius: 10, padding: "8px 14px",
                      color: "#fca5a5", fontSize: "0.75rem", textAlign: "center",
                    }}>
                      {registerError}
                    </div>
                  )}

                  <button
                    onClick={handleRegister}
                    disabled={registerLoading}
                    className="cw-reg-btn"
                    style={{
                      color: "white", border: "none", borderRadius: 14,
                      padding: "13px", fontSize: "0.88rem", fontWeight: 600,
                      cursor: registerLoading ? "not-allowed" : "pointer",
                      marginTop: 4,
                      boxShadow: "0 6px 20px rgba(79,70,229,0.4)",
                      fontFamily: "'Outfit', sans-serif",
                      letterSpacing: "0.02em",
                      opacity: registerLoading ? 0.7 : 1,
                    }}
                  >
                    {registerLoading ? "Starting session..." : "Start Chatting →"}
                  </button>
                </div>

                <p style={{
                  textAlign: "center", fontSize: "0.68rem",
                  color: "rgba(255,255,255,0.2)", marginTop: 20,
                  letterSpacing: "0.03em",
                }}>
                  🔒 End-to-end encrypted · Private & secure
                </p>
              </div>
            )}

            {/* ── Chat Screen ── */}
            {screen === "chat" && (
              <>
                {/* Messages */}
                <div className="cw-scroll" style={{
                  flex: 1, overflowY: "auto",
                  padding: "16px 14px",
                  display: "flex", flexDirection: "column", gap: 12,
                }}>
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className="cw-bubble"
                      style={{
                        display: "flex",
                        justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                        alignItems: "flex-end",
                        gap: 8,
                      }}
                    >
                      {/* Bot avatar */}
                      {msg.role === "bot" && (
                        <div style={{
                          width: 30, height: 30, borderRadius: "50%",
                          background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, flexShrink: 0,
                          boxShadow: "0 0 0 2px rgba(129,140,248,0.2), 0 4px 12px rgba(79,70,229,0.3)",
                        }}>
                          🤖
                        </div>
                      )}

                      {/* Bubble */}
                      <div style={{
                        maxWidth: "76%",
                        padding: "12px 16px",
                        fontSize: "1.08rem",
                        lineHeight: 1.7,
                        borderRadius: msg.role === "user"
                          ? "18px 18px 4px 18px"
                          : "18px 18px 18px 4px",
                        ...(msg.role === "user" ? {
                          background: "linear-gradient(135deg, #4f46e5, #6d28d9)",
                          color: "rgba(255,255,255,0.92)",
                          boxShadow: "0 4px 20px rgba(79,70,229,0.35)",
                          border: "1px solid rgba(129,140,248,0.2)",
                        } : {
                          background: "rgba(255,255,255,0.05)",
                          color: "#c7d2fe",
                          border: "1px solid rgba(99,102,241,0.15)",
                          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                          backdropFilter: "blur(12px)",
                        }),
                      }}>
                        {msg.text ? (
                          msg.role === "bot" ? (
                            <div className="cw-prose">
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
                          ) : msg.text
                        ) : (
                          <span style={{ display: "flex", gap: 5, alignItems: "center", height: 18 }}>
                            {[0, 1, 2].map(n => (
                              <span key={n} className="cw-dot" style={{
                                width: 6, height: 6, borderRadius: "50%",
                                background: "#818cf8", display: "inline-block",
                              }} />
                            ))}
                          </span>
                        )}
                      </div>

                      {/* User avatar */}
                      {msg.role === "user" && (
                        <div style={{
                          width: 30, height: 30, borderRadius: "50%",
                          background: "linear-gradient(135deg, #6d28d9, #4f46e5)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, flexShrink: 0,
                          boxShadow: "0 4px 12px rgba(79,70,229,0.3)",
                        }}>
                          🧑
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Suggestions */}
                {messages.length <= 1 && (
                  <div style={{
                    padding: "10px 14px",
                    display: "flex", gap: 6, flexWrap: "wrap",
                    borderTop: "1px solid rgba(99,102,241,0.12)",
                    background: "rgba(0,0,0,0.15)",
                  }}>
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(s)}
                        className="cw-chip"
                        style={{
                          fontSize: "0.92rem",
                          padding: "5px 12px",
                          borderRadius: 20,
                          cursor: "pointer",
                          fontWeight: 500,
                          fontFamily: "'Outfit', sans-serif",
                          background: "rgba(99,102,241,0.1)",
                          border: "1px solid rgba(99,102,241,0.25)",
                          color: "rgba(165,180,252,0.8)",
                          letterSpacing: "0.01em",
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input */}
                <div style={{
                  padding: "12px 14px",
                  borderTop: "1px solid rgba(99,102,241,0.12)",
                  display: "flex", gap: 10, alignItems: "center",
                  background: "rgba(0,0,0,0.2)",
                  backdropFilter: "blur(10px)",
                }}>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Ask about VAT, invoices, TRN..."
                    className="cw-input"
                    style={{
                      flex: 1, fontSize: "0.93rem", color: "white",
                      border: "1px solid rgba(99,102,241,0.2)",
                      borderRadius: 50, padding: "11px 20px",
                      background: "rgba(255,255,255,0.05)",
                      fontFamily: "'Outfit', sans-serif",
                      transition: "all 0.2s",
                    }}
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={loading}
                    className="cw-send"
                    style={{
                      width: 40, height: 40, borderRadius: "50%", border: "none",
                      background: loading
                        ? "rgba(99,102,241,0.3)"
                        : "linear-gradient(135deg, #4f46e5, #7c3aed)",
                      color: "white", fontSize: 15,
                      cursor: loading ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: loading ? "none" : "0 4px 16px rgba(79,70,229,0.4)",
                    }}
                  >
                    ➤
                  </button>
                </div>

                {/* Footer */}
                <div style={{
                  textAlign: "center", fontSize: "0.62rem",
                  color: "rgba(255,255,255,0.18)", padding: "6px",
                  background: "rgba(0,0,0,0.15)",
                  letterSpacing: "0.06em", textTransform: "uppercase",
                }}>
                  Powered by <span style={{ color: "rgba(129,140,248,0.6)", fontWeight: 600 }}>E-Numerak AI</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── FAB ── */}
        <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          {!isOpen && (
            <>
              <div className="cw-fab-ring" style={{
                position: "absolute", inset: -6, borderRadius: "50%",
                border: "2px solid rgba(99,102,241,0.4)", pointerEvents: "none",
              }} />
              <div className="cw-fab-ring" style={{
                position: "absolute", inset: -2, borderRadius: "50%",
                border: "1px solid rgba(99,102,241,0.2)", pointerEvents: "none",
                animationDelay: "0.8s",
              }} />
            </>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{
              background: isOpen
                ? "linear-gradient(135deg, #374151, #1f2937)"
                : "linear-gradient(135deg, #4f46e5, #7c3aed)",
              color: "white", border: "none", borderRadius: "50%",
              width: 58, height: 58,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: isOpen ? 22 : 24, cursor: "pointer",
              boxShadow: isOpen
                ? "0 4px 16px rgba(0,0,0,0.4)"
                : "0 8px 28px rgba(79,70,229,0.5), 0 0 0 1px rgba(129,140,248,0.2)",
              transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
              position: "relative", zIndex: 1,
            }}
            onMouseOver={e => { e.currentTarget.style.transform = "scale(1.1)"; }}
            onMouseOut={e => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            {isOpen ? "×" : "💬"}
          </button>
        </div>
      </div>
    </>
  );
}