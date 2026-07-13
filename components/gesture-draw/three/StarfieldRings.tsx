"use client";

import { memo } from "react";

export const StarfieldRings = memo(function StarfieldRings() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="gesture-starfield" />
      <div className="gesture-atmosphere-veil" />
    </div>
  );
});
