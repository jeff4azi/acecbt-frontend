import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ClipboardCopy,
  Check,
  Trash2,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import imageCompression from "browser-image-compression";

// ─── AI Prompt ────────────────────────────────────────────────────────────────

const AI_PROMPT = `You are formatting multiple-choice quiz questions into a strict JSON format for import into a CBT platform.

Convert the questions I provide below into this exact JSON structure:

{
  "questions": [
    {
      "question_text": "string - the question",
      "question_image": null,
      "options": [
        { "text": "string - option text", "image": null },
        { "text": "string - option text", "image": null }
      ],
      "correct_option": 0,
      "explanation": "string or null - brief explanation of the correct answer"
    }
  ]
}

Rules you must follow exactly:
1. "correct_option" must be the zero-based index of the correct answer within that question's "options" array (0 = first option, 1 = second, etc.).
2. Always set "question_image" and every option's "image" to null — do not invent URLs or descriptions.
3. If no explanation is given or obvious, set "explanation" to null.
4. Keep each question's options in the same order they were originally given.
5. Output ONLY valid JSON — no markdown code fences, no commentary, no extra text before or after.
6. Do not skip, merge, reword, or reorder questions. Convert them exactly as given.

Here are my questions:

[PASTE YOUR QUESTIONS HERE]`;

// ─── Image upload helper ──────────────────────────────────────────────────────

const BUCKET_LABELS = {
  "question-images": "Question images",
  "option-images": "Answer-option images",
  "ad-images": "Ad images",
};

async function uploadImage(file, bucket) {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error(
      `${BUCKET_LABELS[bucket] ?? bucket}: file too large (${Math.round(
        file.size / 1024 / 1024,
      )} MB). Max 5MB before compression.`,
    );
  }

  let compressed;
  try {
    const widthCap = bucket === "option-images" ? 700 : 800;
    compressed = await imageCompression(file, {
      maxSizeMB: bucket === "option-images" ? 0.12 : 0.15,
      maxWidthOrHeight: widthCap,
      useWebWorker: true,
      fileType: "image/webp",
      initialQuality: 0.82,
    });
  } catch {
    compressed = file;
  }

  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;

  try {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, compressed, { contentType: "image/webp", upsert: false });
    if (error) {
      const msg = error?.message || String(error);
      if (
        /(bucket|schema|not found|does not exist|permission|public|policy)/i.test(
          msg,
        )
      ) {
        throw new Error(
          `Storage issue — make sure the '${bucket}' bucket exists in Supabase, is set to PUBLIC, and has RLS policies for insert/select. Raw: ${msg}`,
        );
      }
      throw new Error(msg);
    }
  } catch (uploadErr) {
    const msg = uploadErr?.message || String(uploadErr);
    if (
      /(bucket|schema|not found|does not exist|permission|public|policy)/i.test(
        msg,
      )
    ) {
      throw new Error(
        `Storage issue — make sure the '${bucket}' bucket exists in Supabase, is set to PUBLIC, and has RLS policies for insert/select. Raw: ${msg}`,
      );
    }
    throw uploadErr;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}
function blankOption() {
  return { id: makeId(), text: "", image_url: null, image_preview: null };
}
function blankForm() {
  return {
    question_text: "",
    question_image_url: null,
    question_image_preview: null,
    options: [blankOption(), blankOption(), blankOption(), blankOption()],
    correct_option_index: 0,
    explanation: "",
  };
}

// ─── Question Card ────────────────────────────────────────────────────────────

function QuestionCard({ q, index, onDelete }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs font-bold text-accent uppercase">Q{index + 1}</p>
        <button
          onClick={onDelete}
          className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <p className="text-sm text-gray-800 font-medium mb-3 line-clamp-2">
        {q.question_text}
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {q.options.map((opt, oi) => (
          <div
            key={oi}
            className={`text-xs px-2.5 py-1.5 rounded-lg border ${
              oi === q.correct_option_index
                ? "bg-green-50 border-green-300 text-green-700 font-semibold"
                : "bg-gray-50 border-gray-200 text-gray-600"
            }`}
          >
            {String.fromCharCode(65 + oi)}. {opt.text}
          </div>
        ))}
      </div>
      {q.explanation && (
        <p className="text-xs text-gray-400 mt-2 line-clamp-1">
          <span className="font-medium">Expl:</span> {q.explanation}
        </p>
      )}
    </div>
  );
}

