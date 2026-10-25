import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { StudentBackdrop } from "@/components/StudentBackdrop";
import { useYoha, useTranslation } from "@/lib/yoha-store";

export const Route = createFileRoute("/app")({
  component: StudentLayout,
});

function StudentLayout() {
  const { state, isReady } = useYoha();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const loc = useLocation();
  const isPublicMap = loc.pathname === "/app/map";

  useEffect(() => {
    if (!isReady || isPublicMap) return;
    if (!state.user) navigate({ to: "/auth" });
    else if (state.user.role !== "student") navigate({ to: "/admin" });
  }, [isReady, isPublicMap, state.user, navigate]);

  if (!isReady || (!state.user && !isPublicMap) || state.user?.role === "admin") return null;

  const tabs: { to: string; label: string; icon: string; primary?: boolean }[] = [
    { to: "/app", label: t("routeHome"), icon: "🏠" },
    { to: "/app/map", label: t("routeMap"), icon: "📍" },
    { to: "/app/scan", label: t("routeScan"), icon: "🔳", primary: true },
    { to: "/app/rewards", label: t("routeRewards"), icon: "🎁" },
    { to: "/app/profile", label: t("routeProfile"), icon: "👤" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface">
      <StudentBackdrop />
      {state.user && (
        <aside className="fixed bottom-0 left-0 top-14 z-40 hidden w-72 flex-col border-r border-border/80 bg-card/90 px-5 py-6 backdrop-blur-xl lg:flex">
          <Link to="/app" className="flex items-center gap-3 px-2">
            <span className="grid size-11 place-items-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-[var(--shadow-pop)]">
              F
            </span>
            <span>
              <span className="block text-lg font-bold tracking-tight">FLYSTIC</span>
              <span className="block text-xs text-muted-foreground">Recycle &amp; reward</span>
            </span>
          </Link>
          <nav className="mt-10 space-y-2">
            {tabs.map((tab) => {
              const active = loc.pathname === tab.to;
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  <span className="text-xl">{tab.icon}</span>
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </nav>
          <Link
            to="/app/profile"
            className="mt-auto flex items-center gap-3 rounded-2xl border border-border bg-card/70 p-3 transition hover:border-primary/40"
          >
            <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-primary to-leaf font-bold text-primary-foreground">
              {state.user.name.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-foreground">
                {state.user.name}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t("studentPoints")}: {state.points}
              </span>
            </span>
          </Link>
        </aside>
      )}
      <main className={`relative min-h-screen pb-24 lg:pb-0 ${state.user ? "lg:pl-72" : ""}`}>
        <Outlet />
      </main>
      {state.user && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
            {tabs.map((t) => {
              const active = loc.pathname === t.to;
              if (t.primary) {
                return (
                  <Link
                    key={t.to}
                    to={t.to}
                    className="-mt-8 grid size-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-pop)] transition hover:-translate-y-0.5"
                  >
                    <span className="text-2xl">{t.icon}</span>
                  </Link>
                );
              }
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs font-medium ${active ? "text-primary" : "text-muted-foreground"}`}
                >
                  <span className="text-xl">{t.icon}</span>
                  <span>{t.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
