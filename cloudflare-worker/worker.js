const GAS_URL = "https://script.google.com/macros/s/AKfycbxF-eM8zsoHOawK9ASXhtYgF_QJOKzrWfmpmKfGcF_C2uBzXMIg4tmqgR6f8ieyj0bL-g/exec";

const ALLOWED_ORIGINS = new Set([
  "https://school-paperless-checkin-20260911.btosi.chatgpt.site",
  "https://btosichen.github.io",
  "http://localhost:5173",
]);

const ALLOWED_TEAMS = new Set(["緊急救護組", "安全防護組", "避難引導組", "通報組", "搶救組"]);
const ALLOWED_ROLES = new Set(["教師", "職員"]);

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://school-paperless-checkin-20260911.btosi.chatgpt.site",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
    "X-Content-Type-Options": "nosniff",
  };
}

function json(payload, status, origin) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function html(body, status, origin) {
  return new Response(body, {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function parseJsonp(source) {
  const open = source.indexOf("(");
  const close = source.lastIndexOf(")");
  if (open < 1 || close <= open) throw new Error("GAS 回應格式不正確");
  return JSON.parse(source.slice(open + 1, close));
}

function unwrapAppsScriptHtml(wrapper) {
  const match = wrapper.match(/goog\.script\.init\("((?:\\.|[^"])*)",\s*""/s);
  if (!match) throw new Error("GAS HTML 回應格式不正確");
  const jsonText = JSON.parse('"' + match[1].replace(/\\x([0-9a-f]{2})/gi, "\\u00$1") + '"');
  const config = JSON.parse(jsonText);
  if (!config.userHtml) throw new Error("GAS HTML 內容不存在");
  return config.userHtml.replaceAll(
    "https://btosichen.github.io/2026-check-in/",
    "https://school-paperless-checkin-20260911.btosi.chatgpt.site/",
  );
}

async function readGas(action) {
  const url = new URL(GAS_URL);
  url.searchParams.set("callback", "workerCallback");
  url.searchParams.set("_", String(Date.now()));
  if (action === "counts") url.searchParams.set("action", "counts");
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error("GAS 回應 " + response.status);
  return parseJsonp(await response.text());
}

function validateCheckin(form) {
  const name = String(form.get("name") || "").trim();
  const role = String(form.get("role") || "").trim();
  const team = String(form.get("team") || "").trim();
  const email = String(form.get("email") || "").trim();
  if (name.length < 2 || name.length > 40) return "姓名格式不正確";
  if (!ALLOWED_ROLES.has(role)) return "身分格式不正確";
  if (!ALLOWED_TEAMS.has(team)) return "編組格式不正確";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) return "Email 格式不正確";
  return "";
}

async function forwardForm(request, origin, adminOnly) {
  const form = await request.formData();
  if (adminOnly) {
    const action = String(form.get("action") || "");
    if (!new Set(["resetCounts", "openSpreadsheet"]).has(action) || !String(form.get("password") || "")) {
      return html("<!doctype html><meta charset=utf-8><title>操作失敗</title><p>管理操作資料不完整。</p>", 400, origin);
    }
  } else {
    const error = validateCheckin(form);
    if (error) return html("<!doctype html><meta charset=utf-8><title>報到失敗</title><p>" + error + "</p>", 400, origin);
  }

  const body = new URLSearchParams();
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") body.append(key, value);
  }
  const response = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body,
    redirect: "follow",
  });
  const responseHtml = await response.text();
  return html(response.ok ? unwrapAppsScriptHtml(responseHtml) : responseHtml, response.ok ? 200 : 502, origin);
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      if (!ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "ymsh-emergency-checkin-proxy" }, 200, origin);
    }

    if (request.method === "GET" && url.pathname === "/api") {
      if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ ok: false, error: "不允許的來源" }, 403, origin);
      try {
        return json(await readGas(url.searchParams.get("action") === "counts" ? "counts" : "config"), 200, origin);
      } catch (error) {
        return json({ ok: false, error: String(error && error.message ? error.message : error) }, 502, origin);
      }
    }

    if (request.method === "POST" && (url.pathname === "/submit" || url.pathname === "/admin")) {
      if (!ALLOWED_ORIGINS.has(origin)) return html("<!doctype html><meta charset=utf-8><title>拒絕存取</title><p>此來源無法使用報到服務。</p>", 403, origin);
      try {
        return await forwardForm(request, origin, url.pathname === "/admin");
      } catch (error) {
        return html("<!doctype html><meta charset=utf-8><title>連線失敗</title><p>" + String(error && error.message ? error.message : error) + "</p>", 502, origin);
      }
    }

    return json({ ok: false, error: "找不到此服務" }, 404, origin);
  },
};