// ─── Manual Form ──────────────────────────────────────────────────────────────

function ManualForm({ onAdd, saving }) {
  const [form, setForm] = useState(blankForm());
  const [qDragOver, setQDragOver] = useState(false);
  const qImgRef = useRef();
  const optImgRefs = useRef([]);

  function applyQuestionFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setForm((f) => ({
      ...f,
      _questionFile: file,
      question_image_preview: URL.createObjectURL(file),
    }));
  }

  function handleQuestionImage(e) {
    applyQuestionFile(e.target.files[0]);
  }

  function clearQuestionImage(e) {
    e.stopPropagation();
    setForm((f) => ({
      ...f,
      _questionFile: null,
      question_image_preview: null,
    }));
    if (qImgRef.current) qImgRef.current.value = "";
  }

  function handleOptionText(idx, val) {
    setForm((f) => {
      const opts = [...f.options];
      opts[idx] = { ...opts[idx], text: val };
      return { ...f, options: opts };
    });
  }

  function handleOptionImage(idx, file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setForm((f) => {
      const opts = [...f.options];
      opts[idx] = {
        ...opts[idx],
        _file: file,
        image_preview: URL.createObjectURL(file),
      };
      return { ...f, options: opts };
    });
  }

  function clearOptionImage(idx, e) {
    e.stopPropagation();
    setForm((f) => {
      const opts = [...f.options];
      opts[idx] = { ...opts[idx], _file: null, image_preview: null };
      return { ...f, options: opts };
    });
    if (optImgRefs.current?.[idx]) optImgRefs.current[idx].value = "";
  }

  function addOption() {
    if (form.options.length >= 6) return;
    setForm((f) => ({ ...f, options: [...f.options, blankOption()] }));
  }

  function removeOption(idx) {
    if (form.options.length <= 2) return;
    setForm((f) => {
      const opts = f.options.filter((_, i) => i !== idx);
      const correct =
        f.correct_option_index >= opts.length ? 0 : f.correct_option_index;
      return { ...f, options: opts, correct_option_index: correct };
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.question_text.trim()) return;
    onAdd({ ...form, id: makeId() });
    setForm(blankForm());
    if (qImgRef.current) qImgRef.current.value = "";
    (optImgRefs.current || []).forEach((r) => {
      if (r) r.value = "";
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Question Text
        </label>
        <textarea
          required
          rows={3}
          value={form.question_text}
          onChange={(e) =>
            setForm((f) => ({ ...f, question_text: e.target.value }))
          }
          placeholder="Type the question here…"
          className="w-full px-4 py-3 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm text-gray-800 resize-none"
        />
      </div>

      {/* Question Image — drag & drop zone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Question Image (optional)
        </label>
        <div
          onClick={() => qImgRef.current.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setQDragOver(true);
          }}
          onDragLeave={() => setQDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setQDragOver(false);
            const file = e.dataTransfer.files?.[0];
            applyQuestionFile(file);
          }}
          className={`relative flex items-center justify-center w-full rounded-xl border-2 border-dashed cursor-pointer transition-colors overflow-hidden
            ${
              qDragOver
                ? "border-primary bg-primary/5"
                : form.question_image_preview
                  ? "border-gray-200 bg-gray-50"
                  : "border-accent-light hover:border-primary/50 hover:bg-primary/5 bg-white"
            }`}
          style={{ minHeight: form.question_image_preview ? "auto" : "120px" }}
        >
          <input
            ref={qImgRef}
            type="file"
            accept="image/*"
            onChange={handleQuestionImage}
            className="hidden"
          />
          {form.question_image_preview ? (
            <>
              <img
                src={form.question_image_preview}
                alt="question preview"
                className="w-full h-40 object-cover"
              />
              <button
                type="button"
                onClick={clearQuestionImage}
                className="absolute top-2 left-2 w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-sm"
                title="Remove image"
              >
                <X size={14} />
              </button>
              <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-lg backdrop-blur-sm">
                Click to change
              </span>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">
                {qDragOver ? "Drop here" : "Click or drag & drop image"}
              </p>
              <p className="text-xs text-gray-400">
                PNG/JPG/WEBP — auto-compressed
              </p>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">
            Answer Options
          </label>
          {form.options.length < 6 && (
            <button
              type="button"
              onClick={addOption}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Plus size={13} /> Add option
            </button>
          )}
        </div>
        <div className="space-y-3">
          {form.options.map((opt, idx) => (
            <div key={opt.id} className="flex items-start gap-2">
              <input
                type="radio"
                name="correct_option"
                checked={form.correct_option_index === idx}
                onChange={() =>
                  setForm((f) => ({ ...f, correct_option_index: idx }))
                }
                className="mt-3 accent-primary shrink-0"
                title="Mark as correct"
              />
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                  value={opt.text}
                  onChange={(e) => handleOptionText(idx, e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-dark cursor-pointer bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Option image
                    <input
                      ref={(el) => (optImgRefs.current[idx] = el)}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleOptionImage(idx, e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                  {opt.image_preview ? (
                    <div className="relative">
                      <img
                        src={opt.image_preview}
                        alt={`${String.fromCharCode(65 + idx)} preview`}
                        className="h-16 w-20 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={(e) => clearOptionImage(idx, e)}
                        className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-sm"
                        title="Remove image"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
              {form.options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(idx)}
                  className="mt-2.5 text-red-400 hover:text-red-600 shrink-0"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Select the radio button next to the correct answer. You can add an
          image for each option in place of (or alongside) the text.
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Explanation (optional)
        </label>
        <textarea
          rows={2}
          value={form.explanation}
          onChange={(e) =>
            setForm((f) => ({ ...f, explanation: e.target.value }))
          }
          placeholder="Brief explanation of the correct answer…"
          className="w-full px-4 py-3 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm resize-none"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition"
      >
        Add Question
      </button>
    </form>
  );
}

// ─── Bulk Import ──────────────────────────────────────────────────────────────

function BulkImport({ onImport }) {
  const [jsonText, setJsonText] = useState("");
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function copyPrompt() {
    navigator.clipboard.writeText(AI_PROMPT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function parseJSON() {
    setError("");
    setParsed(null);
    try {
      const data = JSON.parse(jsonText);
      if (!data.questions || !Array.isArray(data.questions))
        throw new Error('Expected { "questions": [...] }');
      setParsed(data.questions);
    } catch (err) {
      setError(`Invalid JSON: ${err.message}`);
    }
  }

  function importAll() {
    if (!parsed) return;
    onImport(
      parsed.map((q) => ({
        id: makeId(),
        question_text: q.question_text || "",
        question_image_url: null,
        question_image_preview: null,
        _questionFile: null,
        options: (q.options || []).map((o) => ({
          id: makeId(),
          text: o.text || "",
          image_url: null,
          image_preview: null,
          _file: null,
        })),
        correct_option_index: q.correct_option ?? 0,
        explanation: q.explanation || "",
      })),
    );
    setJsonText("");
    setParsed(null);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-gray-600 mb-3">
          Copy the prompt, paste it into ChatGPT/Claude with your questions,
          then paste the JSON output below.
        </p>
        <button
          onClick={copyPrompt}
          className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary font-semibold px-4 py-2.5 rounded-xl text-sm transition"
        >
          {copied ? (
            <>
              <Check size={15} /> Copied!
            </>
          ) : (
            <>
              <ClipboardCopy size={15} /> Copy AI Prompt
            </>
          )}
        </button>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Paste JSON output here
        </label>
        <textarea
          rows={8}
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder={'{\n  "questions": [...]\n}'}
          className="w-full px-4 py-3 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-xs font-mono resize-none"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          {error}
        </p>
      )}
      <button
        onClick={parseJSON}
        disabled={!jsonText.trim()}
        className="w-full bg-secondary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl text-sm transition disabled:opacity-50"
      >
        Parse &amp; Preview
      </button>
      {parsed && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">
            {parsed.length} question(s) parsed:
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {parsed.map((q, idx) => (
              <div key={idx} className="bg-tint rounded-xl px-4 py-3 text-sm">
                <p className="font-medium text-gray-800 mb-1">
                  Q{idx + 1}: {q.question_text}
                </p>
                {(q.options || []).map((o, oi) => (
                  <p
                    key={oi}
                    className={`text-xs ${oi === (q.correct_option ?? 0) ? "text-green-700 font-semibold" : "text-gray-500"}`}
                  >
                    {String.fromCharCode(65 + oi)}. {o.text}
                  </p>
                ))}
              </div>
            ))}
          </div>
          <button
            onClick={importAll}
            className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl text-sm transition"
          >
            Import All ({parsed.length})
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Admin Gate ───────────────────────────────────────────────────────────────

function AdminGateCTA() {
  return (
    <div className="min-h-screen bg-tint flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <ShieldAlert size={32} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-primary-dark mb-1">
            Admin Access Required
          </h1>
          <p className="text-sm text-gray-500">
            Sign in with your admin account to create or edit quizzes.
          </p>
        </div>
        <Link
          to="/admin/login"
          className="block w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-2xl text-sm transition"
        >
          Sign In as Admin
        </Link>
        <Link
          to="/"
          className="block w-full border-2 border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold py-3 rounded-2xl text-sm transition"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuizForm() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { authLoading, user, isAdmin } = useAuth();
  const isEditing = Boolean(quizId);

  const [details, setDetails] = useState({
    title: "",
    description: "",
    price: "",
    duration_minutes: "",
    pass_mark: 50,
    is_published: false,
  });
  const [questions, setQuestions] = useState([]);
  const [existingQs, setExistingQs] = useState([]); // from DB when editing
  const [questionTab, setQuestionTab] = useState("manual");
  const [showQuestions, setShowQuestions] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);

  // Load existing quiz when editing
  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) return;
    if (!isEditing) return;
    let cancelled = false;
    async function load() {
      try {
        const [quizRes, questionsRes] = await Promise.all([
          api.get(`/quizzes/${quizId}`),
          api.get(`/quizzes/${quizId}/questions`),
        ]);
        if (cancelled) return;
        const q = quizRes.data;
        setDetails({
          title: q.title,
          description: q.description ?? "",
          price: q.price,
          duration_minutes: q.duration_minutes,
          pass_mark: q.pass_mark,
          is_published: q.is_published,
        });
        setExistingQs(questionsRes.data);
      } catch (err) {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          // interceptor handles session teardown + redirect
        } else {
          console.error("QuizForm load error:", err);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [quizId, isEditing, authLoading, user, isAdmin]);

  // ── Save quiz details ─────────────────────────────────────────────────────

  async function handleSave(e) {
    e.preventDefault();
    setSaveError("");
    setSaving(true);
    setSaveOk(false);

    try {
      let savedQuiz;
      const payload = {
        title: details.title,
        description: details.description,
        price: Number(details.price),
        duration_minutes: Number(details.duration_minutes),
        pass_mark: Number(details.pass_mark),
        is_published: details.is_published,
      };

      if (isEditing) {
        const res = await api.patch(`/quizzes/${quizId}`, payload);
        savedQuiz = res.data;
      } else {
        const res = await api.post("/quizzes", payload);
        savedQuiz = res.data;
      }

      // Save any new questions (with image uploads)
      if (questions.length > 0) {
        for (const q of questions) {
          // Upload images if present
          let questionImageUrl = null;
          if (q._questionFile) {
            questionImageUrl = await uploadImage(
              q._questionFile,
              "question-images",
            );
          }
          const options = await Promise.all(
            q.options.map(async (opt) => {
              let imageUrl = null;
              if (opt._file)
                imageUrl = await uploadImage(opt._file, "option-images");
              return { text: opt.text, image_url: imageUrl };
            }),
          );
          await api.post(`/quizzes/${savedQuiz.id}/questions`, {
            question_text: q.question_text,
            question_image_url: questionImageUrl,
            options,
            correct_option_index: q.correct_option_index,
            explanation: q.explanation || null,
          });
        }
        setQuestions([]);
      }

      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);

      if (!isEditing)
        navigate(`/admin/quizzes/${savedQuiz.id}/edit`, { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        // interceptor handles
      } else {
        setSaveError(err.response?.data?.error ?? "Failed to save quiz.");
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Delete existing question ──────────────────────────────────────────────

  async function deleteExistingQuestion(id) {
    try {
      await api.delete(`/questions/${id}`);
      setExistingQs((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        // interceptor handles
      } else {
        console.error("Delete question error:", err);
      }
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-tint flex items-center justify-center">
        <span className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <AdminGateCTA />;
  }

  return (
    <div className="min-h-screen bg-tint">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-12 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">
            {isEditing ? "Edit Quiz" : "New Quiz"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Fill in quiz details and add questions below
          </p>
        </div>

        {/* ── Section A: Quiz Details ── */}
        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-bold text-gray-800 text-base mb-5">
            Quiz Details
          </h2>
          {saveError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <AlertCircle size={14} /> {saveError}
            </div>
          )}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                required
                value={details.title}
                onChange={(e) =>
                  setDetails((d) => ({ ...d, title: e.target.value }))
                }
                placeholder="e.g. WAEC Mathematics 2024"
                className="w-full px-4 py-3 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={details.description}
                onChange={(e) =>
                  setDetails((d) => ({ ...d, description: e.target.value }))
                }
                placeholder="Brief description of this quiz…"
                className="w-full px-4 py-3 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm resize-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (₦)
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={details.price}
                  onChange={(e) =>
                    setDetails((d) => ({ ...d, price: e.target.value }))
                  }
                  placeholder="500"
                  className="w-full px-4 py-3 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (min)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={details.duration_minutes}
                  onChange={(e) =>
                    setDetails((d) => ({
                      ...d,
                      duration_minutes: e.target.value,
                    }))
                  }
                  placeholder="60"
                  className="w-full px-4 py-3 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pass Mark (%)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={details.pass_mark}
                  onChange={(e) =>
                    setDetails((d) => ({ ...d, pass_mark: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-tint rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-800">Published</p>
                <p className="text-xs text-gray-500">
                  Students can see and take this quiz
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDetails((d) => ({ ...d, is_published: !d.is_published }))
                }
                className={`w-12 h-6 rounded-full transition-colors relative ${details.is_published ? "bg-primary" : "bg-gray-300"}`}
              >
                <span
                  className={`absolute top-0.5 bottom-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${details.is_published ? "left-[calc(100%-22px)]" : "left-0.5"}`}
                />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl text-sm transition flex items-center gap-2"
              >
                {saving && (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {saving ? "Saving…" : "Save Quiz"}
              </button>
              {saveOk && (
                <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
                  <Check size={15} /> Saved!
                </span>
              )}
            </div>
          </form>
        </section>

        {/* ── Section B: Questions ── */}
        <section className="bg-tint rounded-2xl border border-accent-light/60 overflow-hidden">
          <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-100">
            <div>
              <h2 className="font-bold text-gray-800 text-base">Questions</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {existingQs.length} saved · {questions.length} pending save
              </p>
            </div>
            <button
              onClick={() => setShowQuestions((v) => !v)}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              {showQuestions ? (
                <ChevronUp size={18} />
              ) : (
                <ChevronDown size={18} />
              )}
            </button>
          </div>

          {showQuestions && (
            <div className="p-6 space-y-6">
              <div className="flex bg-white rounded-xl border border-accent-light/60 p-1 gap-1">
                {["manual", "bulk"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setQuestionTab(tab)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                      questionTab === tab
                        ? "bg-primary text-white"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab === "manual" ? "Add Manually" : "Bulk JSON Import"}
                  </button>
                ))}
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-5">
                {questionTab === "manual" ? (
                  <ManualForm
                    onAdd={(q) => setQuestions((prev) => [...prev, q])}
                    saving={saving}
                  />
                ) : (
                  <BulkImport
                    onImport={(qs) => setQuestions((prev) => [...prev, ...qs])}
                  />
                )}
              </div>

              {/* Pending (not yet saved) questions */}
              {questions.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-amber-600 mb-3">
                    ⚠ {questions.length} question(s) pending — save the quiz
                    above to persist them.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {questions.map((q, idx) => (
                      <QuestionCard
                        key={q.id}
                        q={q}
                        index={existingQs.length + idx}
                        onDelete={() =>
                          setQuestions((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Saved questions */}
              {existingQs.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    Saved Questions ({existingQs.length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {existingQs.map((q, idx) => (
                      <QuestionCard
                        key={q.id}
                        q={q}
                        index={idx}
                        onDelete={() => deleteExistingQuestion(q.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
