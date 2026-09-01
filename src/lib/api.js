import axios from "axios";
import { supabase } from "./supabaseClient";

const rawBaseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

let baseURL = rawBaseURL;
if (typeof window !== "undefined" && window.location.protocol === "https:") {
  baseURL = baseURL.replace(/^http:\/\//i, "https://");
}

const MAX_RETRIES = 2;
const sessionRedirectGuard = {
  triggered: false,
  reset() {
    this.triggered = false;
  },
};

if (typeof window !== "undefined") {
  window.addEventListener("pageshow", () => sessionRedirectGuard.reset());
  window.addEventListener("hashchange", () => sessionRedirectGuard.reset());
}

async function resolveRedirectRoute() {
  return "/login";
}

async function terminateSession() {
  if (sessionRedirectGuard.triggered) return;
  sessionRedirectGuard.triggered = true;
  try {
    await supabase.auth.signOut({ scope: "global" });
  } catch {
    /* noop */
  }
  if (typeof window !== "undefined") {
    const route = await resolveRedirectRoute();
    const loginUrl = `${route}?redirect=${encodeURIComponent(
      window.location.pathname + window.location.search,
    )}`;
    window.location.assign(loginUrl);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const api = axios.create({ baseURL });

api.interceptors.request.use(async (config) => {
  const requestConfig = { ...config };
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (token) {
    requestConfig.headers = {
      ...requestConfig.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  requestConfig._retryCount = requestConfig._retryCount ?? 0;
  return requestConfig;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const config = error?.config ?? {};
    const retryCount = config._retryCount ?? 0;

    if (status === 401) {
      const code = error?.response?.data?.code;
      if (retryCount < MAX_RETRIES && code === "TOKEN_REFRESHED") {
        config._retryCount = retryCount + 1;
        await sleep(2 ** retryCount * 150);
        return api.request(config);
      }
      await terminateSession();
      return Promise.reject(error);
    }

    if (status === 403) {
      const code = error?.response?.data?.code;
      if (code === "ADMIN_REQUIRED") {
        await terminateSession();
      }
      return Promise.reject(error);
    }

    const isTransient =
      !status || (status >= 500 && status < 600) || status === 429;
    if (isTransient && retryCount < MAX_RETRIES) {
      config._retryCount = retryCount + 1;
      await sleep(2 ** retryCount * 300 + Math.random() * 100);
      return api.request(config);
    }

    return Promise.reject(error);
  },
);

export default api;
