"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Clock3, LockKeyhole, Mail, Settings, UserRound } from "lucide-react";
import Image from "next/image";

const WORKER_URL = "https://ymsh-emergency-checkin-proxy.btosichen.workers.dev";
const TEAMS = ["緊急救護組", "安全防護組", "避難引導組", "通報組", "搶救組"] as const;
const TEAM_LABELS: Record<(typeof TEAMS)[number], string> = {
  "緊急救護組": "緊急救護組（救護班）",
  "安全防護組": "安全防護組（安全防護班）",
  "避難引導組": "避難引導組（避難引導班）",
  "通報組": "通報組（通報班）",
  "搶救組": "搶救組（滅火班）",
};
const EXPECTED_COUNTS: Record<string, number> = { "緊急救護組": 16, "安全防護組": 27, "避難引導組": 71, "通報組": 15, "搶救組": 68 };

type Status = { state: "before" | "open" | "closed"; message: string; window: string; eventName: string };
type CountPayload = { ok: boolean; counts?: Record<string, number>; expected?: Record<string, number>; total?: number; totalExpected?: number; updatedAt?: string };
type ProtectedAction = "resetCounts" | "openSpreadsheet";

async function loadApiJson<T>(params: Record<string, string> = {}): Promise<T> {
  const query = new URLSearchParams({ ...params, _: String(Date.now()) });
  const response = await fetch(`${WORKER_URL}/api?${query}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json() as Promise<T>;
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
  const [expected, setExpected] = useState<Record<string, number>>(EXPECTED_COUNTS);
  const [total, setTotal] = useState<number | null>(null);
  const [totalExpected, setTotalExpected] = useState<number | null>(197);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [protectedAction, setProtectedAction] = useState<ProtectedAction | null>(null);
  const [password, setPassword] = useState("");

  const refreshCounts = useCallback(() => {
    return loadApiJson<CountPayload>({ action: "counts" })
      .then(payload => {
        if (!payload.ok || !payload.counts) throw new Error("Invalid counts");
        setCounts(payload.counts);
        setExpected(payload.expected || EXPECTED_COUNTS);
        setTotal(payload.total || 0);
        setTotalExpected(payload.totalExpected ?? 197);
        setUpdatedAt(payload.updatedAt || new Date().toISOString());
      })
      .catch(() => setUpdatedAt(null));
  }, []);

  useEffect(() => {
    loadApiJson<{ ok?: boolean; eventName?: string; startAt?: string; endAt?: string; serverTime?: string }>()
      .then(config => setStatus(statusFromConfig(config)))
      .catch(() => setStatus(previous => ({ ...previous, message: "目前無法讀取活動時間" })));

    refreshCounts();
    const timer = window.setInterval(refreshCounts, 15000);
    return () => window.clearInterval(timer);
  }, [refreshCounts]);

  const resetAttendance = () => {
    setPassword("");
    setProtectedAction("resetCounts");
  };

  const openSpreadsheet = () => {
    setPassword("");
    setProtectedAction("openSpreadsheet");
  };

  const submitProtectedAction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!protectedAction || !password) return;
    if (protectedAction === "resetCounts" && !window.confirm("確定要將各組實到人數歸零嗎？原始報到紀錄仍會保留。")) return;
    const action = protectedAction;
    const protectedForm = document.createElement("form");
    protectedForm.method = "post";
    protectedForm.action = `${WORKER_URL}/admin`;
    protectedForm.target = "_blank";
    protectedForm.style.display = "none";
    for (const [name, value] of [["action", action], ["password", password]]) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      protectedForm.appendChild(input);
    }
    document.body.appendChild(protectedForm);
    protectedForm.submit();
    protectedForm.remove();
    setProtectedAction(null);
    setPassword("");
    if (action === "resetCounts") {
      setResetMessage("清除請求已送出，完成後將自動更新…");
      window.setTimeout(() => void refreshCounts(), 2500);
      window.setTimeout(() => {
        void refreshCounts();
        setResetMessage(null);
      }, 5000);
    }
  };

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
      <form action={`${WORKER_URL}/submit`} method="post" className="px-6 pb-8 pt-6 sm:px-8">
        <label className="block text-sm font-black text-[#5a4b79]" htmlFor="name">姓名</label><div className="relative mt-2"><UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-[#e64532]" size={20}/><input id="name" name="name" required minLength={2} maxLength={40} autoComplete="name" placeholder="請輸入真實姓名" className="min-h-14 w-full rounded-2xl border-2 border-[#e5dcff] bg-[#fcfbff] pl-12 pr-4 text-base outline-none transition focus:border-[#8b7cff] focus:ring-4 focus:ring-[#8b7cff]/15"/></div>
        <fieldset className="mt-5"><legend className="text-sm font-black text-[#5a4b79]">身分</legend><div className="mt-2 grid grid-cols-2 gap-3">{["教師", "職員"].map((role, i) => <label key={role} className="cursor-pointer"><input className="peer sr-only" type="radio" name="role" value={role} required/><span className={`grid min-h-13 place-items-center rounded-2xl border-2 font-black transition peer-checked:-translate-y-0.5 peer-checked:shadow-md peer-focus-visible:ring-4 ${i === 0 ? "border-[#ffb5d2] bg-[#fff0f7] text-[#d84988] peer-checked:border-[#ff5fa5]" : "border-[#95eaf3] bg-[#eefdff] text-[#168b9a] peer-checked:border-[#2bcfe0]"}`}>{role}</span></label>)}</div></fieldset>
        <label className="mt-5 block text-sm font-black text-[#5a4b79]" htmlFor="team">編組</label><select id="team" name="team" required defaultValue="" className="mt-2 min-h-14 w-full rounded-2xl border-2 border-[#d9d0ff] bg-[#f7f4ff] px-4 text-base font-black outline-none focus:border-[#8b7cff] focus:ring-4 focus:ring-[#8b7cff]/15"><option value="" disabled>請選擇所屬編組</option>{TEAMS.map(team => <option key={team} value={team}>{TEAM_LABELS[team]}</option>)}</select>
        <label className="mt-5 block text-sm font-black text-[#5a4b79]" htmlFor="email">Email</label><div className="relative mt-2"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b7cff]" size={20}/><input id="email" name="email" required type="email" inputMode="email" autoCapitalize="none" autoComplete="email" placeholder="name@example.com" className="min-h-14 w-full rounded-2xl border-2 border-[#e5dcff] bg-[#fcfbff] pl-12 pr-4 text-base outline-none transition focus:border-[#8b7cff] focus:ring-4 focus:ring-[#8b7cff]/15"/></div><p className="mt-2 text-sm font-medium leading-5 text-[#817495]">Email 僅用於辨識是否重複報到。</p>
        <button disabled={!open} className="mt-7 min-h-14 w-full rounded-2xl bg-[linear-gradient(90deg,#e64532,#c63042,#146b8c)] text-base font-black text-white shadow-[0_8px_0_#153957,0_14px_28px_rgba(21,57,87,.3)] transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-1 active:shadow-[0_4px_0_#153957] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-[0_5px_0_#9ca3af]">{open ? "確認報到 ✦" : status.message}</button>
      </form>
    </section>
    <section aria-labelledby="attendanceTitle" className="relative mx-auto mt-9 max-w-md rounded-[26px] border-[3px] border-white bg-white/95 p-5 shadow-[0_12px_28px_rgba(21,57,87,.14)]">
      <div className="flex items-center justify-between gap-3"><h2 id="attendanceTitle" className="text-xl font-black text-[#153957]">各組現場報到</h2><p className="whitespace-nowrap rounded-2xl bg-[#153957] px-3 py-2 text-center text-xs font-black leading-5 text-white">實到 <strong className="text-base">{total ?? "—"}</strong><br/>應到 <strong className="text-base">{totalExpected ?? "—"}</strong></p></div>
      <div aria-live="polite" className="mt-4 grid grid-cols-2 gap-2.5 max-[400px]:grid-cols-1">{TEAMS.map(team => <div key={team} className="min-h-[78px] rounded-2xl border-2 border-[#d7e4ea] bg-[#f7fbfd] px-3 py-2.5 text-sm font-black text-[#334d5b] last:col-span-2 max-[400px]:last:col-span-1"><span className="block">{TEAM_LABELS[team]}</span><span className="mt-2 flex items-end justify-between text-xs text-[#6d7580]">實到 <strong className="text-2xl text-[#d43b35]">{counts?.[team] ?? "—"}</strong><span>／應到 <b className="text-base text-[#153957]">{expected?.[team] ?? "—"}</b></span></span></div>)}</div>
      <p className="mt-3 text-center text-xs font-bold text-[#6d7580]">{resetMessage || (updatedAt ? `每 15 秒自動更新｜${new Intl.DateTimeFormat("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(updatedAt))} 更新` : "正在讀取現場統計…")}</p>
      <button type="button" onClick={resetAttendance} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#c63042] bg-white text-sm font-black text-[#a92235] transition hover:bg-[#fff0f2] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#c63042]/20"><LockKeyhole size={18}/>清除實到人數</button>
    </section>
    <footer className="relative mx-auto mt-5 max-w-md text-center text-xs font-bold leading-5 text-[#685a7a]"><p>個人資料僅供本次活動出席紀錄使用</p><p className="mt-1 font-black text-[#153957]">臺北市立陽明高中總務處製作</p></footer>
    <button type="button" onClick={openSpreadsheet} title="管理試算表" aria-label="開啟管理試算表" className="fixed bottom-4 right-4 z-20 grid h-14 w-14 place-items-center rounded-full border-[3px] border-white bg-[linear-gradient(135deg,#153957,#146b8c)] text-white shadow-[0_7px_0_#071e32,0_13px_28px_rgba(7,30,50,.4)] transition hover:-translate-y-0.5 hover:rotate-12 hover:brightness-110 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#ffb703]/70 max-[400px]:bottom-3 max-[400px]:right-3 max-[400px]:h-13 max-[400px]:w-13"><Settings size={27} strokeWidth={2.5}/></button>
    {protectedAction && <div className="fixed inset-0 z-50 grid place-items-center bg-[#071e32]/65 px-4 backdrop-blur-sm" onMouseDown={() => { setProtectedAction(null); setPassword(""); }}>
      <form role="dialog" aria-modal="true" aria-labelledby="passwordDialogTitle" onSubmit={submitProtectedAction} onMouseDown={event => event.stopPropagation()} className="w-full max-w-sm rounded-[28px] border-4 border-white bg-white p-6 text-center shadow-[0_22px_0_rgba(7,30,50,.22),0_34px_70px_rgba(7,30,50,.38)]">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#153957] text-white shadow-[0_6px_0_#071e32]"><LockKeyhole size={30}/></div>
        <h2 id="passwordDialogTitle" className="mt-5 text-2xl font-black text-[#153957]">{protectedAction === "resetCounts" ? "清除實到人數" : "開啟管理試算表"}</h2>
        <label htmlFor="protectedPassword" className="mt-5 block text-left text-sm font-black text-[#5a4b79]">請輸入管理密碼</label>
        <input id="protectedPassword" type="password" autoComplete="current-password" autoFocus required value={password} onChange={event => setPassword(event.target.value)} className="mt-2 min-h-14 w-full rounded-2xl border-2 border-[#d9d0ff] bg-[#fcfbff] px-4 text-lg tracking-[.18em] outline-none focus:border-[#8b7cff] focus:ring-4 focus:ring-[#8b7cff]/15"/>
        <p className="mt-2 text-left text-xs font-bold text-[#817495]">密碼會以圓點遮蔽，不會顯示在畫面上。</p>
        <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={() => { setProtectedAction(null); setPassword(""); }} className="min-h-12 rounded-2xl border-2 border-[#d7e4ea] bg-white font-black text-[#5a6570]">取消</button><button type="submit" className="min-h-12 rounded-2xl bg-[linear-gradient(90deg,#e64532,#c63042,#146b8c)] font-black text-white shadow-[0_5px_0_#153957]">確認</button></div>
      </form>
    </div>}
  </main>;
}
