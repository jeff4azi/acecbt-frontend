import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { uploadImage } from "../../lib/uploadImage";

function truncateUrl(url, max = 40) {
  if (!url) return "";
  return url.length > max ? url.slice(0, max) + "…" : url;
}

function AdForm({ initial, onSave, onCancel }) {
  const [duration, setDuration] = useState(initial?.duration_seconds ?? 5);
  const [linkUrl, setLinkUrl] = useState(initial?.link_url ?? "");
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(initial?.image_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

  function applyFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (PNG, JPG, WEBP).");
      return;
    }
    setError("");
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function handleImage(e) {
    applyFile(e.target.files[0]);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) applyFile(file);
  }

  function clearImage(e) {
    e.stopPropagation();
    setImageFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");

    const trimmedLink = linkUrl.trim();
    if (!trimmedLink) {
      setError("Please enter a destination URL for the ad.");
      return;
    }

    let imageUrl = initial?.image_url ?? "";
    if (imageFile) {
      setUploading(true);
      try {
        imageUrl = await uploadImage(imageFile, "ad-images");
      } catch (err) {
        setError("Image upload failed: " + err.message);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    if (!imageUrl) {
      setError("Please select an image.");
      return;
    }

    onSave({
      id: initial?.id,
      image_url: imageUrl,
      link_url: trimmedLink,
      duration_seconds: Number(duration),
      is_active: initial?.is_active ?? true,
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {/* Image upload zone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ad Image
        </label>
        <div
          onClick={() => fileRef.current.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed cursor-pointer transition-colors
            ${
              dragOver
                ? "border-primary bg-primary/5"
                : preview
                  ? "border-gray-200 bg-gray-50"
                  : "border-accent-light hover:border-primary/50 hover:bg-primary/5 bg-white"
            }`}
          style={{ minHeight: preview ? "auto" : "140px" }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleImage}
            className="hidden"
          />
          {preview ? (
            <>
              <img
                src={preview}
                alt="preview"
                className="w-full h-40 object-cover rounded-xl"
              />
              <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-lg backdrop-blur-sm">
                Click to change
              </span>
              {imageFile && (
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 left-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-xs"
                  title="Remove image"
                >
                  <X size={13} />
                </button>
              )}
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-primary"
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
                {dragOver
                  ? "Drop image here"
                  : "Click to upload or drag & drop"}
              </p>
              <p className="text-xs text-gray-400">
                PNG, JPG, WEBP — compressed automatically
              </p>
            </>
          )}
        </div>
      </div>

      {/* Duration */}
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

      {/* Link URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Destination URL
        </label>
        <input
          type="url"
          placeholder="https://example.com or https://wa.me/234..."
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">
          Where users go when they click the ad or "Learn more" button.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

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
          disabled={uploading}
          className="flex-1 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Uploading…
            </>
          ) : (
            "Save"
          )}
        </button>
      </div>
    </form>
  );
}

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
            Sign in with your admin account to manage ads.
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

export default function Ads() {
  const { authLoading, user, isAdmin } = useAuth();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAd, setEditingAd] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .get("/ads/admin")
      .then((res) => {
        if (!cancelled) setAds(res.data);
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          // interceptor handles session teardown + redirect
        } else {
          console.error("Ads load error:", err);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, isAdmin]);

  async function toggleActive(ad) {
    try {
      const res = await api.patch(`/ads/${ad.id}`, {
        is_active: !ad.is_active,
      });
      setAds((prev) => prev.map((a) => (a.id === ad.id ? res.data : a)));
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        // interceptor handles
      } else {
        console.error("Toggle ad error:", err);
      }
    }
  }

  async function deleteAd(id) {
    try {
      await api.delete(`/ads/${id}`);
      setAds((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        // interceptor handles
      } else {
        console.error("Delete ad error:", err);
      }
    }
  }

  async function handleSave(ad) {
    try {
      if (editingAd) {
        const res = await api.patch(`/ads/${ad.id}`, {
          image_url: ad.image_url,
          link_url: ad.link_url,
          duration_seconds: ad.duration_seconds,
        });
        setAds((prev) => prev.map((a) => (a.id === ad.id ? res.data : a)));
      } else {
        const res = await api.post("/ads", {
          image_url: ad.image_url,
          link_url: ad.link_url,
          duration_seconds: ad.duration_seconds,
        });
        setAds((prev) => [res.data, ...prev]);
      }
      setShowForm(false);
      setEditingAd(null);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        // interceptor handles
      } else {
        console.error("Save ad error:", err);
      }
    }
  }

  if (authLoading || (loading && isAdmin)) {
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
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-primary-dark">Ads</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage promotional banners shown to students
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => {
                setEditingAd(null);
                setShowForm(true);
              }}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition shadow-sm"
            >
              <Plus size={16} /> Add Ad
            </button>
          )}
        </div>

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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(ad)}
                      className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${ad.is_active ? "bg-primary" : "bg-gray-300"}`}
                    >
                      <span
                        className={`absolute top-0.5 bottom-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${ad.is_active ? "left-[calc(100%-18px)]" : "left-0.5"}`}
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
                      onClick={() => {
                        setEditingAd(ad);
                        setShowForm(true);
                      }}
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
