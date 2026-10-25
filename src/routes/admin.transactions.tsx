import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  CLEAN_SHORT,
  getLocalizedCollectionPoint,
  getTransactionStatus,
  localeToNumberFormat,
  PLASTIC_ICON,
  PLASTIC_SHORT,
  useTranslation,
  useYoha,
} from "@/lib/yoha-store";

export const Route = createFileRoute("/admin/transactions")({
  component: TransactionsPage,
});

const STATUS_OPTIONS = ["all", "confirmed", "pending", "expired", "cancelled"] as const;

function TransactionsPage() {
  const { state } = useYoha();
  const { t } = useTranslation();
  const STATUS_LABEL: Record<string, string> = {
    all: t("adminStatusAll"),
    confirmed: t("adminTransactionConfirmed"),
    pending: t("adminTransactionPending"),
    expired: t("adminTransactionExpired"),
    cancelled: t("adminTransactionCancelled"),
  };
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [q, setQ] = useState("");

  const stationTransactions = state.transactions.filter(
    (transaction) => transaction.collectionPoint === state.user?.collectionPoint,
  );
  const filtered = stationTransactions.filter((t) => {
    const transactionStatus = getTransactionStatus(t);
    if (status !== "all" && transactionStatus !== status) return false;
    if (
      q &&
      !(t.userName || "").toLowerCase().includes(q.toLowerCase()) &&
      !t.collectionPoint.toLowerCase().includes(q.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="p-6 lg:p-10">
      <h1 className="text-3xl font-bold">{t("adminTransactionTitle")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("adminTransactionDescription")}</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold ring-1 ring-border ${status === s ? "bg-foreground text-background" : "bg-card"}`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("adminSearchPlaceholder")}
          className="ml-auto w-full max-w-xs rounded-full bg-card px-4 py-2 text-sm ring-1 ring-border focus:outline-none focus:ring-primary"
        />
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl border border-border bg-card">
        <div className="hidden grid-cols-12 gap-4 border-b border-border bg-secondary/50 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground md:grid">
          <div className="col-span-3">{t("adminTableStudent")}</div>
          <div className="col-span-2">{t("adminTableStation")}</div>
          <div className="col-span-4">{t("adminTableDetails")}</div>
          <div className="col-span-2">{t("adminTableStatus")}</div>
          <div className="col-span-1 text-right">{t("adminTablePoints")}</div>
        </div>
        <ul className="divide-y divide-border">
          {filtered.length === 0 && (
            <li className="p-10 text-center text-sm text-muted-foreground">
              {t("adminNoFilterResults")}
            </li>
          )}
          {filtered.map((transaction) => (
            <li key={transaction.id} className="grid grid-cols-12 gap-4 p-5">
              <div className="col-span-12 md:col-span-3">
                <p className="font-semibold">
                  {transaction.userName ?? (
                    <span className="text-muted-foreground">— {t("adminAwaitingStudent")}</span>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(transaction.createdAt).toLocaleString(
                    localeToNumberFormat(state.locale),
                  )}
                </p>
              </div>
              <div className="col-span-6 text-sm md:col-span-2">
                {getLocalizedCollectionPoint(transaction.collectionPoint, t).name}
              </div>
              <div className="col-span-12 md:col-span-4">
                <div className="flex flex-wrap gap-1">
                  {transaction.items.map((it, i) => (
                    <span key={i} className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">
                      {PLASTIC_ICON[it.plasticType]} {PLASTIC_SHORT[it.plasticType]} × {it.quantity}{" "}
                      kg · {CLEAN_SHORT[it.cleanliness]}
                    </span>
                  ))}
                </div>
              </div>
              <div className="col-span-6 md:col-span-2">
                <StatusPill status={getTransactionStatus(transaction)} />
              </div>
              <div className="col-span-6 text-right font-bold text-primary md:col-span-1">
                +{transaction.points}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {t("adminFooterShowing", { filtered: filtered.length, total: stationTransactions.length })}
      </p>
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
