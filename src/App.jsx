// src/App.jsx
import { useState, useEffect, useRef } from "react";
import { Groq } from "groq-sdk";
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import kepribadian from "../config/kepribadian.json";

const GUPTA_API = import.meta.env.VITE_AVARDHRA;

const groq = new Groq({
  apiKey: GUPTA_API,
  dangerouslyAllowBrowser: true, // kunci terlihat di browser, gunakan hanya untuk project pribadi
});

const MODEL_OPTIONS = [
  // Chat umum
  { value: "llama-3.1-8b-instant", label: "Cepat (Llama 3.1 8B)" },
  { value: "llama-3.3-70b-versatile", label: "Pintar (Llama 3.3 70B)" },
  { value: "openai/gpt-oss-20b", label: "GPT Ringan" },
  { value: "openai/gpt-oss-120b", label: "GPT Pro" },

  // Mode aman / filter
  { value: "openai/gpt-oss-safeguard-20b", label: "GPT Aman (dengan filter)" },
  { value: "meta-llama/llama-guard-4-12b", label: "Llama Guard (keamanan)" },

  // Prompt guard
  { value: "meta-llama/llama-prompt-guard-2-2b", label: "Prompt Guard 2B" },
  { value: "meta-llama/llama-prompt-guard-2-8b", label: "Prompt Guard 8B" },

  // Model lain
  { value: "meta-llama/llama-4-maverick-17b-128k", label: "Llama 4 Maverick" },
  {
    value: "meta-llama/llama-4-scout-17b-16e-instruct",
    label: "Llama 4 Scout",
  },
  { value: "moonshotai/kimi-k2-instruct", label: "Kimi K2" },
  { value: "moonshotai/kimi-k2-instruct-0905", label: "Kimi K2 (baru)" },

  // Audio
  { value: "whisper-large-v3", label: "Transkrip Suara" },
  { value: "whisper-large-v3-turbo", label: "Transkrip Suara (Cepat)" },
];

const FALLBACK_TEXT_MODEL = "llama-3.3-70b-versatile";

// ==== UTIL GROQ ====

// chat text / vision
// chat text / vision
const requestToGroqAi = async (content, model, history, imageBase64, personaKey = "default") => {

  const safeModel = model.startsWith("whisper-") ? FALLBACK_TEXT_MODEL : model;

  const cleanedHistory = (history || []).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let finalContent = content;
  if (imageBase64) {
    const note =
      "\n\nCatatan: Saya juga melampirkan sebuah gambar dalam bentuk base64. " +
      "Anggap ini sebagai konteks visual tambahan jika model mendukungnya.";
    finalContent = content ? content + note : note;
  }

  const persona = kepribadian[personaKey] || kepribadian.default;

  const messages = [
    {
      role: "system",
      content: persona.systemPrompt,
    },
    ...cleanedHistory,
    { role: "user", content: finalContent },
  ];

  const reply = await groq.chat.completions.create({
    messages,
    model: safeModel,
  });

  return reply.choices[0].message.content || "";
};


// jawaban lokal
const localAnswer = (text) => {
  const lower = text.toLowerCase();

  if (
    lower.includes("gede valendra") ||
    lower.includes("valendra")
  ) {
    return (
      "## Gede Valendra\n\n" +
      "**Gede Valendra** adalah founder **GuptaAI** dan **JejasataLampung**.\n\n" +
      "Untuk informasi lebih lanjut, kunjungi situs resmi **Avardhra Group**: " +
      "[avardhra.my.id](https://www.avardhra.my.id)"
    );
  } else if (lower.includes("nivalesha")) {
    return (
      "## Nivalesha\n\n" +
      "Halo sayang ✨ **Nivalesha** adalah gabungan nama dari **Niken** dan **Valendra**.\n\n" +
      "Perjalanan kami dimulai pada **9 September 2024** di **ITERA**, sebuah cerita penuh makna " +
      "yang terukir indah di hati dan terus tumbuh setiap harinya. 💚"
    );
  } else if (
    lower.includes("frichintia niken gita natasyah") ||
    lower.includes("frichintia") ||
    lower.includes("niken gita") ||
    lower.includes("gita natasyah") ||
    lower.includes("niken") ||
    lower.includes("gita") ||
    lower.includes("natasyah")
  ) {
    return (
      "## Frichintia Niken Gita Natasyah\n\n" +
      "**Frichintia Niken Gita Natasyah** adalah kekasih dari **Gede Valendra**. 💕\n\n" +
      "Sosok spesial yang menginspirasi lahirnya kisah **Nivalesha** dan menjadi alasan " +
      "banyak momen berharga yang tersimpan rapi di hati."
    );
  }

  return null;
};


