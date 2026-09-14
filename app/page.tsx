"use client";

import { useEffect, useState } from "react";
import { Clock3, Mail, UserRound } from "lucide-react";
import Image from "next/image";

const GAS_URL = "https://script.google.com/macros/s/AKfycbxF-eM8zsoHOawK9ASXhtYgF_QJOKzrWfmpmKfGcF_C2uBzXMIg4tmqgR6f8ieyj0bL-g/exec";
const TEAMS = ["緊急救護組", "安全防護組", "避難引導組", "通報組", "搶救組"] as const;

type Status = { state: "before" | "open" | "closed"; message: string; window: string; eventName: string };
type CountPayload = { ok: boolean; counts?: Record<string, number>; total?: number; updatedAt?: string };

function loadJsonp<T>(params: Record<string, string>, prefix: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const callback = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const cleanup = () => {
      script.remove();
      delete (window as unknown as Record<string, unknown>)[callback];
    };
    (window as unknown as Record<string, unknown>)[callback] = (payload: T) => {
      cleanup();
      resolve(payload);
    };
    script.src = `${GAS_URL}?${new URLSearchParams({ ...params, callback, _: String(Date.now()) })}`;
    script.onerror = () => {
      cleanup();
      reject(new Error("JSONP request failed"));
    };
    document.head.appendChild(script);
  });
}

