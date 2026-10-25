import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { getLocalizedCollectionPoint, useTranslation, useYoha } from "@/lib/yoha-store";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { state, signOut, isReady } = useYoha();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (!isReady) return;
    if (!state.user) navigate({ to: "/auth" });
    else if (state.user.role !== "admin") navigate({ to: "/app" });
  }, [isReady, state.user, navigate]);

  if (!isReady || !state.user || state.user.role !== "admin") return null;

  const nav = [
    { to: "/admin", label: t("routeDashboard"), icon: "📊" },
    { to: "/admin/new", label: t("routeNewTransaction"), icon: "➕" },
    { to: "/admin/transactions", label: t("routeTransactions"), icon: "📋" },
    { to: "/admin/reports", label: t("routeReports"), icon: "📈" },
  ] as const;

  return (
    <div className="min-h-screen bg-surface">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
          <div className="flex items-center gap-2 border-b border-border p-6">
            <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground font-bold">
              F
            </div>
            <div>
              <p className="text-lg font-bold">FLYSTIC</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t("adminConsoleTitle")}
              </p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-4">
            {nav.map((n) => {
              const active = loc.pathname === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  <span className="text-base">{n.icon}</span>
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border p-4">
            <div className="rounded-xl bg-secondary p-3">
              <p className="text-xs font-semibold">{state.user.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {state.user.collectionPoint
                  ? getLocalizedCollectionPoint(state.user.collectionPoint, t).name
                  : ""}
              </p>
            </div>
            <button
              onClick={() => {
                signOut();
                navigate({ to: "/" });
              }}
              className="mt-2 w-full rounded-lg py-2 text-xs font-semibold text-coral hover:bg-coral/10"
            >
              {t("adminSignOut")}
            </button>
          </div>
        </aside>

        {/* Mobile top bar */}
        <div className="flex w-full flex-col">
          <header className="flex items-center justify-between border-b border-border bg-card px-5 py-4 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">
                F
              </div>
              <span className="text-lg font-bold">{t("adminMobileTitle")}</span>
            </div>
            <button
              onClick={() => {
                signOut();
                navigate({ to: "/" });
              }}
              className="text-xs font-semibold text-coral"
            >
              {t("adminSignOut")}
            </button>
          </header>

          <main className="flex-1 pb-24 lg:pb-0">
            <Outlet />
          </main>

          {/* Mobile bottom nav */}
          <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:hidden">
            <div className="flex items-center justify-around px-2 py-2">
              {nav.map((n) => {
                const active = loc.pathname === n.to;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}
                  >
                    <span className="text-lg">{n.icon}</span>
                    {n.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