// speech-to-text (Whisper)
const transcribeAudioWithGroq = async (
  file,
  whisperModel = "whisper-large-v3"
) => {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const transcription = await groq.audio.transcriptions.create({
    file: {
      name: file.name,
      type: file.type || "audio/webm",
      data: buffer,
    },
    model: whisperModel,
    response_format: "json",
    language: "id",
  });

  return transcription.text;
};
// 
const getRelationshipDuration = () => {
  // Tanggal mulai hubungan
  const start = new Date(2024, 8, 9); // 9 September 2024 (bulan 8 karena 0 = Januari)
  const now = new Date();

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();

  // Jika hari negatif → pinjam hari dari bulan sebelumnya
  if (days < 0) {
    const lastMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += lastMonthDays;
    months -= 1;
  }

  // Jika bulan negatif → pinjam tahun
  if (months < 0) {
    months += 12;
    years -= 1;
  }

  // Total hari
  const totalDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));

  return { years, months, days, totalDays };
};

// ==== APP ====
function App() {
  // kepribadian
  // model
  const [model, setModel] = useState(MODEL_OPTIONS[0].value);
  const [modelOpen, setModelOpen] = useState(false);
  // persona / kepribadian
  const [personaKey, setPersonaKey] = useState("default");
  // auth
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginMode, setLoginMode] = useState("login");

  // sidebar
  const [showSidebar, setShowSidebar] = useState(false);
  // chat
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  // efek mengetik (typing effect)
  const [typingMessageIndex, setTypingMessageIndex] = useState(null);
  const [typingContent, setTypingContent] = useState("");

  // attachment / mode
  const [attachedFile, setAttachedFile] = useState(null);
  const [attachedImageBase64, setAttachedImageBase64] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);

  const [inputMode, setInputMode] = useState("text"); // "text" | "file" | "voice"

  // voice record
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // history
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState([]);

  const [showFileMenu, setShowFileMenu] = useState(false);
  const [fileMenuPos, setFileMenuPos] = useState({ x: 0, y: 0 });
  const fileLongPressRef = useRef(null);
  const fileInputRef = useRef(null);
  // 
  const [showLovePopup, setShowLovePopup] = useState(false);

  // flag untuk bedakan long press vs short click
  const isLongPressRef = useRef(false);
  // 
  const [tokenUsage, setTokenUsage] = useState({
    totalRequests: 0,
    estimatedTokens: 0,
  });

  // tab popup
  const [showTabPopup, setShowTabPopup] = useState(false);
  // 
  // state untuk toast
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });

  const showToast = (message, type = "info", timeout = 1800) => {
    setToast({ show: true, message, type });
    if (timeout) {
      setTimeout(() => {
        setToast((t) => ({ ...t, show: false }));
      }, timeout);
    }
  };


  // per-tab session
  const [sessionId] = useState(() => {
    const existing = sessionStorage.getItem("gupta_session_id");
    if (existing) return existing;
    const id = `session_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    sessionStorage.setItem("gupta_session_id", id);
    return id;
  });

  const autoClearTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  const storageKeyFor = (email) =>
    `gupta_chat_history_${email || "guest"}`;
  const sessionKeyFor = (email) =>
    `gupta_chat_session_${email || "guest"}_${sessionId}`;

  // INIT
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("gupta_user");
      const storedModel = localStorage.getItem("gupta_model");
      if (storedUser) setUser(JSON.parse(storedUser));
      if (storedModel) setModel(storedModel);
    } catch (e) {
      console.error("Failed init", e);
    }
  }, []);

  // POPUP
  useEffect(() => {
    const dismissed = localStorage.getItem("gupta_tab_popup_dismissed");
    if (dismissed === "1") return;

    const handleVisibility = () => {
      if (!document.hidden) {
        setShowTabPopup(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const closeTabPopup = () => {
    setShowTabPopup(false);
    localStorage.setItem("gupta_tab_popup_dismissed", "1");
  };


  // INIT PERSONA
  useEffect(() => {
    try {
      const storedPersona = localStorage.getItem("gupta_persona");
      if (storedPersona) {
        setPersonaKey(storedPersona);
      }
    } catch (e) {
      console.error("Failed load persona", e);
    }
  }, []);



  // LOAD MSG
  useEffect(() => {
    try {
      const email = user?.email || "guest";
      const sessionKey = sessionKeyFor(email);
      const sessionStored = sessionStorage.getItem(sessionKey);
      if (sessionStored) {
        setMessages(JSON.parse(sessionStored));
        return;
      }
      const key = storageKeyFor(email);
      const stored = localStorage.getItem(key);
      if (stored) setMessages(JSON.parse(stored));
      else setMessages([]);
    } catch (e) {
      console.error("load messages fail", e);
    }
  }, [user, sessionId]);

  // SAVE MSG
  useEffect(() => {
    try {
      const email = user?.email || "guest";
      const key = storageKeyFor(email);
      const sessionKey = sessionKeyFor(email);
      if (messages && messages.length > 0) {
        localStorage.setItem(key, JSON.stringify(messages));
        sessionStorage.setItem(sessionKey, JSON.stringify(messages));
      } else {
        sessionStorage.removeItem(sessionKey);
      }
    } catch (e) {
      console.error("save messages fail", e);
    }
  }, [messages, user, sessionId]);

  // BACKUP BEFORE UNLOAD
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        const email = user?.email || "guest";
        const key = storageKeyFor(email);
        if (messages && messages.length > 0) {
          localStorage.setItem(key, JSON.stringify(messages));
        }
      } catch (e) {
        console.error("backup fail", e);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () =>
      window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [messages, user]);

  // AUTO CLEAR PER TAB
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        if (autoClearTimeoutRef.current)
          clearTimeout(autoClearTimeoutRef.current);
        autoClearTimeoutRef.current = setTimeout(() => {
          try {
            const email = user?.email || "guest";
            const key = storageKeyFor(email);
            if (messages && messages.length > 0) {
              localStorage.setItem(key, JSON.stringify(messages));
              setHistoryList(
                JSON.parse(JSON.stringify(messages))
              );
            }
          } catch (e) {
            console.error("auto clear backup fail", e);
          }
          setMessages([]);
          const sessionKey = sessionKeyFor(user?.email);
          sessionStorage.removeItem(sessionKey);
          autoClearTimeoutRef.current = null;
        }, 120000);
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
      if (autoClearTimeoutRef.current)
        clearTimeout(autoClearTimeoutRef.current);
    };
  }, [messages, user, sessionId]);

  // AUTO SCROLL
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [messages, loading]);

  // EFEK MENGETIK (TYPING EFFECT)
  useEffect(() => {
    if (typingMessageIndex === null) return;
    const msg = messages[typingMessageIndex];
    const fullText = msg?.content || "";
    let i = 0;
    setTypingContent("");

    const interval = setInterval(() => {
      i += 1;
      setTypingContent(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(interval);
        setTypingMessageIndex(null);
      }
    }, 0.10);

    return () => clearInterval(interval);
  }, [typingMessageIndex, messages]);

  const copyText = async (text) => {
    if (!text) {
      showToast("Tidak ada teks yang bisa disalin.", "error");
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        showToast("Teks berhasil disalin ke clipboard.", "success");
        return;
      }

      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);

      if (ok) {
        showToast("Teks berhasil disalin ke clipboard.", "success");
      } else {
        showToast("Gagal menyalin teks.", "error");
      }
    } catch (e) {
      console.error("copy fail", e);
      showToast("Browser memblokir akses clipboard.", "error");
    }
  };



  const shareConversation = async () => {
    if (!messages || messages.length === 0) return;

    const title = "Percakapan dengan GuptaAI";

    // Bentuk URL chat (pakai origin + path sekarang)
    const baseUrl = window.location.origin + window.location.pathname;
    const email = user?.email || "guest";
    const sessionParam = encodeURIComponent(sessionId);
    const userParam = encodeURIComponent(email);
    const shareUrl = `${baseUrl}?session=${sessionParam}&user=${userParam}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: "Lihat percakapan GuptaAI-ku di sini:",
          url: shareUrl,
        });
      } catch (e) {
        console.error("share fail", e);
      }
    } else {
      try {
        await copyText(shareUrl);
        showToast("Link percakapan disalin ke clipboard.", "success");
      } catch (e) {
        console.error("copy convo fail", e);
      }
    }
  };


  const resetAttachment = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setAttachedFile(null);
    setAttachedImageBase64(null);
    setFilePreviewUrl(null);
  };

  // === FILE / IMAGE / AUDIO UPLOAD ===
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    resetAttachment();

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const base64 = result.split(",")[1];
        setAttachedImageBase64(base64);
      };
      reader.readAsDataURL(file);
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
      setAttachedFile(file);
    } else if (file.type.startsWith("audio/")) {
      setAttachedFile(file);
      setAttachedImageBase64(null);
    } else {
      alert("Hanya mendukung gambar atau audio.");
    }

    // selalu reset accept ke default
    if (fileInputRef.current) {
      fileInputRef.current.accept = "image/*,audio/*";
    }
  };

  // === SEND MESSAGE ===
  const sendMessage = async () => {
    if (loading) return;

    let text = content.trim();
    const historyForApi = [...messages];

    if (attachedFile && attachedFile.type.startsWith("audio/")) {
      setLoading(true);
      try {
        const whisperModel =
          model === "whisper-large-v3-turbo"
            ? "whisper-large-v3-turbo"
            : "whisper-large-v3";

        const transcript = await transcribeAudioWithGroq(
          attachedFile,
          whisperModel
        );
        text = text
          ? `${text}\n\nTranskrip audio:\n${transcript}`
          : transcript;
      } catch (err) {
        console.error("transcribe error:", err);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Maaf, terjadi kesalahan saat memproses audio.",
            time: Date.now(),
          },
        ]);
        setLoading(false);
        resetAttachment();
        return;
      } finally {
        resetAttachment();
      }
    }

    if (!text && !attachedImageBase64) return;

    const userMsgContent = attachedImageBase64
      ? text || "Jelaskan isi gambar ini secara singkat."
      : text;
    // kalau user menyebut Nivalesha → munculkan popup love
    if (userMsgContent.toLowerCase().includes("nivalesha")) {
      setShowLovePopup(true);
      // popup nanti bisa ditutup manual oleh user
    }

    const userMsg = {
      role: "user",
      content: userMsgContent,
      time: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setContent("");

    // === UPDATE URL DENGAN SESSION ===
    try {
      const baseUrl = window.location.origin + window.location.pathname;
      const email = user?.email || "guest";
      const params = new URLSearchParams(window.location.search);
      params.set("session", sessionId);
      params.set("user", email);
      const newUrl = `${baseUrl}?${params.toString()}`;
      window.history.replaceState({}, "", newUrl);
    } catch (e) {
      console.error("update url fail", e);
    }
    // ==================================
    // Jawaban lokal (nama-nama khusus)
    const cached = localAnswer(userMsgContent);
    if (cached && !attachedImageBase64) {
      const aiMsg = {
        role: "assistant",
        content: cached,
        time: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      resetAttachment();
      return;
    }

    setLoading(true);
    try {
      const ai = await requestToGroqAi(
        userMsgContent,
        model,
        historyForApi.concat(userMsg),
        attachedImageBase64,
        personaKey
      );

      // === ESTIMASI TOKEN ===
      const promptLength = userMsgContent.length;
      const replyLength = ai.length;
      const estimatedTokens = Math.round(
        (promptLength + replyLength) / 4 // kira‑kira 4 karakter per token
      );
      setTokenUsage((prev) => ({
        totalRequests: prev.totalRequests + 1,
        estimatedTokens: prev.estimatedTokens + estimatedTokens,
      }));
      // =======================

      const aiMsg = { role: "assistant", content: ai, time: Date.now() };
      setMessages((prev) => {
        const next = [...prev, aiMsg];
        const index = next.length - 1;
        setTypingMessageIndex(index);
        setTypingContent("");
        return next;
      });
    } catch (err) {
      console.error("Groq error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Maaf, terjadi kesalahan saat menghubungi GuptaAI.",
          time: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
      resetAttachment();
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

  // AUTH
  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem("gupta_user");
    } catch (e) {
      console.error("clear user fail", e);
    }
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    const rawName = form.elements.name ? form.elements.name.value : "";
    const name = rawName ? rawName.trim() : "";
    const email = (form.elements.email?.value || "").trim();
    const password = (form.elements.password?.value || "").trim();

    if (!email || !password || (loginMode === "signup" && !name)) {
      alert("Lengkapi data terlebih dahulu");
      return;
    }

    try {
      const raw = localStorage.getItem("gupta_users") || "[]";
      const users = JSON.parse(raw);

      if (loginMode === "signup") {
        const already = users.find((u) => u.email === email);
        if (already) {
          alert("Email sudah terdaftar");
          return;
        }
        users.push({ name, email, password });
        localStorage.setItem("gupta_users", JSON.stringify(users));
      } else {
        const found = users.find(
          (u) => u.email === email && u.password === password
        );
        if (!found) {
          alert("Email atau password salah");
          return;
        }
      }

      const finalUser =
        loginMode === "signup"
          ? { name, email }
          : { name: users.find((u) => u.email === email).name, email };

      setUser(finalUser);
      localStorage.setItem("gupta_user", JSON.stringify(finalUser));
      setShowLogin(false);
    } catch (err) {
      console.error("Auth error:", err);
      alert("Gagal memproses data login di browser");
    }
  };

  const openHistory = () => {
    try {
      const key = storageKeyFor(user?.email);
      const stored = localStorage.getItem(key);
      if (stored) setHistoryList(JSON.parse(stored));
      else setHistoryList([]);
    } catch (e) {
      console.error("history fail", e);
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
    } catch (e) {
      console.error("clear history fail", e);
    }
  };

  // VOICE RECORD
  const startRecording = async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const mediaRecorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: "audio/webm",
        });
        const file = new File([blob], "recording.webm", {
          type: "audio/webm",
        });
        setAttachedFile(file);
        setAttachedImageBase64(null);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err) {
      console.error("mic fail:", err);
      alert("Tidak dapat mengakses mikrofon.");
    }
  };

  const stopRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream
      .getTracks()
      .forEach((t) => t.stop());
    mediaRecorderRef.current = null;
    setIsRecording(false);
  };

  const modeLabel = () => {
    if (inputMode === "text") return "Text";
    if (inputMode === "file") return "File";
    if (inputMode === "voice") return "Voice";
    return "";
  };
  const duration = getRelationshipDuration();

  return (
    <div className="h-screen bg-slate-100">
      {/* LOGIN MODAL */}
      {showLogin && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white px-5 mx-6 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              {loginMode === "login"
                ? "Masuk ke GuptaAI"
                : "Daftar Akun GuptaAI"}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Akun disimpan di browser (localStorage) dan bisa disambungkan
              ke backend nanti.
            </p>

            <div className="flex mb-3 rounded-lg border border-slate-200 bg-slate-50 text-[11px]">
              <button
                type="button"
                onClick={() => setLoginMode("login")}
                className={`flex-1 py-1.5 rounded-l-lg ${loginMode === "login"
                  ? "bg-white text-slate-900 font-semibold"
                  : "text-slate-500"
                  }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => setLoginMode("signup")}
                className={`flex-1 py-1.5 rounded-r-lg ${loginMode === "signup"
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
                    className={`p-3 rounded-lg ${m.role === "user"
                      ? "bg-slate-100 text-slate-900"
                      : "bg-white border border-slate-200 text-slate-900"
                      }`}
                  >
                    <div className="text-[12px] font-medium mb-1">
                      {m.role === "user" ? "Anda" : "GuptaAI"}
                    </div>
                    <div className="text-sm whitespace-pre-wrap">
                      {m.content}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {m.time
                        ? new Date(m.time).toLocaleString()
                        : ""}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Tidak ada riwayat.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB POPUP */}
      {showTabPopup && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-2">
              Selamat datang kembali
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Kamu barusan kembali ke tab ini. Popup ini tidak akan muncul
              lagi setelah ditutup.
            </p>
            <div className="flex justify-end">
              <button
                onClick={closeTabPopup}
                className="px-3 py-1.5 text-xs rounded-lg bg-slate-900 text-white hover:bg-slate-800"
              >
                Tutup
              </button>
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
                Asisten AI pribadi berbasis Groq AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={shareConversation}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <i className="bx bx-share-alt text-lg" />
            </button>
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

      {/* SIDEBAR */}
      {showSidebar && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="flex-1 bg-black/30 backdrop-blur-xs transition-opacity duration-300 ease-out opacity-100"
            onClick={() => setShowSidebar(false)}
          />
          <aside
            className={`w-80 max-w-full h-full bg-white shadow-xl border-l border-slate-200 flex flex-col transform transition-transform duration-300 ease-out ${showSidebar ? "translate-x-0" : "translate-x-full"
              }`}
          >
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                GuptaAI
              </h2>
              <button
                onClick={() => setShowSidebar(false)}
                className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* token req */}
              <section>
                <h3 className="text-xs font-semibold text-slate-500 mb-2">
                  Pemakaian Token (Perkiraan)
                </h3>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700 space-y-1">
                  <p>
                    Total request:{" "}
                    <span className="font-semibold">{tokenUsage.totalRequests}</span>
                  </p>
                  <p>
                    Estimasi token terpakai:{" "}
                    <span className="font-semibold">{tokenUsage.estimatedTokens}</span>
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Angka ini hanya perkiraan berdasarkan panjang teks, bukan data resmi
                    dari Groq.
                  </p>
                </div>
              </section>

              {/* AKUN */}
              <section>
                <h3 className="text-xs font-semibold text-slate-500 mb-2">
                  Akun
                </h3>
                {user ? (
                  <div className="space-y-1 text-sm text-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-semibold shadow-sm">
                        {user.name?.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Riwayat chat tersimpan di perangkat ini berdasarkan
                      email.
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
                  <div className="space-y-2 space-x-2">
                    <p className="text-xs text-slate-500">
                      Kamu belum login. Masuk atau daftar untuk menyimpan
                      riwayat per email.
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
                      Jika tidak login, riwayat akan tersimpan sebagai
                      guest.
                    </p>
                  </div>
                )}
              </section>



              {/* PERSONA / KEPRIBADIAN */}
              <section>
                <h3 className="text-xs font-semibold text-slate-500 mb-2">
                  Kepribadian AI
                </h3>
                <div className="space-y-1">
                  {Object.entries(kepribadian).map(([key, value]) => {
                    const active = personaKey === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setPersonaKey(key);
                          try {
                            localStorage.setItem("gupta_persona", key);
                          } catch (e) {
                            console.error("save persona fail", e);
                          }
                        }}
                        className={`w-full flex items-center justify-between rounded-lg border px-3 py-1.5 text-left text-[11px] transition-all ${active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                      >
                        <span>{value.label}</span>
                        {active && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[9px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Aktif
                          </span>
                        )}
                      </button>
                    );
                  })}

                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Ganti gaya bahasa dan cara jawab AI tanpa mengubah kode.
                </p>
              </section>




              {/* MODEL */}
              <section>
                <h3 className="text-xs font-semibold text-slate-500 mb-2">
                  Model AI
                </h3>
                <button
                  type="button"
                  onClick={() => setModelOpen((v) => !v)}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
                      {MODEL_OPTIONS.find((m) => m.value === model)?.label.charAt(
                        0
                      ) ?? "M"}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {MODEL_OPTIONS.find((m) => m.value === model)?.label ??
                          "Pilih model"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Klik untuk {modelOpen ? "menyembunyikan" : "mengganti"}{" "}
                        model
                      </span>
                    </div>
                  </div>
                  <i
                    className={`bx bx-chevron-down text-lg text-slate-500 transition-transform ${modelOpen ? "rotate-180" : ""
                      }`}
                  />
                </button>
                {modelOpen && (
                  <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1">
                    {MODEL_OPTIONS.map((m) => {
                      const active = model === m.value;
                      return (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => {
                            setModel(m.value);
                            localStorage.setItem("gupta_model", m.value);
                            setModelOpen(false);
                          }}
                          className={`w-full flex items-center justify-between rounded-lg border px-3 py-1.5 text-left text-[11px] transition-all duration-150 ${active
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                        >
                          <span>{m.label}</span>
                          {active && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[9px]">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              Aktif
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="mt-1 text-[11px] text-slate-400">
                  Pilih model teks biasa atau model vision/audio sesuai
                  kebutuhan.
                </p>
              </section>

              {/* HISTORY */}
              <section>
                <h3 className="text-xs font-semibold text-slate-500 mb-2">
                  Riwayat Chat
                </h3>
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
                  Riwayat disimpan per email (atau guest) di localStorage.
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
          {/* FILE / MIC */}
          <div className="flex items-center gap-1">
            {/* ICON FILE DENGAN LONG PRESS */}
            <button
              type="button"
              onMouseDown={(e) => {
                isLongPressRef.current = false;
                const rect = e.currentTarget.getBoundingClientRect();
                fileLongPressRef.current = setTimeout(() => {
                  isLongPressRef.current = true;
                  setFileMenuPos({
                    x: rect.left + rect.width / 2,
                    y: rect.top - 8,
                  });
                  setShowFileMenu(true);
                }, 600); // 0.6s long press
              }}
              onMouseUp={() => {
                if (fileLongPressRef.current) {
                  clearTimeout(fileLongPressRef.current);
                  fileLongPressRef.current = null;
                }
                if (!isLongPressRef.current) {
                  // short click → buka file picker langsung
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = "image/*,audio/*";
                    fileInputRef.current.click();
                  }
                }
              }}
              onMouseLeave={() => {
                if (fileLongPressRef.current) {
                  clearTimeout(fileLongPressRef.current);
                  fileLongPressRef.current = null;
                }
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 text-lg"
            >
              <i className="bx bx-paperclip" />
            </button>

            {/* input file hidden */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,audio/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* tombol mic opsional jika mau mode voice terpisah */}
            {inputMode === "voice" && (
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-xs shadow-sm ${isRecording
                  ? "bg-rose-600 border-rose-600 text-white animate-pulse"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
              >
                <i
                  className={`bx ${isRecording ? "bx-stop" : "bx-microphone"
                    } text-lg`}
                />
              </button>
            )}

            {/* MENU FILE (fixed di atas tombol) */}
            {showFileMenu && (
              <div
                className="fixed z-[9999] px-2 py-1 rounded-full bg-white border border-slate-200 shadow-sm flex items-center gap-1 text-xs text-slate-700"
                style={{
                  left: fileMenuPos.x,
                  top: fileMenuPos.y,
                  transform: "translate(-50%, -100%)",
                }}
                onMouseLeave={() => setShowFileMenu(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = "image/*";
                      fileInputRef.current.click();
                      fileInputRef.current.accept = "image/*,audio/*";
                    }
                    setShowFileMenu(false);
                  }}
                  className="h-7 w-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-700"
                >
                  <i className="bx bx-image text-base" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = "audio/*";
                      fileInputRef.current.click();
                      fileInputRef.current.accept = "image/*,audio/*";
                    }
                    setShowFileMenu(false);
                  }}
                  className="h-7 w-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-700"
                >
                  <i className="bx bx-microphone text-base" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowFileMenu(false)}
                  className="h-7 w-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-700"
                >
                  <i className="bx bx-x text-base" />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col gap-1">
            {/* preview image */}
            {attachedFile &&
              attachedFile.type.startsWith("image/") &&
              filePreviewUrl && (
                <div className="mb-1 rounded-xl border border-slate-200 bg-slate-50 p-2 flex items-start justify-between gap-2">
                  <div className="flex-1 text-xs text-slate-700">
                    <img
                      src={filePreviewUrl}
                      alt="preview"
                      className="max-h-32 rounded-lg object-contain bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={resetAttachment}
                    className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                  >
                    <i className="bx bx-x text-sm" />
                  </button>
                </div>
              )}

            {/* preview audio */}
            {attachedFile && attachedFile.type.startsWith("audio/") && (
              <div className="mb-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] text-emerald-700 flex items-center justify-between gap-2">
                <span>Audio siap dikirim dan akan dikonversi menjadi teks.</span>
                <button
                  type="button"
                  onClick={resetAttachment}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white border border-emerald-200 text-emerald-500 hover:bg-emerald-50"
                >
                  <i className="bx bx-x text-xs" />
                </button>
              </div>
            )}

            <textarea
              className="flex-1 w-full resize-none rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 max-h-32 min-h-[44px]"
              placeholder={
                inputMode === "voice"
                  ? "Klik mic untuk rekam, lalu kirim."
                  : inputMode === "file"
                    ? "Upload gambar/audio, lalu beri instruksi jika perlu..."
                    : "Tulis pertanyaanmu di sini..."
              }
              spellCheck="false"
              rows={1}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <button
            type="submit"
            disabled={
              loading || (!content.trim() && !attachedFile && !attachedImageBase64)
            }
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
                    Tulis pertanyaan, upload gambar, atau rekam suara.
                    GuptaAI akan menjawab dalam bahasa Indonesia.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center text-xs text-slate-600 max-w-md">
                    <span className="px-3 py-1 rounded-full bg-white border border-slate-200">
                      ✨ Jelasin isi gambar
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white border border-slate-200">
                      🎙️ Transkrip suara jadi teks
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white border border-slate-200">
                      💡 Tanya apa saja
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, idx) => {
                    const isUser = msg.role === "user";
                    const isTypingTarget =
                      !isUser && idx === typingMessageIndex;
                    const displayContent = isTypingTarget
                      ? typingContent
                      : msg.content;

                    return (
                      <div
                        key={idx}
                        className={`flex w-full ${isUser ? "justify-end" : "justify-start"
                          }`}
                      >
                        <div
                          className={`flex max-w-3xl gap-3 ${isUser ? "flex-row-reverse" : "flex-row"
                            }`}
                        >
                          <div className="flex flex-col gap-1">
                            <div
                              className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${isUser
                                ? "bg-slate-900 text-white rounded-br-md"
                                : "bg-white text-slate-900 border border-slate-200 rounded-bl-md"
                                }`}
                            >
                              {isUser ? (
                                displayContent
                              ) : (
                                <div className="prose prose-slate prose-sm max-w-none markdown-body">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      pre({ children }) {
                                        return <>{children}</>;
                                      },

                                      code({ node, inline, className, children, ...props }) {
                                        const match = /language-(\w+)/.exec(className || "");
                                        const codeString = String(children).replace(/\n$/, "");
                                        const lang = match ? match[1] : "text";

                                        if (inline) {
                                          return (
                                            <code className={`inline-code ${className || ""}`} {...props}>
                                              {children}
                                            </code>
                                          );
                                        }

                                        return (
                                          <div className="code-block">
                                            {/* Header */}
                                            <div className="code-block-header">
                                              <div className="flex gap-3">
                                                <span className="code-block-title-red"></span>
                                                <span className="code-block-title-yellow"></span>
                                                <span className="code-block-title-green"></span>
                                              </div>

                                              {/* Tombol copy SELALU tampil */}
                                              <button
                                                type="button"
                                                onClick={() => copyText(codeString)}
                                                className="code-block-copy"
                                              >
                                                <i className="bx bx-copy text-xs" />
                                                <span>Salin kode</span>
                                              </button>
                                            </div>

                                            {/* Area kode */}
                                            <div className="w-full max-w-full overflow-x-auto">
                                              <SyntaxHighlighter
                                                style={oneDark}
                                                language={lang}
                                                PreTag="pre"
                                                wrapLongLines={true}
                                                className="min-w-0 max-w-full"
                                                {...props}
                                              >
                                                {codeString}
                                              </SyntaxHighlighter>
                                            </div>
                                          </div>
                                        );
                                      },
                                    }}
                                  >
                                    {displayContent}
                                  </ReactMarkdown>
                                </div>


                              )}
                            </div>
                            {!isUser && (
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <span>Dijawab oleh GuptaAI</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyText(msg.content)
                                  }
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
      {/*  */}
      {showLovePopup && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-b from-pink-100/95 via-rose-100/95 to-pink-100/95 backdrop-blur-lg">
          {/* Partikel love & bunga */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {[...Array(55)].map((_, i) => {
              const delay = Math.random() * 5;
              const durationAnim = 7 + Math.random() * 5;
              const left = Math.random() * 100;
              const size = 10 + Math.random() * 22;
              const isHeart = Math.random() > 0.3;
              return (
                <div
                  key={i}
                  className="absolute animate-float-soft"
                  style={{
                    left: `${left}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${delay}s`,
                    animationDuration: `${durationAnim}s`,
                    fontSize: `${size}px`,
                  }}
                >
                  <span className="drop-shadow-[0_0_10px_rgba(244,114,182,0.8)]">
                    {isHeart ? "💗" : "🌸"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Kartu utama */}
          <div className="relative z-10 mx-4 w-full max-w-md">
            <div className="rounded-[30px] bg-white/80 shadow-[0_25px_80px_rgba(190,24,93,0.35)] border border-pink-100/80 px-6 py-8 sm:px-8 sm:py-9 backdrop-blur-xl flex flex-col items-center text-center">
              {/* Badge kecil di atas */}
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-pink-100/80 px-3 py-1 text-[11px] font-semibold text-pink-700">
                <span className="h-1.5 w-1.5 rounded-full bg-pink-500 animate-pulse" />
                <span>Love Story Mode</span>
              </div>

              {/* Ikon hati Boxicons */}
              <div className="flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 rounded-[40px] bg-gradient-to-br from-pink-400 via-rose-400 to-pink-500 shadow-[0_25px_60px_rgba(219,39,119,0.65)]">
                <i className="bx bxs-heart text-[64px] sm:text-[72px] text-pink-50 drop-shadow-[0_0_22px_rgba(248,250,252,0.95)] animate-pulse-slow" />
              </div>

              <h2 className="mt-5 text-2xl sm:text-[26px] font-extrabold tracking-tight text-pink-950">
                Untuk Nivalesha 💖✨
              </h2>

              <p className="mt-3 max-w-md text-sm sm:text-[15px] leading-relaxed text-pink-900/85">
                Setiap kali nama <span className="font-semibold">Nivalesha</span> muncul,
                GuptaAI ikut merayakan cinta manis antara{" "}
                <span className="font-semibold">Niken</span> dan{" "}
                <span className="font-semibold">Valendra</span>.
                Semoga ceritanya terus tumbuh, selembut senja dan selucu chat tengah malam. 🌸
              </p>

              <div className="mt-4 rounded-2xl bg-pink-50/90 border border-pink-100 px-4 py-3 text-[11px] sm:text-xs text-pink-900/80 shadow-inner">
                <p className="font-semibold text-pink-900 mb-0.5">
                  Waktu berjalan, rasanya ikut hangat. ⏳
                </p>
                <p>
                  Sudah{" "}
                  <span className="font-bold">
                    {duration.years} tahun {duration.months} bulan {duration.days} hari
                  </span>{" "}
                  sejak <span className="font-semibold">9 November 2024</span>,
                  yaitu <span className="font-bold">{duration.totalDays} hari penuh cerita</span> yang kalian tulis berdua. 💫
                </p>
              </div>

              <p className="mt-3 text-[11px] sm:text-xs text-pink-900/70">
                Terus jaga, ya. Di dunia nyata maupun di setiap baris chat kecil seperti ini. 💌
              </p>

              <button
                type="button"
                onClick={() => setShowLovePopup(false)}
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500 px-6 py-2.5 text-xs sm:text-[13px] font-semibold text-pink-50 shadow-[0_14px_35px_rgba(244,114,182,0.7)] hover:brightness-105 active:scale-95 transition-transform transition-[filter]"
              >
                <i className="bx bxs-heart-circle text-base" />
                Tutup, tapi cintanya lanjut 💞
              </button>
            </div>
          </div>
        </div>
      )}



      {/*  */}
      {toast.show && (
        <div className="fixed bottom-4 right-4 z-[9999]">
          <div
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs shadow-lg border ${toast.type === "success"
              ? "bg-emerald-600/95 text-white border-emerald-500"
              : toast.type === "error"
                ? "bg-rose-600/95 text-white border-rose-500"
                : "bg-slate-900/95 text-white border-slate-700"
              }`}
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10">
              <i
                className={`bx ${toast.type === "success"
                  ? "bx-check"
                  : toast.type === "error"
                    ? "bx-error"
                    : "bx-info-circle"
                  } text-sm`}
              />
            </span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/*  */}

    </div>
  );

}

export default App;
