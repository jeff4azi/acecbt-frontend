import { useState, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  ClipboardCopy,
  Check,
  Pencil,
  Trash2,
  ImagePlus,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── AI Prompt text ───────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function blankOption() {
  return { id: makeId(), text: "", image_url: null, image_preview: null };
}

function blankQuestionForm() {
  return {
    question_text: "",
    question_image_url: null,
    question_image_preview: null,
    options: [blankOption(), blankOption(), blankOption(), blankOption()],
    correct_option_index: 0,
    explanation: "",
  };
}

// ─── Question Card (in the list below the form) ───────────────────────────────

function QuestionCard({ q, index, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold text-accent uppercase mb-1">
          Q{index + 1}
        </p>
        <div className="flex gap-1.5">
          <button
            onClick={onEdit}
            className="text-primary hover:text-primary-dark p-1 rounded-lg hover:bg-tint transition"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition"
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
            key={opt.id}
            className={`text-xs px-2.5 py-1.5 rounded-lg border ${
              oi === q.correct_option_index
                ? "bg-green-50 border-green-300 text-green-700 font-semibold"
                : "bg-gray-50 border-gray-200 text-gray-600"
            }`}
          >
            {String.fromCharCode(65 + oi)}.{" "}
            {opt.text || <em className="text-gray-400">empty</em>}
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

// ─── Manual Question Form ─────────────────────────────────────────────────────

function ManualForm({ onAdd }) {
  const [form, setForm] = useState(blankQuestionForm());
  const qImgRef = useRef();

  function handleQuestionImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    setForm((f) => ({
      ...f,
      question_image_url: file,
      question_image_preview: URL.createObjectURL(file),
    }));
  }

  function handleOptionText(idx, val) {
    setForm((f) => {
      const opts = [...f.options];
      opts[idx] = { ...opts[idx], text: val };
      return { ...f, options: opts };
    });
  }

  function handleOptionImage(idx, e) {
    const file = e.target.files[0];
    if (!file) return;
    setForm((f) => {
      const opts = [...f.options];
      opts[idx] = {
        ...opts[idx],
        image_url: file,
        image_preview: URL.createObjectURL(file),
      };
      return { ...f, options: opts };
    });
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
    setForm(blankQuestionForm());
    if (qImgRef.current) qImgRef.current.value = "";
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Question text */}
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

      {/* Question image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Question Image (optional)
        </label>
        <input
          ref={qImgRef}
          type="file"
          accept="image/*"
          onChange={handleQuestionImage}
          className="text-sm"
        />
        {form.question_image_preview && (
          <img
            src={form.question_image_preview}
            alt="preview"
            className="mt-2 h-28 rounded-xl object-cover border"
          />
        )}
      </div>

      {/* Options */}
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
              {/* Correct radio */}
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
              <div className="flex-1 space-y-1">
                <input
                  type="text"
                  placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                  value={opt.text}
                  onChange={(e) => handleOptionText(idx, e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleOptionImage(idx, e)}
                  className="text-xs"
                />
                {opt.image_preview && (
                  <img
                    src={opt.image_preview}
                    alt="opt"
                    className="h-14 rounded-lg object-cover border"
                  />
                )}
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

      {/* Explanation */}
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
        className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl text-sm transition"
      >
        Add Question
      </button>
    </form>
  );
}

// ─── Bulk JSON Import ─────────────────────────────────────────────────────────

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
        options: (q.options || []).map((o) => ({
          id: makeId(),
          text: o.text || "",
          image_url: null,
          image_preview: null,
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
          Copy the prompt below, paste it into your AI assistant (ChatGPT,
          Claude, etc.), then paste your questions and let it generate the JSON.
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
            {parsed.length} question(s) parsed — preview:
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuizForm() {
  const { quizId } = useParams();
  const isEditing = Boolean(quizId);

  // Section A: quiz details
  const [details, setDetails] = useState({
    title: "",
    description: "",
    price: "",
    duration_minutes: "",
    pass_mark: 50,
    is_published: false,
  });

  // Section B: questions
  const [questions, setQuestions] = useState([]);
  const [questionTab, setQuestionTab] = useState("manual"); // 'manual' | 'bulk'
  const [editingIndex, setEditingIndex] = useState(null);
  const [showQuestions, setShowQuestions] = useState(true);

  function handleDetailChange(key, val) {
    setDetails((d) => ({ ...d, [key]: val }));
  }

  function handleSave(e) {
    e.preventDefault();
    console.log("Quiz form state:", { details, questions });
  }

  function addQuestion(q) {
    if (editingIndex !== null) {
      setQuestions((prev) =>
        prev.map((item, i) => (i === editingIndex ? q : item)),
      );
      setEditingIndex(null);
    } else {
      setQuestions((prev) => [...prev, q]);
    }
  }

  function importQuestions(qs) {
    setQuestions((prev) => [...prev, ...qs]);
  }

  function deleteQuestion(idx) {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="min-h-screen bg-tint">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-12 space-y-8">
        {/* Header */}
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
          <form
            onSubmit={handleSave}
            className="space-y-4"
            id="quiz-details-form"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                required
                value={details.title}
                onChange={(e) => handleDetailChange("title", e.target.value)}
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
                  handleDetailChange("description", e.target.value)
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
                  value={details.price}
                  onChange={(e) => handleDetailChange("price", e.target.value)}
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
                  value={details.duration_minutes}
                  onChange={(e) =>
                    handleDetailChange("duration_minutes", e.target.value)
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
                    handleDetailChange("pass_mark", e.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                />
              </div>
            </div>

            {/* Published toggle */}
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
                  handleDetailChange("is_published", !details.is_published)
                }
                className={`w-12 h-6 rounded-full transition-colors relative ${details.is_published ? "bg-primary" : "bg-gray-300"}`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${details.is_published ? "translate-x-6" : "translate-x-0.5"}`}
                />
              </button>
            </div>

            <button
              type="submit"
              form="quiz-details-form"
              className="bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 rounded-xl text-sm transition"
            >
              Save Details
            </button>
          </form>
        </section>

        {/* ── Section B: Question Manager ── */}
        <section className="bg-tint rounded-2xl border border-accent-light/60 overflow-hidden">
          <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-100">
            <div>
              <h2 className="font-bold text-gray-800 text-base">Questions</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {questions.length} question(s) added
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
              {/* Tab switcher */}
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

              {/* Tab content */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                {questionTab === "manual" ? (
                  <ManualForm onAdd={addQuestion} />
                ) : (
                  <BulkImport onImport={importQuestions} />
                )}
              </div>

              {/* Question list */}
              {questions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Added Questions
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {questions.map((q, idx) => (
                      <QuestionCard
                        key={q.id}
                        q={q}
                        index={idx}
                        onEdit={() => {
                          setEditingIndex(idx);
                          setQuestionTab("manual");
                        }}
                        onDelete={() => deleteQuestion(idx)}
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
