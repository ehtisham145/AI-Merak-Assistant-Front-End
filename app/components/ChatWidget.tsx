"use client";
import ReactMarkdown from "react-markdown";
import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

type Message = { role: "user" | "bot"; text: string };
type Screen = "login" | "register" | "verify" | "chat";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API = "https://tax-data-assistant-backend-production.up.railway.app/";
  const suggestions = [
    "What is the primary objective of the UAE's E-invoicing System?",
    "What is E-Numerak?",
    "What is a TRN?",
  ];

  useEffect(() => {
    const existing = localStorage.getItem("chat_session_id");
    if (existing) setSessionId(existing);
    else { const id = uuidv4(); localStorage.setItem("chat_session_id", id); setSessionId(id); }
    const registered = localStorage.getItem("chat_registered");
    const savedName = localStorage.getItem("chat_user_name");
    if (registered === "true" && savedName) {
      setScreen("chat");
      setMessages([{ role: "bot", text: `Welcome back, **${savedName}!** 👋 How can I assist you with UAE tax today?` }]);
    }
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleRegister = async () => {
    setFormError("");
    if (!name.trim()) return setFormError("Please enter your full name.");
    if (!email.trim() || !email.includes("@")) return setFormError("Please enter a valid email.");
    if (password.length < 6) return setFormError("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setFormError("Passwords do not match.");
    setFormLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), email: email.trim(), password }) });
      const data = await res.json();
      if (res.ok) { localStorage.setItem("pending_email", email.trim()); localStorage.setItem("pending_name", name.trim()); setScreen("verify"); setFormError(""); }
      else setFormError(data.detail || "Registration failed. Please try again.");
    } catch { setFormError("Connection failed. Please check your internet."); }
    finally { setFormLoading(false); }
  };

  const handleVerify = async () => {
    setFormError("");
    if (verifyCode.trim().length !== 6) return setFormError("Please enter the 6-digit code.");
    const pendingEmail = localStorage.getItem("pending_email") || email;
    setFormLoading(true);
    try {
      const res = await fetch(`${API}/auth/verify-email`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: pendingEmail, code: verifyCode.trim() }) });
      const data = await res.json();
      if (res.ok) { localStorage.removeItem("pending_email"); localStorage.removeItem("pending_name"); setVerifyCode(""); setScreen("login"); setFormError("✅ Email verified! Please login now."); }
      else setFormError(data.detail || "Invalid code. Please try again.");
    } catch { setFormError("Connection failed. Please try again."); }
    finally { setFormLoading(false); }
  };

  const handleResend = async () => {
    const pendingEmail = localStorage.getItem("pending_email") || email;
    setResendLoading(true); setResendMsg("");
    try {
      const res = await fetch(`${API}/auth/resend-code?email=${encodeURIComponent(pendingEmail)}`, { method: "POST" });
      const data = await res.json();
      setResendMsg(res.ok ? "✅ New code sent to your email!" : data.detail || "Failed to resend.");
    } catch { setResendMsg("Connection failed."); }
    finally { setResendLoading(false); }
  };

  const handleLogin = async () => {
    setFormError("");
    if (!email.trim() || !email.includes("@")) return setFormError("Please enter a valid email.");
    if (!password) return setFormError("Please enter your password.");
    setFormLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), password }) });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("chat_registered", "true");
        localStorage.setItem("chat_user_name", data.name || email.split("@")[0]);
        localStorage.setItem("chat_user_email", email.trim());
        setScreen("chat");
        setMessages([{ role: "bot", text: `Hello **${data.name || email.split("@")[0]}!** 👋 I'm your E-Numerak Tax Assistant. How can I help you today?` }]);
        setPassword(""); setFormError("");
      } else setFormError(data.detail || "Login failed. Please try again.");
    } catch { setFormError("Connection failed. Please check your internet."); }
    finally { setFormLoading(false); }
  };

  const handleLogout = async () => {
    try { await fetch(`${API}/auth/logout`, { method: "POST" }); } catch {}
    localStorage.removeItem("chat_registered"); localStorage.removeItem("chat_user_name");
    localStorage.removeItem("chat_user_email"); localStorage.removeItem("chat_session_id");
    setSessionId(""); setScreen("login");
    setName(""); setEmail(""); setPassword(""); setConfirmPassword(""); setVerifyCode("");
    setMessages([]); setFormError(""); setLogoutConfirm(false);
    const id = uuidv4(); localStorage.setItem("chat_session_id", id); setSessionId(id);
  };

  const sendMessage = async (text?: string) => {
    const userMessage = text || input;
    if (!userMessage.trim() || loading || !sessionId) return;
    const savedEmail = localStorage.getItem("chat_user_email") || "";
    if (!savedEmail) { setMessages(p => [...p, { role: "bot", text: "⚠️ Session expired. Please login again." }]); localStorage.removeItem("chat_registered"); setScreen("login"); return; }
    setInput(""); setMessages(p => [...p, { role: "user", text: userMessage }]); setLoading(true);
    try {
      const response = await fetch(`${API}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: userMessage, session_id: sessionId, email: savedEmail }) });
      if (!response.ok) { const errData = await response.json(); setMessages(p => [...p, { role: "bot", text: `⚠️ ${errData.detail || "Something went wrong."}` }]); setLoading(false); return; }
      const reader = response.body!.getReader(); const decoder = new TextDecoder(); let botReply = "";
      setMessages(p => [...p, { role: "bot", text: "" }]);
      while (true) { const { done, value } = await reader.read(); if (done) break; botReply += decoder.decode(value); setMessages(p => { const u = [...p]; u[u.length - 1] = { role: "bot", text: botReply }; return u; }); }
    } catch { setMessages(p => [...p, { role: "bot", text: "⚠️ Connection error. Please try again." }]); }
    finally { setLoading(false); }
  };

  const handleNewChat = async () => {
    await fetch(`${API}/clear-memory/${sessionId}`, { method: "POST" });
    setMessages([{ role: "bot", text: "New conversation started! How can I help you? 😊" }]);
  };

  const inputWrap: React.CSSProperties = { display: "flex", alignItems: "center", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 12, background: "rgba(15,23,42,0.6)", padding: "12px 16px", gap: 10, transition: "all 0.2s" };
  const inputStyle: React.CSSProperties = { flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "0.875rem", color: "#e2e8f0", fontFamily: "'DM Sans', sans-serif" };
  const labelStyle: React.CSSProperties = { fontSize: "0.68rem", fontWeight: 600, color: "rgba(148,163,184,0.7)", display: "block", marginBottom: 7, letterSpacing: "0.1em", textTransform: "uppercase" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Cormorant+Garamond:wght@600;700&family=Space+Grotesk:wght@500;600;700&display=swap');

        .cw*{box-sizing:border-box;}
        .cw{font-family:'DM Sans',sans-serif;}

        .cw-open{animation:cwSlideUp 0.45s cubic-bezier(0.16,1,0.3,1) forwards;transform-origin:bottom right;}
        @keyframes cwSlideUp{from{opacity:0;transform:scale(0.85) translateY(30px);}to{opacity:1;transform:scale(1) translateY(0);}}

        .cw-bubble{animation:cwPop 0.28s cubic-bezier(0.34,1.56,0.64,1);}
        @keyframes cwPop{from{opacity:0;transform:translateY(8px) scale(0.94);}to{opacity:1;transform:translateY(0) scale(1);}}

        .cw-dot{animation:cwDot 1.5s infinite ease-in-out;}
        .cw-dot:nth-child(2){animation-delay:.22s;}
        .cw-dot:nth-child(3){animation-delay:.44s;}
        @keyframes cwDot{0%,60%,100%{transform:translateY(0);opacity:0.25;}30%{transform:translateY(-5px);opacity:1;}}

        .cw-pulse{animation:cwPulse 3s ease-out infinite;}
        @keyframes cwPulse{0%{transform:scale(1);opacity:0.5;}100%{transform:scale(2);opacity:0;}}

        .cw-scroll::-webkit-scrollbar{width:3px;}
        .cw-scroll::-webkit-scrollbar-track{background:transparent;}
        .cw-scroll::-webkit-scrollbar-thumb{background:rgba(99,102,241,0.2);border-radius:99px;}

        .cw-wrap:focus-within{border-color:rgba(99,102,241,0.5)!important;box-shadow:0 0 0 3px rgba(99,102,241,0.1);}
        .cw-eye{cursor:pointer;opacity:0.4;transition:opacity 0.15s;font-size:13px;user-select:none;}
        .cw-eye:hover{opacity:0.9;}

        .cw-chip{transition:all 0.2s ease;cursor:pointer;white-space:nowrap;}
        .cw-chip:hover{background:rgba(99,102,241,0.18)!important;border-color:rgba(99,102,241,0.5)!important;color:#c7d2fe!important;transform:translateY(-1px);}

        .cw-send{transition:transform 0.18s ease,box-shadow 0.18s ease;}
        .cw-send:hover:not(:disabled){transform:scale(1.1) rotate(8deg);box-shadow:0 8px 24px rgba(99,102,241,0.5)!important;}

        .cw-hbtn{transition:all 0.15s ease;cursor:pointer;}
        .cw-hbtn:hover{background:rgba(255,255,255,0.12)!important;}

        .cw-btn{transition:all 0.2s ease;}
        .cw-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 10px 32px rgba(99,102,241,0.45)!important;}
        .cw-btn:active:not(:disabled){transform:translateY(0);}

        .cw-link{cursor:pointer;transition:color 0.15s;}
        .cw-link:hover{color:#a5b4fc!important;}

        .cw-tab{cursor:pointer;}
        .cw-tab:hover{opacity:0.8;}

        .cw-prose{font-size:0.92rem;line-height:1.75;}
        .cw-prose p{margin:0 0 0.5rem;}
        .cw-prose p:last-child{margin:0;}
        .cw-prose ul{list-style:none;padding:0;margin:0.5rem 0;}
        .cw-prose ul li{padding-left:1.4rem;position:relative;margin-bottom:0.35rem;color:#cbd5e1;}
        .cw-prose ul li::before{content:'›';position:absolute;left:0;color:#6366f1;font-size:1.1rem;top:-1px;font-weight:700;}
        .cw-prose ol{padding-left:1.4rem;margin:0.5rem 0;}
        .cw-prose ol li{margin-bottom:0.35rem;color:#cbd5e1;}
        .cw-prose strong{color:#f1f5f9;font-weight:600;}
        .cw-prose h1,.cw-prose h2{font-family:'Space Grotesk',sans-serif;font-weight:600;margin:0.8rem 0 0.3rem;color:#f1f5f9;font-size:0.95rem;}
        .cw-prose h3{font-weight:600;margin:0.5rem 0 0.2rem;color:#94a3b8;font-size:0.85rem;}
        .cw-prose code{background:rgba(99,102,241,0.15);color:#a5b4fc;padding:0.1rem 0.4rem;border-radius:4px;font-size:0.8rem;border:1px solid rgba(99,102,241,0.25);}

        @keyframes cwShimmer{0%{background-position:200% center;}100%{background-position:-200% center;}}
        .cw-shimmer{background:linear-gradient(90deg,#4f46e5,#7c3aed,#818cf8,#4f46e5);background-size:300%;animation:cwShimmer 2.5s linear infinite;}

        .cw-logout-overlay{animation:cwFade 0.2s ease;}
        @keyframes cwFade{from{opacity:0;}to{opacity:1;}}
      `}</style>

      <div className="cw" style={{ position:"fixed", bottom:24, right:24, zIndex:9999 }}>

        {/* ── CHAT WINDOW ── */}
        {isOpen && (
          <div className="cw-open" style={{ marginBottom:16, width:440, height:680, display:"flex", flexDirection:"column", borderRadius:20, overflow:"hidden", background:"#080c14", border:"1px solid rgba(99,102,241,0.18)", boxShadow:"0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05)" }}>

            {/* HEADER */}
            <div style={{ padding:"12px 14px", display:"flex", alignItems:"center", gap:10, background:"linear-gradient(135deg,rgba(30,27,75,0.95),rgba(15,23,42,0.95))", borderBottom:"1px solid rgba(99,102,241,0.12)", flexShrink:0, position:"relative", overflow:"hidden" }}>
              {/* Glow */}
              <div style={{ position:"absolute", top:-30, left:-10, width:100, height:100, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,0.2) 0%,transparent 70%)", pointerEvents:"none" }} />

              {/* Avatar */}
              <div style={{ position:"relative", flexShrink:0 }}>
                <div style={{ width:38, height:38, borderRadius:"50%", background:"linear-gradient(135deg,#4338ca,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, boxShadow:"0 0 0 2px rgba(99,102,241,0.3), 0 4px 14px rgba(79,70,229,0.4)", position:"relative", zIndex:1 }}>🤖</div>
                <div style={{ position:"absolute", bottom:1, right:1, width:9, height:9, borderRadius:"50%", background:"#22c55e", border:"2px solid #080c14", zIndex:2 }} />
              </div>

              {/* Title */}
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ color:"#f1f5f9", fontWeight:700, fontSize:"0.92rem", margin:0, fontFamily:"'Space Grotesk',sans-serif", letterSpacing:"-0.01em" }}>
                  E-Numerak <span style={{ color:"#818cf8" }}>Assistant</span>
                </p>
                <p style={{ color:"rgba(148,163,184,0.55)", fontSize:"0.62rem", margin:0, letterSpacing:"0.08em", textTransform:"uppercase" }}>UAE TAX EXPERT · ONLINE</p>
              </div>

              {/* Chat actions */}
              {screen === "chat" && (
                <div style={{ display:"flex", gap:5, position:"relative", zIndex:1 }}>
                  <button onClick={handleNewChat} className="cw-hbtn" style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.09)", color:"rgba(148,163,184,0.8)", fontSize:"0.62rem", fontFamily:"'Space Grotesk',sans-serif", fontWeight:600, borderRadius:6, padding:"4px 10px", letterSpacing:"0.06em" }}>NEW</button>
                  <button onClick={()=>setLogoutConfirm(true)} className="cw-hbtn" style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", color:"rgba(252,165,165,0.8)", fontSize:"0.62rem", fontFamily:"'Space Grotesk',sans-serif", fontWeight:600, borderRadius:6, padding:"4px 10px", letterSpacing:"0.06em" }}>LOGOUT</button>
                </div>
              )}

              {/* Close */}
              <button onClick={()=>setIsOpen(false)} className="cw-hbtn" style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(148,163,184,0.6)", width:26, height:26, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>×</button>
            </div>

            {/* ── LOGOUT CONFIRM OVERLAY ── */}
            {logoutConfirm && (
              <div className="cw-logout-overlay" style={{ position:"absolute", inset:0, zIndex:100, background:"rgba(8,12,20,0.92)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:32 }}>
                <div style={{ background:"linear-gradient(135deg,rgba(30,27,75,0.9),rgba(15,23,42,0.95))", border:"1px solid rgba(99,102,241,0.2)", borderRadius:16, padding:"28px 24px", textAlign:"center", width:"100%" }}>
                  <div style={{ fontSize:36, marginBottom:14 }}>🚪</div>
                  <h3 style={{ color:"#f1f5f9", fontFamily:"'Space Grotesk',sans-serif", fontSize:"1rem", fontWeight:700, margin:"0 0 8px" }}>Sign Out?</h3>
                  <p style={{ color:"rgba(148,163,184,0.7)", fontSize:"0.8rem", margin:"0 0 22px", lineHeight:1.6 }}>You will be signed out of your E-Numerak account. Your conversation history will be saved.</p>
                  <div style={{ display:"flex", gap:10 }}>
                    <button onClick={()=>setLogoutConfirm(false)} style={{ flex:1, padding:"10px", borderRadius:10, border:"1px solid rgba(99,102,241,0.2)", background:"rgba(99,102,241,0.08)", color:"#a5b4fc", fontSize:"0.82rem", fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
                    <button onClick={handleLogout} style={{ flex:1, padding:"10px", borderRadius:10, border:"1px solid rgba(239,68,68,0.3)", background:"rgba(239,68,68,0.12)", color:"#fca5a5", fontSize:"0.82rem", fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Sign Out</button>
                  </div>
                </div>
              </div>
            )}

            {/* ══ LOGIN ══ */}
            {screen === "login" && (
              <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"30px 26px", overflowY:"auto" }}>
                <div style={{ textAlign:"center", marginBottom:26 }}>
                  <div style={{ width:60, height:60, borderRadius:16, background:"linear-gradient(135deg,#4338ca,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, margin:"0 auto 16px", boxShadow:"0 0 0 6px rgba(67,56,202,0.12), 0 12px 28px rgba(67,56,202,0.35)" }}>🔐</div>
                  <h2 style={{ color:"#f1f5f9", fontSize:"1.2rem", fontWeight:700, margin:"0 0 5px", fontFamily:"'Space Grotesk',sans-serif", letterSpacing:"-0.02em" }}>Welcome Back</h2>
                  <p style={{ color:"rgba(148,163,184,0.5)", fontSize:"0.75rem", margin:0 }}>Sign in to your E-Numerak account</p>
                </div>

                <div style={{ height:"1px", background:"linear-gradient(90deg,transparent,rgba(99,102,241,0.25),transparent)", marginBottom:24 }} />

                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  <div>
                    <label style={labelStyle}>Email Address</label>
                    <div className="cw-wrap" style={inputWrap}>
                      <span style={{ fontSize:14, opacity:0.5 }}>✉️</span>
                      <input type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="your@email.com" style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Password</label>
                    <div className="cw-wrap" style={inputWrap}>
                      <span style={{ fontSize:14, opacity:0.5 }}>🔑</span>
                      <input type={showPass?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="Enter your password" style={inputStyle} />
                      <span className="cw-eye" onClick={()=>setShowPass(!showPass)}>{showPass?"🙈":"👁️"}</span>
                    </div>
                  </div>

                  {formError && (
                    <div style={{ background:formError.startsWith("✅")?"rgba(34,197,94,0.08)":"rgba(239,68,68,0.08)", border:`1px solid ${formError.startsWith("✅")?"rgba(34,197,94,0.25)":"rgba(239,68,68,0.2)"}`, borderRadius:10, padding:"9px 14px", color:formError.startsWith("✅")?"#86efac":"#fca5a5", fontSize:"0.75rem", textAlign:"center", lineHeight:1.5 }}>
                      {formError}
                    </div>
                  )}

                  <button onClick={handleLogin} disabled={formLoading} className="cw-btn cw-shimmer" style={{ color:"white", border:"none", borderRadius:12, padding:"13px", fontSize:"0.875rem", fontWeight:600, cursor:formLoading?"not-allowed":"pointer", marginTop:2, boxShadow:"0 6px 24px rgba(79,70,229,0.35)", fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.01em", opacity:formLoading?0.65:1 }}>
                    {formLoading ? "Signing in..." : "Sign In →"}
                  </button>

                  <p style={{ textAlign:"center", color:"rgba(148,163,184,0.45)", fontSize:"0.775rem", margin:"4px 0 0" }}>
                    Don't have an account?{" "}
                    <span className="cw-link" onClick={()=>{setScreen("register");setFormError("");}} style={{ color:"#818cf8", fontWeight:600 }}>Create one</span>
                  </p>
                </div>

                <p style={{ textAlign:"center", fontSize:"0.63rem", color:"rgba(148,163,184,0.2)", marginTop:22, letterSpacing:"0.04em" }}>🔒 256-bit encrypted · Private & secure</p>
              </div>
            )}

            {/* ══ REGISTER ══ */}
            {screen === "register" && (
              <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"22px 26px", overflowY:"auto" }}>
                <div style={{ textAlign:"center", marginBottom:20 }}>
                  <div style={{ width:56, height:56, borderRadius:16, background:"linear-gradient(135deg,#4338ca,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, margin:"0 auto 14px", boxShadow:"0 0 0 6px rgba(67,56,202,0.12), 0 12px 28px rgba(67,56,202,0.35)" }}>✨</div>
                  <h2 style={{ color:"#f1f5f9", fontSize:"1.15rem", fontWeight:700, margin:"0 0 4px", fontFamily:"'Space Grotesk',sans-serif", letterSpacing:"-0.02em" }}>Create Account</h2>
                  <p style={{ color:"rgba(148,163,184,0.5)", fontSize:"0.73rem", margin:0 }}>Join E-Numerak Tax Assistant</p>
                </div>

                <div style={{ height:"1px", background:"linear-gradient(90deg,transparent,rgba(99,102,241,0.25),transparent)", marginBottom:18 }} />

                <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
                  <div>
                    <label style={labelStyle}>Full Name</label>
                    <div className="cw-wrap" style={inputWrap}>
                      <span style={{ fontSize:14, opacity:0.5 }}>👤</span>
                      <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Email Address</label>
                    <div className="cw-wrap" style={inputWrap}>
                      <span style={{ fontSize:14, opacity:0.5 }}>✉️</span>
                      <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Password</label>
                    <div className="cw-wrap" style={inputWrap}>
                      <span style={{ fontSize:14, opacity:0.5 }}>🔑</span>
                      <input type={showPass?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min. 6 characters" style={inputStyle} />
                      <span className="cw-eye" onClick={()=>setShowPass(!showPass)}>{showPass?"🙈":"👁️"}</span>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Confirm Password</label>
                    <div className="cw-wrap" style={inputWrap}>
                      <span style={{ fontSize:14, opacity:0.5 }}>🔒</span>
                      <input type={showConfirmPass?"text":"password"} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleRegister()} placeholder="Re-enter password" style={inputStyle} />
                      <span className="cw-eye" onClick={()=>setShowConfirmPass(!showConfirmPass)}>{showConfirmPass?"🙈":"👁️"}</span>
                    </div>
                  </div>

                  {formError && (
                    <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:10, padding:"9px 14px", color:"#fca5a5", fontSize:"0.75rem", textAlign:"center" }}>{formError}</div>
                  )}

                  <button onClick={handleRegister} disabled={formLoading} className="cw-btn cw-shimmer" style={{ color:"white", border:"none", borderRadius:12, padding:"13px", fontSize:"0.875rem", fontWeight:600, cursor:formLoading?"not-allowed":"pointer", marginTop:2, boxShadow:"0 6px 24px rgba(79,70,229,0.35)", fontFamily:"'DM Sans',sans-serif", opacity:formLoading?0.65:1 }}>
                    {formLoading ? "Creating account..." : "Create Account →"}
                  </button>

                  <p style={{ textAlign:"center", color:"rgba(148,163,184,0.45)", fontSize:"0.775rem", margin:"2px 0 0" }}>
                    Already registered?{" "}
                    <span className="cw-link" onClick={()=>{setScreen("login");setFormError("");}} style={{ color:"#818cf8", fontWeight:600 }}>Sign in</span>
                  </p>
                </div>
              </div>
            )}

            {/* ══ VERIFY ══ */}
            {screen === "verify" && (
              <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"30px 26px", overflowY:"auto" }}>
                <div style={{ textAlign:"center", marginBottom:24 }}>
                  <div style={{ width:64, height:64, borderRadius:"50%", background:"linear-gradient(135deg,#065f46,#059669)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, margin:"0 auto 16px", boxShadow:"0 0 0 8px rgba(5,150,105,0.1), 0 12px 28px rgba(5,150,105,0.3)" }}>📬</div>
                  <h2 style={{ color:"#f1f5f9", fontSize:"1.15rem", fontWeight:700, margin:"0 0 8px", fontFamily:"'Space Grotesk',sans-serif" }}>Check Your Inbox</h2>
                  <p style={{ color:"rgba(148,163,184,0.55)", fontSize:"0.77rem", margin:0, lineHeight:1.65 }}>
                    We sent a 6-digit code to<br/>
                    <span style={{ color:"#818cf8", fontWeight:600 }}>{localStorage.getItem("pending_email") || email}</span>
                  </p>
                </div>

                <div style={{ height:"1px", background:"linear-gradient(90deg,transparent,rgba(16,185,129,0.2),transparent)", marginBottom:24 }} />

                <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                  <div>
                    <label style={labelStyle}>Verification Code</label>
                    <div className="cw-wrap" style={{ ...inputWrap, justifyContent:"center" }}>
                      <input type="text" maxLength={6} value={verifyCode} onChange={e=>setVerifyCode(e.target.value.replace(/\D/g,""))} onKeyDown={e=>e.key==="Enter"&&handleVerify()} placeholder="• • • • • •" style={{ ...inputStyle, textAlign:"center", letterSpacing:"0.6rem", fontSize:"1.4rem", fontWeight:700, color:"#e2e8f0" }} />
                    </div>
                  </div>

                  {formError && (
                    <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:10, padding:"9px 14px", color:"#fca5a5", fontSize:"0.75rem", textAlign:"center" }}>{formError}</div>
                  )}

                  <button onClick={handleVerify} disabled={formLoading} className="cw-btn" style={{ color:"white", border:"none", borderRadius:12, padding:"13px", fontSize:"0.875rem", fontWeight:600, cursor:formLoading?"not-allowed":"pointer", background:"linear-gradient(135deg,#065f46,#059669)", boxShadow:"0 6px 24px rgba(5,150,105,0.3)", fontFamily:"'DM Sans',sans-serif", opacity:formLoading?0.65:1, transition:"all 0.2s" }}>
                    {formLoading ? "Verifying..." : "Verify Email ✓"}
                  </button>

                  <div style={{ textAlign:"center" }}>
                    <p style={{ color:"rgba(148,163,184,0.4)", fontSize:"0.73rem", margin:"0 0 6px" }}>Didn't receive the code?</p>
                    <span className="cw-tab" onClick={handleResend} style={{ color:resendLoading?"rgba(129,140,248,0.35)":"#818cf8", fontWeight:600, fontSize:"0.77rem", textDecoration:"underline", pointerEvents:resendLoading?"none":"auto" }}>
                      {resendLoading ? "Sending..." : "Resend Code"}
                    </span>
                    {resendMsg && <p style={{ color:"#86efac", fontSize:"0.72rem", margin:"7px 0 0" }}>{resendMsg}</p>}
                  </div>

                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                    <span style={{ fontSize:"0.68rem", color:"rgba(148,163,184,0.3)" }}>⏰</span>
                    <p style={{ color:"rgba(148,163,184,0.3)", fontSize:"0.7rem", margin:0 }}>Code expires in 10 minutes</p>
                  </div>
                </div>
              </div>
            )}

            {/* ══ CHAT ══ */}
            {screen === "chat" && (
              <>
                <div className="cw-scroll" style={{ flex:1, overflowY:"auto", padding:"14px 12px", display:"flex", flexDirection:"column", gap:10 }}>
                  {messages.map((msg, i) => (
                    <div key={i} className="cw-bubble" style={{ display:"flex", justifyContent:msg.role==="user"?"flex-end":"flex-start", alignItems:"flex-end", gap:7 }}>
                      {msg.role==="bot" && (
                        <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#4338ca,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0, boxShadow:"0 0 0 2px rgba(99,102,241,0.2),0 4px 12px rgba(67,56,202,0.3)" }}>🤖</div>
                      )}
                      <div style={{ maxWidth:"78%", padding:"11px 15px", fontSize:"0.88rem", lineHeight:1.7, borderRadius:msg.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px", ...(msg.role==="user"?{ background:"linear-gradient(135deg,#4338ca,#6d28d9)", color:"rgba(255,255,255,0.92)", boxShadow:"0 4px 18px rgba(67,56,202,0.3)", border:"1px solid rgba(99,102,241,0.2)" }:{ background:"rgba(255,255,255,0.04)", color:"#cbd5e1", border:"1px solid rgba(99,102,241,0.1)", boxShadow:"0 4px 14px rgba(0,0,0,0.2)", backdropFilter:"blur(10px)" }) }}>
                        {msg.text ? (
                          msg.role==="bot" ? <div className="cw-prose"><ReactMarkdown components={{ p:({children})=><p>{children}</p>, strong:({children})=><strong>{children}</strong>, ul:({children})=><ul>{children}</ul>, ol:({children})=><ol>{children}</ol>, li:({children})=><li>{children}</li>, h1:({children})=><h1>{children}</h1>, h2:({children})=><h2>{children}</h2>, h3:({children})=><h3>{children}</h3>, code:({children})=><code>{children}</code> }}>{msg.text}</ReactMarkdown></div>
                          : msg.text
                        ) : (
                          <span style={{ display:"flex", gap:4, alignItems:"center", height:16 }}>
                            {[0,1,2].map(n=><span key={n} className="cw-dot" style={{ width:5, height:5, borderRadius:"50%", background:"#818cf8", display:"inline-block" }} />)}
                          </span>
                        )}
                      </div>
                      {msg.role==="user" && (
                        <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#6d28d9,#4338ca)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0, boxShadow:"0 4px 12px rgba(67,56,202,0.3)" }}>🧑</div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {messages.length <= 1 && (
                  <div style={{ padding:"8px 12px", display:"flex", gap:5, flexWrap:"nowrap", overflowX:"auto", borderTop:"1px solid rgba(99,102,241,0.1)", background:"rgba(0,0,0,0.2)" }}>
                    {suggestions.map((s,i)=>(
                      <button key={i} onClick={()=>sendMessage(s)} className="cw-chip" style={{ fontSize:"0.72rem", padding:"5px 11px", borderRadius:20, fontWeight:500, fontFamily:"'DM Sans',sans-serif", background:"rgba(99,102,241,0.08)", border:"1px solid rgba(99,102,241,0.2)", color:"rgba(148,163,184,0.8)", flexShrink:0 }}>{s}</button>
                    ))}
                  </div>
                )}

                <div style={{ padding:"10px 12px", borderTop:"1px solid rgba(99,102,241,0.1)", display:"flex", gap:8, alignItems:"center", background:"rgba(0,0,0,0.25)", backdropFilter:"blur(10px)" }}>
                  <input type="text" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()} placeholder="Ask about VAT, TRN, invoices..." className="cw-wrap" style={{ flex:1, fontSize:"0.85rem", color:"#e2e8f0", border:"1px solid rgba(99,102,241,0.18)", borderRadius:50, padding:"10px 18px", background:"rgba(15,23,42,0.7)", fontFamily:"'DM Sans',sans-serif", outline:"none", transition:"all 0.2s" }} />
                  <button onClick={()=>sendMessage()} disabled={loading} className="cw-send" style={{ width:38, height:38, borderRadius:"50%", border:"none", background:loading?"rgba(99,102,241,0.2)":"linear-gradient(135deg,#4338ca,#7c3aed)", color:"white", fontSize:14, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:loading?"none":"0 4px 16px rgba(67,56,202,0.4)" }}>➤</button>
                </div>

                <div style={{ textAlign:"center", fontSize:"0.58rem", color:"rgba(148,163,184,0.15)", padding:"5px", background:"rgba(0,0,0,0.2)", letterSpacing:"0.08em", textTransform:"uppercase" }}>
                  Powered by <span style={{ color:"rgba(99,102,241,0.5)", fontWeight:700 }}>E-Numerak AI</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── FAB ── */}
        <div style={{ position:"relative", display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
          {!isOpen && <>
            <div className="cw-pulse" style={{ position:"absolute", inset:-8, borderRadius:"50%", border:"1.5px solid rgba(99,102,241,0.35)", pointerEvents:"none" }} />
            <div className="cw-pulse" style={{ position:"absolute", inset:-2, borderRadius:"50%", border:"1px solid rgba(99,102,241,0.2)", pointerEvents:"none", animationDelay:"1s" }} />
          </>}
          <button onClick={()=>setIsOpen(!isOpen)} style={{ background:isOpen?"linear-gradient(135deg,#1e293b,#0f172a)":"linear-gradient(135deg,#4338ca,#7c3aed)", color:"white", border:isOpen?"1px solid rgba(99,102,241,0.2)":"none", borderRadius:"50%", width:54, height:54, display:"flex", alignItems:"center", justifyContent:"center", fontSize:isOpen?20:22, cursor:"pointer", boxShadow:isOpen?"0 4px 16px rgba(0,0,0,0.5)":"0 8px 28px rgba(67,56,202,0.5),0 0 0 1px rgba(99,102,241,0.2)", transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)", position:"relative", zIndex:1 }}
            onMouseOver={e=>{e.currentTarget.style.transform="scale(1.08)";}}
            onMouseOut={e=>{e.currentTarget.style.transform="scale(1)";}}>
            {isOpen ? "×" : "💬"}
          </button>
        </div>
      </div>
    </>
  );
}
