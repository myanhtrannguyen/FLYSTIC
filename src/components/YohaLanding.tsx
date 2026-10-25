import { Link } from "@tanstack/react-router";
import { GraduationCap, HandHeart, Mail, MapPin, QrCode, Recycle } from "lucide-react";
import { COLLECTION_POINTS, getLocalizedCollectionPoint, useTranslation } from "@/lib/yoha-store";

/**
 * Decorative plastic-waste themed background: tiled SVG pattern of
 * bottles, leaves, recycle marks, droplets, caps. Sits behind all content,
 * pointer-events disabled.
 */
export function PlasticPatternBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Tiled icon pattern */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.09]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="yoha-plastic"
            x="0"
            y="0"
            width="220"
            height="220"
            patternUnits="userSpaceOnUse"
          >
            {/* PET bottle */}
            <g
              transform="translate(20 30)"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="text-primary"
            >
              <path d="M10 4 h10 v6 c4 1 6 5 6 9 v22 c0 4 -3 7 -7 7 h-8 c-4 0 -7 -3 -7 -7 v-22 c0 -4 2 -8 6 -9 z" />
              <line x1="6" y1="22" x2="26" y2="22" />
            </g>
            {/* Leaf */}
            <g transform="translate(110 50)" fill="currentColor" className="text-leaf">
              <path
                d="M0 20 C 0 6, 14 0, 28 0 C 28 14, 22 28, 8 28 C 4 28, 0 24, 0 20 Z"
                opacity="0.55"
              />
            </g>
            {/* Recycle triangle */}
            <g
              transform="translate(160 140)"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-ocean"
            >
              <path d="M12 4 l8 14 h-16 z" />
              <path d="M4 18 l-2 4 l4 0" />
            </g>
            {/* Droplet */}
            <g transform="translate(50 140)" fill="currentColor" className="text-ocean">
              <path
                d="M14 0 C 22 10, 26 18, 26 22 a 12 12 0 1 1 -24 0 C 2 18, 6 10, 14 0 Z"
                opacity="0.4"
              />
            </g>
            {/* Cap */}
            <g
              transform="translate(170 30)"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="text-coral"
            >
              <rect x="0" y="0" width="22" height="10" rx="2" />
              <line x1="4" y1="3" x2="4" y2="7" />
              <line x1="10" y1="3" x2="10" y2="7" />
              <line x1="16" y1="3" x2="16" y2="7" />
            </g>
            {/* Small bottle */}
            <g
              transform="translate(100 160)"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              className="text-primary"
            >
              <path d="M6 2 h6 v4 c3 0 4 3 4 6 v14 c0 3 -2 5 -5 5 h-4 c-3 0 -5 -2 -5 -5 v-14 c0 -3 1 -6 4 -6 z" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#yoha-plastic)" />
      </svg>

      {/* Soft color blobs */}
      <div className="absolute -top-32 -left-20 h-[28rem] w-[28rem] rounded-full bg-primary-glow/30 blur-3xl" />
      <div className="absolute top-1/3 -right-24 h-[24rem] w-[24rem] rounded-full bg-ocean/20 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-[22rem] w-[22rem] rounded-full bg-sunshine/20 blur-3xl" />

      {/* Floating decorative emojis-as-svg (large, low opacity) */}
      <FloatingIcon
        className="left-[6%] top-[18%] text-primary"
        style={{ "--r": "-8deg" } as React.CSSProperties}
        size={64}
      >
        <BottleIcon />
      </FloatingIcon>
      <FloatingIcon
        className="right-[10%] top-[12%] text-leaf"
        style={{ "--r": "12deg", animationDelay: "1.2s" } as React.CSSProperties}
        size={72}
      >
        <LeafIcon />
      </FloatingIcon>
      <FloatingIcon
        className="left-[12%] bottom-[20%] text-ocean"
        style={{ "--r": "6deg", animationDelay: "2s" } as React.CSSProperties}
        size={56}
      >
        <RecycleIcon />
      </FloatingIcon>
      <FloatingIcon
        className="right-[14%] bottom-[24%] text-coral"
        style={{ "--r": "-14deg", animationDelay: "0.6s" } as React.CSSProperties}
        size={52}
      >
        <CapIcon />
      </FloatingIcon>
      <FloatingIcon
        className="left-1/2 top-[8%] text-sunshine"
        style={{ "--r": "20deg", animationDelay: "1.8s" } as React.CSSProperties}
        size={48}
      >
        <DropletIcon />
      </FloatingIcon>
    </div>
  );
}

function FloatingIcon({
  children,
  className,
  size,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  size: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`absolute animate-float opacity-25 ${className ?? ""}`}
      style={{ width: size, height: size, ...style }}
    >
      {children}
    </div>
  );
}

