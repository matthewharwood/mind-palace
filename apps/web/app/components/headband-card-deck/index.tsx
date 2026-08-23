import { CharacterDefinitionSchema } from "@mind-palace/schemas";
import { ChevronLeft, Printer, Scissors } from "lucide-react";
import type { ReactNode } from "react";
import * as z from "zod";

import { chunkCharacters } from "~/lib/character-party";
import { defineComponent } from "~/lib/define-component";

import "./styles.css";

const HeadbandCharacterCardPropsSchema = z.object({
  character: CharacterDefinitionSchema,
});
type HeadbandCharacterCardProps = z.infer<typeof HeadbandCharacterCardPropsSchema>;

function nameSizeClass(name: string): string {
  if (name.length > 24) return "headband-card-name headband-card-name-long";
  if (name.length > 16) return "headband-card-name headband-card-name-medium";
  return "headband-card-name";
}

const HeadbandCharacterCard = defineComponent(
  HeadbandCharacterCardPropsSchema,
  ({ character }: HeadbandCharacterCardProps): ReactNode => {
    return (
      <article className="headband-print-card" data-character-id={character.id}>
        <p className="headband-card-eyebrow">Who am I?</p>
        <h2 className={nameSizeClass(character.name)}>{character.name}</h2>
        <p className="headband-card-franchise">{character.franchise}</p>
        <p className="headband-card-footer">Character Party</p>
      </article>
    );
  },
);

export const HeadbandCardDeckPropsSchema = z.object({
  cards: z.array(CharacterDefinitionSchema).min(1).max(150),
  backHref: z.string().min(1),
});
export type HeadbandCardDeckProps = z.infer<typeof HeadbandCardDeckPropsSchema>;

export const HeadbandCardDeck = defineComponent(
  HeadbandCardDeckPropsSchema,
  ({ cards, backHref }: HeadbandCardDeckProps): ReactNode => {
    const pages = chunkCharacters(cards);
    return (
      <main className="character-print-deck">
        <header className="character-print-toolbar">
          <div>
            <a href={backHref} className="character-print-back-link">
              <ChevronLeft className="size-4" aria-hidden="true" />
              Headband game
            </a>
            <h1>Character Party cards</h1>
            <p>
              {cards.length} cards on {pages.length} US Letter sheets. Print at 100% / Actual Size,
              turn off browser headers and footers, then cut on the dashed lines.
            </p>
          </div>
          <button type="button" onClick={() => window.print()}>
            <Printer className="size-5" aria-hidden="true" />
            Print cards
          </button>
        </header>

        <div className="character-print-pages">
          {pages.map((page, pageIndex) => (
            <section
              key={page.map((character) => character.id).join(":")}
              className="headband-print-page"
              aria-label={`Printable card sheet ${pageIndex + 1} of ${pages.length}`}
            >
              {page.map((character) => (
                <HeadbandCharacterCard key={character.id} character={character} />
              ))}
            </section>
          ))}
        </div>

        <footer className="character-print-toolbar character-print-footer">
          <Scissors className="size-4" aria-hidden="true" />
          Cut carefully. Shuffle thoroughly. Keep every card face down until it reaches a headband.
        </footer>
      </main>
    );
  },
);
