import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#20a064" },
      { title: "FLYSTIC — Đổi nhựa lấy quà xanh" },
      { name: "description", content: "Nền tảng đổi nhựa lấy quà xanh cho sinh viên." },
      { name: "author", content: "FLYSTIC" },
      { property: "og:title", content: "FLYSTIC — Đổi nhựa lấy quà xanh" },
      { property: "og:description", content: "Đổi nhựa, tích điểm và đổi quà xanh cùng FLYSTIC." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icons/yoha-icon.svg", type: "image/svg+xml" },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));",
          }}
        />
      </body>
    </html>
  );
}

import { YohaProvider, useTranslation } from "@/lib/yoha-store";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <YohaProvider>
        <div className="min-h-screen bg-background">
          <TopBar />
          <Outlet />
        </div>
      </YohaProvider>
    </QueryClientProvider>
  );
}

function TopBar() {
  const { locale, setLocale, t } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <div className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-end gap-2 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("languageLabel")}
        </span>
        <button
          type="button"
          onClick={() => setLocale("vi")}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${locale === "vi" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
        >
          {t("vietnamese")}
        </button>
        <button
          type="button"
          onClick={() => setLocale("en")}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${locale === "en" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
        >
          {t("english")}
        </button>
        <button
          type="button"
          onClick={() => setLocale("ko")}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${locale === "ko" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
        >
          {t("korean")}
        </button>
      </div>
    </div>
  );
}
