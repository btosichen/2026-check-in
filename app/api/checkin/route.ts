import { NextResponse } from "next/server";

const GAS_URL = "https://script.google.com/macros/s/AKfycbxF-eM8zsoHOawK9ASXhtYgF_QJOKzrWfmpmKfGcF_C2uBzXMIg4tmqgR6f8ieyj0bL-g/exec";
const CALLBACK = "receiveSitesProxyResponse";

export const dynamic = "force-dynamic";

function parseJsonp(text: string): unknown {
  const prefix = `${CALLBACK}(`;
  const trimmed = text.trim();
  if (!trimmed.startsWith(prefix)) throw new Error("GAS 回應格式不正確");
  const end = trimmed.endsWith(");") ? -2 : trimmed.endsWith(")") ? -1 : 0;
  if (!end) throw new Error("GAS 回應格式不正確");
  return JSON.parse(trimmed.slice(prefix.length, end));
}

function errorPage(message: string) {
  const safeMessage = message.replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character);
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>目前無法完成報到</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:linear-gradient(135deg,#fff5a8,#ffd4e9 50%,#bef6ff);font-family:Arial,'Microsoft JhengHei',sans-serif;color:#40345c}.card{width:min(86vw,390px);padding:42px 28px;text-align:center;background:#fff;border-radius:32px;box-shadow:0 22px 60px #59479533}.icon{width:76px;height:76px;margin:auto;display:grid;place-items:center;border-radius:50%;background:#ff6b8a;color:#fff;font-size:46px;font-weight:900}h1{font-size:28px;margin:22px 0 10px}p{font-size:16px;line-height:1.7;color:#716482}.back{display:inline-block;margin-top:22px;padding:14px 28px;border-radius:16px;background:#153957;color:#fff;text-decoration:none;font-weight:800}</style></head><body><main class="card"><div class="icon">!</div><h1>目前無法完成報到</h1><p>${safeMessage}</p><a class="back" href="/">返回報到頁重試</a></main></body></html>`;
}

function unwrapAppsScriptHtml(wrapper: string) {
  const match = wrapper.match(/goog\.script\.init\("((?:\\.|[^"])*)",\s*""/s);
  if (!match) throw new Error("GAS HTML 回應格式不正確");
  const jsonText = JSON.parse(`"${match[1].replace(/\\x([0-9a-f]{2})/gi, "\\u00$1")}"`);
  const config = JSON.parse(jsonText) as { userHtml?: string };
  if (!config.userHtml) throw new Error("GAS HTML 內容不存在");
  return config.userHtml.replaceAll("https://btosichen.github.io/2026-check-in/", "/");
}

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const upstream = new URL(GAS_URL);
  if (incoming.searchParams.get("action") === "counts") upstream.searchParams.set("action", "counts");
  upstream.searchParams.set("callback", CALLBACK);
  upstream.searchParams.set("_", String(Date.now()));

  try {
    const response = await fetch(upstream, { cache: "no-store", redirect: "follow" });
    if (!response.ok) throw new Error(`GAS 回應 ${response.status}`);
    return NextResponse.json(parseJsonp(await response.text()), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("GAS GET proxy failed", error);
    return NextResponse.json({ ok: false, error: "目前無法連接報到服務，請稍後再試。" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const body = new URLSearchParams();
    for (const [name, value] of form.entries()) {
      if (typeof value === "string") body.append(name, value);
    }

    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body,
      cache: "no-store",
      redirect: "follow",
    });
    if (!response.ok) throw new Error(`GAS 回應 ${response.status}`);

    return new Response(unwrapAppsScriptHtml(await response.text()), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GAS POST proxy failed", error);
    return new Response(errorPage("校園網路已連到本站，但後端服務暫時沒有回應。請返回後再試一次，或聯絡現場工作人員。"), {
      status: 502,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}
