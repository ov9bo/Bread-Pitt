"use client";

import { animate, useMotionValue, useTransform, motion } from "framer-motion";
import { useEffect } from "react";

export function SpringCounter({
  to,
  duration = 1.4,
  format = (n: number) => Math.round(n).toString(),
  className,
}: {
  to: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const mv = useMotionValue(0);
  const display = useTransform(mv, (n) => format(n));

  useEffect(() => {
    const controls = animate(mv, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
    });
    return controls.stop;
  }, [to, duration, mv]);

  return <motion.span className={className}>{display}</motion.span>;
}

/**
 * Live countdown — accepts a target Date and renders HH:MM:SS, ticking
 * every second. Stops at zero. Used for "Feed Crustopher in 03:42:11".
 */
export function Countdown({
  to,
  className,
}: {
  to: Date | string | number;
  className?: string;
}) {
  const target = typeof to === "object" ? to.getTime() : new Date(to).getTime();
  const mv = useMotionValue(Math.max(0, target - Date.now()));
  const display = useTransform(mv, (ms) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  });

  useEffect(() => {
    const id = setInterval(() => {
      mv.set(Math.max(0, target - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [target, mv]);

  return <motion.span className={className}>{display}</motion.span>;
}
