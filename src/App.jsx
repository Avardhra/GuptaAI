// App.jsx (modified)
// Catatan: pastikan dependency (React, Groq SDK, ReactMarkdown, remark-gfm, tailwind/boxicons dll) tetap ada.
import { useState, useEffect, useRef } from "react";
import { Groq } from "groq-sdk";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const GUPTA_API = import.meta.env.VITE_AVARDHRA;

const groq = new Groq({
  apiKey: GUPTA_API,
  dangerouslyAllowBrowser: true, // produksi: lebih aman lewat backend
});

const MODEL_OPTIONS = [
  { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
  { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile" },
  { value: "meta-llama/llama-4-maverick-17b-128k", label: "Llama 4 Maverick 17B" },
  { value: "meta-llama/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout 17B Instruct" },
  { value: "meta-llama/llama-guard-4-12b", label: "Llama Guard 4 12B" },
  { value: "meta-llama/llama-prompt-guard-2-2b", label: "Llama Prompt Guard 2 2B" },
  { value: "meta-llama/llama-prompt-guard-2-8b", label: "Llama Prompt Guard 2 8B" },
  { value: "moonshotai/kimi-k2-instruct", label: "Kimi K2 Instruct" },
  { value: "moonshotai/kimi-k2-instruct-0905", label: "Kimi K2 Instruct 0905" },
  { value: "openai/gpt-oss-120b", label: "GPT-OSS 120B" },
  { value: "openai/gpt-oss-20b", label: "GPT-OSS 20B" },
  { value: "openai/gpt-oss-safeguard-20b", label: "GPT-OSS Safeguard 20B" },
  { value: "whisper-large-v3", label: "Whisper Large v3 (audio)" },
  { value: "whisper-large-v3-turbo", label: "Whisper Large v3 Turbo (audio)" },
];

const FALLBACK_TEXT_MODEL = "llama-3.3-70b-versatile";

export const requestToGroqAi = async (content, model, history) => {
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
  const [messages, setMessages] = useState([]); // {role, content, time}
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  // file/audio
  const [attachedFile, setAttachedFile] = useState(null); // File | null
  const [attachedType, setAttachedType] = useState(null); // 'audio' | 'file' | null

  // history modal
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState([]); // loaded from storage

  // ref to auto-clear timeout & visibility state
  const autoClearTimeoutRef = useRef(null);

  // --- Helpers for storage keys per account ---
  const storageKeyFor = (email) => `gupta_chat_history_${email || "guest"}`;

  // --- Load messages for current user on mount and when user changes ---
  useEffect(() => {
    try {
      const key = storageKeyFor(user?.email);
      const stored = localStorage.getItem(key);
      if (stored) {
        // do not automatically populate UI if we want to keep current session messages
        // but per requirement when login, riwayat dapat diakses via modal.
        // We will not auto-fill messages UI on login to avoid surprising user;
        // instead we keep messages as-is and show saved history in modal.
        // However if messages are empty, we can optionally load to UI.
        if (!messages || messages.length === 0) {
          setMessages(JSON.parse(stored));
        }
      }
    } catch (e) {
      console.error("Failed to load messages for user", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // --- Save messages to per-user storage whenever messages change ---
  // IMPORTANT: we **only write** when messages length > 0 to avoid overwriting archive with empty when auto-cleared.
  useEffect(() => {
    try {
      const key = storageKeyFor(user?.email);
      if (messages && messages.length > 0) {
        localStorage.setItem(key, JSON.stringify(messages));
      }
    } catch (e) {
      console.error("Failed to save chat history", e);
    }
  }, [messages, user]);

  // --- Load model & local user info (guest) on first mount ---
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("gupta_user");
      const storedModel = localStorage.getItem("gupta_model");
      if (storedUser) setUser(JSON.parse(storedUser));
      if (storedModel) setModel(storedModel);
      // If guest history exists and messages empty, load it
      if (!storedUser) {
        const guestKey = storageKeyFor("guest");
        const guestStored = localStorage.getItem(guestKey);
        if (guestStored && (!messages || messages.length === 0)) {
          setMessages(JSON.parse(guestStored));
        }
      }
    } catch (e) {
      console.error("Failed to initialize from localStorage", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Visibility API: when tab hidden start timer; when visible cancel ---
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        // start auto-clear timer (2 minutes)
        if (autoClearTimeoutRef.current) clearTimeout(autoClearTimeoutRef.current);
        autoClearTimeoutRef.current = setTimeout(() => {
          // before clearing UI, persist messages to per-user storage (archive)
          try {
            const key = storageKeyFor(user?.email);
            if (messages && messages.length > 0) {
              localStorage.setItem(key, JSON.stringify(messages));
              // update historyList for modal as well
              setHistoryList(JSON.parse(JSON.stringify(messages)));
            }
          } catch (e) {
            console.error("Failed to backup messages before auto-clear", e);
          }
          // clear UI messages (but do NOT remove archive)
          setMessages([]);
          autoClearTimeoutRef.current = null;
        }, 120000); // 120000 ms = 2 menit
      } else {
        // tab visible again -> cancel auto clear
        if (autoClearTimeoutRef.current) {
          clearTimeout(autoClearTimeoutRef.current);
          autoClearTimeoutRef.current = null;
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (autoClearTimeoutRef.current) clearTimeout(autoClearTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, user]);

  // --- Handlers untuk file ---
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

  // --- Sending messages / AI interaction ---
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
          time: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);
        setLoading(false);
        clearAttachment();
        return;
      } finally {
        clearAttachment();
      }
    }

    if (attachedFile && attachedType === "file") {
      const fileInfo = `\n\n[File terlampir: ${attachedFile.name} (${attachedFile.type || "unknown"})]`;
      text = text ? text + fileInfo : fileInfo;
      clearAttachment();
    }

    if (!text) return;

    // user message with timestamp
    const userMsg = { role: "user", content: text, time: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setContent("");

    const cached = localAnswer(text);
    if (cached) {
      const aiMsg = { role: "assistant", content: cached, time: Date.now() };
      setMessages((prev) => [...prev, aiMsg]);
      return;
    }

    setLoading(true);
    try {
      const history = messages;
      const ai = await requestToGroqAi(text, model, history);
      const aiMsg = { role: "assistant", content: ai, time: Date.now() };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("Error Groq:", err);
      const errMsg = {
        role: "assistant",
        content: "Maaf, terjadi kesalahan saat menghubungi GuptaAI.",
        time: Date.now(),
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

  // --- Simple login (client-side only) ---
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    if (!name || !email) return;
    const newUser = { name, email };
    setUser(newUser);
    localStorage.setItem("gupta_user", JSON.stringify(newUser));
    setShowLogin(false);

    // load saved history into history modal list (but do NOT auto-paste into chat UI)
    try {
      const key = storageKeyFor(email);
      const stored = localStorage.getItem(key);
      if (stored) setHistoryList(JSON.parse(stored));
    } catch (e) {
      console.error("Failed to load user history after login", e);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setShowProfile(false);
  };

  // --- Open history modal & load archived history ---
  const openHistory = () => {
    try {
      const key = storageKeyFor(user?.email);
      const stored = localStorage.getItem(key);
      if (stored) {
        setHistoryList(JSON.parse(stored));
      } else {
        setHistoryList([]);
      }
    } catch (e) {
      console.error("Failed to load history", e);
      setHistoryList([]);
    }
    setShowHistory(true);
  };

  // Optional: allow clearing archived history for account
  const clearArchivedHistory = () => {
    try {
      const key = storageKeyFor(user?.email);
      localStorage.removeItem(key);
      setHistoryList([]);
    } catch (e) {
      console.error("Failed to clear archived history", e);
    }
  };

  return (
    <div className="h-screen bg-slate-100">
      {/* LOGIN MODAL */}
      {showLogin && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Masuk ke GuptaAI</h2>
            <p className="text-xs text-slate-500 mb-4">
              Login sederhana ini hanya disimpan di browser kamu (localStorage).
            </p>
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nama</label>
                <input name="name" type="text" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-300" placeholder="Nama kamu" autoComplete="off" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input name="email" type="email" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-300" placeholder="email@contoh.com" autoComplete="off" />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowLogin(false)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Batal</button>
                <button type="submit" className="px-4 py-1.5 text-xs rounded-lg bg-slate-900 text-white hover:bg-slate-800">Masuk</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROFILE MODAL */}
      {showProfile && user && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Profil Pengguna</h2>
            <p className="text-xs text-slate-500 mb-4">Data ini disimpan di perangkat (localStorage) dengan key berbasis email.</p>
            <div className="space-y-2 text-sm text-slate-700 mb-4">
              <p><span className="font-medium">Nama:</span> {user.name}</p>
              <p><span className="font-medium">Email:</span> {user.email}</p>
              <p className="text-xs text-slate-400">Riwayat chat tersimpan di akun ini dan dapat diakses oleh siapa saja yang login dengan email tersebut pada perangkat ini.</p>
            </div>
            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={() => setShowProfile(false)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Tutup</button>
              <button type="button" onClick={handleLogout} className="px-4 py-1.5 text-xs rounded-lg bg-rose-600 text-white hover:bg-rose-500">Keluar</button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold mb-2">Riwayat Chat ({user?.email || "guest"})</h2>
              <div className="flex items-center gap-2">
                <button onClick={clearArchivedHistory} className="text-xs px-2 py-1 rounded border border-slate-200 text-rose-600 hover:bg-rose-50">Hapus Riwayat</button>
                <button onClick={() => setShowHistory(false)} className="text-xs px-2 py-1 rounded border border-slate-200">Tutup</button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-3 mt-2">
              {historyList && historyList.length > 0 ? (
                historyList.map((m, i) => (
                  <div key={i} className={`p-3 rounded-lg ${m.role === "user" ? "bg-slate-100 text-slate-900" : "bg-white border border-slate-200 text-slate-900"}`}>
                    <div className="text-[12px] font-medium mb-1">{m.role === "user" ? "Anda" : "GuptaAI"}</div>
                    <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {m.time ? new Date(m.time).toLocaleString() : ""}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Tidak ada riwayat.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-lg font-semibold shadow-sm">G</div>
              <span className="absolute -bottom-1 -right-1 inline-flex items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 shadow">AI</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-slate-900">GuptaAI</span>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600 border border-emerald-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1" />
                  Online
                </span>
              </div>
              <p className="text-xs text-slate-500">Asisten AI dari Avardhra Group</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select value={model} onChange={(e) => setModel(e.target.value)} className="text-[11px] border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300">
              {MODEL_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>

            <button onClick={openHistory} className="px-3 py-1 rounded-full bg-white border border-slate-300 text-[11px] hover:bg-slate-100">Riwayat</button>

            {user ? (
              <button type="button" onClick={() => setShowProfile(true)} className="flex items-center gap-2 px-2 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] text-slate-700 hover:bg-slate-200">
                <span className="h-6 w-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">{user.name.charAt(0).toUpperCase()}</span>
                <span className="hidden sm:inline max-w-[120px] truncate">{user.name}</span>
              </button>
            ) : (
              <button type="button" onClick={() => setShowLogin(true)} className="hidden sm:flex px-3 py-1 rounded-full bg-slate-900 text-white text-[11px] hover:bg-slate-800">Masuk</button>
            )}
          </div>
        </div>
      </header>

      {/* INPUT FOOTER */}
      <form onSubmit={handleSubmit} className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur-sm px-3 py-3 sm:px-4">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <div className="flex flex-col items-center gap-1">
            <label className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer">
              <i className="bx bx-paperclip text-xl" />
              <input type="file" accept="audio/*,application/pdf,text/plain,image/*" className="hidden" onChange={handleFileChange} />
            </label>
            {attachedFile && (
              <span className="max-w-[72px] text-[9px] text-slate-500 text-center line-clamp-2">
                {attachedType === "audio" ? "Audio: " : "File: "}{attachedFile.name}
              </span>
            )}
          </div>

          <textarea className="flex-1 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 max-h-32 min-h-[44px]" placeholder="Tulis pertanyaanmu di sini..." spellCheck="false" rows={1} value={content} onChange={(e) => setContent(e.target.value)} onKeyDown={handleKeyDown} />

          <button type="submit" disabled={loading || (!content.trim() && !attachedFile)} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <i className="bx bx-loader-alt animate-spin text-xl" /> : <i className="bx bx-right-arrow-alt text-xl" />}
          </button>
        </div>
        <p className="mt-1 text-[10px] text-center text-slate-400">Enter untuk kirim • Shift + Enter untuk baris baru.</p>
      </form>

      {/* CHAT AREA */}
      <main className="pt-[64px] pb-[88px] h-full">
        <div className="h-full flex justify-center px-2 sm:px-4">
          <div className="w-full max-w-5xl rounded-3xl flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
              {(!messages || messages.length === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white text-2xl shadow-lg shadow-slate-900/30">
                    <i className="bx bx-message-dots" />
                  </div>
                  <h1 className="text-lg font-semibold text-slate-900 mb-1">Mulai ngobrol dengan GuptaAI</h1>
                  <p className="text-sm mb-4 max-w-md">Tulis pertanyaanmu di bawah, GuptaAI akan menjawab dalam bahasa Indonesia yang jelas dan mudah dipahami.</p>
                  <div className="flex flex-wrap gap-2 justify-center text-xs text-slate-600 max-w-md">
                    <span className="px-3 py-1 rounded-full bg-white border border-slate-200">✨ Jelaskan konsep sulit dengan sederhana</span>
                    <span className="px-3 py-1 rounded-full bg-white border border-slate-200">💡 Cari ide konten & caption</span>
                    <span className="px-3 py-1 rounded-full bg-white border border-slate-200">🛠️ Bantu review & refactor kode</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, idx) => {
                    const isUser = msg.role === "user";
                    return (
                      <div key={idx} className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
                        <div className={`flex max-w-3xl gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                          {!isUser && (
                            <div className="flex-shrink-0 h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-semibold shadow-sm">G</div>
                          )}
                          <div className="flex flex-col gap-1">
                            <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${isUser ? "bg-slate-900 text-white rounded-br-md" : "bg-white text-slate-900 border border-slate-200 rounded-bl-md"}`}>
                              {isUser ? (
                                msg.content
                              ) : (
                                <div className="prose prose-slate prose-sm max-w-none">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {msg.content}
                                  </ReactMarkdown>
                                </div>
                              )}
                            </div>
                            {!isUser && <span className="text-[10px] text-slate-400">Dijawab oleh GuptaAI</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="flex max-w-xs items-center gap-2">
                        <div className="flex-shrink-0 h-7 w-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-semibold shadow-sm">G</div>
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
