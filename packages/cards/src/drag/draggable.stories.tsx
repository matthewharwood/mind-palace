import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Card } from "../card/card";
import { CardSlot } from "../slot/card-slot";
import { Draggable } from "./draggable";
import { isActionable } from "./hit-test";
import type { DropResult } from "./schema";

type ElementId = "au" | "ag" | "cu";
const ELEMENTS: Record<ElementId, { n: number; sym: string; name: string; bg: string }> = {
  au: { n: 79, sym: "Au", name: "Gold", bg: "bg-amber-50 text-amber-950" },
  ag: { n: 47, sym: "Ag", name: "Silver", bg: "bg-slate-100 text-slate-800" },
  cu: { n: 29, sym: "Cu", name: "Copper", bg: "bg-orange-100 text-orange-900" },
};

function ElementFace({ id }: { id: ElementId }): React.ReactNode {
  const e = ELEMENTS[id];
  return (
    <div className={`flex h-full w-full flex-col justify-between p-3 ${e.bg}`}>
      <span className="text-xs font-semibold opacity-70">{e.n}</span>
      <span className="self-center text-4xl font-bold">{e.sym}</span>
      <span className="self-center text-sm">{e.name}</span>
    </div>
  );
}

// Interactive board: drag cards between slots (empty → drop, occupied → swap).
// Demonstrates the controlled contract — the engine reports intent, this demo
// owns the placement state. Not exported (keeps the story file component-clean).
const SLOT_IDS = ["slot-0", "slot-1", "slot-2", "slot-3"] as const;
function DragBoard(): React.ReactNode {
  const [slots, setSlots] = useState<Record<string, ElementId | null>>({
    "slot-0": "au",
    "slot-1": "ag",
    "slot-2": "cu",
    "slot-3": null,
  });

  function handleDrop(result: DropResult): void {
    const { source, target, intent } = result;
    if (!target || !isActionable(intent)) return;
    setSlots((prev) => {
      const moving = prev[source.id] ?? null;
      if (intent.kind === "swap") {
        return { ...prev, [target.id]: moving, [source.id]: prev[target.id] ?? null };
      }
      return { ...prev, [source.id]: null, [target.id]: moving };
    });
  }

  return (
    <div className="flex gap-4">
      {SLOT_IDS.map((slotId) => {
        const cardId = slots[slotId] ?? null;
        return (
          <CardSlot key={slotId} slotId={slotId} testId={slotId} occupied={cardId != null}>
            {cardId ? (
              <Draggable
                key={cardId}
                cardId={cardId}
                testId={`card-${cardId}`}
                source={{ kind: "slot", id: slotId }}
                onDrop={handleDrop}
              >
                <Card front={<ElementFace id={cardId} />} />
              </Draggable>
            ) : null}
          </CardSlot>
        );
      })}
    </div>
  );
}

// A single iPhone-SE-sized (375×667) card, draggable into a matching slot —
// proves the size abstraction: --mp-card-w/--mp-card-h (set here via Tailwind
// arbitrary properties) override the presets, and the drag feel is identical.
function PhoneBoard(): React.ReactNode {
  const PHONE = "[--mp-card-w:375px] [--mp-card-h:667px]";
  const [placed, setPlaced] = useState(false);

  function handleDrop(result: DropResult): void {
    if (result.target?.id === "phone-slot" && isActionable(result.intent)) setPlaced(true);
    else if (result.target === null) setPlaced(false);
  }

  return (
    <div className="flex items-center gap-8">
      <CardSlot slotId="home" className={PHONE} occupied={!placed}>
        {placed ? null : (
          <Draggable
            key="home"
            cardId="phone"
            source={{ kind: "slot", id: "home" }}
            onDrop={handleDrop}
          >
            <Card
              className={PHONE}
              front={
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-indigo-600 text-indigo-50">
                  <span className="text-2xl font-semibold">iPhone SE card</span>
                  <span className="text-sm opacity-80">375 × 667 — drag me →</span>
                </div>
              }
            />
          </Draggable>
        )}
      </CardSlot>

      <CardSlot slotId="phone-slot" className={PHONE} occupied={placed}>
        {placed ? (
          <Draggable
            key="phone"
            cardId="phone"
            source={{ kind: "slot", id: "phone-slot" }}
            onDrop={handleDrop}
          >
            <Card
              className={PHONE}
              front={
                <div className="flex h-full w-full items-center justify-center bg-emerald-600 text-emerald-50">
                  <span className="text-xl">Placed ✓</span>
                </div>
              }
            />
          </Draggable>
        ) : null}
      </CardSlot>
    </div>
  );
}

const meta = {
  title: "Cards/Draggable",
  component: Draggable,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Draggable>;

export default meta;
type Story = StoryObj<typeof Draggable>;

export const Board: Story = { render: () => <DragBoard /> };
export const IphoneSeSize: Story = { render: () => <PhoneBoard /> };
