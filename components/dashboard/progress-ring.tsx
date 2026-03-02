"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { useMotionValue, useSpring } from "motion/react";

const SIZE = 72;
const STROKE = 7;
const R = (SIZE - STROKE) / 2;

type Props = {
  completed: number;
  due: number;
};

export function ProgressRing({ completed, due }: Props) {
  const fraction = due > 0 ? completed / due : 0;
  const isPerfect = due > 0 && completed === due;

  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 120, damping: 20 });

  useEffect(() => {
    motionVal.set(fraction);
  }, [fraction, motionVal]);

  return (
    <div className="relative flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>
      <svg
        width={SIZE}
        height={SIZE}
        style={{ transform: "rotate(-90deg)" }}
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-muted"
        />
        {/* Progress */}
        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          pathLength={1}
          style={{ pathLength: spring }}
          className={isPerfect ? "stroke-green-500" : "stroke-primary"}
        />
      </svg>
      {/* Center label */}
      <span
        className="absolute text-xs font-semibold tabular-nums"
        style={{ lineHeight: 1 }}
      >
        {completed}/{due}
      </span>
    </div>
  );
}
