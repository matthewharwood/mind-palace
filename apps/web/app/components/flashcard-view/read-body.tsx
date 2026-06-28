import type { ReactNode } from "react";

import { Prose } from "./markdown";

export function ReadBody({ markdown }: { markdown: string }): ReactNode {
  return <Prose markdown={markdown} />;
}
