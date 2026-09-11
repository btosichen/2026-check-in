import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
const EVENT_ID = "ems-2026-09-14", OPEN_AT = "2026-09-14T07:30:00+08:00", CLOSE_AT = "2026-09-14T09:10:00+08:00";
function eventStatus(now = new Date()) { const open = new Date(OPEN_AT), close = new Date(CLOSE_AT); const state = now < open ? "before" : now > close ? "closed" : "open"; return { state, message: state === "open" ? "開放報到中" : state === "before" ? "報到尚未開始" : "報到已截止", window: "2026/09/14 07:30－09:10" }; }
function formatTaipei(iso: string) { return new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(iso)); }
export async function GET() { return NextResponse.json(eventStatus()); }
export async function POST(request: Request) {
  const status = eventStatus(); if (status.state !== "open") return NextResponse.json({ error: status.message }, { status: 403 });
  const body = await request.json().catch(() => ({})); const name = String(body.name ?? "").trim().replace(/\s+/g, " "), role = String(body.role ?? ""), email = String(body.email ?? "").trim().toLowerCase();
  if (name.length < 2 || name.length > 40) return NextResponse.json({ error: "請輸入正確姓名。" }, { status: 400 });
  if (role !== "教師" && role !== "職員") return NextResponse.json({ error: "請選擇身分。" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return NextResponse.json({ error: "請輸入有效的 Email。" }, { status: 400 });
  const existing = await env.DB.prepare("SELECT checked_in_at FROM checkins WHERE event_id = ? AND email = ? LIMIT 1").bind(EVENT_ID, email).first<{ checked_in_at: string }>();
  if (existing) return NextResponse.json({ ok: true, duplicate: true, checkedInAt: formatTaipei(existing.checked_in_at) });
  const now = new Date().toISOString();
  try { await env.DB.prepare("INSERT INTO checkins (event_id, name, role, email, checked_in_at) VALUES (?, ?, ?, ?, ?)").bind(EVENT_ID, name, role, email, now).run(); }
  catch { const row = await env.DB.prepare("SELECT checked_in_at FROM checkins WHERE event_id = ? AND email = ? LIMIT 1").bind(EVENT_ID, email).first<{ checked_in_at: string }>(); if (row) return NextResponse.json({ ok: true, duplicate: true, checkedInAt: formatTaipei(row.checked_in_at) }); return NextResponse.json({ error: "目前無法儲存，請稍後再試。" }, { status: 503 }); }
  return NextResponse.json({ ok: true, duplicate: false, checkedInAt: formatTaipei(now) });
}
