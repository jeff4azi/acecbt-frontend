import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, X, ExternalLink, ShieldAlert } from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import imageCompression from "browser-image-compression";

// Real upload: compress to 80-250KB WebP then upload to Supabase Storage ad-images bucket
async function uploadAdImage(file) {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.25,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: "image/webp",
  });
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
  const { error } = await supabase.storage
    .from("ad-images")
    .upload(path, compressed, { contentType: "image/webp" });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("ad-images").getPublicUrl(path);
  return data.publicUrl;
}

function truncateUrl(url, max = 40) {
  if (!url) return "";
  return url.length > max ? url.slice(0, max) + "…" : url;
}

function AdForm({ initial, onSave, onCancel }) {
  const [linkUrl, setLinkUrl] = useState(initial?.link_url ?? "");
  const [duration, setDuration] = useState(initial?.duration_seconds ?? 5);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(initial?.image_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

  function handleImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");

    let imageUrl = initial?.image_url ?? "";
    if (imageFile) {
      setUploading(true);
      try {
        imageUrl = await uploadAdImage(imageFile);
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
      link_url: linkUrl,
      duration_seconds: Number(duration),
      is_active: initial?.is_active ?? true,
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
          {uploading && (
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {uploading ? "Uploading…" : "Save"}
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
  const { authLoading, user } = useAuth();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAd, setEditingAd] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
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
  }, [authLoading, user]);

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

  if (authLoading || (loading && user)) {
    return (
      <div className="min-h-screen bg-tint flex items-center justify-center">
        <span className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
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
