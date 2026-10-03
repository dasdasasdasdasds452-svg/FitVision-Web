"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/context/LanguageContext";
import {
    BoardRow,
    CODE_RE,
    FriendProfile,
    FriendsAvailability,
    addFriend,
    friendsAvailability,
    loadBoard,
    normalizeCode,
    publishMyStats,
    rankBoard,
    removeFriend,
} from "@/lib/friends";

type Notice = { tone: "ok" | "warn"; text: string } | null;

export default function FriendsPage() {
    const { t } = useLanguage();
    const f = t.friends;
    const [avail, setAvail] = useState<FriendsAvailability | null>(null);
    const [me, setMe] = useState<FriendProfile | null>(null);
    const [rows, setRows] = useState<BoardRow[] | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState<Notice>(null);
    const [copied, setCopied] = useState(false);
    const [armedRemove, setArmedRemove] = useState<string | null>(null);

    const refresh = useCallback(async (userId: string) => {
        const profiles = await loadBoard(userId);
        if (!profiles) {
            setLoadFailed(true);
            return;
        }
        setLoadFailed(false);
        setRows(rankBoard(profiles, userId));
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const a = await friendsAvailability();
            if (cancelled) return;
            setAvail(a);
            if (a.status !== "ok") return;
            const profile = await publishMyStats();
            if (cancelled) return;
            setMe(profile);
            if (!profile) setLoadFailed(true);
            await refresh(a.userId);
        })();
        return () => {
            cancelled = true;
        };
    }, [refresh]);

    useEffect(() => {
        if (!armedRemove) return;
        const id = setTimeout(() => setArmedRemove(null), 3000);
        return () => clearTimeout(id);
    }, [armedRemove]);

    const onAdd = async (e: FormEvent) => {
        e.preventDefault();
        if (!avail || avail.status !== "ok" || busy) return;
        const clean = normalizeCode(code);
        if (!CODE_RE.test(clean)) {
            setNotice({ tone: "warn", text: f.invalid });
            return;
        }
        setBusy(true);
        setNotice(null);
        const r = await addFriend(clean);
        setBusy(false);
        if (r.status === "added") {
            setNotice({ tone: "ok", text: f.added.replace("{name}", r.name) });
            setCode("");
            await refresh(avail.userId);
        } else if (r.status === "already") {
            setNotice({ tone: "ok", text: f.already.replace("{name}", r.name) });
        } else {
            const text = r.status === "not_found" ? f.notFound : r.status === "self" ? f.self : r.status === "invalid" ? f.invalid : f.failed;
            setNotice({ tone: "warn", text });
        }
    };

    const onRemove = async (row: BoardRow) => {
        if (!avail || avail.status !== "ok") return;
        if (armedRemove !== row.userId) {
            setArmedRemove(row.userId);
            return;
        }
        setArmedRemove(null);
        if (await removeFriend(row.userId)) await refresh(avail.userId);
        else setNotice({ tone: "warn", text: f.failed });
    };

    const copyCode = async () => {
        if (!me) return;
        try {
            await navigator.clipboard.writeText(me.friend_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* clipboard blocked */
        }
    };

    const shareCode = async () => {
        if (!me) return;
        const text = f.shareText.replace("{code}", me.friend_code);
        try {
            if (navigator.share) await navigator.share({ text });
            else {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        } catch {
            /* cancelled */
        }
    };

    const friendsCount = rows ? rows.filter((r) => !r.isMe).length : 0;

    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto w-full px-4 md:px-8 py-6 flex flex-col gap-6 pb-16">
                <header>
                    <h1 className="text-2xl md:text-3xl font-semibold text-white">{f.title}</h1>
                    <p className="text-slate-300 mt-1">{f.subtitle}</p>
                </header>

                {avail === null && <p className="text-slate-400" role="status">{f.loading}</p>}

                {avail && avail.status !== "ok" && (
                    <section className="rounded-3xl p-6 bg-surface-dark border border-white/10 flex flex-col items-start gap-3">
                        <span className="material-symbols-outlined text-4xl text-slate-500">{avail.status === "not_configured" ? "cloud_off" : "group"}</span>
                        <h2 className="text-lg font-semibold text-white">{avail.status === "not_configured" ? f.notConfigured : f.needAccount}</h2>
                        <p className="text-slate-300">{avail.status === "not_configured" ? f.notConfiguredDesc : f.needAccountDesc}</p>
                    </section>
                )}

                {avail?.status === "ok" && (
                    <>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {/* My code */}
                            <section aria-labelledby="code-h" className="rounded-3xl p-5 bg-primary/10 border border-primary/30 flex flex-col gap-3">
                                <h2 id="code-h" className="text-sm font-medium text-primary">{f.myCode}</h2>
                                <p className="text-4xl font-bold tracking-[0.25em] text-white tabular-nums font-mono" aria-live="polite">
                                    {me ? me.friend_code : "······"}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={copyCode}
                                        disabled={!me}
                                        className="h-11 px-4 rounded-xl bg-primary text-background-dark font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                        <span className="material-symbols-outlined text-lg">{copied ? "check" : "content_copy"}</span>
                                        {copied ? f.copied : f.copy}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={shareCode}
                                        disabled={!me}
                                        className="h-11 px-4 rounded-xl border border-white/20 text-white font-semibold flex items-center gap-2 cursor-pointer hover:bg-white/5 disabled:opacity-50"
                                    >
                                        <span className="material-symbols-outlined text-lg">ios_share</span>
                                        {f.share}
                                    </button>
                                </div>
                            </section>

                            {/* Add a friend */}
                            <section aria-labelledby="add-h" className="rounded-3xl p-5 bg-surface-dark border border-white/10 flex flex-col gap-3">
                                <h2 id="add-h" className="text-sm font-medium text-slate-300">{f.addTitle}</h2>
                                <form onSubmit={onAdd} className="flex gap-2">
                                    <label htmlFor="friend-code" className="sr-only">{f.addLabel}</label>
                                    <input
                                        id="friend-code"
                                        value={code}
                                        onChange={(e) => setCode(normalizeCode(e.target.value))}
                                        placeholder={f.addPlaceholder}
                                        autoComplete="off"
                                        autoCapitalize="characters"
                                        spellCheck={false}
                                        className="flex-1 min-w-0 h-12 bg-white/[0.04] border border-white/15 rounded-xl px-4 text-white text-lg tracking-[0.2em] font-mono uppercase placeholder:text-slate-500 placeholder:tracking-normal placeholder:text-base focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                    />
                                    <button
                                        type="submit"
                                        disabled={busy || code.length < 6}
                                        className="h-12 px-5 rounded-xl bg-white text-background-dark font-semibold cursor-pointer disabled:opacity-40"
                                    >
                                        {f.add}
                                    </button>
                                </form>
                                <p role="status" aria-live="polite" className={`text-sm min-h-5 ${notice?.tone === "warn" ? "text-orange-300" : "text-primary"}`}>
                                    {notice?.text ?? ""}
                                </p>
                            </section>
                        </div>

                        {/* Weekly board */}
                        <section aria-labelledby="board-h" className="flex flex-col gap-3">
                            <div className="flex items-baseline justify-between gap-3">
                                <h2 id="board-h" className="text-lg font-semibold text-white">{f.boardTitle}</h2>
                                <p className="text-xs text-slate-400">{f.boardNote}</p>
                            </div>
                            {loadFailed && <p className="text-sm text-orange-300">{f.failed}</p>}
                            {rows === null && !loadFailed && <p className="text-slate-400" role="status">{f.loading}</p>}
                            {rows && (
                                <ol className="rounded-2xl border border-white/10 bg-surface-dark divide-y divide-white/5">
                                    {rows.map((r, i) => (
                                        <li key={r.userId} className={`flex items-center gap-3 px-4 py-3 ${r.isMe ? "bg-primary/[0.06]" : ""}`}>
                                            <span className={`w-7 text-center font-bold tabular-nums ${i === 0 && r.days > 0 ? "text-primary" : "text-slate-400"}`}>{i + 1}</span>
                                            <span className="size-10 rounded-full bg-white/10 flex items-center justify-center font-semibold text-white shrink-0" aria-hidden="true">
                                                {r.name.slice(0, 1).toUpperCase()}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-white truncate">
                                                    {r.name}
                                                    {r.isMe && <span className="ml-2 text-xs font-medium text-primary">({f.you})</span>}
                                                </p>
                                                <p className="text-sm text-slate-400 tabular-nums">
                                                    {r.days} {f.days} · {r.sets} {f.sets}
                                                    {r.avg !== null && <> · {f.form} {r.avg}%</>}
                                                </p>
                                            </div>
                                            {r.streak >= 2 && (
                                                <span className="hidden sm:inline-flex items-center gap-1 text-sm text-orange-300 shrink-0">
                                                    <span className="material-symbols-outlined filled text-base">local_fire_department</span>
                                                    {f.streak.replace("{n}", String(r.streak))}
                                                </span>
                                            )}
                                            {!r.isMe && (
                                                <button
                                                    type="button"
                                                    onClick={() => onRemove(r)}
                                                    aria-label={`${armedRemove === r.userId ? f.removeConfirm : f.remove} ${r.name}`}
                                                    className={`h-9 px-3 rounded-lg text-xs font-semibold border shrink-0 cursor-pointer ${armedRemove === r.userId ? "bg-orange-500 text-black border-orange-400" : "border-white/15 text-slate-300 hover:bg-white/5"}`}
                                                >
                                                    {armedRemove === r.userId ? f.removeConfirm : f.remove}
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ol>
                            )}
                            {rows && friendsCount === 0 && <p className="text-sm text-slate-300">{f.empty}</p>}
                        </section>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
