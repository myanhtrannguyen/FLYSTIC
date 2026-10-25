import { createFileRoute, Link } from "@tanstack/react-router";
import { type CSSProperties } from "react";
import {
  getLocalizedCollectionPoint,
  getTransactionStatus,
  localeToNumberFormat,
  PLASTIC_ICON,
  PLASTIC_SHORT,
  useYoha,
} from "@/lib/yoha-store";
import { useTranslation } from "@/lib/yoha-store";

export const Route = createFileRoute("/app/")({
  component: StudentHome,
});

function StudentHome() {
  const { state } = useYoha();
  const u = state.user!;
  const myTransactions = state.transactions.filter((transaction) => transaction.userId === u.id);
  const recent = myTransactions.slice(0, 3);
  const confirmedCount = myTransactions.filter(
    (transaction) => getTransactionStatus(transaction) === "confirmed",
  ).length;
  const { t } = useTranslation();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="relative mx-auto max-w-6xl px-5 pb-8 pt-8 animate-fade-in lg:px-10 lg:pt-10">
        <header className="lg:flex lg:items-start lg:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{t("studentGreeting")}</p>
            <p className="text-2xl font-bold">{u.name} 👋</p>
          </div>
        </header>

        <section className="mt-6 max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            {t("landingHeroLabel")}
          </span>
          <h1 className="mt-4 text-balance text-3xl font-bold leading-tight tracking-tight">
            {t("landingTitleLine1")}
            <br />
            <span className="text-primary">{t("landingTitleLine2")}</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {t("landingHeroDescription")}
          </p>
        </section>

        <div className="relative mt-6 overflow-hidden rounded-3xl bg-foreground p-6 text-background shadow-[var(--shadow-pop)]">
          <div
            className="absolute -right-6 -top-6 text-7xl opacity-15 animate-float"
            style={{ "--r": "-15deg" } as CSSProperties}
          >
            ♻️
          </div>
          <div
            className="absolute -bottom-4 right-10 text-5xl opacity-10 animate-float"
            style={{ "--r": "10deg", animationDelay: "1.2s" } as CSSProperties}
          >
            🧴
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-glow/70">
            {t("studentCurrentPoints")}
          </p>
          <p className="mt-1 text-4xl font-bold">
            {state.points.toLocaleString(localeToNumberFormat(state.locale))}{" "}
            <span className="text-base font-medium opacity-60">{t("studentPoints")}</span>
          </p>
        </div>

        <div className="mt-4 grid max-w-2xl grid-cols-2 gap-3">
          <Stat
            label={t("studentCollected")}
            value={`${state.totalKg.toFixed(2)} kg`}
            tone="bg-leaf/20"
          />
          <Stat
            label={t("studentTransactions")}
            value={String(confirmedCount)}
            tone="bg-ocean/15"
          />
        </div>

        <div className="mt-6 grid max-w-3xl grid-cols-3 gap-3">
          <Link
            to="/app/scan"
            className="hover-scale rounded-2xl bg-primary p-4 text-center text-xs font-bold text-primary-foreground shadow-[var(--shadow-pop)]"
          >
            🔳
            <br />
            {t("studentScanQr")}
          </Link>
          <Link
            to="/app/guide"
            className="hover-scale rounded-2xl bg-card p-4 text-center text-xs font-bold ring-1 ring-border"
          >
            📚
            <br />
            {t("studentGuideSorting")}
          </Link>
          <Link
            to="/app/leaderboard"
            className="hover-scale rounded-2xl bg-sunshine/40 p-4 text-center text-xs font-bold ring-1 ring-sunshine"
          >
            🏆
            <br />
            {t("studentLeaderboard")}
          </Link>
        </div>

        <Section title={t("studentRecentActivity") || "Hoạt động gần đây"}>
          {recent.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-card p-5 text-center text-sm text-muted-foreground">
              {t("studentNoTransactions")}
            </p>
          ) : (
            <ul className="space-y-2">
              {recent.map((transaction) => (
                <li key={transaction.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      {getLocalizedCollectionPoint(transaction.collectionPoint, t).name}
                    </p>
                    <span className="font-bold text-primary">+{transaction.points}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {transaction.items.map((it, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {PLASTIC_ICON[it.plasticType]} {PLASTIC_SHORT[it.plasticType]} ×{" "}
                        {it.quantity} kg
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`rounded-2xl border border-border p-4 ${tone}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
