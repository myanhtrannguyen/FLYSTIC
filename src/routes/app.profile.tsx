import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ChevronRight, CircleHelp, Languages, Mail, Settings2, ShieldCheck, X } from "lucide-react";
import { getTransactionStatus, useTranslation, useYoha } from "@/lib/yoha-store";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
});

type ProfilePanel = "settings" | "help" | "terms";

function ProfilePage() {
  const { state, signOut } = useYoha();
  const { locale, setLocale, t } = useTranslation();
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState<ProfilePanel | null>(null);
  const u = state.user!;
  const myConfirmed = state.transactions.filter(
    (transaction) =>
      transaction.userId === u.id && getTransactionStatus(transaction) === "confirmed",
  );
  const bottles = Math.round(state.totalKg * 40);
  const items = myConfirmed.reduce(
    (sum, transaction) =>
      sum + transaction.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0,
  );
  const allClean =
    myConfirmed.length > 0 &&
    myConfirmed.every((transaction) =>
      transaction.items.every((item) => item.cleanliness === "CLEAN"),
    );
  const badges = [
    { e: "🌱", n: "First Drop", got: items > 0 },
    { e: "♻️", n: "Green Starter", got: state.totalKg >= 1 },
    { e: "🦸", n: "Plastic Hero", got: state.totalKg >= 5 },
    { e: "✨", n: "Clean Recycler", got: allClean },
    { e: "🔥", n: "Weekly Warrior", got: myConfirmed.length >= 3 },
    { e: "🏆", n: "Campus Guardian", got: state.totalKg >= 10 },
  ];

  const panelTitle =
    activePanel === "settings"
      ? t("profileSettingsTitle")
      : activePanel === "help"
        ? t("profileHelpTitle")
        : t("profileTermsTitle");

  return (
    <div className="mx-auto max-w-6xl px-5 pb-8 pt-8 lg:px-10 lg:pt-10">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:items-start">
        <div>
          <div className="flex items-center gap-4 rounded-3xl border border-border bg-card/85 p-5 shadow-sm">
            <div className="grid size-20 place-items-center rounded-full bg-gradient-to-br from-primary to-leaf text-3xl font-bold text-primary-foreground">
              {u.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold lg:text-2xl">{u.name}</h1>
              <p className="text-sm text-muted-foreground">
                {u.studentId} · {u.className}
              </p>
              <p className="text-xs text-muted-foreground">{u.faculty}</p>
            </div>
          </div>

          <section className="mt-6 rounded-3xl border border-border bg-card/85 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("profileImpact")}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <Impact value={`${state.totalKg.toFixed(1)}`} unit={t("profileKg")} />
              <Impact value={String(bottles)} unit={t("profileBottles")} />
              <Impact value={String(items)} unit={t("profileItems")} />
            </div>
          </section>

          <section className="mt-6 space-y-2">
            <MenuItem
              icon={<Settings2 className="size-5" aria-hidden="true" />}
              label={t("profileSettings")}
              onClick={() => setActivePanel("settings")}
            />
            <MenuItem
              icon={<CircleHelp className="size-5" aria-hidden="true" />}
              label={t("profileHelp")}
              onClick={() => setActivePanel("help")}
            />
            <MenuItem
              icon={<ShieldCheck className="size-5" aria-hidden="true" />}
              label={t("profileTerms")}
              onClick={() => setActivePanel("terms")}
            />
          </section>

          <button
            onClick={() => {
              signOut();
              navigate({ to: "/" });
            }}
            className="mt-6 w-full rounded-xl border border-coral/30 bg-coral/10 py-3 text-sm font-bold text-coral"
          >
            {t("profileSignOut")}
          </button>
        </div>

        <section className="rounded-3xl border border-border bg-card/85 p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold">{t("profileBadges")}</h2>
          <div className="grid grid-cols-3 gap-3">
            {badges.map((b) => (
              <div
                key={b.n}
                className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border border-border p-4 ${b.got ? "bg-card" : "bg-secondary opacity-50"}`}
              >
                <span className="text-3xl">{b.e}</span>
                <span className="text-center text-xs font-semibold">{b.n}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {activePanel && (
        <ProfileDialog title={panelTitle} onClose={() => setActivePanel(null)}>
          {activePanel === "settings" && (
            <>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("profileSettingsDescription")}
              </p>
              <section className="mt-5 rounded-2xl bg-secondary p-4">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Languages className="size-4 text-primary" aria-hidden="true" />
                  {t("profileLanguageTitle")}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(
                    [
                      ["vi", t("vietnamese")],
                      ["en", t("english")],
                      ["ko", t("korean")],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setLocale(value)}
                      className={`rounded-full px-4 py-2 text-xs font-bold transition ${locale === value ? "bg-primary text-primary-foreground" : "bg-card text-foreground ring-1 ring-border hover:ring-primary/50"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {t("profileLanguageDescription")}
                </p>
              </section>
              <section className="mt-3 rounded-2xl border border-border p-4">
                <h3 className="text-sm font-bold">{t("profileDataTitle")}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t("profileDataDescription")}
                </p>
              </section>
            </>
          )}

          {activePanel === "help" && (
            <>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("profileHelpDescription")}
              </p>
              <ol className="mt-5 space-y-3 rounded-2xl bg-secondary p-4 text-sm leading-relaxed">
                {[t("profileHelpStep1"), t("profileHelpStep2"), t("profileHelpStep3")].map(
                  (step, index) => (
                    <li key={step} className="flex gap-3">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ),
                )}
              </ol>
              <section className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <h3 className="text-sm font-bold">{t("profileHelpContactTitle")}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t("profileHelpContactDescription")}
                </p>
                <a
                  href="mailto:myanh260305@gmail.com"
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-xs font-bold text-background transition hover:opacity-90"
                >
                  <Mail className="size-4" aria-hidden="true" />
                  myanh260305@gmail.com
                </a>
              </section>
            </>
          )}

          {activePanel === "terms" && (
            <>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("profileTermsDescription")}
              </p>
              <div className="mt-5 space-y-3">
                <TermsItem
                  title={t("profileTermsUseTitle")}
                  description={t("profileTermsUseDescription")}
                />
                <TermsItem
                  title={t("profileTermsDataTitle")}
                  description={t("profileTermsDataDescription")}
                />
                <TermsItem
                  title={t("profileTermsPrivacyTitle")}
                  description={t("profileTermsPrivacyDescription")}
                />
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                {t("profileTermsContact")}
              </p>
            </>
          )}
        </ProfileDialog>
      )}
    </div>
  );
}

function Impact({ value, unit }: { value: string; unit: string }) {
  return (
    <div className="rounded-2xl bg-secondary p-3">
      <p className="text-xl font-bold text-primary">{value}</p>
      <p className="text-[10px] font-medium uppercase text-muted-foreground">{unit}</p>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
    >
      <span className="grid size-9 place-items-center rounded-xl bg-secondary text-primary">
        {icon}
      </span>
      <span className="flex-1 text-sm font-semibold">{label}</span>
      <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}

function ProfileDialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-foreground/35 p-4 backdrop-blur-sm sm:items-center sm:justify-center"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-pop)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 place-items-center rounded-full bg-secondary text-muted-foreground transition hover:text-foreground"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </section>
    </div>
  );
}

function TermsItem({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-2xl border border-border p-4">
      <h3 className="text-sm font-bold">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </section>
  );
}
