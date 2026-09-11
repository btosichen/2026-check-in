"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, Clock3, Mail, ShieldCheck, UserRound } from "lucide-react";

type Status = { state: "before" | "open" | "closed"; message: string; window: string };
type Result = { ok?: boolean; duplicate?: boolean; checkedInAt?: string; error?: string };

export default function Home() {
  const [status, setStatus] = useState<Status>({ state: "open", message: "開放報到中", window: "讀取中…" });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => { fetch("/api/checkin").then((r) => r.json()).then(setStatus).catch(() => setStatus({ state: "open", message: "開放報到中", window: "2026/09/14" })); }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setResult(null);
    const form = e.currentTarget;
    try {
      const response = await fetch("/api/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
      const data = await response.json(); setResult(data); if (response.ok) form.reset();
    } catch { setResult({ error: "目前無法連線，請確認網路後再試一次。" }); }
    finally { setBusy(false); }
  }

  if (result?.ok) return <main className="min-h-screen bg-[#f3f8f8] px-5 py-10 text-[#163638]"><section className="mx-auto max-w-md overflow-hidden rounded-[28px] bg-white shadow-[0_22px_70px_rgba(17,70,74,.14)]"><div className="h-2 bg-[#20a6a8]"/><div className="px-7 py-12 text-center"><span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#def5ef] text-[#087863]"><Check size={42} strokeWidth={2.5}/></span><p className="mt-7 text-sm font-bold tracking-[.18em] text-[#16898c]">報到完成</p><h1 className="mt-2 text-3xl font-black">歡迎到場</h1><p className="mt-4 text-base text-slate-600">{result.duplicate ? "此 Email 已完成報到，以下為原報到時間。" : "系統已記錄您的報到日期與時間。"}</p><time className="mt-7 block rounded-2xl bg-[#f0f7f7] px-4 py-5 text-xl font-bold">{result.checkedInAt}</time><button onClick={() => setResult(null)} className="mt-8 min-h-12 w-full rounded-xl border border-[#9bcacc] font-bold text-[#147b7e]">返回報到頁</button></div></section></main>;

  const open = status.state === "open";
  return <main className="min-h-screen bg-[#f3f8f8] px-4 py-6 text-[#163638] sm:py-10"><section className="mx-auto max-w-md overflow-hidden rounded-[28px] bg-white shadow-[0_22px_70px_rgba(17,70,74,.14)]"><div className="h-2 bg-[#20a6a8]"/><header className="px-6 pb-5 pt-8 sm:px-8"><div className="mb-6 flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#dff3f3] text-[#15888b]"><ShieldCheck size={27}/></span><span className={`rounded-full px-3 py-1.5 text-sm font-bold ${open ? "bg-[#def5ef] text-[#087863]" : "bg-slate-100 text-slate-600"}`}>{status.message}</span></div><p className="text-sm font-bold tracking-[.12em] text-[#16898c]">914 緊急救護組</p><h1 className="mt-1 text-[2rem] font-black tracking-tight">現場報到</h1><div className="mt-4 flex items-start gap-2 text-sm leading-6 text-slate-600"><Clock3 className="mt-0.5 shrink-0" size={18}/><span>{status.window}<br/>系統將自動記錄送出時間</span></div></header>
    <form onSubmit={submit} className="border-t border-slate-100 px-6 pb-8 pt-6 sm:px-8"><label className="block text-sm font-bold" htmlFor="name">姓名</label><div className="relative mt-2"><UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/><input id="name" name="name" required autoComplete="name" placeholder="請輸入真實姓名" className="min-h-14 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-base outline-none transition focus:border-[#20a6a8] focus:ring-4 focus:ring-[#20a6a8]/10"/></div>
    <fieldset className="mt-5"><legend className="text-sm font-bold">身分</legend><div className="mt-2 grid grid-cols-2 gap-3">{["教師", "職員"].map((role) => <label key={role} className="cursor-pointer"><input className="peer sr-only" type="radio" name="role" value={role} required/><span className="grid min-h-13 place-items-center rounded-xl border border-slate-300 font-bold text-slate-600 transition peer-checked:border-[#16898c] peer-checked:bg-[#e8f7f7] peer-checked:text-[#126f72] peer-focus-visible:ring-4 peer-focus-visible:ring-[#20a6a8]/20">{role}</span></label>)}</div></fieldset>
    <label className="mt-5 block text-sm font-bold" htmlFor="email">Email</label><div className="relative mt-2"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/><input id="email" name="email" required type="email" inputMode="email" autoCapitalize="none" autoComplete="email" placeholder="name@example.com" className="min-h-14 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-base outline-none transition focus:border-[#20a6a8] focus:ring-4 focus:ring-[#20a6a8]/10"/></div><p className="mt-2 text-sm leading-5 text-slate-500">Email 僅用於辨識是否重複報到。</p>
    {result?.error && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{result.error}</p>}<button disabled={!open || busy} className="mt-7 min-h-14 w-full rounded-xl bg-[#168f92] text-base font-black text-white shadow-[0_8px_24px_rgba(22,143,146,.25)] transition hover:bg-[#117b7e] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none">{busy ? "正在確認…" : open ? "確認報到" : status.message}</button></form></section><p className="mx-auto mt-5 max-w-md text-center text-xs leading-5 text-slate-500">個人資料僅供本次活動出席紀錄使用</p></main>;
}
