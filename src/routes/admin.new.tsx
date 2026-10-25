import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Check, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  useTranslation,
  useYoha,
  calculatePoints,
  localeToNumberFormat,
  PLASTIC_LABELS,
  PLASTIC_SHORT,
  PLASTIC_BASE,
  PLASTIC_ICON,
  CLEAN_LABELS,
  CLEAN_SHORT,
  CLEAN_MULT,
  COLLECTION_POINTS,
  getLocalizedCollectionPoint,
  getTransactionStatus,
  type PlasticType,
  type Cleanliness,
  type Transaction,
} from "@/lib/yoha-store";

export const Route = createFileRoute("/admin/new")({
  component: NewTransaction,
});

type Line = { plasticType: PlasticType; quantity: number; cleanliness: Cleanliness };

const ALL_TYPES: PlasticType[] = ["PET", "HDPE", "PP", "LDPE", "PS"];
const KG_STEP = 0.1;
const roundKg = (value: number) => Math.round(value * 100) / 100;

function NewTransaction() {
  const { t } = useTranslation();
  const { state, createTransaction, cancelTransaction, getTransaction, isRemote } = useYoha();
  const [lines, setLines] = useState<Line[]>([
    { plasticType: "PET", quantity: 1, cleanliness: "CLEAN" },
  ]);
  const [collectionPoint, setCollectionPoint] = useState(
    state.user?.collectionPoint || COLLECTION_POINTS[0].name,
  );
  const [active, setActive] = useState<Transaction | null>(null);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!active) return;
    const fresh = state.transactions.find((x) => x.id === active.id);
    if (fresh && fresh.status === "confirmed") setActive(fresh);
  }, [state.transactions, active]);

  useEffect(() => {
    if (!isRemote || !active?.token || getTransactionStatus(active) !== "pending") return;
    const poll = window.setInterval(() => {
      void getTransaction(active.token)
        .then((transaction) => {
          if (transaction) setActive(transaction);
        })
        .catch(() => undefined);
    }, 3_000);
    return () => window.clearInterval(poll);
  }, [active, getTransaction, isRemote]);

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((l) => l.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function addLine() {
    const used = new Set(lines.map((l) => l.plasticType));
    const next = ALL_TYPES.find((t) => !used.has(t)) ?? "PET";
    setLines((l) => [...l, { plasticType: next, quantity: 1, cleanliness: "CLEAN" }]);
  }
  function removeLine(i: number) {
    setLines((l) => (l.length === 1 ? l : l.filter((_, idx) => idx !== i)));
  }

  const lineTotals = lines.map((l) => calculatePoints(l.quantity, l.plasticType, l.cleanliness));
  const totalPoints = lineTotals.reduce((s, n) => s + n, 0);
  const totalQty = roundKg(lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0));
  const canSubmit = totalQty > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setCreateError(null);
    setIsCreating(true);
    try {
      const tx = await createTransaction({ items: lines, collectionPoint });
      setActive(tx);
    } catch (cause) {
      setCreateError(cause instanceof Error ? cause.message : t("scanConfirmFail"));
    } finally {
      setIsCreating(false);
    }
  }

  function reset() {
    if (active && active.status === "pending") void cancelTransaction(active.id);
    setActive(null);
    setCopied(false);
  }

  async function copyToken() {
    if (!active) return;
    await navigator.clipboard.writeText(active.token);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (active) {
    const remaining = Math.max(0, Math.floor((active.expiresAt - now) / 1000));
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    const currentStatus = getTransactionStatus(active, now);
    const confirmed = currentStatus === "confirmed";
    const expired = currentStatus === "expired";

    return (
      <div className="p-6 lg:p-10">
        <Link to="/admin/new" onClick={reset} className="text-sm font-medium text-muted-foreground">
          ← {t("adminCreateAnotherTransaction")}
        </Link>
        <div className="mx-auto mt-6 grid max-w-3xl gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-8 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t("adminQrHeader")}
            </p>
            <div className="mt-6 inline-block rounded-2xl border-4 border-foreground/10 bg-white p-4">
              <QRCodeSVG
                value={active.token}
                size={240}
                level="M"
                marginSize={3}
                title={`FLYSTIC token ${active.token}`}
                fgColor="#0f1d14"
                bgColor="#ffffff"
              />
            </div>
            {!confirmed && !expired && (
              <p className="mt-6 font-mono text-2xl font-bold">
                {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
              </p>
            )}
            {!confirmed && !expired && (
              <p className="text-xs text-muted-foreground">{t("adminTokenExpiresIn")}</p>
            )}
            {expired && (
              <p className="mt-6 text-lg font-bold text-coral">{t("adminTokenExpired")}</p>
            )}
            {confirmed && (
              <div className="mt-6">
                <p className="text-4xl">✅</p>
                <p className="mt-2 text-lg font-bold text-primary">{t("adminStudentConfirmed")}</p>
                <p className="text-sm text-muted-foreground">
                  {active.userName} ·{" "}
                  {new Date(active.confirmedAt!).toLocaleTimeString(
                    localeToNumberFormat(state.locale),
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <h3 className="font-bold">{t("adminTransactionDetails")}</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <Row
                label={t("adminTransactionToken")}
                value={
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="rounded-lg bg-secondary px-2 py-1 font-mono text-xs tracking-wider">
                      {active.token}
                    </span>
                    <button
                      type="button"
                      onClick={copyToken}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-bold text-foreground hover:border-primary hover:text-primary"
                    >
                      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      {copied ? t("copied") : t("copy")}
                    </button>
                  </div>
                }
              />
              <Row label={t("adminTransactionStation")} value={active.collectionPoint} />
              <Row
                label={t("adminTransactionTypeCount")}
                value={`${active.items.length} ${t("adminTypes")} · ${active.totalQuantity.toFixed(2)} kg`}
              />
              <Row
                label={t("adminTransactionWeightEstimate")}
                value={`${active.weightKg.toFixed(2)} kg`}
              />
              <Row
                label={t("adminTransactionTotalPoints")}
                value={<span className="font-bold text-primary">+{active.points}</span>}
              />
              <Row
                label={t("adminTransactionStatus")}
                value={<StatusPill status={currentStatus} />}
              />
            </dl>
            <div className="mt-4 space-y-2 rounded-2xl bg-secondary/50 p-3">
              {active.items.map((it, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span>
                    {PLASTIC_ICON[it.plasticType]} <b>{PLASTIC_SHORT[it.plasticType]}</b> ×{" "}
                    {it.quantity} kg · {CLEAN_SHORT[it.cleanliness]}
                  </span>
                  <span className="font-bold text-primary">+{it.points}</span>
                </div>
              ))}
            </div>

            {!confirmed && (
              <button
                onClick={reset}
                className="mt-6 w-full rounded-xl border border-coral/30 bg-coral/10 py-3 text-sm font-bold text-coral"
              >
                {t("adminCancelTransaction")}
              </button>
            )}
            {confirmed && (
              <Link
                to="/admin/new"
                onClick={reset}
                className="mt-6 block rounded-xl bg-primary py-3 text-center text-sm font-bold text-primary-foreground"
              >
                {t("adminCreateAnotherTransaction")}
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10">
      <h1 className="text-3xl font-bold">{t("adminNewTransactionTitle")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("adminNewTransactionDescription")}</p>

      <form onSubmit={submit} className="mx-auto mt-6 grid max-w-5xl gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-3xl border border-border bg-card p-6">
            <Label>{t("adminCollectionPoint")}</Label>
            <select
              value={collectionPoint}
              onChange={(e) => setCollectionPoint(e.target.value)}
              className="mt-2 w-full rounded-xl bg-secondary p-3 ring-1 ring-border focus:outline-none focus:ring-primary"
            >
              {COLLECTION_POINTS.map((p) => (
                <option key={p.id} value={p.name}>
                  {getLocalizedCollectionPoint(p, t).name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {lines.map((line, i) => {
              const pts = lineTotals[i];
              return (
                <div
                  key={i}
                  className="rounded-3xl border border-border bg-card p-5 animate-fade-in"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {t("adminLineNumber", { number: i + 1 })}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      disabled={lines.length === 1}
                      className="text-xs font-semibold text-coral disabled:opacity-30"
                    >
                      {t("adminDeleteLine")}
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {ALL_TYPES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => updateLine(i, { plasticType: p })}
                        className={`rounded-xl border p-2 text-center text-xs font-bold transition ${line.plasticType === p ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary"}`}
                      >
                        <div className="text-lg">{PLASTIC_ICON[p]}</div>
                        <div>{p}</div>
                        <div className="text-[10px] font-normal text-muted-foreground">
                          {PLASTIC_BASE[p]}đ/đv
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>{t("adminQuantityUnits")}</Label>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateLine(i, {
                              quantity: Math.max(0, roundKg(line.quantity - KG_STEP)),
                            })
                          }
                          className="size-10 rounded-xl bg-secondary text-lg font-bold"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={0.01}
                          max={200}
                          step={0.01}
                          inputMode="decimal"
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(i, {
                              quantity: Math.min(
                                200,
                                Math.max(0, roundKg(Number(e.target.value) || 0)),
                              ),
                            })
                          }
                          className="w-full rounded-xl bg-secondary p-2 text-center text-xl font-bold ring-1 ring-border focus:outline-none focus:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateLine(i, {
                              quantity: Math.min(200, roundKg(line.quantity + KG_STEP)),
                            })
                          }
                          className="size-10 rounded-xl bg-secondary text-lg font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label>{t("adminCondition")}</Label>
                      <div className="mt-2 grid grid-cols-3 gap-1.5">
                        {(["CLEAN", "NORMAL", "DIRTY"] as Cleanliness[]).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => updateLine(i, { cleanliness: c })}
                            className={`rounded-xl border p-2 text-[11px] font-bold transition ${line.cleanliness === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary"}`}
                          >
                            {CLEAN_SHORT[c]}
                            <br />
                            <span className="text-[9px] font-normal opacity-70">
                              ×{CLEAN_MULT[c]}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-xl bg-primary/5 px-3 py-2 text-xs">
                    <span className="text-muted-foreground">
                      {line.quantity} kg × {PLASTIC_BASE[line.plasticType]} ×{" "}
                      {CLEAN_MULT[line.cleanliness]}
                    </span>
                    <span className="font-bold text-primary">
                      +{pts} {t("studentPoints")}
                    </span>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={addLine}
              className="w-full rounded-2xl border-2 border-dashed border-border bg-card/50 py-4 text-sm font-bold text-muted-foreground hover:border-primary hover:text-primary"
            >
              {t("adminAddOtherType")}
            </button>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-3xl bg-gradient-to-br from-primary/15 to-leaf/10 p-6 ring-1 ring-primary/20">
            <p className="text-xs font-semibold uppercase text-primary">
              {t("adminEstimatedPointsHeader")}
            </p>
            <p className="mt-2 text-5xl font-bold text-foreground">+{totalPoints}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {lines.length} {t("adminTypes")} · {totalQty.toFixed(2)} kg
            </p>
          </div>
          <button
            type="submit"
            disabled={!canSubmit || isCreating}
            className="w-full rounded-xl bg-foreground py-4 text-sm font-bold text-background disabled:opacity-40"
          >
            {isCreating ? t("authSubmitting") : t("adminQrCreateButton")}
          </button>
          {createError && (
            <p className="text-center text-xs font-medium text-coral">{createError}</p>
          )}
          <p className="text-center text-xs text-muted-foreground">{t("adminQrExpirationNote")}</p>
          <div className="rounded-2xl bg-secondary/60 p-4 text-[11px] text-muted-foreground">
            <p className="font-bold text-foreground">{t("adminPointsFormulaLabel")}</p>
            <p className="mt-1">{t("adminPointsFormulaDetail")}</p>
          </div>
        </aside>
      </form>
    </div>
  );
}

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <label
      className={`block text-xs font-bold uppercase tracking-wider text-muted-foreground ${className}`}
    >
      {children}
    </label>
  );
}
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}
function StatusPill({ status }: { status: string }) {
  const { t } = useTranslation();
  const map: Record<string, [string, string]> = {
    pending: ["bg-sunshine/30 text-foreground", t("adminTransactionPending")],
    confirmed: ["bg-primary/15 text-primary", t("adminTransactionConfirmed")],
    expired: ["bg-muted text-muted-foreground", t("adminTransactionExpired")],
    cancelled: ["bg-coral/15 text-coral", t("adminTransactionCancelled")],
  };
  const [cls, label] = map[status];
  return (
    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${cls}`}>{label}</span>
  );
}
