import type { ReactNode } from "react";

import { defineComponent } from "../lib/define-component";
import "../theme/tokens.css";
import "./card-slot.css";
import { type CardSlotProps, CardSlotPropsSchema } from "./schema";

// Single-occupant drop target. Renders the persistent empty-slot surface with
// the occupant (children) overlaid, plus the `data-drop-target` contract the
// drag engine hit-tests against. Stateless — feedback `state` is driven in.
export const CardSlot = defineComponent(CardSlotPropsSchema, (props: CardSlotProps): ReactNode => {
  const {
    slotId,
    accepts,
    disabled = false,
    locked = false,
    occupied,
    state = "idle",
    shape = "rounded",
    size = "md",
    className,
    testId,
    children,
  } = props;

  const isOccupied = occupied ?? children != null;
  const rootClass = className ? `mp-slot ${className}` : "mp-slot";

  return (
    <div
      className={rootClass}
      data-drop-target=""
      data-target-kind="slot"
      data-target-id={slotId}
      data-accepts={accepts}
      data-shape={shape}
      data-size={size}
      data-occupied={isOccupied ? "true" : undefined}
      data-disabled={disabled ? "true" : undefined}
      data-locked={locked ? "true" : undefined}
      data-state={disabled ? "disabled" : state}
      data-test={testId}
    >
      <div className="mp-slot-surface" aria-hidden="true" />
      {children}
    </div>
  );
});
