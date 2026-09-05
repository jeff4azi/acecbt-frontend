import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ClipboardCopy,
  Check,
  Trash2,
  Pencil,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ShieldAlert,
  TriangleAlert,
  FileText,
  BookOpen,
} from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { uploadImage } from "../../lib/uploadImage";
import { JAMB_SUBJECTS } from "../../lib/jambSubjects";

// ─── AI Prompt ────────────────────────────────────────────────────────────────
const AI_PROMPT = `You are formatting multiple-choice quiz questions into a strict JSON format for import into a CBT platform.

Convert the questions I provide below into this exact JSON structure:

{
  "passages": [
    {
      "title": "Passage 1",
      "body": "Full text of the passage here…"
    }
  ],
  "questions": [
    {
      "question_text": "string - the question",
      "question_image": null,
      "passage_ref": "Passage 1",
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
5. Output the JSON wrapped in a single fenced code block (\`\`\`json ... \`\`\`) so it's easy to copy — no commentary, explanation, or extra text outside the code block.
6. Do not skip, merge, reword, or reorder questions. Convert them exactly as given.
7. PASSAGES: If questions are based on a reading passage, extract each passage into the top-level "passages" array. Each passage needs a unique "title" (e.g. "Passage 1", "Passage 2"). For every question that belongs to a passage, set "passage_ref" to the exact title of its passage. For questions NOT based on any passage, set "passage_ref" to null.
8. If there are NO passages at all, you may omit the "passages" key entirely (or set it to an empty array []).

Here are my questions:

[PASTE YOUR QUESTIONS HERE]`;

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
    passage_id: null,
  };
}

// ─── Passage Manager ──────────────────────────────────────────────────────────
// Handles creating, editing, and deleting passages for the quiz.

