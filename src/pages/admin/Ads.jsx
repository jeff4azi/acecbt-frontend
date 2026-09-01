import { useState, useRef } from "react";
import { Plus, Pencil, Trash2, X, ExternalLink } from "lucide-react";

// ─── Mock Data ───────────────────────────────────────────────────────────────
// Real upload should use the browser-image-compression library already installed,
// targeting 800-1200px width, 80-250KB, WebP/JPEG before uploading to Supabase
// Storage's ad-images bucket, once wired to the backend.

const INITIAL_ADS = [
  {
    id: "1",
    image_url: "https://picsum.photos/seed/ad10/800/300",
    link_url: "https://example.com/promo1",
    duration_seconds: 5,
    is_active: true,
  },
  {
    id: "2",
    image_url: "https://picsum.photos/seed/ad20/800/300",
    link_url: "https://example.com/promo2",
    duration_seconds: 7,
    is_active: true,
  },
  {
    id: "3",
    image_url: "https://picsum.photos/seed/ad30/800/300",
    link_url: "https://example.com/sale",
    duration_seconds: 6,
    is_active: false,
  },
  {
    id: "4",
    image_url: "https://picsum.photos/seed/ad40/800/300",
    link_url: "https://example.com/event",
    duration_seconds: 10,
    is_active: true,
  },
];

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function truncateUrl(url, max = 40) {
  if (!url) return "";
  return url.length > max ? url.slice(0, max) + "…" : url;
}

// ─── Add/Edit form ────────────────────────────────────────────────────────────

function AdForm({ initial, onSave, onCancel }) {
  const [linkUrl, setLinkUrl] = useState(initial?.link_url ?? "");
  const [duration, setDuration] = useState(initial?.duration_seconds ?? 5);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(initial?.image_url ?? null);
  const fileRef = useRef();

  function handleImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function handleSave(e) {
    e.preventDefault();
    onSave({
      id: initial?.id ?? makeId(),
      image_url: preview ?? "https://picsum.photos/seed/new/800/300",
      link_url: linkUrl,
      duration_seconds: Number(duration),
      is_active: initial?.is_active ?? true,
      _imageFile: imageFile, // available for real upload later
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ad Image
        </label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleImage}
          className="text-sm"
        />
        {preview && (
          <img
            src={preview}
            alt="preview"
            className="mt-2 w-full h-32 object-cover rounded-xl border"
          />
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Link URL
        </label>
        <input
          type="url"
          required
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="https://example.com"
          className="w-full px-4 py-3 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Duration (seconds)
        </label>
        <input
          type="number"
          min={2}
          max={60}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
        />
      </div>
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-xl text-sm transition"
        >
          Save
        </button>
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Ads() {
  const [ads, setAds] = useState(INITIAL_ADS);
  const [showForm, setShowForm] = useState(false);
  const [editingAd, setEditingAd] = useState(null); // null = adding, object = editing

  function toggleActive(id) {
    setAds((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_active: !a.is_active } : a)),
    );
  }

  function deleteAd(id) {
    setAds((prev) => prev.filter((a) => a.id !== id));
  }

  function handleSave(ad) {
    if (editingAd) {
      setAds((prev) => prev.map((a) => (a.id === ad.id ? ad : a)));
    } else {
      setAds((prev) => [...prev, ad]);
    }
    setShowForm(false);
    setEditingAd(null);
  }

  function openEdit(ad) {
    setEditingAd(ad);
    setShowForm(true);
  }

  function openAdd() {
    setEditingAd(null);
    setShowForm(true);
  }

  return (
    <div className="min-h-screen bg-tint">
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-primary-dark">Ads</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage promotional banners shown to students
            </p>
          </div>
          {!showForm && (
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition shadow-sm"
            >
              <Plus size={16} /> Add Ad
            </button>
          )}
        </div>

        {/* Inline form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-accent-light/60">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">
                {editingAd ? "Edit Ad" : "New Ad"}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingAd(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <AdForm
              initial={editingAd}
              onSave={handleSave}
              onCancel={() => {
                setShowForm(false);
                setEditingAd(null);
              }}
            />
          </div>
        )}

        {/* Ad grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {ads.map((ad) => (
            <div
              key={ad.id}
              className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100"
            >
              <img
                src={ad.image_url}
                alt="Ad thumbnail"
                className="w-full h-36 object-cover"
              />
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <ExternalLink size={12} className="shrink-0 text-accent" />
                  <a
                    href={ad.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-primary truncate flex-1"
                    title={ad.link_url}
                  >
                    {truncateUrl(ad.link_url)}
                  </a>
                </div>

                <p className="text-xs text-gray-400">
                  Duration:{" "}
                  <span className="font-medium text-gray-700">
                    {ad.duration_seconds}s
                  </span>
                </p>

                <div className="flex items-center justify-between pt-1">
                  {/* Active toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(ad.id)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${ad.is_active ? "bg-primary" : "bg-gray-300"}`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${ad.is_active ? "translate-x-5" : "translate-x-0.5"}`}
                      />
                    </button>
                    <span
                      className={`text-xs font-medium ${ad.is_active ? "text-primary" : "text-gray-400"}`}
                    >
                      {ad.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => openEdit(ad)}
                      className="p-1.5 rounded-lg hover:bg-tint text-primary transition"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => deleteAd(ad.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {ads.length === 0 && (
            <div className="col-span-2 py-16 text-center text-sm text-gray-400">
              No ads yet — click "+ Add Ad" to create one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
