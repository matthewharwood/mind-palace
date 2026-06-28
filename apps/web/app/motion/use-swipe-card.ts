// oxlint-disable react-doctor/exhaustive-deps -- API-design escape (same as
// use-anime): the effect re-binds only when the card element changes; the rate
// callback is read through a ref so it never needs to be a dependency.
import { animate, createDraggable } from "animejs";
import { type RefObject, useEffect, useRef } from "react";

// Tinder-style swipe-to-rate, layered on top of the always-present rating
// buttons (progressive enhancement). A side channel per the Pillar: all
// anime.js lives in the effect, never in render. Honors reduced-motion by
// not binding the gesture at all (buttons remain).
//
// Gesture → SRS rating:  right = good · left = again · up = easy · down = hard.
// Under the distance threshold the card springs back to centre (`snap: 0`).

export type SwipeRating = "again" | "hard" | "good" | "easy";

const PRM = "(prefers-reduced-motion: reduce)";
const THRESHOLD = 96; // px of travel before a release commits

export function useSwipeCard(
  ref: RefObject<HTMLElement | null>,
  onRate: (rating: SwipeRating) => void,
): void {
  const onRateRef = useRef(onRate);
  // Keep the latest callback without re-binding the gesture. Synced in an
  // effect (not during render) so a release fired later calls the current rate.
  useEffect(() => {
    onRateRef.current = onRate;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window !== "undefined" && window.matchMedia(PRM).matches) return;

    let committed = false;
    const draggable = createDraggable(el, {
      x: { snap: 0 },
      y: { snap: 0 },
      onRelease: (d) => {
        if (committed) return;
        const x = d.x;
        const y = d.y;
        const ax = Math.abs(x);
        const ay = Math.abs(y);

        let rating: SwipeRating | null = null;
        let offX = 0;
        let offY = 0;
        let rotate = 0;
        if (ax > THRESHOLD && ax >= ay) {
          rating = x > 0 ? "good" : "again";
          offX = x > 0 ? 720 : -720;
          rotate = x > 0 ? 18 : -18;
        } else if (ay > THRESHOLD) {
          rating = y < 0 ? "easy" : "hard";
          offY = y < 0 ? -820 : 820;
        }
        if (!rating) return; // under threshold → snaps back to centre

        committed = true;
        const decided = rating;
        d.disable();
        animate(el, {
          x: offX,
          y: offY,
          rotate,
          opacity: 0,
          duration: 280,
          ease: "out(3)",
          onComplete: () => onRateRef.current(decided),
        });
      },
    });

    return () => {
      draggable.revert();
    };
  }, [ref]);
}
