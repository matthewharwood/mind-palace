import {
  Card,
  CardSlot,
  createCardFeedback,
  Draggable,
  type DropResult,
  DropZone,
  isActionable,
} from "@mind-palace/cards";
import { createHaptics } from "@mind-palace/cards/haptics";
import { createCardSoundService } from "@mind-palace/cards/sound";
import { useAtomValue, useSetAtom } from "jotai";
import type { ReactNode } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";
import { alchemyBoardAtom } from "~/state/atoms";

// Bespoke use of the pristine @mind-palace/cards package: an alchemy reagent
// board built from the periodic-table card art, re-themed via token overrides,
// with sound + haptic feedback, and placements persisted IDB-first through the
// app's atomWithIDB (Pillar 3). The package itself stays generic; everything
// alchemy-specific lives here.

const DEFAULT_ELEMENTS = ["au", "ag", "cu", "fe", "zn"];
const DEFAULT_SLOTS = ["reagent-0", "reagent-1", "reagent-2"];

// Module-singleton feedback — the AudioContext stays lazy until first gesture,
// and haptics no-op where unsupported (iPad).
const sound = createCardSoundService();
const haptics = createHaptics();
const feedback = createCardFeedback({ sound, haptics });

function ElementCardFront({ symbol }: { symbol: string }): ReactNode {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-amber-50 p-2">
      <img
        src={`${import.meta.env.BASE_URL}element-card-art/${symbol}.webp`}
        alt={symbol}
        className="h-3/4 w-auto object-contain"
      />
      <span className="text-xs font-semibold text-amber-900 uppercase">{symbol}</span>
    </div>
  );
}

export const AlchemyBoardPropsSchema = z.object({
  elements: z.array(z.string()).optional(),
  slotIds: z.array(z.string()).optional(),
});
export type AlchemyBoardProps = z.infer<typeof AlchemyBoardPropsSchema>;

export const AlchemyBoard = defineComponent(
  AlchemyBoardPropsSchema,
  ({ elements = DEFAULT_ELEMENTS, slotIds = DEFAULT_SLOTS }: AlchemyBoardProps): ReactNode => {
    const board = useAtomValue(alchemyBoardAtom);
    const setBoard = useSetAtom(alchemyBoardAtom);

    const placed = board.slots;
    const placedCards = new Set(Object.values(placed));
    const tray = elements.filter((id) => !placedCards.has(id));

    function handleDrop(result: DropResult): void {
      const { target, intent, cardId } = result;
      if (!target || !isActionable(intent)) return;
      // The atom validates on set (atomWithIDB parses with the schema), so we
      // just compute the next placement here — no extra runtime parse.
      setBoard((prev) => {
        const slots = { ...prev.slots };
        const fromSlot = Object.keys(slots).find((s) => slots[s] === cardId);
        if (fromSlot) delete slots[fromSlot];
        if (target.kind === "slot") {
          const occupant = slots[target.id];
          if (occupant && fromSlot) slots[fromSlot] = occupant; // swap
          slots[target.id] = cardId;
        }
        return { ...prev, slots };
      });
    }

    return (
      // data-cards-scope bounds keyboard target-gathering to this board.
      // The bracketed classes re-theme the cards (parchment + gold) via tokens.
      <div
        data-cards-scope=""
        className="flex flex-col gap-6 [--mp-card-bg:#fdf6e3] [--mp-card-border-color:#caa45a] [--mp-card-radius:0.5rem]"
      >
        <DropZone
          zoneId="tray"
          testId="tray"
          accepts="element"
          className="flex min-h-40 flex-wrap items-center gap-3 p-4"
        >
          {tray.map((id) => (
            <Draggable
              key={id}
              cardId={id}
              testId={`card-${id}`}
              tags="element"
              label={id}
              source={{ kind: "tray", id: "tray" }}
              onDrop={handleDrop}
              {...feedback}
            >
              <Card size="sm" front={<ElementCardFront symbol={id} />} />
            </Draggable>
          ))}
        </DropZone>

        <div className="flex gap-4">
          {slotIds.map((slotId) => {
            const cardId = placed[slotId];
            return (
              <CardSlot
                key={slotId}
                slotId={slotId}
                testId={slotId}
                accepts="element"
                size="sm"
                occupied={cardId != null}
              >
                {cardId ? (
                  <Draggable
                    key={cardId}
                    cardId={cardId}
                    testId={`card-${cardId}`}
                    tags="element"
                    label={cardId}
                    source={{ kind: "slot", id: slotId }}
                    onDrop={handleDrop}
                    {...feedback}
                  >
                    <Card size="sm" front={<ElementCardFront symbol={cardId} />} />
                  </Draggable>
                ) : null}
              </CardSlot>
            );
          })}
        </div>
      </div>
    );
  },
);
