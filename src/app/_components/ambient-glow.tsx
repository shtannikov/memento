"use client";

import { useLayoutEffect, useRef } from "react";

import styles from "./ambient-glow.module.css";

type AmbientGlowProps = {
  variation?: string;
};

type AmbientGlowMotion = Record<`--ambient-glow-${string}`, string>;

function randomBetween(
  random: () => number,
  minimum: number,
  maximum: number,
) {
  return minimum + random() * (maximum - minimum);
}

function format(value: number) {
  return Number(value.toFixed(2));
}

function createAmbientGlowDestination(
  random: () => number,
): AmbientGlowMotion {
  return {
    "--ambient-glow-x": `${format(randomBetween(random, 42, 58))}%`,
    "--ambient-glow-y": `${format(randomBetween(random, 36, 58))}%`,
  };
}

export function createAmbientGlowMotion(
  random: () => number = Math.random,
): AmbientGlowMotion {
  const destination = createAmbientGlowDestination(random);
  const driftX = randomBetween(random, -12, 12);
  const driftY = randomBetween(random, -9, 9);

  return {
    ...destination,
    "--ambient-glow-drift-x": `${format(driftX)}px`,
    "--ambient-glow-drift-y": `${format(driftY)}px`,
    "--ambient-glow-return-x": `${format(driftX * -0.7)}px`,
    "--ambient-glow-return-y": `${format(driftY * -0.7)}px`,
    "--ambient-glow-duration": `${format(
      randomBetween(random, 12, 18),
    )}s`,
  };
}

export function AmbientGlow({ variation }: AmbientGlowProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const variationRef = useRef(variation);

  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!field) return;

    const motion = createAmbientGlowMotion();
    for (const [property, value] of Object.entries(motion)) {
      field.style.setProperty(property, value);
    }
  }, []);

  useLayoutEffect(() => {
    if (variationRef.current === variation) return;
    variationRef.current = variation;

    const field = fieldRef.current;
    if (!field) return;

    const destination = createAmbientGlowDestination(Math.random);
    for (const [property, value] of Object.entries(destination)) {
      field.style.setProperty(property, value);
    }
  }, [variation]);

  return (
    <div
      ref={fieldRef}
      className={styles.field}
      aria-hidden="true"
      data-ambient-glow=""
    >
      <div className={styles.anchor}>
        <div className={styles.glow} />
      </div>
    </div>
  );
}