function statusFromConfig(config: { ok?: boolean; eventName?: string; startAt?: string; endAt?: string; serverTime?: string }) {
  if (!config.ok || !config.startAt || !config.endAt || !config.serverTime) throw new Error("Invalid config");
  const start = new Date(config.startAt);
  const end = new Date(config.endAt);
  const server = new Date(config.serverTime);
  const state = server < start ? "before" : server > end ? "closed" : "open";
  const formatDate = new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  const formatTime = new Intl.DateTimeFormat("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false });
  return {
    state,
    message: state === "open" ? "開放報到中" : state === "before" ? "報到尚未開始" : "報到已截止",
    window: `${formatDate.format(start)}－${formatTime.format(end)}`,
    eventName: config.eventName || "現場報到",
  } satisfies Status;
}

export default function Home() {
  const [status, setStatus] = useState<Status>({ state: "closed", message: "正在確認時間", window: "讀取活動時間中…", eventName: "914 緊急避難點名" });
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    loadJsonp<{ ok?: boolean; eventName?: string; startAt?: string; endAt?: string; serverTime?: string }>({}, "receiveCheckinConfig")
      .then(config => setStatus(statusFromConfig(config)))
      .catch(() => setStatus(previous => ({ ...previous, message: "目前無法讀取活動時間" })));

    const loadCounts = () => {
      loadJsonp<CountPayload>({ action: "counts" }, "receiveCheckinCounts")
        .then(payload => {
          if (!payload.ok || !payload.counts) throw new Error("Invalid counts");
          setCounts(payload.counts);
          setTotal(payload.total || 0);
          setUpdatedAt(payload.updatedAt || new Date().toISOString());
        })
        .catch(() => setUpdatedAt(null));
    };
    loadCounts();
    const timer = window.setInterval(loadCounts, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const open = status.state === "open";
  return <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#fff6a8,#ffd5ea_50%,#bff7ff)] px-4 py-6 text-[#40345c] sm:py-10">
    <div aria-hidden className="absolute -left-16 top-16 h-44 w-44 rounded-full bg-[#ff7043]/35 blur-2xl"/>
    <div aria-hidden className="absolute -right-14 bottom-10 h-52 w-52 rounded-full bg-[#1885a8]/40 blur-2xl"/>
    <section className="relative mx-auto max-w-md overflow-hidden rounded-[34px] border-4 border-white bg-white/95 shadow-[0_24px_0_rgba(21,57,87,.16),0_34px_80px_rgba(21,57,87,.22)]">
      <div className="h-3 bg-[linear-gradient(90deg,#d62828,#ffb703,#146b8c,#d62828)]"/>
      <header className="relative min-h-52 overflow-hidden bg-[radial-gradient(circle_at_20%_20%,#ffffff38_0_3px,transparent_4px),linear-gradient(135deg,#092f4f,#145b78_58%,#8f2435)] bg-[size:27px_27px,auto] px-6 pb-5 pt-7 text-white sm:px-8">
        <Image src="/0914-firefighter.png" alt="穿著紫色消防裝備的人員與救災黑貓" width={512} height={768} priority className="absolute -bottom-14 -right-5 h-auto w-48 drop-shadow-[0_9px_3px_rgba(2,11,18,.5)] max-[400px]:-bottom-12 max-[400px]:-right-4 max-[400px]:w-44"/>
        <div className="relative z-10 max-w-[62%]"><span className={`inline-block rounded-full border-[3px] border-white px-3 py-1.5 text-sm font-black shadow-[0_4px_0_#071e32] ${open ? "bg-[#24c996]" : "bg-[#e64532]"}`}>{status.message}</span><p className="mt-6 text-sm font-black tracking-[.08em] text-[#ffe08a] [text-shadow:0_2px_3px_#041b2d]">{status.eventName}</p><h1 className="mt-1 text-[2.1rem] font-black tracking-tight [text-shadow:0_3px_0_#071e32,0_6px_18px_#0009]">現場報到</h1><p className="mt-2 text-sm font-black leading-5 [text-shadow:0_2px_3px_#041b2d]">填寫四項資料，快速完成簽到！</p></div>
      </header>
      <div className="mx-6 flex items-start gap-2 rounded-2xl border-2 border-[#ffe078] bg-[#fff9cd] px-4 py-3 text-sm font-bold leading-5 text-[#765723] shadow-sm sm:mx-8"><Clock3 className="mt-0.5 shrink-0 text-[#ff9731]" size={19}/><span>{status.window}<br/>送出時自動記錄時間</span></div>
      <form action={GAS_URL} method="post" className="px-6 pb-8 pt-6 sm:px-8">
        <label className="block text-sm font-black text-[#5a4b79]" htmlFor="name">姓名</label><div className="relative mt-2"><UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-[#e64532]" size={20}/><input id="name" name="name" required minLength={2} maxLength={40} autoComplete="name" placeholder="請輸入真實姓名" className="min-h-14 w-full rounded-2xl border-2 border-[#e5dcff] bg-[#fcfbff] pl-12 pr-4 text-base outline-none transition focus:border-[#8b7cff] focus:ring-4 focus:ring-[#8b7cff]/15"/></div>
        <fieldset className="mt-5"><legend className="text-sm font-black text-[#5a4b79]">身分</legend><div className="mt-2 grid grid-cols-2 gap-3">{["教師", "職員"].map((role, i) => <label key={role} className="cursor-pointer"><input className="peer sr-only" type="radio" name="role" value={role} required/><span className={`grid min-h-13 place-items-center rounded-2xl border-2 font-black transition peer-checked:-translate-y-0.5 peer-checked:shadow-md peer-focus-visible:ring-4 ${i === 0 ? "border-[#ffb5d2] bg-[#fff0f7] text-[#d84988] peer-checked:border-[#ff5fa5]" : "border-[#95eaf3] bg-[#eefdff] text-[#168b9a] peer-checked:border-[#2bcfe0]"}`}>{role}</span></label>)}</div></fieldset>
        <label className="mt-5 block text-sm font-black text-[#5a4b79]" htmlFor="team">編組</label><select id="team" name="team" required defaultValue="" className="mt-2 min-h-14 w-full rounded-2xl border-2 border-[#d9d0ff] bg-[#f7f4ff] px-4 text-base font-black outline-none focus:border-[#8b7cff] focus:ring-4 focus:ring-[#8b7cff]/15"><option value="" disabled>請選擇所屬編組</option>{TEAMS.map(team => <option key={team} value={team}>{team}</option>)}</select>
        <label className="mt-5 block text-sm font-black text-[#5a4b79]" htmlFor="email">Email</label><div className="relative mt-2"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b7cff]" size={20}/><input id="email" name="email" required type="email" inputMode="email" autoCapitalize="none" autoComplete="email" placeholder="name@example.com" className="min-h-14 w-full rounded-2xl border-2 border-[#e5dcff] bg-[#fcfbff] pl-12 pr-4 text-base outline-none transition focus:border-[#8b7cff] focus:ring-4 focus:ring-[#8b7cff]/15"/></div><p className="mt-2 text-sm font-medium leading-5 text-[#817495]">Email 僅用於辨識是否重複報到。</p>
        <button disabled={!open} className="mt-7 min-h-14 w-full rounded-2xl bg-[linear-gradient(90deg,#e64532,#c63042,#146b8c)] text-base font-black text-white shadow-[0_8px_0_#153957,0_14px_28px_rgba(21,57,87,.3)] transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-1 active:shadow-[0_4px_0_#153957] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-[0_5px_0_#9ca3af]">{open ? "確認報到 ✦" : status.message}</button>
      </form>
    </section>
    <section aria-labelledby="attendanceTitle" className="relative mx-auto mt-9 max-w-md rounded-[26px] border-[3px] border-white bg-white/95 p-5 shadow-[0_12px_28px_rgba(21,57,87,.14)]">
      <div className="flex items-center justify-between gap-3"><h2 id="attendanceTitle" className="text-xl font-black text-[#153957]">各組現場報到</h2><p className="whitespace-nowrap rounded-full bg-[#153957] px-3 py-2 text-sm font-black text-white">總計 <strong>{total ?? "—"}</strong> 人</p></div>
      <div aria-live="polite" className="mt-4 grid grid-cols-2 gap-2.5 max-[400px]:grid-cols-1">{TEAMS.map(team => <div key={team} className="flex min-h-13 items-center justify-between gap-2 rounded-2xl border-2 border-[#d7e4ea] bg-[#f7fbfd] px-3 py-2.5 text-sm font-black text-[#334d5b] last:col-span-2 max-[400px]:last:col-span-1"><span>{team}</span><strong className="text-2xl text-[#d43b35]">{counts?.[team] ?? "—"}</strong></div>)}</div>
      <p className="mt-3 text-center text-xs font-bold text-[#6d7580]">{updatedAt ? `每 15 秒自動更新｜${new Intl.DateTimeFormat("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(updatedAt))} 更新` : "正在讀取現場統計…"}</p>
    </section>
    <p className="relative mx-auto mt-5 max-w-md text-center text-xs font-bold leading-5 text-[#685a7a]">個人資料僅供本次活動出席紀錄使用</p>
  </main>;
}
