"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, Clock3, Mail, UserRound } from "lucide-react";

type Status = { state: "before" | "open" | "closed"; message: string; window: string };
type Result = { ok?: boolean; duplicate?: boolean; checkedInAt?: string; error?: string };

export default function Home() {
  const [status, setStatus] = useState<Status>({ state: "open", message: "開放報到中", window: "讀取中…" });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => { fetch("/api/checkin").then(r => r.json()).then(setStatus).catch(() => setStatus({ state: "open", message: "開放報到中", window: "請依現場公告" })); }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setResult(null); const form = e.currentTarget;
    try {
      const response = await fetch("/api/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
      const data = await response.json(); setResult(data); if (response.ok) form.reset();
    } catch { setResult({ error: "目前無法連線，請確認網路後再試一次。" }); }
    finally { setBusy(false); }
  }

  if (result?.ok) return <main className="min-h-screen bg-[linear-gradient(135deg,#fff6a8,#ffd5ea_50%,#bff7ff)] px-5 py-10 text-[#40345c]"><section className="mx-auto max-w-md overflow-hidden rounded-[34px] border-4 border-white bg-white shadow-[0_24px_0_rgba(106,87,176,.15),0_34px_80px_rgba(89,71,149,.2)]"><div className="h-3 bg-[linear-gradient(90deg,#ff5fa5,#ffc83d,#32d7e7,#8b7cff)]"/><div className="px-7 py-10 text-center"><img src="/checkin-fox.png" alt="狐狸報到吉祥物" className="mx-auto -mb-2 w-44"/><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#dffff1] text-[#13a879]"><Check size={36} strokeWidth={3}/></span><p className="mt-5 text-sm font-black tracking-[.18em] text-[#8b7cff]">報到完成</p><h1 className="mt-2 text-3xl font-black">歡迎到場！</h1><p className="mt-3 text-[#736683]">{result.duplicate ? "這個 Email 已報到過，以下是原報到時間。" : "已經幫你記錄日期與時間囉！"}</p><time className="mt-6 block rounded-2xl bg-[#fff6c8] px-4 py-4 text-xl font-black text-[#795522]">{result.checkedInAt}</time><button onClick={() => setResult(null)} className="mt-7 min-h-12 w-full rounded-2xl border-2 border-[#8b7cff] font-black text-[#6c59cc]">返回報到頁</button></div></section></main>;

  const open = status.state === "open";
  return <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#fff6a8,#ffd5ea_50%,#bff7ff)] px-4 py-6 text-[#40345c] sm:py-10"><div aria-hidden className="absolute -left-16 top-16 h-44 w-44 rounded-full bg-[#ff70af]/35 blur-2xl"/><div aria-hidden className="absolute -right-14 bottom-10 h-52 w-52 rounded-full bg-[#30d9eb]/40 blur-2xl"/>
    <section className="relative mx-auto max-w-md overflow-hidden rounded-[34px] border-4 border-white bg-white/95 shadow-[0_24px_0_rgba(106,87,176,.16),0_34px_80px_rgba(89,71,149,.2)]"><div className="h-3 bg-[linear-gradient(90deg,#ff5fa5,#ffc83d,#32d7e7,#8b7cff)]"/>
      <header className="relative min-h-52 overflow-hidden bg-[radial-gradient(circle_at_20%_20%,#fff_0_3px,transparent_4px),linear-gradient(135deg,#50ddeb,#8b7cff_58%,#ff7fb8)] bg-[size:27px_27px,auto] px-6 pb-5 pt-7 text-white sm:px-8"><img src="/checkin-fox.png" alt="可愛狐狸報到吉祥物" className="absolute -bottom-8 -right-8 w-48 drop-shadow-[0_8px_0_rgba(74,56,132,.16)]"/><div className="relative z-10 max-w-[62%]"><span className={`inline-block rounded-full border-2 border-white/80 px-3 py-1.5 text-sm font-black shadow-sm ${open ? "bg-[#24c996]" : "bg-[#ffad32]"}`}>{status.message}</span><p className="mt-6 text-sm font-black tracking-[.12em] text-white/90">914 緊急救護組</p><h1 className="mt-1 text-[2.1rem] font-black tracking-tight drop-shadow-sm">現場報到</h1><p className="mt-2 text-sm font-bold leading-5 text-white/95">填寫三項資料，快速完成簽到！</p></div></header>
      <div className="mx-6 flex items-start gap-2 rounded-2xl border-2 border-[#ffe078] bg-[#fff9cd] px-4 py-3 text-sm font-bold leading-5 text-[#765723] shadow-sm sm:mx-8"><Clock3 className="mt-0.5 shrink-0 text-[#ff9731]" size={19}/><span>{status.window}<br/>送出時自動記錄時間</span></div>
      <form onSubmit={submit} className="px-6 pb-8 pt-6 sm:px-8">
        <label className="block text-sm font-black text-[#5a4b79]" htmlFor="name">姓名</label><div className="relative mt-2"><UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ff5fa5]" size={20}/><input id="name" name="name" required autoComplete="name" placeholder="請輸入真實姓名" className="min-h-14 w-full rounded-2xl border-2 border-[#e5dcff] bg-[#fcfbff] pl-12 pr-4 text-base outline-none transition focus:border-[#8b7cff] focus:ring-4 focus:ring-[#8b7cff]/15"/></div>
        <fieldset className="mt-5"><legend className="text-sm font-black text-[#5a4b79]">身分</legend><div className="mt-2 grid grid-cols-2 gap-3">{["教師", "職員"].map((role, i) => <label key={role} className="cursor-pointer"><input className="peer sr-only" type="radio" name="role" value={role} required/><span className={`grid min-h-13 place-items-center rounded-2xl border-2 font-black transition peer-checked:-translate-y-0.5 peer-checked:shadow-md peer-focus-visible:ring-4 ${i === 0 ? "border-[#ffb5d2] bg-[#fff0f7] text-[#d84988] peer-checked:border-[#ff5fa5]" : "border-[#95eaf3] bg-[#eefdff] text-[#168b9a] peer-checked:border-[#2bcfe0]"}`}>{role}</span></label>)}</div></fieldset>
        <label className="mt-5 block text-sm font-black text-[#5a4b79]" htmlFor="email">Email</label><div className="relative mt-2"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b7cff]" size={20}/><input id="email" name="email" required type="email" inputMode="email" autoCapitalize="none" autoComplete="email" placeholder="name@example.com" className="min-h-14 w-full rounded-2xl border-2 border-[#e5dcff] bg-[#fcfbff] pl-12 pr-4 text-base outline-none transition focus:border-[#8b7cff] focus:ring-4 focus:ring-[#8b7cff]/15"/></div><p className="mt-2 text-sm font-medium leading-5 text-[#817495]">Email 僅用於辨識是否重複報到。</p>
        {result?.error && <p role="alert" className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{result.error}</p>}<button disabled={!open || busy} className="mt-7 min-h-14 w-full rounded-2xl bg-[linear-gradient(90deg,#ff5fa5,#8b7cff,#27cadb)] text-base font-black text-white shadow-[0_8px_0_#6651ad,0_14px_28px_rgba(102,81,173,.25)] transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-1 active:shadow-[0_4px_0_#6651ad] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-[0_5px_0_#9ca3af]">{busy ? "正在確認…" : open ? "確認報到 ✦" : status.message}</button>
      </form></section><p className="relative mx-auto mt-7 max-w-md text-center text-xs font-bold leading-5 text-[#685a7a]">個人資料僅供本次活動出席紀錄使用</p></main>;
}
