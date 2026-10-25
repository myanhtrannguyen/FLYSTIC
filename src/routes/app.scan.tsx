import { createFileRoute, useNavigate } from "@tanstack/react-router";
import QrScanner from "qr-scanner";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getLocalizedCollectionPoint,
  getTransactionStatus,
  useYoha,
  useTranslation,
  PLASTIC_SHORT,
  PLASTIC_ICON,
  CLEAN_SHORT,
  type PointDestination,
  type Transaction,
} from "@/lib/yoha-store";
import { YohaApiError } from "@/lib/yoha-api";

export const Route = createFileRoute("/app/scan")({
  component: ScanPage,
});

const normalizeToken = (value: string) => value.trim().toUpperCase();

function ScanPage() {
  const { state, confirmTransaction, getTransaction } = useYoha();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const lastDetectedRef = useRef("");
  const [token, setToken] = useState("");
  const [preview, setPreview] = useState<Transaction | null>(null);
  const [destination, setDestination] = useState<PointDestination | null>(null);
  const [success, setSuccess] = useState<{ points: number; items: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [scannerState, setScannerState] = useState<
    "idle" | "starting" | "scanning" | "unsupported"
  >("idle");
  const [cameraAccess, setCameraAccess] = useState<"idle" | "requesting" | "granted" | "denied">(
    "idle",
  );

  const lookup = useCallback(
    async (value: string) => {
      const normalized = normalizeToken(value);
      setError(null);
      if (!normalized) {
        setPreview(null);
        setDestination(null);
        return false;
      }
      if (state.user?.role !== "student") {
        setError(t("scanStudentRequired"));
        setPreview(null);
        return false;
      }
      let tx: Transaction | null = null;
      try {
        tx = await getTransaction(normalized);
      } catch {
        setError(t("scanInvalid"));
        setPreview(null);
        setDestination(null);
        return false;
      }
      if (!tx) {
        setError(t("scanInvalid"));
        setPreview(null);
        setDestination(null);
        return false;
      }
      const transactionStatus = getTransactionStatus(tx);
      if (transactionStatus === "confirmed") {
        setError(t("scanUsed"));
        setPreview(null);
        setDestination(null);
        return false;
      }
      if (transactionStatus === "expired") {
        setError(t("scanExpired"));
        setPreview(null);
        setDestination(null);
        return false;
      }
      if (transactionStatus === "cancelled") {
        setError(t("scanCancelled"));
        setPreview(null);
        setDestination(null);
        return false;
      }
      setPreview(tx);
      setDestination(null);
      return true;
    },
    [getTransaction, state.user?.role, t],
  );

  const applyToken = useCallback(
    async (value: string) => {
      const normalized = normalizeToken(value);
      setToken(normalized);
      await lookup(normalized);
    },
    [lookup],
  );

  const stopScanner = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;
    lastDetectedRef.current = "";
    setScannerState("idle");
  }, []);

  const startScanner = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) {
      setScannerState("unsupported");
      return;
    }

    setError(null);
    setCameraAccess("requesting");
    setScannerState("starting");

    try {
      // Ask for permission in this explicit user action. QrScanner will then open the
      // preferred rear camera for the live video stream below.
      const permissionStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      permissionStream.getTracks().forEach((track) => track.stop());
      setCameraAccess("granted");
      scannerRef.current?.destroy();
      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          const normalized = normalizeToken(result.data);
          if (normalized && normalized !== lastDetectedRef.current) {
            lastDetectedRef.current = normalized;
            void applyToken(normalized);
          }
        },
        {
          preferredCamera: "environment",
          maxScansPerSecond: 8,
          returnDetailedScanResult: true,
          onDecodeError: () => undefined,
        },
      );
      scannerRef.current = scanner;
      await scanner.start();
      setScannerState("scanning");
    } catch (cause) {
      setScannerState("idle");
      const name = cause instanceof DOMException ? cause.name : "";
      const denied = name === "NotAllowedError" || name === "SecurityError";
      setCameraAccess(denied ? "denied" : "idle");
      setError(denied ? t("scanCameraDenied") : t("scanCameraError"));
    }
  }, [applyToken, t]);

  useEffect(() => stopScanner, [stopScanner]);

  async function confirm() {
    if (!preview || !state.user) return;
    if (state.user.role !== "student") {
      setError(t("scanStudentRequired"));
      return;
    }
    if (!destination) {
      setError(t("scanSelectAllocation"));
      return;
    }
    setError(null);
    setIsConfirming(true);
    try {
      const c = await confirmTransaction(preview.token, destination, preview);
      if (!c) {
        setError(t("scanConfirmFail"));
        return;
      }
      setSuccess({ points: c.points, items: c.totalQuantity });
      setPreview(null);
      setDestination(null);
      setToken("");
      stopScanner();
    } catch (cause) {
      if (cause instanceof YohaApiError) {
        if (cause.status === 401) {
          setError(t("scanSessionExpired"));
        } else if (cause.status === 403) {
          setError(t("scanStudentRequired"));
        } else if (cause.status === 409 && cause.message.toLowerCase().includes("expired")) {
          setError(t("scanExpired"));
        } else if (cause.status === 409 && cause.message.toLowerCase().includes("used")) {
          setError(t("scanUsed"));
        } else {
          setError(cause.message || t("scanConfirmFail"));
        }
      } else {
        setError(t("scanConfirmFail"));
      }
    } finally {
      setIsConfirming(false);
    }
  }

  async function scanImage(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      await applyToken(result.data);
    } catch {
      setError(t("scanImageError"));
    }
  }

  if (success) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center px-5 text-center">
        <div className="animate-bounce text-7xl">♻️</div>
        <h1 className="mt-6 text-3xl font-bold">{t("scanSuccessTitle")}</h1>
        <p className="mt-2 text-muted-foreground">{t("scanSuccessThanks")}</p>
        <div className="mt-8 rounded-3xl bg-foreground p-8 text-background">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-glow/70">
            {t("scanSuccessYouEarned")}
          </p>
          <p className="mt-2 text-5xl font-bold text-primary-glow">+{success.points}</p>
          <p className="mt-1 text-sm opacity-70">
            {t("scanSuccessPoints", { count: success.items })}
          </p>
        </div>
        <div className="mt-8 flex w-full gap-3">
          <button
            onClick={() => setSuccess(null)}
            className="flex-1 rounded-xl border border-border bg-card py-3 font-semibold"
          >
            {t("scanScanAgain")}
          </button>
          <button
            onClick={() => navigate({ to: "/app" })}
            className="flex-1 rounded-xl bg-primary py-3 font-semibold text-primary-foreground"
          >
            {t("scanBackHome")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-5 pt-8">
      <h1 className="text-2xl font-bold">{t("scanTitle")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("scanDescription")}</p>

      <div className="relative mt-6 aspect-square overflow-hidden rounded-3xl border-2 border-dashed border-primary/40 bg-foreground/90">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
        />
        {scannerState !== "scanning" && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center text-background/70">
              <div className="text-5xl">📷</div>
              <p className="mt-3 text-sm">
                {scannerState === "unsupported"
                  ? t("scanUnsupported")
                  : cameraAccess === "denied"
                    ? t("scanCameraDenied")
                    : t("scanCameraPermissionDescription")}
              </p>
            </div>
          </div>
        )}
        {[
          "top-4 left-4 border-t-4 border-l-4",
          "top-4 right-4 border-t-4 border-r-4",
          "bottom-4 left-4 border-b-4 border-l-4",
          "bottom-4 right-4 border-b-4 border-r-4",
        ].map((c) => (
          <div key={c} className={`absolute size-10 border-primary-glow rounded-md ${c}`} />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={startScanner}
          disabled={scannerState === "starting" || scannerState === "scanning"}
          className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {scannerState === "starting"
            ? t("scanStarting")
            : cameraAccess === "granted"
              ? t("scanTitle")
              : t("scanCameraPermissionButton")}
        </button>
        <button
          type="button"
          onClick={stopScanner}
          disabled={scannerState !== "scanning"}
          className="rounded-xl border border-border bg-card py-3 text-sm font-bold disabled:opacity-40"
        >
          {t("scanStop")}
        </button>
      </div>
      {scannerState === "scanning" && (
        <p className="mt-3 text-center text-xs font-medium text-primary">{t("scanCameraActive")}</p>
      )}

      <div className="mt-6">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("scanManualLabel")}
        </label>
        <input
          value={token}
          onChange={(e) => {
            void applyToken(e.target.value);
          }}
          placeholder={t("scanTokenPlaceholder")}
          className="mt-1.5 w-full rounded-xl bg-card px-4 py-3 font-mono text-xs ring-1 ring-border focus:outline-none focus:ring-primary"
        />
      </div>

      <label className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-border bg-card px-4 py-3 text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary">
        {t("scanUploadLabel")}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => {
            void scanImage(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
      </label>

      {error && (
        <p className="mt-4 rounded-xl bg-coral/15 p-3 text-sm font-semibold text-coral">{error}</p>
      )}

      {preview && (
        <div className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-pop)] animate-scale-in">
          <p className="text-xs font-bold uppercase text-muted-foreground">
            {t("scanConfirmTitle")}
          </p>
          <p className="mt-2 text-lg font-bold">
            {getLocalizedCollectionPoint(preview.collectionPoint, t).name}
          </p>
          <ul className="mt-4 space-y-2">
            {preview.items.map((it, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2 text-sm"
              >
                <span>
                  {PLASTIC_ICON[it.plasticType]} <b>{PLASTIC_SHORT[it.plasticType]}</b> ×{" "}
                  {it.quantity} kg{" "}
                  <span className="text-xs text-muted-foreground">
                    · {CLEAN_SHORT[it.cleanliness]}
                  </span>
                </span>
                <span className="font-bold text-primary">+{it.points}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm text-muted-foreground">{t("scanConfirmTotal")}</span>
            <span className="text-xl font-bold text-primary">+{preview.points}</span>
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-sm font-bold">{t("scanAllocationTitle")}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t("scanAllocationDescription")}
            </p>
            <div className="mt-3 grid gap-2">
              <AllocationOption
                selected={destination === "rewards"}
                title={t("scanRewardsOption")}
                description={t("scanRewardsOptionDescription")}
                onClick={() => {
                  setDestination("rewards");
                  setError(null);
                }}
              />
              <AllocationOption
                selected={destination === "fundraising"}
                title={t("scanFundraisingOption")}
                description={t("scanFundraisingOptionDescription")}
                onClick={() => {
                  setDestination("fundraising");
                  setError(null);
                }}
              />
            </div>
          </div>
          <button
            onClick={confirm}
            disabled={isConfirming}
            className="mt-5 w-full rounded-xl bg-primary py-3.5 font-bold text-primary-foreground disabled:opacity-60"
          >
            {isConfirming ? t("authSubmitting") : t("scanConfirmButton")}
          </button>
        </div>
      )}
    </div>
  );
}

function AllocationOption({
  selected,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-2xl border p-3 text-left transition ${
        selected
          ? "border-primary bg-primary/10 ring-1 ring-primary"
          : "border-border bg-secondary/50 hover:border-primary/40"
      }`}
    >
      <span className="block text-sm font-bold">{title}</span>
      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
        {description}
      </span>
    </button>
  );
}
