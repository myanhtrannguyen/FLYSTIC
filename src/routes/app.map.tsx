import { createFileRoute } from "@tanstack/react-router";
import {
  COLLECTION_POINTS,
  getStationFillKg,
  getStationFillPercent,
  getLocalizedCollectionPoint,
  useTranslation,
  useYoha,
} from "@/lib/yoha-store";
import hustMap from "@/assets/hust-campus-map.JPG";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const ZOOM_STEP = 0.25;
const MIN_ZOOM = 1;
const MAX_ZOOM = 2;

export const Route = createFileRoute("/app/map")({
  component: MapPage,
});

function MapPage() {
  const { t } = useTranslation();
  const { state, isRemote } = useYoha();
  const points = COLLECTION_POINTS;
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const mapFrameRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);

  function clampPan(position: { x: number; y: number }, scale: number) {
    const frame = mapFrameRef.current;
    if (!frame) return position;

    const { width, height } = frame.getBoundingClientRect();
    const maxX = (width * (scale - 1)) / 2;
    const maxY = (height * (scale - 1)) / 2;

    return {
      x: Math.max(-maxX, Math.min(maxX, position.x)),
      y: Math.max(-maxY, Math.min(maxY, position.y)),
    };
  }

  function changeZoom(delta: number) {
    setZoom((currentZoom) => {
      const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom + delta));
      setPan((currentPan) => clampPan(currentPan, nextZoom));
      return nextZoom;
    });
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (zoom === MIN_ZOOM || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    setIsDragging(true);
  }

  function drag(event: ReactPointerEvent<HTMLDivElement>) {
    const start = dragStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    event.preventDefault();
    setPan(
      clampPan(
        { x: start.panX + event.clientX - start.x, y: start.panY + event.clientY - start.y },
        zoom,
      ),
    );
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStartRef.current?.pointerId !== event.pointerId) return;
    dragStartRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pb-8 pt-8 lg:px-10 lg:pt-10">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-bold lg:text-3xl">{t("mapTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("mapDescription")}</p>
      </header>

      <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.8fr)] xl:items-start">
        <div
          ref={mapFrameRef}
          className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-pop)]"
        >
          <div
            onPointerDown={startDrag}
            onPointerMove={drag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className={`relative aspect-[48/41] origin-center ${zoom > MIN_ZOOM ? "cursor-grab touch-none" : ""} ${isDragging ? "cursor-grabbing" : "transition-transform duration-200"}`}
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          >
            <img
              src={hustMap}
              alt="Bản đồ Đại học Bách khoa Hà Nội"
              loading="lazy"
              width={960}
              height={820}
              className="block size-full object-cover"
            />
            {points.map((point, index) => (
              <div
                key={point.id}
                className="absolute -translate-x-1/2 -translate-y-full"
                style={{ left: point.mapPosition.x, top: point.mapPosition.y }}
              >
                <div className="animate-float" style={{ animationDelay: `${index * 0.35}s` }}>
                  <div className="grid size-9 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-lg ring-2 ring-white">
                    {index + 1}
                  </div>
                  <div className="mx-auto h-2 w-2 rotate-45 -translate-y-1 bg-primary" />
                </div>
              </div>
            ))}
          </div>
          <div className="absolute right-3 top-3 rounded-full bg-card/95 px-3 py-1 text-xs font-semibold shadow backdrop-blur">
            {t("mapPins", { count: points.length })}
          </div>
          <div className="absolute left-3 bottom-3 rounded-xl bg-card/95 px-3 py-2 text-[10px] font-medium shadow backdrop-blur">
            <span className="font-bold">{t("mapUniversity")}</span>
            <br />
            <span className="text-muted-foreground">{t("mapPins", { count: points.length })}</span>
          </div>
          <div className="absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-xl border border-border bg-card/95 shadow backdrop-blur">
            <button
              type="button"
              onClick={() => changeZoom(ZOOM_STEP)}
              disabled={zoom === MAX_ZOOM}
              aria-label={t("mapZoomIn")}
              className="grid size-9 place-items-center text-lg font-bold transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => changeZoom(-ZOOM_STEP)}
              disabled={zoom === MIN_ZOOM}
              aria-label={t("mapZoomOut")}
              className="grid size-9 place-items-center border-t border-border text-lg font-bold transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
            >
              −
            </button>
          </div>
        </div>

        <ul className="space-y-3 xl:max-h-[44rem] xl:overflow-y-auto xl:pr-1">
          {points.map((p, i) => {
            const remoteStation = state.stations.find((station) => station.id === p.id);
            const fillPercent = isRemote
              ? (remoteStation?.fillPercent ?? 0)
              : getStationFillPercent(state.transactions, state.collectionRuns, p);
            const filledKg = (
              isRemote
                ? (remoteStation?.filledKg ?? 0)
                : getStationFillKg(state.transactions, state.collectionRuns, p.name)
            ).toFixed(1);

            return (
              <li
                key={p.id}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
              >
                <div className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground font-bold">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{getLocalizedCollectionPoint(p, t).name}</p>
                  <p className="text-xs text-muted-foreground">
                    {getLocalizedCollectionPoint(p, t).address}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {t("mapStorageCurrent", { filled: filledKg, capacity: p.capacityKg })}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-xs font-bold ${fillPercent > 80 ? "text-coral" : "text-primary"}`}
                  >
                    {fillPercent}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">{t("mapCapacity")}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
