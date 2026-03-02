"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899", "#f97316"];

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function Confetti() {
  const today = new Date().toISOString().slice(0, 10);
  const storageKey = `confetti_shown_${today}`;

  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    if (localStorage.getItem(storageKey)) return;
    localStorage.setItem(storageKey, "1");
    setShow(true);
    const timer = setTimeout(() => setShow(false), 3500);
    return () => clearTimeout(timer);
  }, [storageKey]);

  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: `${randomBetween(0, 100)}vw`,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    width: randomBetween(6, 14),
    height: randomBetween(6, 14),
    duration: randomBetween(1.5, 3),
    delay: randomBetween(0, 0.5),
    rotate: Math.random() > 0.5 ? 720 : -720,
  }));

  return (
    <AnimatePresence>
      {show && (
        <div
          className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
          aria-hidden="true"
        >
          {pieces.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: p.x, y: "-10px", rotate: 0, opacity: 1 }}
              animate={{
                y: "110vh",
                rotate: p.rotate,
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: "easeIn",
              }}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: p.width,
                height: p.height,
                backgroundColor: p.color,
                borderRadius: 2,
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
