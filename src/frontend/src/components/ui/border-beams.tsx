import { motion } from "framer-motion";
import { cn } from "@/utils/utils";

type BorderBeamProps = {
  className?: string;
  duration?: number;
  size?: number;
  colorFrom?: string;
  colorTo?: string;
  anchor?: number;
  borderWidth?: number;
};

export function BorderBeam({
  className,
  duration = 12,
  size = 200,
  colorFrom = "#C661B8",
  colorTo = "#61C6B8",
  anchor = 20,
  borderWidth = 1.5,
}: BorderBeamProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]",
        className,
      )}
    >
      <motion.div
        className="absolute"
        style={{
          width: size,
          height: borderWidth,
          top: anchor,
          left: -size / 2,
          background: `linear-gradient(90deg, ${colorFrom}, ${colorTo})`,
          filter: "blur(0.5px)",
        }}
        animate={{ x: ["0%", "140%"] }}
        transition={{
          duration,
          ease: "linear",
          repeat: Number.POSITIVE_INFINITY,
        }}
      />
    </div>
  );
}

