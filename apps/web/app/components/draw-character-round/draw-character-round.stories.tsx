import {
  CHARACTER_PARTY_SESSION_DEFAULT,
  CharacterDefinitionSchema,
  CharacterPartySessionSchema,
} from "@mind-palace/schemas";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { DrawCharacterRound } from "./index";

const pikachu = CharacterDefinitionSchema.parse({
  id: "pikachu",
  name: "Pikachu",
  franchise: "Pokémon",
  difficulty: "easy",
  generation: "1990s-2000s",
  category: "video-game",
  drawable: true,
  headbandEligible: true,
  imageSearchTerm: "Pikachu character",
  wikipediaTitle: "Pikachu",
});

const staticReference = async () => ({
  imageUrl: `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="#fff3a5"/><circle cx="300" cy="300" r="180" fill="#f6cf35"/><circle cx="235" cy="270" r="18"/><circle cx="365" cy="270" r="18"/><path d="M250 365 Q300 405 350 365" fill="none" stroke="#24172c" stroke-width="14" stroke-linecap="round"/><circle cx="190" cy="335" r="34" fill="#ef4d66"/><circle cx="410" cy="335" r="34" fill="#ef4d66"/></svg>',
  )}`,
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Pikachu_Parade.jpg",
  sourceName: "Wikimedia Commons",
  creatorName: "Yoshikazu TAKADA",
  licenseName: "CC BY 2.0",
  licenseUrl: "https://creativecommons.org/licenses/by/2.0",
});

const sharedArgs = {
  character: pikachu,
  characterCount: 180,
  homeHref: "/apps/character-party",
  loadReference: staticReference,
  onConfigure: () => undefined,
  onStart: () => undefined,
  onReveal: () => undefined,
  onSkip: () => undefined,
  onNext: () => undefined,
  onStartTimer: () => undefined,
  onEnd: () => undefined,
};

const meta = {
  title: "App/CharacterParty/DrawRound",
  component: DrawCharacterRound,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof DrawCharacterRound>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Setup: Story = {
  args: { ...sharedArgs, session: CHARACTER_PARTY_SESSION_DEFAULT, character: null },
};

export const Prompt: Story = {
  args: {
    ...sharedArgs,
    session: CharacterPartySessionSchema.parse({
      phase: "prompt",
      currentCharacterId: pikachu.id,
      presentedCount: 4,
      recentCharacterIds: [pikachu.id],
    }),
  },
};

export const Revealed: Story = {
  args: {
    ...sharedArgs,
    session: CharacterPartySessionSchema.parse({
      phase: "revealed",
      currentCharacterId: pikachu.id,
      presentedCount: 4,
      recentCharacterIds: [pikachu.id],
      completedCharacterIds: [pikachu.id],
      history: { [pikachu.id]: { usedCount: 1, lastUsed: 1_000 } },
    }),
  },
};

export const MissingImageFallback: Story = {
  args: {
    ...Revealed.args,
    loadReference: async () => null,
  },
};
