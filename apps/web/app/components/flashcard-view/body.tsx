import type { Flashcard } from "@mind-palace/curriculum";
import type { ReactNode } from "react";

import { ChoiceBody } from "./choice-body";
import { CodeBody } from "./code-body";
import { MiniGameBody } from "./mini-game-body";
import { ReadBody } from "./read-body";
import { VideoBody } from "./video-body";

// Polymorphic lesson-node renderer — switches on the flashcard's content union.
export function Body({ flashcard }: { flashcard: Flashcard }): ReactNode {
  const content = flashcard.content;
  switch (content.type) {
    case "read":
      return <ReadBody markdown={content.markdown} />;
    case "multiple-choice":
      return (
        <ChoiceBody
          question={content.question}
          code={content.code}
          language={content.language}
          options={content.options}
          answerIndex={content.answerIndex}
        />
      );
    case "video":
      return <VideoBody src={content.src} caption={content.caption} />;
    case "card-mini-game":
      return <MiniGameBody prompt={content.prompt} />;
    case "code":
      return (
        <CodeBody prompt={content.prompt} language={content.language} solution={content.solution} />
      );
    default:
      return null;
  }
}
