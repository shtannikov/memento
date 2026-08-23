import { ArrowLeft } from "lucide-react";
import { Fragment } from "react";

import { AmbientGlow } from "./ambient-glow";
import styles from "./status-screen.module.css";

type StatusScreenProps = {
  title: string;
  supportingCopy: string;
  onBack?: () => void;
  backLabel?: string;
  animatedEllipsis?: boolean;
  onAction?: () => void;
  actionLabel?: string;
  role?: "alert" | "status";
};

export function StatusScreen({
  title,
  supportingCopy,
  onBack,
  backLabel = "Back",
  animatedEllipsis = true,
  onAction,
  actionLabel,
  role,
}: StatusScreenProps) {
  return (
    <div
      className={styles.centerScreen}
      role={role}
      aria-live={role === "status" ? "polite" : undefined}
    >
      <AmbientGlow variation={title} />
      {onBack && (
        <button className={styles.backButton} onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          {backLabel}
        </button>
      )}
      <h1 aria-label={animatedEllipsis ? `${title}...` : undefined}>
        {title}
        {animatedEllipsis && (
          <span className={styles.animatedDots} aria-hidden="true">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        )}
      </h1>
      <p className={styles.supportingCopy}>
        {supportingCopy.split("\n").map((line, index) => (
          <Fragment key={`${index}-${line}`}>
            {index > 0 && <br />}
            {line}
          </Fragment>
        ))}
      </p>
      {onAction && actionLabel && (
        <button className={styles.actionButton} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
