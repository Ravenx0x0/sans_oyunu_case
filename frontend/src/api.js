export const API_BASE = "http://127.0.0.1:8000";

// Token'ı refresh sonrası da kullanabilmek için localStorage'dan başlatıyoruz
let token = localStorage.getItem("token");

export function getToken() {
    return token || localStorage.getItem("token");
}

export function setToken(t) {
    token = t || null;
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
}

export async function api(path, options = {}) {
    const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

    // headers merge
    const headers = { ...(options.headers || {}) };

    // JSON body desteği (body object ise otomatik stringify)
    let body = options.body;
    if (body && typeof body === "object" && !(body instanceof FormData)) {
        headers["Content-Type"] = headers["Content-Type"] || "application/json";
        body = JSON.stringify(body);
    } else {
        // body string ise (JSON.stringify ile geliyorsa) Content-Type garanti olsun
        if (body && typeof body === "string") {
            headers["Content-Type"] = headers["Content-Type"] || "application/json";
        }
    }

    const t = getToken();
    if (t) headers["Authorization"] = `Token ${t}`;

    const res = await fetch(url, {
        ...options,
        headers,
        body,
    });

    const text = await res.text();
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!res.ok) {
        const detail =
            (data && (data.detail || (Array.isArray(data.non_field_errors) && data.non_field_errors[0]))) ||
            (typeof data === "string" ? data : null);

        throw new Error(`${options.method || "GET"} ${path} -> HTTP ${res.status}${detail ? ` | ${detail}` : ""}`);
    }

    return data;
}