function PassageManager({ quizId, passages, onPassagesChange }) {
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState(null); // passage id being edited
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", body: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function startNew() {
    setEditingId(null);
    setForm({ title: "", body: "" });
    setShowForm(true);
    setExpanded(true);
  }

  function startEdit(p) {
    setEditingId(p.id);
    setForm({ title: p.title ?? "", body: p.body });
    setShowForm(true);
    setExpanded(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ title: "", body: "" });
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.body.trim()) return;
    setError("");
    setSaving(true);
    try {
      if (editingId) {
        const res = await api.patch(`/passages/${editingId}`, {
          title: form.title.trim() || null,
          body: form.body.trim(),
        });
        onPassagesChange(
          passages.map((p) => (p.id === editingId ? res.data : p)),
        );
      } else {
        const res = await api.post(`/quizzes/${quizId}/passages`, {
          title: form.title.trim() || null,
          body: form.body.trim(),
        });
        onPassagesChange([...passages, res.data]);
      }
      cancelForm();
    } catch (err) {
      setError(err.response?.data?.error ?? "Failed to save passage.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (
      !window.confirm(
        "Delete this passage? Questions linked to it will lose their passage reference.",
      )
    )
      return;
    try {
      await api.delete(`/passages/${id}`);
      onPassagesChange(passages.filter((p) => p.id !== id));
    } catch (err) {
      alert(err.response?.data?.error ?? "Failed to delete passage.");
    }
  }

  // When quizId isn't saved yet, disable passage creation
  const canCreate = Boolean(quizId);

  return (
    <div className="border border-accent-light/60 rounded-2xl overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          <BookOpen size={15} className="text-primary" />
          <span className="text-sm font-bold text-gray-800">Passages</span>
          {passages.length > 0 && (
            <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {passages.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <button
              type="button"
              onClick={startNew}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-dark bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition"
            >
              <Plus size={13} /> Add Passage
            </button>
          )}
          {passages.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
      </div>

      {!canCreate && (
        <p className="text-xs text-gray-400 px-5 py-3">
          Save the quiz details first before adding passages.
        </p>
      )}

      {/* Passage list */}
      {expanded && passages.length > 0 && (
        <div className="divide-y divide-gray-50">
          {passages.map((p) => (
            <div key={p.id} className="px-5 py-3 flex items-start gap-3">
              <FileText size={14} className="text-accent mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                {p.title && (
                  <p className="text-xs font-bold text-gray-700 mb-0.5">
                    {p.title}
                  </p>
                )}
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                  {p.body}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => startEdit(p)}
                  className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Passage form */}
      {showForm && (
        <div className="px-5 py-4 border-t border-gray-100 bg-tint/50 space-y-3">
          <p className="text-xs font-semibold text-primary">
            {editingId ? "Edit Passage" : "New Passage"}
          </p>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Passage title (optional, e.g. Passage 1)"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              className="w-full px-3 py-2.5 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
            />
            <textarea
              required
              rows={5}
              placeholder="Paste the passage text here…"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm resize-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelForm}
                className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold py-2.5 rounded-xl text-sm transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !form.body.trim()}
                className="flex-1 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-1.5"
              >
                {saving && (
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {editingId ? "Update" : "Save Passage"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Question Card ────────────────────────────────────────────────────────────

function QuestionCard({ q, index, passages, onDelete, onEdit }) {
  const passage = passages.find((p) => p.id === q.passage_id);
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-bold text-accent uppercase">
            Q{index + 1}
          </p>
          {passage && (
            <span className="flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-md font-medium">
              <FileText size={9} />
              {passage.title ?? "Passage"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="text-primary hover:text-primary-dark p-1 rounded-lg hover:bg-primary/10 transition"
            title="Edit question"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition"
            title="Delete question"
          >
            <Trash2 size={14} />
          </button>
        </div>
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

function ManualForm({
  onAdd,
  onUpdate,
  editingQuestion,
  onCancelEdit,
  saving,
  formRef,
  passages,
}) {
  const isEditMode = Boolean(editingQuestion);

  function buildFormFromQuestion(q) {
    return {
      question_text: q.question_text ?? "",
      question_image_url: q.question_image_url ?? null,
      question_image_preview: q.question_image_url ?? null,
      _questionFile: null,
      options: (q.options ?? []).map((opt) => ({
        id: makeId(),
        text: opt.text ?? "",
        image_url: opt.image_url ?? null,
        image_preview: opt.image_url ?? null,
        _file: null,
      })),
      correct_option_index: q.correct_option_index ?? 0,
      explanation: q.explanation ?? "",
      passage_id: q.passage_id ?? null,
    };
  }

  const [form, setForm] = useState(() =>
    isEditMode ? buildFormFromQuestion(editingQuestion) : blankForm(),
  );
  const [qDragOver, setQDragOver] = useState(false);
  const [highlight, setHighlight] = useState(isEditMode);
  const qImgRef = useRef();
  const optImgRefs = useRef([]);

  useEffect(() => {
    if (editingQuestion) {
      setForm(buildFormFromQuestion(editingQuestion));
      setHighlight(true);
      const timer = setTimeout(() => setHighlight(false), 1200);
      return () => clearTimeout(timer);
    } else {
      setForm(blankForm());
      setHighlight(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingQuestion]);

  function applyQuestionFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    setForm((f) => ({
      ...f,
      _questionFile: file,
      question_image_preview: URL.createObjectURL(file),
    }));
  }

  function clearQuestionImage(e) {
    e.stopPropagation();
    setForm((f) => ({
      ...f,
      _questionFile: null,
      question_image_url: null,
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
    if (!file || !file.type.startsWith("image/")) return;
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
      opts[idx] = {
        ...opts[idx],
        _file: null,
        image_url: null,
        image_preview: null,
      };
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

  function resetForm() {
    setForm(blankForm());
    if (qImgRef.current) qImgRef.current.value = "";
    (optImgRefs.current || []).forEach((r) => {
      if (r) r.value = "";
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.question_text.trim()) return;
    if (isEditMode) {
      onUpdate({ ...editingQuestion, ...form });
    } else {
      onAdd({ ...form, id: makeId() });
      resetForm();
    }
  }

  function handleCancel() {
    resetForm();
    onCancelEdit?.();
  }

  return (
    <div
      ref={formRef}
      className={`rounded-xl transition-all duration-300 ${highlight ? "ring-2 ring-primary ring-offset-2" : ""}`}
    >
      {isEditMode && (
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
            <Pencil size={14} /> Editing question
          </p>
          <button
            type="button"
            onClick={handleCancel}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <X size={13} /> Cancel edit
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Passage selector */}
        {passages.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Linked Passage (optional)
            </label>
            <select
              value={form.passage_id ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, passage_id: e.target.value || null }))
              }
              className="w-full px-4 py-3 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm bg-white"
            >
              <option value="">— No passage —</option>
              {passages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title ?? `Passage (${p.body.slice(0, 40)}…)`}
                </option>
              ))}
            </select>
          </div>
        )}

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

        {/* Question Image */}
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
              applyQuestionFile(e.dataTransfer.files?.[0]);
            }}
            className={`relative flex items-center justify-center w-full rounded-xl border-2 border-dashed cursor-pointer transition-colors overflow-hidden ${
              qDragOver
                ? "border-primary bg-primary/5"
                : form.question_image_preview
                  ? "border-gray-200 bg-gray-50"
                  : "border-accent-light hover:border-primary/50 hover:bg-primary/5 bg-white"
            }`}
            style={{
              minHeight: form.question_image_preview ? "auto" : "120px",
            }}
          >
            <input
              ref={qImgRef}
              type="file"
              accept="image/*"
              onChange={(e) => applyQuestionFile(e.target.files[0])}
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
                        onChange={(e) =>
                          handleOptionImage(idx, e.target.files[0])
                        }
                        className="hidden"
                      />
                    </label>
                    {opt.image_preview && (
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
                        >
                          <X size={11} />
                        </button>
                      </div>
                    )}
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
            Select the radio button next to the correct answer.
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

        <div className="flex gap-3">
          {isEditMode && (
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold py-3 rounded-xl text-sm transition"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition"
          >
            {isEditMode ? "Update Question" : "Add Question"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Bulk Import ──────────────────────────────────────────────────────────────

function BulkImport({ onImport }) {
  const [jsonText, setJsonText] = useState("");
  const [parsed, setParsed] = useState(null); // { passages, questions }
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
      const cleaned = jsonText
        .trim()
        .replace(/^```[a-zA-Z]*\n?/, "")
        .replace(/```$/, "")
        .trim();
      const data = JSON.parse(cleaned);
      if (!data.questions || !Array.isArray(data.questions))
        throw new Error('Expected { "questions": [...] }');
      setParsed({ passages: data.passages ?? [], questions: data.questions });
    } catch (err) {
      setError(`Invalid JSON: ${err.message}`);
    }
  }

  function importAll() {
    if (!parsed) return;
    onImport({
      passages: parsed.passages,
      questions: parsed.questions.map((q) => ({
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
        // passage_ref is preserved as a string for display; resolved to UUID on save
        _passage_ref: q.passage_ref ?? null,
        passage_id: null,
      })),
    });
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
          placeholder={'{\n  "passages": [...],\n  "questions": [...]\n}'}
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
          {parsed.passages.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
              <p className="font-semibold mb-1">
                {parsed.passages.length} passage(s) detected:
              </p>
              {parsed.passages.map((p, i) => (
                <p key={i} className="truncate">
                  • {p.title ?? `Passage ${i + 1}`}: {p.body.slice(0, 60)}…
                </p>
              ))}
            </div>
          )}
          <p className="text-sm font-semibold text-gray-700">
            {parsed.questions.length} question(s) parsed:
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {parsed.questions.map((q, idx) => (
              <div key={idx} className="bg-tint rounded-xl px-4 py-3 text-sm">
                {q.passage_ref && (
                  <p className="text-[10px] font-semibold text-amber-700 mb-0.5 flex items-center gap-1">
                    <FileText size={9} /> {q.passage_ref}
                  </p>
                )}
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
            Import All ({parsed.questions.length})
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Confirm Clear Overlay ────────────────────────────────────────────────────

function ConfirmClearOverlay({
  savedCount,
  pendingCount,
  onConfirm,
  onCancel,
  clearing,
}) {
  const total = savedCount + pendingCount;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!clearing ? onCancel : undefined}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mx-auto">
          <TriangleAlert size={28} className="text-red-600" />
        </div>
        <div className="text-center space-y-1.5">
          <h2 className="text-lg font-bold text-gray-900">
            Clear all questions?
          </h2>
          <p className="text-sm text-gray-500">
            This will permanently delete{" "}
            <span className="font-semibold text-gray-800">
              {total} question{total !== 1 ? "s" : ""}
            </span>
            {savedCount > 0 && pendingCount > 0 && (
              <>
                {" "}
                ({savedCount} saved + {pendingCount} pending)
              </>
            )}
            {savedCount > 0 && pendingCount === 0 && <> from the database</>}
            {savedCount === 0 && pendingCount > 0 && (
              <> from the pending list</>
            )}
            . This cannot be undone.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={clearing}
            className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold py-3 rounded-xl text-sm transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={clearing}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition flex items-center justify-center gap-2"
          >
            {clearing ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Clearing…
              </>
            ) : (
              "Yes, clear all"
            )}
          </button>
        </div>
      </div>
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
          to="/login"
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
    question_limit: "",
    is_published: false,
    is_jamb: false,
    jamb_subject: JAMB_SUBJECTS[0],
    jamb_year: String(new Date().getFullYear()),
  });
  const [passages, setPassages] = useState([]); // saved passages from DB
  const [questions, setQuestions] = useState([]); // pending (not yet saved) questions
  const [existingQs, setExistingQs] = useState([]); // saved questions from DB
  const [questionTab, setQuestionTab] = useState("manual");
  const [showQuestions, setShowQuestions] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const manualFormRef = useRef(null);

  // Current saved quizId — set once the quiz is first saved (for new quizzes)
  const [savedQuizId, setSavedQuizId] = useState(quizId ?? null);

  useEffect(() => {
    if (authLoading || !user || !isAdmin || !isEditing) return;
    let cancelled = false;
    async function load() {
      try {
        const [quizRes, questionsRes, passagesRes] = await Promise.all([
          api.get(`/quizzes/${quizId}`),
          api.get(`/quizzes/${quizId}/questions`),
          api.get(`/quizzes/${quizId}/passages`),
        ]);
        if (cancelled) return;
        const q = quizRes.data;
        setDetails({
          title: q.title,
          description: q.description ?? "",
          price: q.price,
          duration_minutes: q.duration_minutes,
          pass_mark: q.pass_mark,
          question_limit: q.question_limit ?? "",
          is_published: q.is_published,
          is_jamb: q.is_jamb ?? false,
          jamb_subject: q.jamb_subject ?? JAMB_SUBJECTS[0],
          jamb_year: q.jamb_year
            ? String(q.jamb_year)
            : String(new Date().getFullYear()),
        });
        setExistingQs(questionsRes.data);
        setPassages(passagesRes.data ?? []);
      } catch (err) {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status !== 401 && status !== 403)
          console.error("QuizForm load error:", err);
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
      const composedTitle = details.is_jamb
        ? `JAMB ${details.jamb_subject} ${details.jamb_year}`
        : details.title;

      const payload = {
        title: composedTitle,
        description: details.description,
        price: Number(details.price),
        duration_minutes: Number(details.duration_minutes),
        pass_mark: Number(details.pass_mark),
        question_limit:
          details.question_limit !== "" && details.question_limit !== null
            ? Number(details.question_limit)
            : null,
        is_published: details.is_published,
        is_jamb: details.is_jamb,
        jamb_subject: details.is_jamb ? details.jamb_subject : null,
        jamb_year: details.is_jamb ? Number(details.jamb_year) : null,
      };

      if (isEditing) {
        const res = await api.patch(`/quizzes/${quizId}`, payload);
        savedQuiz = res.data;
      } else {
        const res = await api.post("/quizzes", payload);
        savedQuiz = res.data;
        setSavedQuizId(savedQuiz.id);
      }

      // Save pending questions (with any bulk-import passage refs resolved)
      if (questions.length > 0) {
        // Build a passage title→id map from DB passages
        const passageTitleMap = {};
        for (const p of passages) {
          if (p.title) passageTitleMap[p.title] = p.id;
        }

        for (const q of questions) {
          let questionImageUrl = null;
          if (q._questionFile)
            questionImageUrl = await uploadImage(
              q._questionFile,
              "question-images",
            );

          const options = await Promise.all(
            q.options.map(async (opt) => {
              let imageUrl = null;
              if (opt._file)
                imageUrl = await uploadImage(opt._file, "option-images");
              return { text: opt.text, image_url: imageUrl };
            }),
          );

          // Resolve passage: either already set (manual) or from _passage_ref (bulk import)
          let passageId = q.passage_id ?? null;
          if (!passageId && q._passage_ref) {
            passageId = passageTitleMap[q._passage_ref] ?? null;
          }

          await api.post(`/quizzes/${savedQuiz.id}/questions`, {
            question_text: q.question_text,
            question_image_url: questionImageUrl,
            options,
            correct_option_index: q.correct_option_index,
            explanation: q.explanation || null,
            passage_id: passageId,
          });
        }
        setQuestions([]);
        // Refresh existing questions so the list stays current
        const refreshed = await api.get(`/quizzes/${savedQuiz.id}/questions`);
        setExistingQs(refreshed.data);
      }

      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
      if (!isEditing)
        navigate(`/admin/quizzes/${savedQuiz.id}/edit`, { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      if (status !== 401 && status !== 403) {
        setSaveError(err.response?.data?.error ?? "Failed to save quiz.");
      }
    } finally {
      setSaving(false);
    }
  }

  function startEditing(question, source, idx) {
    setQuestionTab("manual");
    setShowQuestions(true);
    setEditingQuestion({ question, source, idx });
    setTimeout(() => {
      manualFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 60);
  }

  async function handleUpdateQuestion(updated) {
    if (!editingQuestion) return;
    const { source, idx } = editingQuestion;

    if (source === "pending") {
      setQuestions((prev) =>
        prev.map((q, i) => (i === idx ? { ...q, ...updated } : q)),
      );
      setEditingQuestion(null);
      return;
    }

    setSaving(true);
    try {
      let questionImageUrl = updated.question_image_url ?? null;
      if (updated._questionFile)
        questionImageUrl = await uploadImage(
          updated._questionFile,
          "question-images",
        );

      const options = await Promise.all(
        updated.options.map(async (opt) => {
          let imageUrl = opt.image_url ?? null;
          if (opt._file)
            imageUrl = await uploadImage(opt._file, "option-images");
          return { text: opt.text, image_url: imageUrl };
        }),
      );

      const res = await api.patch(`/questions/${updated.id}`, {
        question_text: updated.question_text,
        question_image_url: questionImageUrl,
        options,
        correct_option_index: updated.correct_option_index,
        explanation: updated.explanation || null,
        passage_id: updated.passage_id ?? null,
      });

      setExistingQs((prev) =>
        prev.map((q) => (q.id === updated.id ? res.data : q)),
      );
      setEditingQuestion(null);
    } catch (err) {
      const status = err?.response?.status;
      if (status !== 401 && status !== 403)
        setSaveError(err.response?.data?.error ?? "Failed to update question.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteExistingQuestion(id) {
    try {
      await api.delete(`/questions/${id}`);
      setExistingQs((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      const status = err?.response?.status;
      if (status !== 401 && status !== 403)
        console.error("Delete question error:", err);
    }
  }

  async function handleClearAll() {
    setClearing(true);
    try {
      await Promise.all(
        existingQs.map((q) => api.delete(`/questions/${q.id}`)),
      );
      setExistingQs([]);
      setQuestions([]);
      setEditingQuestion(null);
      setShowClearConfirm(false);
    } catch (err) {
      const status = err?.response?.status;
      if (status !== 401 && status !== 403)
        setSaveError(err.response?.data?.error ?? "Failed to clear questions.");
      setShowClearConfirm(false);
    } finally {
      setClearing(false);
    }
  }

  // Handle bulk import — passages come in with _passage_ref strings on questions.
  // If the quiz is already saved we can send them straight to the import endpoint.
  // If not, we queue them locally and resolve refs when the quiz is saved.
  async function handleBulkImport({
    passages: importedPassages,
    questions: importedQuestions,
  }) {
    const currentQuizId = savedQuizId;

    if (
      currentQuizId &&
      (importedPassages?.length > 0 || importedQuestions.length > 0)
    ) {
      // Quiz already exists — send to backend import endpoint which handles passage creation & ref resolution
      try {
        const res = await api.post(
          `/quizzes/${currentQuizId}/questions/import`,
          {
            passages: importedPassages,
            questions: importedQuestions.map((q) => ({
              question_text: q.question_text,
              question_image: q.question_image_url ?? null,
              options: q.options.map((o) => ({
                text: o.text,
                image: o.image_url ?? null,
              })),
              correct_option: q.correct_option_index,
              explanation: q.explanation || null,
              passage_ref: q._passage_ref ?? null,
            })),
          },
        );
        // Refresh both passages and questions
        const [qRes, pRes] = await Promise.all([
          api.get(`/quizzes/${currentQuizId}/questions`),
          api.get(`/quizzes/${currentQuizId}/passages`),
        ]);
        setExistingQs(qRes.data);
        setPassages(pRes.data ?? []);
        setSaveOk(true);
        setTimeout(() => setSaveOk(false), 3000);
      } catch (err) {
        const status = err?.response?.status;
        if (status !== 401 && status !== 403)
          setSaveError(err.response?.data?.error ?? "Import failed.");
      }
    } else {
      // Quiz not saved yet — queue locally. Passages will be sent on save.
      // Store passage definitions on the question list to be processed during handleSave.
      setQuestions((prev) => [
        ...prev,
        ...importedQuestions.map((q) => ({
          ...q,
          _importedPassages: importedPassages,
        })),
      ]);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-tint flex items-center justify-center">
        <span className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) return <AdminGateCTA />;

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
            {/* JAMB Toggle */}
            <div className="flex items-center justify-between p-4 bg-tint rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-800">JAMB Quiz</p>
                <p className="text-xs text-gray-500">
                  Auto-format title as "JAMB [Subject] [Year]"
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDetails((d) => ({ ...d, is_jamb: !d.is_jamb }))
                }
                className={`w-12 h-6 rounded-full transition-colors relative ${details.is_jamb ? "bg-primary" : "bg-gray-300"}`}
              >
                <span
                  className={`absolute top-0.5 bottom-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${details.is_jamb ? "left-[calc(100%-22px)]" : "left-0.5"}`}
                />
              </button>
            </div>

            {/* Title */}
            {details.is_jamb ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <select
                      required
                      value={details.jamb_subject}
                      onChange={(e) =>
                        setDetails((d) => ({
                          ...d,
                          jamb_subject: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm bg-white"
                    >
                      {JAMB_SUBJECTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Exam Year
                    </label>
                    <input
                      type="number"
                      required
                      min={1990}
                      max={2099}
                      value={details.jamb_year}
                      onChange={(e) =>
                        setDetails((d) => ({ ...d, jamb_year: e.target.value }))
                      }
                      placeholder="e.g. 2024"
                      className="w-full px-4 py-3 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                    />
                  </div>
                </div>
                {details.jamb_subject && details.jamb_year && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-xl">
                    <span className="text-xs text-gray-500">
                      Title will be:
                    </span>
                    <span className="text-sm font-semibold text-primary">
                      JAMB {details.jamb_subject} {details.jamb_year}
                    </span>
                  </div>
                )}
              </div>
            ) : (
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
            )}

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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Questions per attempt
                </label>
                <input
                  type="number"
                  min={1}
                  value={details.question_limit}
                  onChange={(e) =>
                    setDetails((d) => ({
                      ...d,
                      question_limit: e.target.value,
                    }))
                  }
                  placeholder="Leave blank for all"
                  className="w-full px-4 py-3 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Leave blank to give students the full question bank.
                </p>
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

        {/* ── Section B: Passages ── */}
        <section>
          <PassageManager
            quizId={savedQuizId}
            passages={passages}
            onPassagesChange={setPassages}
          />
        </section>

        {/* ── Section C: Questions ── */}
        <section className="bg-tint rounded-2xl border border-accent-light/60 overflow-hidden">
          <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-100">
            <div>
              <h2 className="font-bold text-gray-800 text-base">Questions</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {existingQs.length} saved · {questions.length} pending save
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(existingQs.length > 0 || questions.length > 0) && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition"
                >
                  <Trash2 size={13} /> Clear All
                </button>
              )}
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
          </div>

          {showQuestions && (
            <div className="p-6 space-y-6">
              <div className="flex bg-white rounded-xl border border-accent-light/60 p-1 gap-1">
                {["manual", "bulk"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setQuestionTab(tab)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${questionTab === tab ? "bg-primary text-white" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    {tab === "manual" ? "Add Manually" : "Bulk JSON Import"}
                  </button>
                ))}
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-5">
                {questionTab === "manual" ? (
                  <ManualForm
                    onAdd={(q) => setQuestions((prev) => [...prev, q])}
                    onUpdate={handleUpdateQuestion}
                    editingQuestion={editingQuestion?.question ?? null}
                    onCancelEdit={() => setEditingQuestion(null)}
                    saving={saving}
                    formRef={manualFormRef}
                    passages={passages}
                  />
                ) : (
                  <BulkImport onImport={handleBulkImport} />
                )}
              </div>

              {/* Pending questions */}
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
                        passages={passages}
                        onEdit={() => startEditing(q, "pending", idx)}
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
                        passages={passages}
                        onEdit={() => startEditing(q, "existing", idx)}
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

      {showClearConfirm && (
        <ConfirmClearOverlay
          savedCount={existingQs.length}
          pendingCount={questions.length}
          onConfirm={handleClearAll}
          onCancel={() => setShowClearConfirm(false)}
          clearing={clearing}
        />
      )}
    </div>
  );
}
