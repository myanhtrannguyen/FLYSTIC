import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  COLLECTION_POINTS,
  getStationFillKg,
  getStationFillPercent,
  getLocalizedCollectionPoint,
  getTransactionStatus,
  localeToNumberFormat,
  PLASTIC_ICON,
  PLASTIC_SHORT,
  type PlasticType,
  useTranslation,
  useYoha,
} from "@/lib/yoha-store";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { emptyCollectionPoint, state, isRemote } = useYoha();
  const { t } = useTranslation();
  const [handoverMessage, setHandoverMessage] = useState<string | null>(null);
  const stationName = state.user?.collectionPoint ?? COLLECTION_POINTS[0].name;
  const station =
    COLLECTION_POINTS.find((point) => point.name === stationName) ?? COLLECTION_POINTS[0];
  const stationTransactions = state.transactions.filter(
    (transaction) => transaction.collectionPoint === station.name,
  );
  const recentConfirmed = stationTransactions.filter(
    (transaction) =>
      getTransactionStatus(transaction) === "confirmed" &&
      Date.now() - (transaction.confirmedAt ?? transaction.createdAt) < 86_400_000 * 7,
  );
  const totalKg = recentConfirmed.reduce((sum, transaction) => sum + transaction.weightKg, 0);
  const totalPoints = recentConfirmed.reduce((sum, transaction) => sum + transaction.points, 0);
  const pendingCount = stationTransactions.filter(
    (transaction) => getTransactionStatus(transaction) === "pending",
  ).length;
  const remoteStation = state.stations.find((item) => item.id === station.id);
  const stationFillKg = isRemote
    ? (remoteStation?.filledKg ?? 0)
    : getStationFillKg(state.transactions, state.collectionRuns, station.name);
  const stationFillPercent = isRemote
    ? (remoteStation?.fillPercent ?? 0)
    : getStationFillPercent(state.transactions, state.collectionRuns, station);

  const TYPES: PlasticType[] = ["PET", "HDPE", "PP", "LDPE", "PS"];
  const byType = TYPES.map((k) => ({
    k,
    v: recentConfirmed.reduce(
      (sum, transaction) =>
        sum +
        transaction.items
          .filter((item) => item.plasticType === k)
          .reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    ),
  }));
  const maxType = Math.max(1, ...byType.map((b) => b.v));

  async function recordHandover() {
    try {
      const run = await emptyCollectionPoint(station.name);
      setHandoverMessage(
        run
          ? t("adminStationEmptySuccess", { weight: run.weightKg.toFixed(2) })
          : t("adminStationEmptyEmpty"),
      );
    } catch {
      setHandoverMessage(t("adminStationEmptyEmpty"));
    }
  }

  return (
    <div className="p-6 lg:p-10">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("adminStation", { station: getLocalizedCollectionPoint(station, t).name })}
          </p>
          <h1 className="mt-1 text-3xl font-bold">{t("adminDashboardTitle")}</h1>
        </div>
        <Link
          to="/admin/new"
          className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-pop)]"
        >
          ➕ {t("adminCreateTransaction")}
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label={t("adminCollectedWeek")}
          value={`${totalKg.toFixed(1)} kg`}
          trend={t("adminTrendThisWeek")}
          tone="text-primary"
        />
        <KpiCard
          label={t("adminTransactions")}
          value={String(recentConfirmed.length)}
          trend={t("adminTrendThisWeek")}
          tone="text-foreground"
        />
        <KpiCard
          label={t("adminPointsOut")}
          value={totalPoints.toLocaleString(localeToNumberFormat(state.locale))}
          trend={t("adminTrendThisWeek")}
          tone="text-ocean"
        />
        <KpiCard
          label={t("adminPending")}
          value={String(pendingCount)}
          trend={t("adminTrendActive")}
          tone="text-coral"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-3xl border border-border bg-card p-6 lg:col-span-2">
          <h2 className="text-base font-bold">{t("adminPlasticBreakdown")}</h2>
          <div className="mt-6 space-y-4">
            {byType.map((b) => (
              <div key={b.k}>
                <div className="flex justify-between text-xs font-semibold">
                  <span>
                    {PLASTIC_ICON[b.k]} {PLASTIC_SHORT[b.k]}
                  </span>
                  <span className="text-muted-foreground">{b.v.toFixed(2)} kg</span>
                </div>
                <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: (b.v / maxType) * 100 + "%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="text-base font-bold">{t("adminCapacity")}</h2>
          <ul className="mt-4 space-y-3">
            <li>
              <div className="flex justify-between gap-3 text-xs font-semibold">
                <span>{station.name}</span>
                <span className={stationFillPercent > 80 ? "text-coral" : "text-muted-foreground"}>
                  {stationFillPercent}%
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full ${stationFillPercent > 80 ? "bg-coral" : "bg-primary"}`}
                  style={{ width: `${stationFillPercent}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {t("adminStationFillDetail", {
                  filled: stationFillKg.toFixed(2),
                  capacity: station.capacityKg,
                  percent: stationFillPercent,
                })}
              </p>
              <button
                type="button"
                onClick={recordHandover}
                className="mt-3 w-full rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-bold text-primary"
              >
                {t("adminStationEmpty")}
              </button>
              <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                {handoverMessage ?? t("adminStationEmptyHint")}
              </p>
            </li>
          </ul>
        </section>
      </div>

      <section className="mt-6 rounded-3xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-base font-bold">{t("adminRecent")}</h2>
          <Link to="/admin/transactions" className="text-xs font-semibold text-primary">
            {t("adminSeeAll")}
          </Link>
        </div>
        <ul className="divide-y divide-border">
          {stationTransactions.slice(0, 6).map((tx) => (
            <li key={tx.id} className="flex items-center gap-4 p-4">
              <div className="grid size-10 place-items-center rounded-full bg-secondary text-lg">
                ♻️
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {tx.userName ?? t("adminAwaitingStudent")} · {tx.totalQuantity.toFixed(2)} kg
                </p>
                <p className="text-xs text-muted-foreground">
                  {tx.collectionPoint} ·{" "}
                  {tx.items
                    .map((i) => `${PLASTIC_SHORT[i.plasticType]}×${i.quantity} kg`)
                    .join(" · ")}
                </p>
              </div>
              <StatusBadge status={getTransactionStatus(tx)} />
              <p className="w-20 text-right font-bold text-primary">+{tx.points}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  trend,
  tone,
}: {
  label: string;
  value: string;
  trend: string;
  tone: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{trend}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const map: Record<string, string> = {
    confirmed: "bg-primary/15 text-primary",
    pending: "bg-sunshine/30 text-foreground",
    expired: "bg-muted text-muted-foreground",
    cancelled: "bg-coral/15 text-coral",
  };
  const label: Record<string, string> = {
    confirmed: t("adminTransactionConfirmed"),
    pending: t("adminTransactionPending"),
    expired: t("adminTransactionExpired"),
    cancelled: t("adminTransactionCancelled"),
  };
  return (
    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${map[status]}`}>
      {label[status]}
    </span>
  );
}
