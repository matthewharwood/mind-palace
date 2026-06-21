import type { ReactNode } from "react";

import { defineComponent } from "../lib/define-component";
import "../theme/tokens.css";
import "./card.css";
import { type CardProps, CardPropsSchema } from "./schema";

// Presentational card primitive: shape + size + optional 3D flip, fully
// theme-token driven. No drag/sound/haptics here — those compose on top in
// later phases. Content is whatever ReactNode you pass as front/back, so the
// same primitive renders an element tile, a flashcard, or a photo.
export const Card = defineComponent(CardPropsSchema, (props: CardProps): ReactNode => {
  // Defaults live here (parse is dev-only, so this is the prod-safe source).
  // `label` is intentionally not consumed yet — ARIA/roles are designed
  // holistically in the a11y phase; the root stays semantically plain for now.
  const {
    front,
    back,
    shape = "rounded",
    size = "md",
    face = "front",
    flippable = false,
    disabled = false,
    state = "idle",
    cardId,
    className,
    testId,
  } = props;

  const rootClass = className ? `mp-card ${className}` : "mp-card";

  return (
    <div
      className={rootClass}
      data-shape={shape}
      data-size={size}
      data-face={flippable ? face : "front"}
      data-state={disabled ? "disabled" : state}
      data-disabled={disabled ? "true" : undefined}
      data-card-id={cardId}
      data-test={testId}
    >
      <div className="mp-card-inner">
        <div className="mp-card-face mp-card-face-front">{front}</div>
        {flippable ? <div className="mp-card-face mp-card-face-back">{back}</div> : null}
      </div>
    </div>
  );
});