function BottleIcon() {
  return (
    <svg
      viewBox="0 0 48 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-full w-full"
    >
      <path d="M18 4 h12 v8 c6 2 8 8 8 14 v30 c0 4 -3 8 -8 8 h-12 c-5 0 -8 -4 -8 -8 v-30 c0 -6 2 -12 8 -14 z" />
      <line x1="8" y1="26" x2="40" y2="26" />
    </svg>
  );
}
function LeafIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" className="h-full w-full">
      <path d="M4 44 C 4 16, 32 4, 60 4 C 60 32, 48 60, 20 60 C 12 60, 4 52, 4 44 Z" />
    </svg>
  );
}
function RecycleIcon() {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-full w-full"
    >
      <path d="M32 8 l12 20 h-24 z" />
      <path d="M52 38 l8 14 h-16" />
      <path d="M12 38 l-8 14 h16" />
    </svg>
  );
}
function CapIcon() {
  return (
    <svg
      viewBox="0 0 64 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className="h-full w-full"
    >
      <rect x="2" y="4" width="60" height="20" rx="4" />
      <line x1="14" y1="10" x2="14" y2="18" />
      <line x1="26" y1="10" x2="26" y2="18" />
      <line x1="38" y1="10" x2="38" y2="18" />
      <line x1="50" y1="10" x2="50" y2="18" />
    </svg>
  );
}
function DropletIcon() {
  return (
    <svg viewBox="0 0 48 64" fill="currentColor" className="h-full w-full">
      <path d="M24 2 C 38 22, 44 36, 44 44 a 20 20 0 1 1 -40 0 C 4 36, 10 22, 24 2 Z" />
    </svg>
  );
}

/* ---------------- Landing page sections ---------------- */

