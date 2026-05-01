"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { Children, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  delay?: number;
  stagger?: number;
  className?: string;
} & HTMLMotionProps<"div">;

export function FadeStagger({
  children,
  delay = 0,
  stagger = 0.07,
  className,
  ...rest
}: Props) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
      className={className}
      {...rest}
    >
      {Children.map(children, (child, i) => (
        <motion.div
          key={i}
          variants={{
            hidden: { opacity: 0, y: 8 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
            },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
