import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  Code2,
  Facebook,
  Gift,
  HandHeart,
  HeartHandshake,
  Mail,
  Sparkles,
  TreePine,
  UsersRound,
} from "lucide-react";
import springFundraiserPhoto from "../../ViT/gay_quy_xuan_yeu_thuong_2026.jpg";
import greenSummerPhoto from "../../ViT/mua_he_xanh_2026.png.jpeg";
import springPhoto from "../../ViT/xuan_yeu_thuong_2026.jpg";
import { localeToNumberFormat, useTranslation, useYoha } from "@/lib/yoha-store";

export const Route = createFileRoute("/app/rewards")({ component: CommunityPage });

type CommunityView = "choices" | "fundraising" | "rewards";

const VIT_FACEBOOK_URL = "https://www.facebook.com/doitinhnguyen.soict?locale=vi_VN";

function CommunityPage() {
  const { state } = useYoha();
  const { t } = useTranslation();
  const [view, setView] = useState<CommunityView>("choices");
  const formattedPoints = state.points.toLocaleString(localeToNumberFormat(state.locale));
  const formattedFundPoints = state.fundPoints.toLocaleString(localeToNumberFormat(state.locale));
  const formattedRewardPoints = state.rewardPoints.toLocaleString(
    localeToNumberFormat(state.locale),
  );

  if (view === "choices") {
    return (
      <div className="mx-auto max-w-6xl px-5 pb-8 pt-6 lg:px-10 lg:pt-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)] lg:items-start">
          <CommunityHero t={t} compact />
          <div>
            <section className="rounded-3xl border border-primary/15 bg-primary/10 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                {t("communityPointsLabel")}
              </p>
              <p className="mt-1 text-4xl font-bold text-foreground">
                {formattedPoints}{" "}
                <span className="text-base font-medium text-muted-foreground">
                  {t("studentPoints")}
                </span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t("communityPointsDescription")}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <PointBalance label={t("communityFundPointsLabel")} value={formattedFundPoints} />
                <PointBalance
                  label={t("communityRewardPointsLabel")}
                  value={formattedRewardPoints}
                />
              </div>
            </section>

            <section className="mt-7">
              <h2 className="text-xl font-bold tracking-tight">{t("communityChooseTitle")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t("communityChooseDescription")}
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <ChoiceCard
                  icon={<Gift className="size-6" />}
                  title={t("communityRewardsOption")}
                  description={t("communityRewardsOptionDescription")}
                  tone="bg-primary/10 text-primary"
                  onClick={() => setView("rewards")}
                />
                <ChoiceCard
                  icon={<HeartHandshake className="size-6" />}
                  title={t("communityFundraisingOption")}
                  description={t("communityFundraisingOptionDescription")}
                  tone="bg-coral/10 text-coral"
                  onClick={() => setView("fundraising")}
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pb-8 pt-6 lg:px-10 lg:pt-10">
      <button
        type="button"
        onClick={() => setView("choices")}
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t("communityBackToChoices")}
      </button>
      {view === "fundraising" ? (
        <FundraisingView points={formattedFundPoints} t={t} />
      ) : (
        <RewardsView points={state.rewardPoints} locale={state.locale} t={t} />
      )}
    </div>
  );
}