function Hero() {
  const { t } = useTranslation();

  return (
    <header className="relative">
      <div className="relative mx-auto max-w-7xl px-6 pt-16 pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <span className="size-1.5 rounded-full bg-primary" />
              {t("landingHeroLabel")}
            </span>
            <h1 className="mt-6 text-balance text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              {t("landingTitleLine1")}
              <br />
              <span className="text-primary">{t("landingTitleLine2")}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              {t("landingHeroDescription")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="rounded-2xl bg-primary px-7 py-4 text-base font-bold text-primary-foreground shadow-[var(--shadow-pop)] transition-transform hover:-translate-y-0.5"
              >
                {t("landingStartNow")}
              </Link>
              <Link
                to="/app/map"
                className="rounded-2xl border-2 border-foreground/15 bg-card px-7 py-4 text-base font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                {t("landingViewMap")}
              </Link>
            </div>

            <div className="mt-10 max-w-xl rounded-3xl border border-primary/20 bg-card/85 p-5 shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <MapPin className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">
                    {t("landingPilotLabel")}
                  </p>
                  <p className="mt-0.5 text-sm font-bold">{t("landingPilotTitle")}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {t("landingPilotDescription")}
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {COLLECTION_POINTS.map((point, index) => {
                  const location = getLocalizedCollectionPoint(point, t);
                  return (
                    <li
                      key={point.id}
                      className="flex min-w-0 gap-2 rounded-2xl border border-border bg-secondary/60 p-3"
                    >
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-bold leading-snug text-foreground">
                          {location.name}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                          {location.address}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Project identity, replacing demo account data with verified project information. */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-primary/20 via-leaf/10 to-ocean/20 blur-2xl" />
            <div className="rounded-[2.75rem] border border-border bg-card p-6 shadow-[var(--shadow-pop)]">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                {t("landingCollaborationLabel")}
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight">
                {t("landingCollaborationTitle")}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {t("landingCollaborationDescription")}
              </p>
              <UniversityStickers className="mt-5" />
              <div className="mt-5 rounded-2xl bg-secondary p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("landingProjectFocusLabel")}
                </p>
                <p className="mt-1 text-sm font-semibold leading-relaxed">
                  {t("landingProjectFocus")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function HowItWorks() {
  const { t } = useTranslation();

  const steps = [
    { n: "01", t: t("landingStep1Title"), d: t("landingStep1Description") },
    { n: "02", t: t("landingStep2Title"), d: t("landingStep2Description") },
    { n: "03", t: t("landingStep3Title"), d: t("landingStep3Description") },
    { n: "04", t: t("landingStep4Title"), d: t("landingStep4Description") },
  ];
  return (
    <section className="relative mx-auto max-w-7xl px-6 py-20">
      <div className="mb-12 max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          {t("landingHowItWorksLabel")}
        </p>
        <h2 className="mt-3 text-4xl font-bold tracking-tight">{t("landingHowItWorksTitle")}</h2>
      </div>
      <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <li
            key={s.n}
            className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
          >
            <span className="font-display text-5xl font-bold text-primary/30">{s.n}</span>
            <h3 className="mt-4 text-lg font-bold">{s.t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function AdminPreview() {
  const { t } = useTranslation();
  const capabilities = [
    {
      icon: MapPin,
      title: t("landingCapabilityMapTitle"),
      description: t("landingCapabilityMapDescription"),
    },
    {
      icon: Recycle,
      title: t("landingCapabilitySortingTitle"),
      description: t("landingCapabilitySortingDescription"),
    },
    {
      icon: QrCode,
      title: t("landingCapabilityQrTitle"),
      description: t("landingCapabilityQrDescription"),
    },
    {
      icon: HandHeart,
      title: t("landingCapabilityRewardTitle"),
      description: t("landingCapabilityRewardDescription"),
    },
  ];

  return (
    <section className="relative mx-auto max-w-7xl px-6 py-20">
      <div className="grid items-start gap-10 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-ocean">
            {t("landingProjectLabel")}
          </p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight">{t("landingAdminTitle")}</h2>
          <p className="mt-4 max-w-md text-muted-foreground">{t("landingAdminDescription")}</p>
          <div className="mt-6 rounded-3xl border border-primary/20 bg-primary/5 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              {t("landingPilotLabel")}
            </p>
            <p className="mt-2 font-bold">{t("landingPilotTitle")}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("landingStationDescription")}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {capabilities.map((capability) => {
            const Icon = capability.icon;
            return (
              <article
                key={capability.title}
                className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]"
              >
                <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-bold">{capability.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {capability.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Collaboration() {
  const { t } = useTranslation();

  return (
    <section className="relative mx-auto max-w-7xl px-6 py-20">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-coral">
            {t("landingCollaborationLabel")}
          </p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight">
            {t("landingCollaborationSectionTitle")}
          </h2>
          <p className="mt-4 text-muted-foreground">
            {t("landingCollaborationSectionDescription")}
          </p>
        </div>
        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-pop)]">
          <UniversityStickers />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <UniversityCard
              flag="🇻🇳"
              title={t("landingHustName")}
              country={t("landingHustCountry")}
              tone="border-primary/20 bg-primary/5"
            />
            <UniversityCard
              flag="🇰🇷"
              title={t("landingJbnuName")}
              country={t("landingJbnuCountry")}
              tone="border-ocean/20 bg-ocean/5"
            />
          </div>
          <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
            {t("landingCollaborationFootnote")}
          </p>
        </div>
      </div>
    </section>
  );
}

function UniversityStickers({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 ${className}`}
      aria-label="HUST and Jeonbuk National University"
    >
      <span className="inline-flex items-center gap-2 rounded-2xl border-2 border-primary/25 bg-primary/10 px-3 py-2 text-xs font-black tracking-wide text-primary shadow-sm -rotate-2">
        <GraduationCap className="size-4" aria-hidden="true" />
        HUST <span aria-hidden="true">🇻🇳</span>
      </span>
      <span aria-hidden="true" className="font-bold text-muted-foreground">
        ×
      </span>
      <span className="inline-flex items-center gap-2 rounded-2xl border-2 border-ocean/25 bg-ocean/10 px-3 py-2 text-xs font-black tracking-wide text-ocean shadow-sm rotate-2">
        <GraduationCap className="size-4" aria-hidden="true" />
        JBNU <span aria-hidden="true">🇰🇷</span>
      </span>
    </div>
  );
}

function UniversityCard({
  flag,
  title,
  country,
  tone,
}: {
  flag: string;
  title: string;
  country: string;
  tone: string;
}) {
  return (
    <article className={`rounded-2xl border p-4 ${tone}`}>
      <span className="text-2xl" aria-hidden="true">
        {flag}
      </span>
      <h3 className="mt-3 text-sm font-bold leading-snug">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{country}</p>
    </article>
  );
}

function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="relative mt-10 border-t border-border bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-6 py-12 text-center">
        <p className="text-xl font-bold">FLYSTIC</p>
        <p className="mt-2 text-sm text-background/60">{t("landingFooterProjectDescription")}</p>
        <UniversityStickers className="mt-5 justify-center" />
        <a
          href="mailto:myanh260305@gmail.com"
          className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-background/75 transition hover:text-background"
        >
          <Mail className="size-4" aria-hidden="true" />
          myanh260305@gmail.com
        </a>
        <p className="mt-6 text-xs text-background/40">{t("landingFooterCopyright")}</p>
      </div>
    </footer>
  );
}

export function YohaLanding() {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-screen overflow-hidden bg-plastic-pattern text-foreground">
      <PlasticPatternBackdrop />
      <div className="relative">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <RecycleIcon />
            </div>
            <span className="text-xl font-bold tracking-tight">FLYSTIC</span>
          </div>
          <div className="hidden gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#how" className="hover:text-foreground">
              {t("landingNavHow")}
            </a>
            <a href="#admin" className="hover:text-foreground">
              {t("landingNavAdmin")}
            </a>
            <a href="#collaboration" className="hover:text-foreground">
              {t("landingNavCollaboration")}
            </a>
          </div>
          <Link
            to="/auth"
            className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background"
          >
            {t("landingLogin")}
          </Link>
        </nav>
        <Hero />
        <div id="how">
          <HowItWorks />
        </div>
        <div id="admin">
          <AdminPreview />
        </div>
        <div id="collaboration">
          <Collaboration />
        </div>
        <Footer />
      </div>
    </div>
  );
}
