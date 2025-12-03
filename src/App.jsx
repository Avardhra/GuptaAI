import { useState } from "react";
import { Groq } from "groq-sdk";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const GUPTA_API = import.meta.env.VITE_AVARDHRA;

const groq = new Groq({
  apiKey: GUPTA_API,
  dangerouslyAllowBrowser: true,
});

export const requestToGroqAi = async (content) => {
  const reply = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "Kamu adalah asisten AI bernama GuptaAI. Jawab selalu dalam bahasa Indonesia yang jelas dan sopan. " +
          "Format jawaban menggunakan Markdown (heading, list, tabel sederhana, dan blok kode bila perlu). " +
          "Jika pengguna menanyakan siapa kamu, apa namamu, atau model apa yang digunakan, jawab bahwa namamu adalah GuptaAI dan kamu adalah asisten AI dari GuptaAI.",
      },
      { role: "user", content },
    ],
    model: "llama-3.3-70b-versatile",
  });

  return reply.choices[0].message.content;
};

function App() {
  const [messages, setMessages] = useState([]); // {role: 'user' | 'assistant', content: string}
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    const text = content.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setContent("");
    setLoading(true);

    try {
      const ai = await requestToGroqAi(text);
      const aiMsg = { role: "assistant", content: ai };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("Error Groq:", err);
      const errMsg = {
        role: "assistant",
        content: "Maaf, terjadi kesalahan saat menghubungi GuptaAI.",
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-screen bg-slate-100">
      {/* HEADER fixed */}
      <header className="fixed top-0 left-0 right-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-lg font-semibold shadow-sm">
                G
              </div>
              <span className="absolute -bottom-1 -right-1 inline-flex items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 shadow">
                AI
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-slate-900">
                  GuptaAI
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600 border border-emerald-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1" />
                  Online
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Asisten AI dari Avardhra Group
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] text-slate-500">
            v1.0 • Beta
          </span>
        </div>
      </header>

      {/* FOOTER / INPUT fixed */}
      <form
        onSubmit={handleSubmit}
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur-sm px-3 py-3 sm:px-4"
      >
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <textarea
            className="flex-1 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 max-h-32 min-h-[44px]"
            placeholder="Tulis pertanyaanmu di sini..."
            spellCheck="false"
            rows={1}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <i className="bx bx-loader-alt animate-spin text-xl" />
            ) : (
              <i className="bx bx-right-arrow-alt text-xl" />
            )}
          </button>
        </div>
        <p className="mt-1 text-[10px] text-center text-slate-400">
          Enter untuk kirim • Shift + Enter untuk baris baru.
        </p>
      </form>

      {/* AREA CHAT tengah: hanya ini yang scroll */}
      <main className="pt-[64px] pb-[88px] h-full">
        <div className="h-full flex justify-center px-2 sm:px-4">
          <div className="w-full max-w-5xl rounded-3xl flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white text-2xl shadow-lg shadow-slate-900/30">
                    <i className="bx bx-message-dots" />
                  </div>
                  <h1 className="text-lg font-semibold text-slate-900 mb-1">
                    Mulai ngobrol dengan GuptaAI
                  </h1>
                  <p className="text-sm mb-4 max-w-md">
                    Tulis pertanyaanmu di bawah, GuptaAI akan menjawab dalam
                    bahasa Indonesia yang jelas dan mudah dipahami.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center text-xs text-slate-600 max-w-md">
                    <span className="px-3 py-1 rounded-full bg-white border border-slate-200">
                      ✨ Jelaskan konsep sulit dengan sederhana
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white border border-slate-200">
                      💡 Cari ide konten & caption
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white border border-slate-200">
                      🛠️ Bantu review & refactor kode
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, idx) => {
                    const isUser = msg.role === "user";
                    return (
                      <div
                        key={idx}
                        className={`flex w-full ${
                          isUser ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`flex max-w-3xl gap-3 ${
                            isUser ? "flex-row-reverse" : "flex-row"
                          }`}
                        >
                          {!isUser && (
                            <div className="flex-shrink-0 h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-semibold shadow-sm">
                              G
                            </div>
                          )}
                          <div className="flex flex-col gap-1">
                            <div
                              className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                                isUser
                                  ? "bg-slate-900 text-white rounded-br-md"
                                  : "bg-white text-slate-900 border border-slate-200 rounded-bl-md"
                              }`}
                            >
                              {isUser ? (
                                msg.content
                              ) : (
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  className="prose prose-slate prose-sm max-w-none prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-code:text-slate-900 prose-headings:text-slate-900 prose-li:marker:text-slate-400"
                                >
                                  {msg.content}
                                </ReactMarkdown>
                              )}
                            </div>
                            {!isUser && (
                              <span className="text-[10px] text-slate-400">
                                Dijawab oleh GuptaAI
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="flex max-w-xs items-center gap-2">
                        <div className="flex-shrink-0 h-7 w-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-semibold shadow-sm">
                          G
                        </div>
                        <div className="rounded-2xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-500 flex items-center gap-2">
                          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse" />
                          Mengetik...
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
