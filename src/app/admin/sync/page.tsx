"use client";
// /admin/sync — Merr's "sync now" button. After editing products or prices in
// Notion, one click pushes the changes to Stripe (the same sync the cron runs,
// just immediately) and shows what changed. Password-protected; see
// src/lib/adminAuth.ts. Linked from the top of the Notion Shop Items database.
import { useState, useEffect, FormEvent } from "react";
import type { ReconcileReport } from "@/lib/reconcile";

const prose = "font-sans";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 bg-merrbakes-berry text-white rounded-full px-6 py-3 text-xl font-bold hover:opacity-85 transition shadow-sm disabled:opacity-60";

function dollars(cents: number | null): string {
  return cents == null ? "?" : `$${(cents / 100).toFixed(2)}`;
}

function Section({ title, items, tone = "normal" }: { title: string; items: string[]; tone?: "normal" | "warn" | "error" }) {
  if (items.length === 0) return null;
  const color = tone === "error" ? "border-red-400 bg-red-50" : tone === "warn" ? "border-merrbakes-yellow bg-merrbakes-yellow/30" : "border-merrbakes-brown/15 bg-white";
  return (
    <div className={`rounded-2xl border-2 p-5 ${color}`}>
      <div className="text-xl font-bold">{title}</div>
      <ul className={`${prose} mt-2 flex flex-col gap-1 text-base`}>
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}

export default function AdminSyncPage() {
  // undefined = still checking whether this browser is signed in
  const [authed, setAuthed] = useState<boolean | undefined>(undefined);
  const [configured, setConfigured] = useState(true);
  useEffect(() => {
    fetch("/api/admin/sync", { cache: "no-store" })
      .then((res) => res.json())
      .then((d) => { setAuthed(!!d.authed); setConfigured(d.configured !== false); })
      .catch(() => setAuthed(false));
  }, []);

  const [password, setPassword] = useState("");
  const [loginState, setLoginState] = useState<"idle" | "checking" | "wrong">("idle");
  async function login(e: FormEvent) {
    e.preventDefault();
    setLoginState("checking");
    const res = await fetch("/api/admin/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", password }),
    }).catch(() => null);
    if (res?.ok) {
      setAuthed(true);
      setPassword("");
      setLoginState("idle");
    } else {
      setLoginState("wrong");
    }
  }

  const [syncState, setSyncState] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [report, setReport] = useState<ReconcileReport | null>(null);
  const [syncError, setSyncError] = useState("");
  async function sync() {
    setSyncState("syncing");
    setReport(null);
    setSyncError("");
    try {
      const res = await fetch("/api/admin/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      const d = await res.json();
      if (res.status === 401) { setAuthed(false); setSyncState("idle"); return; }
      if (!res.ok) throw new Error(d.message || d.error || "sync failed");
      setReport(d.report);
      setSyncState("done");
    } catch (err) {
      setSyncError((err as Error).message);
      setSyncState("error");
    }
  }

  const nothingChanged = report
    && report.stripePricesUpdated.length === 0 && report.stripePricesCreated.length === 0
    && report.variantsCreated.length === 0 && report.fulfillmentRowsCreated.length === 0
    && report.defaultsFixed.length === 0 && (report.chargesSkipped ?? []).length === 0;

  return (
    <main className="min-h-screen bg-merrbakes-pink text-merrbakes-brown font-hand">
      <div className="max-w-2xl mx-auto px-5 py-16">
        <h1 className="text-4xl font-black text-merrbakes-berry">sync the shop</h1>
        <p className={`${prose} text-lg text-merrbakes-brown/75 mt-2`}>
          Changed a product or price in Notion? Sync to update checkout right away.
          (It also syncs automatically every hour.)
        </p>

        <div className="mt-8">
          {authed === undefined ? (
            <div className="h-14 w-48 rounded-full bg-white/60 animate-pulse" />
          ) : !configured ? (
            <p className={`${prose} text-lg`}>The sync password hasn&apos;t been set up on the server yet.</p>
          ) : !authed ? (
            <form onSubmit={login} className="flex flex-col sm:flex-row gap-3 max-w-md">
              <input type="password" required autoFocus value={password} placeholder="password" autoComplete="current-password"
                     onChange={(e) => { setPassword(e.target.value); setLoginState("idle"); }}
                     className={`${prose} flex-1 rounded-full px-5 py-3 text-lg bg-white border border-merrbakes-brown/20 outline-none focus:ring-4 focus:ring-merrbakes-yellow`} />
              <button type="submit" disabled={loginState === "checking"} className={btnPrimary}>
                {loginState === "checking" ? "checking…" : "sign in"}
              </button>
              {loginState === "wrong" && <p className={`${prose} text-merrbakes-berry text-base sm:basis-full`}>That password didn&apos;t work.</p>}
            </form>
          ) : (
            <button type="button" onClick={sync} disabled={syncState === "syncing"} className={`${btnPrimary} ${syncState === "syncing" ? "animate-pulse" : ""}`}>
              {syncState === "syncing" ? "syncing… (this can take a minute)" : "🔄 sync now"}
            </button>
          )}
        </div>

        {syncState === "error" && (
          <div className="mt-8">
            <Section title="The sync didn't finish" items={[syncError]} tone="error" />
          </div>
        )}

        {report && (
          <div className="mt-8 flex flex-col gap-4">
            {nothingChanged && <div className="rounded-2xl border-2 border-merrbakes-brown/15 bg-white p-5 text-xl font-bold">✓ everything was already in sync</div>}
            <Section title="Prices changed" items={report.stripePricesUpdated.map((u) => `${u.variant}: ${dollars(u.oldCents)} → ${dollars(u.newCents)}`)} />
            <Section title="New items added to checkout" items={report.stripePricesCreated.map((c) => c.variant)} />
            <Section title="Missing option rows created" items={report.variantsCreated} />
            <Section title="Fulfillment rows created" items={report.fulfillmentRowsCreated} />
            <Section title="Default option set" items={report.defaultsFixed} />
            <Section title="Membership charges skipped (cookie club week / breaks)" items={report.chargesSkipped ?? []} />
            <Section title="Needs a look in Notion" items={report.flagged} tone="warn" />
            <Section title="Couldn't sync" items={report.errors} tone="error" />
          </div>
        )}
      </div>
    </main>
  );
}
