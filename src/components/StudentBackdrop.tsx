import { type CSSProperties, type ReactNode } from "react";

/** Decorative background shared by the student-facing pages. */
export function StudentBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute -left-16 -top-20 size-72 rounded-full bg-primary-glow/30 blur-3xl" />
      <div className="absolute -right-20 top-40 size-72 rounded-full bg-ocean/20 blur-3xl" />
      <div className="absolute bottom-10 left-10 size-60 rounded-full bg-sunshine/25 blur-3xl" />
      <Floater pos="left-4 top-32" delay="0s" size={36} rot="-12deg">
        🧴
      </Floater>
      <Floater pos="right-6 top-52" delay="1.2s" size={32} rot="14deg">
        ♻️
      </Floater>
      <Floater pos="left-8 top-[55%]" delay="2s" size={28} rot="8deg">
        🌱
      </Floater>
      <Floater pos="right-4 top-[68%]" delay="0.6s" size={30} rot="-10deg">
        💧
      </Floater>
      <Floater pos="left-1/2 bottom-20" delay="1.8s" size={26} rot="20deg">
        🥤
      </Floater>
    </div>
  );
}

function Floater({
  children,
  pos,
  delay,
  size,
  rot,
}: {
  children: ReactNode;
  pos: string;
  delay: string;
  size: number;
  rot: string;
}) {
  return (
    <span
      className={`absolute ${pos} animate-float opacity-30`}
      style={{ fontSize: size, animationDelay: delay, "--r": rot } as CSSProperties}
    >
      {children}
    </span>
  );
}