function CommunityHero({
  t,
  compact = false,
}: {
  t: ReturnType<typeof useTranslation>["t"];
  compact?: boolean;
}) {
  return (
    <header className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-foreground via-foreground to-primary/85 text-card shadow-[var(--shadow-pop)]">
      <div className="absolute -right-10 -top-10 -z-10 size-48 rounded-full bg-primary-glow/25 blur-2xl" />
      <div className="absolute -bottom-16 -left-10 -z-10 size-52 rounded-full bg-ocean/20 blur-2xl" />
      <div
        className={`flex flex-col justify-end p-6 ${compact ? "min-h-[20rem]" : "min-h-[24rem]"}`}
      >
        <div className="grid size-14 place-items-center rounded-2xl bg-primary text-3xl text-primary-foreground shadow-lg">
          🎁
        </div>
        <p className="w-fit rounded-full border border-card/30 bg-card/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-card/90 backdrop-blur-sm">
          {t("communityLabel")}
        </p>
        <h1 className="mt-3 text-3xl font-bold leading-[1.15] tracking-tight">
          {t("communityTitle")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-card/85">{t("communityDescription")}</p>
      </div>
    </header>
  );
}

function FundraisingView({
  points,
  t,
}: {
  points: string;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const missions = [
    {
      icon: HandHeart,
      title: t("communityMissionServiceTitle"),
      description: t("communityMissionServiceDescription"),
      color: "bg-coral/10 text-coral",
    },
    {
      icon: UsersRound,
      title: t("communityMissionConnectionTitle"),
      description: t("communityMissionConnectionDescription"),
      color: "bg-ocean/10 text-ocean",
    },
    {
      icon: Sparkles,
      title: t("communityMissionSkillsTitle"),
      description: t("communityMissionSkillsDescription"),
      color: "bg-sunshine/20 text-foreground",
    },
    {
      icon: Code2,
      title: t("communityMissionTechnologyTitle"),
      description: t("communityMissionTechnologyDescription"),
      color: "bg-primary/10 text-primary",
    },
  ];
  const featuredActivities = [
    {
      image: greenSummerPhoto,
      title: t("communityActivitySummerTitle"),
      description: t("communityActivitySummerDescription"),
    },
    {
      image: springPhoto,
      title: t("communityActivitySpringTitle"),
      description: t("communityActivitySpringDescription"),
    },
    {
      image: springFundraiserPhoto,
      title: t("communityActivityFundraiserTitle"),
      description: t("communityActivityFundraiserDescription"),
    },
  ];

  return (
    <>
      <section className="mt-5">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">
          {t("communityFundraisingTeams")}
        </p>
        <article className="mt-3 rounded-3xl border border-primary/20 bg-primary/5 p-5">
          <div className="grid size-11 place-items-center rounded-2xl bg-primary text-xl text-primary-foreground">
            🤝
          </div>
          <h1 className="mt-4 text-xl font-bold leading-snug">{t("communityVitTeam")}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("communityVitTeamDescription")}
          </p>
          <p className="mt-4 text-sm font-bold text-primary">
            {t("communityFundPointsLabel")}: {points} {t("studentPoints")}
          </p>
        </article>
        <p className="mt-3 text-center text-xs text-muted-foreground">{t("communityMoreTeams")}</p>
      </section>

      <section className="mt-7">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">
          {t("communityAboutLabel")}
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight">{t("communityAboutTitle")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("communityAboutDescription")}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-bold tracking-tight">{t("communityMissionTitle")}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {missions.map((mission) => {
            const Icon = mission.icon;
            return (
              <article
                key={mission.title}
                className="rounded-3xl border border-border bg-card p-4 shadow-sm"
              >
                <div className={`grid size-10 place-items-center rounded-2xl ${mission.color}`}>
                  <Icon size={20} strokeWidth={2.2} aria-hidden="true" />
                </div>
                <h3 className="mt-3 text-sm font-bold leading-snug">{mission.title}</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {mission.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="text-xl font-bold tracking-tight">{t("communityActivitiesTitle")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("communityActivitiesDescription")}
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {featuredActivities.map((activity) => (
            <article
              key={activity.title}
              className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
            >
              <img
                src={activity.image}
                alt={activity.title}
                className="aspect-[16/10] w-full object-cover"
              />
              <div className="p-4">
                <h3 className="font-bold">{activity.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {activity.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <FacebookLink t={t} />
    </>
  );
}

function RewardsView({
  points,
  locale,
  t,
}: {
  points: number;
  locale: "vi" | "en" | "ko";
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const formattedPoints = points.toLocaleString(localeToNumberFormat(locale));
  const cashRedemptions = Math.floor(points / 1_000);
  const trees = Math.floor(points / 500);

  return (
    <>
      <section className="mt-5 rounded-3xl border border-primary/15 bg-primary/10 p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">
          {t("communityRewardsTitle")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("communityRewardsDescription")}
        </p>
        <p className="mt-4 text-lg font-bold text-foreground">
          {t("communityRewardBalance", { points: formattedPoints })}
        </p>
      </section>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <RewardCard
          icon={<Banknote className="size-6" />}
          title={t("communityCashReward")}
          detail={t("communityCashRewardDetail")}
          availability={t("communityRewardCashAvailable", { count: cashRedemptions })}
          tone="bg-sunshine/20 text-foreground"
        />
        <RewardCard
          icon={<TreePine className="size-6" />}
          title={t("communityTreeReward")}
          detail={t("communityTreeRewardDetail")}
          availability={t("communityRewardTreesAvailable", { count: trees })}
          tone="bg-primary/10 text-primary"
        />
      </div>

      <a
        href="mailto:myanh260305@gmail.com?subject=FLYSTIC%20-%20%C4%90%E1%BB%95i%20qu%C3%A0"
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-4 py-4 text-sm font-bold text-background transition hover:opacity-90"
      >
        <Mail size={18} aria-hidden="true" />
        {t("communityRewardContact")}
        <ArrowUpRight size={16} aria-hidden="true" />
      </a>
    </>
  );
}

function PointBalance({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card/80 p-3 ring-1 ring-primary/10">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function ChoiceCard({
  icon,
  title,
  description,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-3xl border border-border bg-card p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40"
    >
      <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${tone}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{title}</span>
        <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
      <ArrowUpRight className="size-5 shrink-0 text-muted-foreground" />
    </button>
  );
}

function RewardCard({
  icon,
  title,
  detail,
  availability,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  availability: string;
  tone: string;
}) {
  return (
    <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className={`grid size-12 place-items-center rounded-2xl ${tone}`}>{icon}</div>
      <h2 className="mt-4 text-lg font-bold">{title}</h2>
      <p className="mt-1 text-sm font-semibold text-primary">{detail}</p>
      <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
        {availability}
      </p>
    </article>
  );
}

function FacebookLink({ t }: { t: ReturnType<typeof useTranslation>["t"] }) {
  return (
    <a
      href={VIT_FACEBOOK_URL}
      target="_blank"
      rel="noreferrer"
      className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-4 py-4 text-sm font-bold text-background transition hover:opacity-90"
    >
      <Facebook size={18} aria-hidden="true" />
      {t("communityFollowCta")}
      <ArrowUpRight size={16} aria-hidden="true" />
    </a>
  );
}
