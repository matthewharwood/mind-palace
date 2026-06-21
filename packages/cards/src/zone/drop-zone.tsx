import type { ReactNode } from "react";

import { defineComponent } from "../lib/define-component";
import "../theme/tokens.css";
import "./drop-zone.css";
import { type DropZoneProps, DropZonePropsSchema } from "./schema";

// Region drop target. Renders the `data-drop-target` contract (kind="zone")
// plus border/tint feedback; content + footprint are the consumer's. Stateless.
export const DropZone = defineComponent(DropZonePropsSchema, (props: DropZoneProps): ReactNode => {
  const { zoneId, accepts, disabled = false, state = "idle", className, testId, children } = props;

  const rootClass = className ? `mp-zone ${className}` : "mp-zone";

  return (
    <div
      className={rootClass}
      data-drop-target=""
      data-target-kind="zone"
      data-target-id={zoneId}
      data-accepts={accepts}
      data-disabled={disabled ? "true" : undefined}
      data-state={disabled ? "disabled" : state}
      data-test={testId}
    >
      {children}
    </div>
  );
});
