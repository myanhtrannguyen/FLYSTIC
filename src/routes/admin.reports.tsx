import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  getTransactionStatus,
  localeToNumberFormat,
  PLASTIC_ICON,
  useTranslation,
  useYoha,
} from "@/lib/yoha-store";

export const Route = createFileRoute("/admin/reports")({
  component: ReportsPage,
});

const CO2_KG_PER_KG_PLASTIC = 2.5;
const DEMO_TRANSACTION_PREFIX = "demo-2026-";

const QUALITY_LABEL_KEYS = {
  CLEAN: "adminQualityClean",
  NORMAL: "adminQualityNormal",
  DIRTY: "adminQualityDirty",
} as const;

function escapeCsv(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function ReportsPage() {
  const { state } = useYoha();
  const { t } = useTranslation();
  const [downloaded, setDownloaded] = useState(false);
  const [view, setView] = useState<"demo" | "live">("demo");
  const stationName = state.user?.collectionPoint;
  const demoCampaign = state.demoCampaign;
  const showDemo = view === "demo" && Boolean(demoCampaign?.transactionCount);
  const since = Date.now() - 7 * 86_400_000;
  const confirmed = state.transactions.filter(
    (transaction) =>
      transaction.collectionPoint === stationName &&
      getTransactionStatus(transaction) === "confirmed" &&
      (showDemo
        ? transaction.id.startsWith(DEMO_TRANSACTION_PREFIX)
        : (transaction.confirmedAt ?? transaction.createdAt) >= since),
  );
  const liveTotalKg = confirmed.reduce((sum, transaction) => sum + transaction.weightKg, 0);
  const liveTotalPoints = confirmed.reduce((sum, transaction) => sum + transaction.points, 0);
  const liveParticipantCount = new Set(
    confirmed
      .map((transaction) => transaction.userId)
      .filter((userId): userId is string => userId !== null),
  ).size;
  const totalKg = showDemo ? (demoCampaign?.totalKg ?? 0) : liveTotalKg;
  const totalPoints = showDemo ? (demoCampaign?.totalPoints ?? 0) : liveTotalPoints;
  const participantCount = showDemo ? (demoCampaign?.participantCount ?? 0) : liveParticipantCount;

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const dayBars = days.map((date) => {
    const next = date.getTime() + 86_400_000;
    const kg = confirmed
      .filter((transaction) => {
        const recordedAt = transaction.confirmedAt ?? transaction.createdAt;
        return recordedAt >= date.getTime() && recordedAt < next;
      })
      .reduce((sum, transaction) => sum + transaction.weightKg, 0);
    return {
      label: date.toLocaleDateString(localeToNumberFormat(state.locale), { weekday: "short" }),
      kg,
    };
  });
  const maxBar = Math.max(1, ...dayBars.map((bar) => bar.kg));
  const leaderboard = Object.values(
    confirmed.reduce<Record<string, { name: string; points: number; kg: number }>>(
      (rows, transaction) => {
        if (!transaction.userId) return rows;
        const current = rows[transaction.userId] ?? {
          name: transaction.userName ?? "Sinh viên FLYSTIC",
          points: 0,
          kg: 0,
        };
        current.points += transaction.points;
        current.kg += transaction.weightKg;
        rows[transaction.userId] = current;
        return rows;
      },
      {},
    ),
  )
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);

  function downloadCsv() {
    const rows = [
      ["Mã giao dịch", "Thời gian xác nhận", "Sinh viên", "Trạm", "Khối lượng (kg)", "Điểm"],
      ...confirmed.map((transaction) => [
        transaction.id,
        new Date(transaction.confirmedAt ?? transaction.createdAt).toLocaleString(
          localeToNumberFormat(state.locale),
        ),
        transaction.userName ?? "",
        transaction.collectionPoint,
        transaction.weightKg.toFixed(2),
        transaction.points,
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(escapeCsv).join(",")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `flystic-${showDemo ? "demo-jun-jul-2026" : new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 2500);
  }

  return (
    <div className="p-6 lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t("adminReportsTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {showDemo ? t("adminReportDemoDescription") : t("adminReportsDescription")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold"
          >
            📄 {t("adminExportPdf")}
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold"
          >
            📊 {t("adminExportExcel")}
          </button>
        </div>
      </div>
      {downloaded && (
        <p className="mt-3 text-sm font-semibold text-primary">{t("adminReportCsvDownloaded")}</p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setView("demo")}
          disabled={!demoCampaign?.transactionCount}
          className={`rounded-xl px-4 py-2 text-sm font-bold ${showDemo ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}
        >
          {t("adminReportViewDemo")}
        </button>
        <button
          type="button"
          onClick={() => setView("live")}
          className={`rounded-xl px-4 py-2 text-sm font-bold ${!showDemo ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}
        >
          {t("adminReportViewLive")}
        </button>
      </div>

      {showDemo && (
        <div className="mt-4 rounded-2xl border border-sunshine/50 bg-sunshine/15 px-4 py-3 text-sm text-foreground">
          <span className="font-bold">⚠️ {t("adminReportDemoLabel")}</span>
          <span className="ml-2 text-muted-foreground">· 06–07/2026</span>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label={t("adminReportTotalWaste")}
          value={`${totalKg.toFixed(1)} kg`}
          sub="≈ "
          sub2={t("adminReportPetBottles", { count: Math.round(totalKg * 40) })}
        />
        <Kpi
          label={t("adminReportPointsIssued")}
          value={totalPoints.toLocaleString(localeToNumberFormat(state.locale))}
          sub={`${t("adminReportTotal")} `}
          sub2={`${confirmed.length} ${t("adminReportTransactions")}`}
        />
        {showDemo ? (
          <Kpi
            label={t("adminRegisteredStudents")}
            value={(demoCampaign?.registeredStudents ?? 0).toLocaleString(
              localeToNumberFormat(state.locale),
            )}
            sub=""
            sub2=""
          />
        ) : (
          <Kpi
            label={t("adminReportParticipants")}
            value={String(participantCount)}
            sub=""
            sub2=""
          />
        )}
        {showDemo ? (
          <Kpi
            label={t("adminFundraisingAllocation")}
            value={`${demoCampaign?.fundraisingPercent ?? 0}%`}
            sub=""
            sub2={t("adminDemoFundraisingDetail", {
              points: (demoCampaign?.fundraisingPoints ?? 0).toLocaleString(
                localeToNumberFormat(state.locale),
              ),
              total: totalPoints.toLocaleString(localeToNumberFormat(state.locale)),
            })}
          />
        ) : (
          <Kpi
            label={t("adminReportCo2Saved")}
            value={`${(totalKg * CO2_KG_PER_KG_PLASTIC).toFixed(1)} kg`}
            sub={t("adminReportEstimated")}
            sub2=""
          />
        )}
      </div>

      {showDemo ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Breakdown
            title={t("adminDemoBreakdown")}
            rows={demoCampaign?.byType ?? []}
            label={(row) =>
              `${PLASTIC_ICON[row.label as keyof typeof PLASTIC_ICON] ?? "♻️"} ${row.label}`
            }
          />
          <Breakdown
            title={t("adminDemoQuality")}
            rows={demoCampaign?.byQuality ?? []}
            label={(row) =>
              t(
                QUALITY_LABEL_KEYS[row.label as keyof typeof QUALITY_LABEL_KEYS] ??
                  "adminQualityNormal",
              )
            }
          />
        </div>
      ) : (
        <section className="mt-6 rounded-3xl border border-border bg-card p-6">
          <h2 className="text-base font-bold">{t("adminWeeklyCollectionByDay")}</h2>
          <div className="mt-6 flex h-48 items-end gap-3">
            {dayBars.map((bar) => (
              <div key={bar.label} className="flex flex-1 flex-col items-center gap-2">
                <div className="relative flex h-full w-full items-end">
                  <div
                    className="w-full rounded-t-xl bg-gradient-to-t from-primary to-primary-glow transition-all"
                    style={{ height: `${Math.max(4, (bar.kg / maxBar) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] font-semibold text-muted-foreground">{bar.label}</p>
                <p className="text-[10px] text-muted-foreground">{bar.kg.toFixed(1)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="text-base font-bold">{t("adminTopStudents")}</h2>
          <ul className="mt-4 divide-y divide-border">
            {leaderboard.map((row, index) => (
              <li key={row.name} className="flex items-center gap-4 py-3">
                <div
                  className={`grid size-9 place-items-center rounded-full text-sm font-bold ${index === 0 ? "bg-sunshine/40" : index === 1 ? "bg-muted" : index === 2 ? "bg-coral/20" : "bg-secondary"}`}
                >
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{row.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("adminReportKgCollected", { kg: row.kg.toFixed(1) })}
                  </p>
                </div>
                <p className="font-bold text-primary">
                  {row.points.toLocaleString(localeToNumberFormat(state.locale))}đ
                </p>
              </li>
            ))}
            {leaderboard.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">{t("adminNoData")}</li>
            )}
          </ul>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="text-base font-bold">{t("adminMonthlyTargetProgress")}</h2>
          <div className="mt-6 space-y-5">
            {[
              { label: t("adminGoalCollected"), current: totalKg, target: 100, unit: "kg" },
              {
                label: t("adminGoalParticipants"),
                current: participantCount,
                target: 500,
                unit: "SV",
              },
              {
                label: t("adminGoalCo2"),
                current: totalKg * CO2_KG_PER_KG_PLASTIC,
                target: 250,
                unit: "kg",
              },
            ].map((goal) => {
              const percent = Math.min(100, Math.round((goal.current / goal.target) * 100));
              return (
                <div key={goal.label}>
                  <div className="flex justify-between text-xs font-semibold">
                    <span>{goal.label}</span>
                    <span className="text-muted-foreground">
                      {goal.current.toFixed(0)} / {goal.target} {goal.unit}
                    </span>
                  </div>
                  <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-right text-[10px] font-bold text-primary">{percent}%</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function Breakdown({
  title,
  rows,
  label,
}: {
  title: string;
  rows: { label: string; kg: number }[];
  label: (row: { label: string; kg: number }) => string;
}) {
  const maximum = Math.max(1, ...rows.map((row) => row.kg));
  return (
    <section className="rounded-3xl border border-border bg-card p-6">
      <h2 className="text-base font-bold">{title}</h2>
      <div className="mt-5 space-y-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="flex justify-between gap-3 text-xs font-semibold">
              <span>{label(row)}</span>
              <span className="text-muted-foreground">{row.kg.toFixed(2)} kg</span>
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.round((row.kg / maximum) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Kpi({
  label,
  value,
  sub,
  sub2,
}: {
  label: string;
  value: string;
  sub: string;
  sub2: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold text-primary">{value}</p>
      {(sub || sub2) && (
        <p className="mt-1 text-xs text-muted-foreground">
          {sub} <span className="font-semibold text-foreground">{sub2}</span>
        </p>
      )}
    </div>
  );
}
