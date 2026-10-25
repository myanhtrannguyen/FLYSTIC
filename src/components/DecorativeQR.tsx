/** Renders a deterministic decorative QR-like grid from a string. Not a real QR. */
export function DecorativeQR({ value, size = 200 }: { value: string; size?: number }) {
  const grid = 21;
  // Hash string into bits
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  const cells: boolean[] = [];
  for (let i = 0; i < grid * grid; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    cells.push((h & 0xff) > 120);
  }
  // Force corner markers
  const setCell = (x: number, y: number, v: boolean) => { cells[y * grid + x] = v; };
  const drawMarker = (cx: number, cy: number) => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      const onBorder = x === 0 || y === 0 || x === 6 || y === 6;
      const inCenter = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      setCell(cx + x, cy + y, onBorder || inCenter);
    }
  };
  drawMarker(0, 0);
  drawMarker(grid - 7, 0);
  drawMarker(0, grid - 7);

  const cell = size / grid;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-lg bg-white">
      <rect width={size} height={size} fill="white" />
      {cells.map((on, i) => {
        if (!on) return null;
        const x = (i % grid) * cell;
        const y = Math.floor(i / grid) * cell;
        return <rect key={i} x={x} y={y} width={cell} height={cell} fill="#0f1d14" />;
      })}
    </svg>
  );
}
