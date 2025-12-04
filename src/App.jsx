import { useState, useEffect } from "react";
import { Groq } from "groq-sdk";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const GUPTA_API = import.meta.env.VITE_AVARDHRA;

const groq = new Groq({
  apiKey: GUPTA_API,
  dangerouslyAllowBrowser: true, // produksi: lebih aman lewat backend
});

// daftar model Groq yang bisa dipilih
const MODEL_OPTIONS = [
  { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
  { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile" },
  { value: "meta-llama/llama-4-maverick-17b-128k", label: "Llama 4 Maverick 17B" },
  { value: "meta-llama/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout 17B Instruct" },
  { value: "meta-llama/llama-guard-4-12b", label: "Llama Guard 4 12B" },
  { value: "meta-llama/llama-prompt-guard-2-2b", label: "Llama Prompt Guard 2 2B" },
  { value: "meta-llama/llama-prompt-guard-2-8b", label: "Llama Prompt Guard 2 8B" },

  // Moonshot
  { value: "moonshotai/kimi-k2-instruct", label: "Kimi K2 Instruct" },
  { value: "moonshotai/kimi-k2-instruct-0905", label: "Kimi K2 Instruct 0905" },

  // OpenAI (OSS)
  { value: "openai/gpt-oss-120b", label: "GPT‑OSS 120B" },
  { value: "openai/gpt-oss-20b", label: "GPT‑OSS 20B" },
  { value: "openai/gpt-oss-safeguard-20b", label: "GPT‑OSS Safeguard 20B" },

  // Whisper (hanya untuk audio, bukan chat)
  { value: "whisper-large-v3", label: "Whisper Large v3 (audio)" },
  { value: "whisper-large-v3-turbo", label: "Whisper Large v3 Turbo (audio)" },
];

// pilih model teks default (kalau user pilih whisper, nanti dipaksa balik ke ini)
const FALLBACK_TEXT_MODEL = "llama-3.3-70b-versatile";

export const requestToGroqAi = async (content, model, history) => {
  // kalau user pilih Whisper, pakai fallback text model
  const safeModel = model.startsWith("whisper-") ? FALLBACK_TEXT_MODEL : model;

  const messages = [
    {
      role: "system",
      content: `
Gunakan bahasa Indonesia yang sopan, jelas, dan elegan.
Jawab dengan format Markdown yang rapih: judul, subjudul, list, tabel, dan blok kode bila perlu.
`,
    },
    ...history,
    { role: "user", content },
  ];

  const reply = await groq.chat.completions.create({
    messages,
    model: safeModel,
  });

  return reply.choices[0].message.content;
};

// basis data lokal sederhana
const localAnswer = (text) => {
  const lower = text.toLowerCase();

  if (lower.includes("gede valendra")) {
    return (
      "Gede Valendra adalah founder GuptaAI dan JejasataLampung. " +
      "Untuk informasi lebih lanjut, kunjungi situs resmi Avardhra Group: [https://www.avardhra.my.id](https://www.avardhra.my.id)"
    );
  }

  return null;
};

// transkripsi audio dengan Whisper di Groq
const transcribeAudioWithGroq = async (file, whisperModel = "whisper-large-v3") => {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const transcription = await groq.audio.transcriptions.create({
    file: {
      name: file.name,
      type: file.type || "audio/mpeg",
      data: buffer,
    },
    model: whisperModel,
    response_format: "json",
    language: "id",
  });

  return transcription.text;
};

function App() {
  // login & profile
  const [user, setUser] = useState(null); // {name, email}
  const [showLogin, setShowLogin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // model AI
  const [model, setModel] = useState(MODEL_OPTIONS[0].value);

  // chat
  const [messages, setMessages] = useState([]); // {role: 'user' | 'assistant', content: string}
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  // file/audio
  const [attachedFile, setAttachedFile] = useState(null); // File | null
  const [attachedType, setAttachedType] = useState(null); // 'audio' | 'file' | null

  // load dari localStorage saat awal
  useEffect(() => {
    try {
      const storedMessages = localStorage.getItem("gupta_chat_history");
      const storedUser = localStorage.getItem("gupta_user");
      const storedModel = localStorage.getItem("gupta_model");

      if (storedMessages) {
        setMessages(JSON.parse(storedMessages));
      }
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      if (storedModel) {
        setModel(storedModel);
      }
    } catch (e) {
      console.error("Failed to load from localStorage", e);
    }
  }, []);

  // simpan ke localStorage setiap messages berubah
  useEffect(() => {
    try {
      localStorage.setItem("gupta_chat_history", JSON.stringify(messages));
    } catch (e) {
      console.error("Failed to save chat history", e);
    }
  }, [messages]);

  // simpan user & model
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem("gupta_user", JSON.stringify(user));
      } else {
        localStorage.removeItem("gupta_user");
      }
    } catch (e) {
      console.error("Failed to save user", e);
    }
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem("gupta_model", model);
    } catch (e) {
      console.error("Failed to save model", e);
    }
  }, [model]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isAudio = file.type.startsWith("audio/");
    setAttachedFile(file);
    setAttachedType(isAudio ? "audio" : "file");
  };

  const clearAttachment = () => {
    setAttachedFile(null);
    setAttachedType(null);
  };

  const sendMessage = async () => {
    if (loading) return;

    let text = content.trim();

    // jika ada audio, transcribe dulu
    if (attachedFile && attachedType === "audio") {
      setLoading(true);
      try {
        const whisperModel =
          model === "whisper-large-v3-turbo" ? "whisper-large-v3-turbo" : "whisper-large-v3";
        const transcript = await transcribeAudioWithGroq(attachedFile, whisperModel);
        const prefix = text ? `${text}\n\nTranskrip audio:\n${transcript}` : transcript;
        text = prefix;
      } catch (err) {
        console.error("Error transcribe:", err);
        const errMsg = {
          role: "assistant",
          content: "Maaf, terjadi kesalahan saat memproses audio.",
        };
        setMessages((prev) => [...prev, errMsg]);
        setLoading(false);
        clearAttachment();
        return;
      } finally {
        clearAttachment();
      }
    }

    // jika ada file non‑audio, hanya kirim info nama file ke prompt
    if (attachedFile && attachedType === "file") {
      const fileInfo = `\n\n[File terlampir: ${attachedFile.name} (${attachedFile.type || "unknown"})]`;
      text = text ? text + fileInfo : fileInfo;
      clearAttachment();
    }

    if (!text) return;

    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setContent("");

    const cached = localAnswer(text);
    if (cached) {
      const aiMsg = { role: "assistant", content: cached };
      setMessages((prev) => [...prev, aiMsg]);
      return;
    }

    setLoading(true);
    try {
      const history = messages;
      const ai = await requestToGroqAi(text, model, history);
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

  // handler login sederhana (tanpa backend)
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    if (!name || !email) return;
    setUser({ name, email });
    setShowLogin(false);
  };

  const handleLogout = () => {
    setUser(null);
    setShowProfile(false);
  };

  return (
    <div className="h-screen bg-slate-100">
      {/* OVERLAY LOGIN MODAL */}
      {showLogin && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              Masuk ke GuptaAI
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Login sederhana ini hanya disimpan di browser kamu (localStorage).
            </p>
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Nama
                </label>
                <input
                  name="name"
                  type="text"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-300"
                  placeholder="Nama kamu"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-300"
                  placeholder="email@contoh.com"
                  autoComplete="off"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogin(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                >
                  Masuk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OVERLAY PROFILE MODAL */}
      {showProfile && user && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              Profil Pengguna
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Data ini hanya disimpan di perangkat kamu.
            </p>
            <div className="space-y-2 text-sm text-slate-700 mb-4">
              <p>
                <span className="font-medium">Nama:</span> {user.name}
              </p>
              <p>
                <span className="font-medium">Email:</span> {user.email}
              </p>
              <p className="text-xs text-slate-400">
                Riwayat chat akan tetap tersimpan meskipun kamu menutup halaman.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setShowProfile(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-1.5 text-xs rounded-lg bg-rose-600 text-white hover:bg-rose-500"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER fixed */}
      <header className="fixed top-0 left-0 right-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-3">
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

          {/* kanan: pilih model + user */}
          <div className="flex items-center gap-2">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="text-[11px] border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300"
            >
              {MODEL_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            {user ? (
              <button
                type="button"
                onClick={() => setShowProfile(true)}
                className="flex items-center gap-2 px-2 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] text-slate-700 hover:bg-slate-200"
              >
                <span className="h-6 w-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {user.name}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowLogin(true)}
                className="hidden sm:flex px-3 py-1 rounded-full bg-slate-900 text-white text-[11px] hover:bg-slate-800"
              >
                Masuk
              </button>
            )}
          </div>
        </div>
      </header>

      {/* FOOTER / INPUT fixed */}
      <form
        onSubmit={handleSubmit}
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur-sm px-3 py-3 sm:px-4"
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          {/* tombol upload */}
          <div className="flex flex-col items-center gap-1">
            <label className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer">
              <i className="bx bx-paperclip text-xl" />
              <input
                type="file"
                accept="audio/*,application/pdf,text/plain,image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            {attachedFile && (
              <span className="max-w-[72px] text-[9px] text-slate-500 text-center line-clamp-2">
                {attachedType === "audio" ? "Audio: " : "File: "}
                {attachedFile.name}
              </span>
            )}
          </div>

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
            disabled={loading || (!content.trim() && !attachedFile)}
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
                                <div className="prose prose-slate prose-sm max-w-none">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      h1: ({ children }) => (
                                        <h1 className="text-lg font-semibold mb-2 text-slate-900 border-b border-slate-200 pb-1">
                                          {children}
                                        </h1>
                                      ),
                                      h2: ({ children }) => (
                                        <h2 className="text-base font-semibold mt-3 mb-1 text-slate-900">
                                          {children}
                                        </h2>
                                      ),
                                      h3: ({ children }) => (
                                        <h3 className="text-sm font-semibold mt-2 mb-1 text-slate-900">
                                          {children}
                                        </h3>
                                      ),
                                      p: ({ children }) => (
                                        <p className="mb-2 text-[13px] text-slate-800">
                                          {children}
                                        </p>
                                      ),
                                      ul: ({ children }) => (
                                        <ul className="list-disc pl-5 space-y-1 mb-2">
                                          {children}
                                        </ul>
                                      ),
                                      ol: ({ children }) => (
                                        <ol className="list-decimal pl-5 space-y-1 mb-2">
                                          {children}
                                        </ol>
                                      ),
                                      li: ({ children }) => (
                                        <li className="text-[13px] text-slate-800">
                                          {children}
                                        </li>
                                      ),
                                      blockquote: ({ children }) => (
                                        <blockquote className="border-l-4 border-slate-300 pl-3 italic text-slate-600 text-[13px] mb-2">
                                          {children}
                                        </blockquote>
                                      ),
                                      table: ({ children }) => (
                                        <div className="mb-3 overflow-x-auto">
                                          <table className="w-full text-left text-[13px] border border-slate-200 rounded-lg overflow-hidden">
                                            {children}
                                          </table>
                                        </div>
                                      ),
                                      thead: ({ children }) => (
                                        <thead className="bg-slate-50 text-slate-900 font-semibold">
                                          {children}
                                        </thead>
                                      ),
                                      tbody: ({ children }) => (
                                        <tbody className="divide-y divide-slate-200">
                                          {children}
                                        </tbody>
                                      ),
                                      th: ({ children }) => (
                                        <th className="px-3 py-2 border-b border-slate-200">
                                          {children}
                                        </th>
                                      ),
                                      td: ({ children }) => (
                                        <td className="px-3 py-2 align-top">
                                          {children}
                                        </td>
                                      ),
                                      code({
                                        inline,
                                        className,
                                        children,
                                        ...props
                                      }) {
                                        if (inline) {
                                          return (
                                            <code className="px-1 py-0.5 rounded bg-slate-100 text-[0.85em] font-mono">
                                              {children}
                                            </code>
                                          );
                                        }
                                        return (
                                          <pre className="rounded-lg bg-slate-950 text-slate-50 p-3 text-xs overflow-x-auto mb-3">
                                            <code {...props}>{children}</code>
                                          </pre>
                                        );
                                      },
                                    }}
                                  >
                                    {msg.content}
                                  </ReactMarkdown>
                                </div>
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

