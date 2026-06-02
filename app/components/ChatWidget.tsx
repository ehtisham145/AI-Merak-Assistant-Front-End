"use client";
import { useState, useRef, useEffect } from "react";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", text: "Assalam o Alaikum! Ask you Query Related to Tax Invoices." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let botReply = "";

      setMessages(prev => [...prev, { role: "bot", text: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        botReply += decoder.decode(value);
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "bot", text: botReply };
          return updated;
        });
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: "bot", text: "Error! No Connection with Backend." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-80 h-96 bg-white rounded-2xl shadow-2xl flex flex-col border border-gray-200">
          {/* Header */}
          <div className="bg-blue-600 text-white px-4 py-3 rounded-t-2xl flex justify-between items-center">
            <div>
              <p className="font-semibold text-sm">Tax Assistant</p>
              <p className="text-xs opacity-80">Online</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white text-xl leading-none">×</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-xs px-3 py-2 rounded-2xl text-sm ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-gray-100 text-gray-800 rounded-bl-none"
                }`}>
                  {msg.text || "..."}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              placeholder="Ask your question..."
              className="flex-1 text-sm text-gray-800 border border-gray-200 rounded-full px-3 py-2 outline-none focus:border-blue-400"
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="bg-blue-600 text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-blue-700 disabled:opacity-50"
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* Bubble Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg text-2xl"
      >
        {isOpen ? "×" : "💬"}
      </button>
    </div>
  );
}