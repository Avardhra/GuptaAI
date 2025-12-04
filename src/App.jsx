import { useState, useEffect, useRef } from "react";
import { Groq } from "groq-sdk";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const GUPTA_API = import.meta.env.VITE_AVARDHRA;

const groq = new Groq({
  apiKey: GUPTA_API,
  dangerouslyAllowBrowser: true,
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

// ====== UTIL GUPTA AI ======
export const requestToGroqAi = async (content, model, history) => {
  const safeModel = model.startsWith("whisper-") ? FALLBACK_TEXT_MODEL : model;

  const cleanedHistory = (history || []).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const messages = [
    {
      role: "system",
      content: `
Gunakan bahasa Indonesia yang sopan, jelas, dan elegan.
Jawab dengan format Markdown yang rapih: judul, subjudul, list, tabel, dan blok kode bila perlu.
`,
    },
    ...cleanedHistory,
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
  const [loginMode, setLoginMode] = useState("login"); // 'login' | 'signup'
  const [showSidebar, setShowSidebar] = useState(false); // sidebar kanan (panel)
  // model AI
  const [model, setModel] = useState(MODEL_OPTIONS[0].value);

  // chat
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  // file/audio
  const [attachedFile, setAttachedFile] = useState(null);
  const [attachedType, setAttachedType] = useState(null);

  // history modal
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState([]);

  // per-tab session id (supaya tiap tab punya sesi sendiri)
  const [sessionId] = useState(() => {
    const existing = sessionStorage.getItem("gupta_session_id");
    if (existing) return existing;
    const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem("gupta_session_id", id);
    return id;
  });

  // ref auto-clear & scroll
  const autoClearTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  const storageKeyFor = (email) => `gupta_chat_history_${email || "guest"}`;
  const sessionKeyFor = (email) =>
    `gupta_chat_session_${email || "guest"}_${sessionId}`;

  // ============ INIT USER & MODEL ============
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("gupta_user");
      const storedModel = localStorage.getItem("gupta_model");
      if (storedUser) setUser(JSON.parse(storedUser));
      if (storedModel) setModel(storedModel);
    } catch (e) {
      console.error("Failed to initialize from localStorage", e);
    }
  }, []);

  // ============ LOAD MESSAGES KETIKA USER BERUBAH ============
  useEffect(() => {
    try {
      const email = user?.email || "guest";
      // 1. coba load session khusus tab
      const sessionKey = sessionKeyFor(email);
      const sessionStored = sessionStorage.getItem(sessionKey);
      if (sessionStored) {
        setMessages(JSON.parse(sessionStored));
        return;
      }
      // 2. fallback ke history umum user
      const key = storageKeyFor(email);
      const stored = localStorage.getItem(key);
      if (stored) {
        setMessages(JSON.parse(stored));
      } else {
        setMessages([]);
      }
    } catch (e) {
      console.error("Failed to load messages for user", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionId]);

  // ============ SIMPAN MESSAGES KE localStorage + sessionStorage ============
  useEffect(() => {
    try {
      const email = user?.email || "guest";
      const key = storageKeyFor(email);
      const sessionKey = sessionKeyFor(email);

      if (messages && messages.length > 0) {
        // simpan versi "archive" (global user)
        localStorage.setItem(key, JSON.stringify(messages));
        // simpan versi sesi tab
        sessionStorage.setItem(sessionKey, JSON.stringify(messages));
      } else {
        // kalau kosong, jangan hapus archive, tapi kosongkan session
        sessionStorage.removeItem(sessionKey);
      }
    } catch (e) {
      console.error("Failed to save chat history", e);
    }
  }, [messages, user, sessionId]);

  // ============ AUTO-BACKUP SAAT TAB DITUTUP ============
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        const email = user?.email || "guest";
        const key = storageKeyFor(email);
        if (messages && messages.length > 0) {
          localStorage.setItem(key, JSON.stringify(messages));
        }
      } catch (e) {
        console.error("Failed to backup before unload", e);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, user]);

  // ============ VISIBILITY: CLEAR SESSION PER TAB ============
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        if (autoClearTimeoutRef.current) clearTimeout(autoClearTimeoutRef.current);
        autoClearTimeoutRef.current = setTimeout(() => {
          try {
            const email = user?.email || "guest";
            const key = storageKeyFor(email);
            // pastikan archive terbaru
            if (messages && messages.length > 0) {
              localStorage.setItem(key, JSON.stringify(messages));
              setHistoryList(JSON.parse(JSON.stringify(messages)));
            }
          } catch (e) {
            console.error("Failed to backup messages before auto-clear", e);
          }
          // clear hanya session tab ini
          setMessages([]);
          const sessionKey = sessionKeyFor(user?.email);
          sessionStorage.removeItem(sessionKey);
          autoClearTimeoutRef.current = null;
        }, 120000); // 2 menit
      } else {
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
  }, [messages, user, sessionId]);

  // ============ AUTO SCROLL ============
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, loading]);

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Teks disalin ke clipboard");
    } catch (e) {
      console.error("Failed to copy", e);
    }
  };

  const shareConversation = async () => {
    if (!messages || messages.length === 0) return;

    const lines = messages.map((m) => {
      const prefix = m.role === "user" ? "Anda:" : "GuptaAI:";
      return `${prefix}\n${m.content}\n`;
    });
    const shareText = lines.join("\n----------------------\n");
    const title = "Percakapan dengan GuptaAI";

    if (navigator.share) {
      try {
        await navigator.share({ title, text: shareText });
      } catch (e) {
        console.error("Share cancelled or failed", e);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        alert("Percakapan disalin ke clipboard, silakan tempel di mana saja.");
      } catch (e) {
        console.error("Failed to copy conversation", e);
      }
    }
  };

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
      const historyForApi = [...messages, userMsg];
      const ai = await requestToGroqAi(text, model, historyForApi);
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

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem("gupta_user");
    } catch (e) {
      console.error("Failed to clear user from localStorage", e);
    }
  };

  // signup + login (API via fetch, ganti URL ke endpoint serverless kamu)
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.name?.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value.trim();
    if (!email || !password || (loginMode === "signup" && !name)) return;

    try {
      let url, body;
      if (loginMode === "signup") {
        url = "/api/signup"; // ganti ke endpoint vercel / serverless kamu
        body = { name, email, password };
      } else {
        url = "/api/login";
        body = { email, password };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal otentikasi");
        return;
      }

      const userData = data.user || { name, email };
      setUser(userData);
      localStorage.setItem("gupta_user", JSON.stringify(userData));
      setShowLogin(false);
    } catch (err) {
      console.error("Auth error:", err);
      alert("Gagal terhubung ke server otentikasi");
    }
  };

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

  const clearArchivedHistory = () => {
    const email = user?.email || "guest";
    try {
      const key = storageKeyFor(email);
      localStorage.removeItem(key);
      setHistoryList([]);
      setMessages([]);

      // kalau punya backend history, disini bisa panggil API DELETE
      // fetch(`/api/history?email=${encodeURIComponent(email)}`, {
      //   method: "DELETE",
      // }).catch((err) => {
      //   console.error("Failed to clear history in backend", err);
      // });
    } catch (e) {
      console.error("Failed to clear archived history", e);
    }
  };

  return (
    <div className="h-screen bg-slate-100">
      {/* LOGIN / SIGNUP MODAL */}
      {showLogin && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              {loginMode === "login" ? "Masuk ke GuptaAI" : "Daftar Akun GuptaAI"}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Data login disimpan di server melalui API dan di browser kamu.
            </p>

            <div className="flex mb-3 rounded-lg border border-slate-200 bg-slate-50 text-[11px]">
              <button
                type="button"
                onClick={() => setLoginMode("login")}
                className={`flex-1 py-1.5 rounded-l-lg ${
                  loginMode === "login"
                    ? "bg-white text-slate-900 font-semibold"
                    : "text-slate-500"
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => setLoginMode("signup")}
                className={`flex-1 py-1.5 rounded-r-lg ${
                  loginMode === "signup"
                    ? "bg-white text-slate-900 font-semibold"
                    : "text-slate-500"
                }`}
              >
                Daftar
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {loginMode === "signup" && (
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
              )}
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
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Password
                </label>
                <input
                  name="password"
                  type="password"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-300"
                  placeholder="Minimal 4 karakter"
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
                  {loginMode === "login" ? "Masuk" : "Daftar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold mb-2">
                Riwayat Chat ({user?.email || "guest"})
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearArchivedHistory}
                  className="text-xs px-2 py-1 rounded border border-slate-200 text-rose-600 hover:bg-rose-50"
                >
                  Hapus Riwayat
                </button>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-xs px-2 py-1 rounded border border-slate-200"
                >
                  Tutup
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-3 mt-2">
              {historyList && historyList.length > 0 ? (
                historyList.map((m, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg ${
                      m.role === "user"
                        ? "bg-slate-100 text-slate-900"
                        : "bg-white border border-slate-200 text-slate-900"
                    }`}
                  >
                    <div className="text-[12px] font-medium mb-1">
                      {m.role === "user" ? "Anda" : "GuptaAI"}
                    </div>
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
              <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-lg font-semibold shadow-sm">
                G
              </div>
              <span className="absolute -bottom-1 -right-1 inline-flex items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 shadow">
                AI
              </span>
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
            {/* Icon bar untuk buka sidebar */}
            <button
              type="button"
              onClick={() => setShowSidebar(true)}
              className="mr-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <i className="bx bx-menu text-xl" />
            </button>
          </div>
        </div>
      </header>

      {/* RIGHT SIDEBAR / PANEL */}
      {showSidebar && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="flex-1 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ease-out opacity-100"
            onClick={() => setShowSidebar(false)}
          />
          <aside
            className="
              w-80 max-w-full h-full bg-white shadow-xl border-l border-slate-200 flex flex-col
              transform transition-transform duration-300 ease-out translate-x-0
            "
          >
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Panel GuptaAI</h2>
              <button
                onClick={() => setShowSidebar(false)}
                className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* LOGIN / PROFILE SECTION */}
              <section>
                <h3 className="text-xs font-semibold text-slate-500 mb-2">Akun</h3>
                {user ? (
                  <div className="space-y-1 text-sm text-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-semibold shadow-sm">
                        {user.name?.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-[11px] text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Riwayat chat tersimpan di perangkat ini berdasarkan email.
                    </p>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-3 inline-flex items-center justify-center px-3 py-1.5 text-xs rounded-lg bg-rose-600 text-white hover:bg-rose-500"
                    >
                      Keluar
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">
                      Kamu belum login. Masuk atau daftar untuk menyimpan riwayat per email.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginMode("login");
                        setShowLogin(true);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                    >
                      <i className="bx bx-log-in text-sm" />
                      Masuk
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginMode("signup");
                        setShowLogin(true);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      <i className="bx bx-user-plus text-sm" />
                      Daftar
                    </button>
                    <p className="text-[11px] text-slate-400">
                      Jika tidak login, riwayat akan tersimpan sebagai guest.
                    </p>
                  </div>
                )}
              </section>

              {/* MODEL SECTION */}
              <section>
                <h3 className="text-xs font-semibold text-slate-500 mb-2">Model AI</h3>
                <select
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value);
                    localStorage.setItem("gupta_model", e.target.value);
                  }}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300"
                >
                  {MODEL_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  Pilih model AI yang ingin digunakan untuk percakapan.
                </p>
              </section>

              {/* HISTORY SECTION */}
              <section>
                <h3 className="text-xs font-semibold text-slate-500 mb-2">Riwayat Chat</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={openHistory}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] hover:bg-slate-800"
                  >
                    Buka Riwayat
                  </button>
                  <button
                    onClick={clearArchivedHistory}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] text-rose-600 hover:bg-rose-50"
                  >
                    Hapus
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Riwayat disimpan per email (atau guest) di localStorage. Tiap tab punya sesi
                  sendiri, tapi archive tetap tersimpan.
                </p>
              </section>
            </div>
          </aside>
        </div>
      )}

      {/* INPUT FOOTER */}
      <form
        onSubmit={handleSubmit}
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur-sm px-3 py-3 sm:px-4"
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2">
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

      {/* CHAT AREA */}
      <main className="pt-[64px] pb-[88px] h-full">
        <div className="h-full flex justify-center px-2 sm:px-4">
          <div className="w-full max-w-5xl rounded-3xl flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
              {!messages || messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white text-2xl shadow-lg shadow-slate-900/30">
                    <i className="bx bx-message-dots" />
                  </div>
                  <h1 className="text-lg font-semibold text-slate-900 mb-1">
                    Mulai ngobrol dengan GuptaAI
                  </h1>
                  <p className="text-sm mb-4 max-w-md">
                    Tulis pertanyaanmu di bawah, GuptaAI akan menjawab dalam bahasa Indonesia yang
                    jelas dan mudah dipahami.
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
                        className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
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
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {msg.content}
                                  </ReactMarkdown>
                                </div>
                              )}
                            </div>
                            {!isUser && (
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <span>Dijawab oleh GuptaAI</span>
                                <button
                                  type="button"
                                  onClick={() => copyText(msg.content)}
                                  className="ml-2 px-2 py-0.5 rounded-full border border-slate-200 text-[10px] text-slate-600 hover:bg-slate-50"
                                >
                                  Salin
                                </button>
                              </div>
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
                  <div ref={messagesEndRef} />
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
