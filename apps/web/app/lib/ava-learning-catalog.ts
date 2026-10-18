import {
  type AvaCollectionId,
  AvaCollectionIdSchema,
  AvaLearningSubjectSchema,
} from "@mind-palace/schemas";
import * as z from "zod";

export const AvaLearningCardSchema = z.object({
  id: z.string().regex(/^[a-z][a-z-]*$/),
  label: z.string().min(1),
  prompt: z.string().min(1),
  action: z.string().min(1),
  hint: z.string().min(1),
  opposite: z.string().optional(),
  subject: AvaLearningSubjectSchema.default("ava"),
});
export type AvaLearningCard = z.infer<typeof AvaLearningCardSchema>;
const CollectionSchema = z.object({
  id: AvaCollectionIdSchema,
  title: z.string(),
  subtitle: z.string(),
  description: z.string(),
  color: z.string(),
  cards: z.array(AvaLearningCardSchema).min(10),
});
export type AvaCollection = z.infer<typeof CollectionSchema>;

const actionSpecs = [
  ["jump", "Jump", "jumping", "Bend your knees, then jump together."],
  ["eat", "Eat", "eating", "Pretend to take a little bite."],
  ["drink", "Drink", "drinking", "Take a sip of water together."],
  ["sleep", "Sleep", "sleeping", "Rest your cheek on your hands."],
  ["wash", "Wash", "washing", "Rub your hands together like you are washing."],
  ["open", "Open", "opening", "Open a box and see what is inside."],
  ["hug", "Hug", "hugging", "Give a favorite soft toy a gentle hug."],
  ["run", "Run", "running", "Run your fingers across your palm."],
  ["walk", "Walk", "walking", "Take a few slow steps together."],
  ["dance", "Dance", "dancing", "Sway from side to side together."],
  ["clap", "Clap", "clapping", "Clap your hands two times."],
  ["wave", "Wave", "waving", "Wave hello to someone you love."],
  ["sit", "Sit", "sitting", "Sit down on a little chair together."],
  ["stand", "Stand", "standing", "Stand up tall together."],
  ["kick", "Kick", "kicking", "Give a soft ball a little kick."],
  ["throw", "Throw", "throwing", "Gently toss a soft ball."],
  ["catch", "Catch", "catching", "Hold your hands out for a soft ball."],
  ["push", "Push", "pushing", "Push a toy car across the table."],
  ["pull", "Pull", "pulling", "Pull a toy wagon toward you."],
  ["close", "Close", "closing", "Close the box after you open it."],
] as const;
const actions = actionSpecs.map(([id, label, doing, hint]) => ({
  id,
  label,
  prompt: `Which one is ${doing}?`,
  action: id,
  hint,
}));
const needsSpecs = [
  ["more", "More", "eat", "Pause with a small snack and let Ava ask for more."],
  ["help", "Help", "help", "Offer a closed box and wait for a request for help."],
  ["stop", "Stop", "stop", "Stop rolling a ball when Ava says or gestures stop."],
  ["again", "Again", "jump", "Do one little jump, pause, and invite again."],
  ["mine", "Mine", "hug", "Hold a favorite toy close and say mine."],
  ["all-done", "All done", "all-done", "Put the empty bowl away when Ava is finished."],
  ["please", "Please", "please", "Model please while offering a favorite toy."],
  ["thank-you", "Thank you", "thank-you", "Take turns giving a toy and saying thank you."],
  ["yes", "Yes", "yes", "Nod yes together."],
  ["no", "No", "no", "Shake your head gently; respect Ava's no."],
  ["want", "Want", "please", "Point toward something Ava wants and wait."],
  ["water", "Water", "drink", "Offer water and say its name."],
  ["milk", "Milk", "milk", "Use the word during an ordinary milk break."],
  ["hungry", "Hungry", "eat", "Name hungry before a snack."],
  ["thirsty", "Thirsty", "drink", "Name thirsty before a drink."],
  ["tired", "Tired", "sleep", "Notice a yawn and model tired."],
  ["potty", "Potty", "potty", "Use the word in your usual bathroom routine."],
  ["hurt", "Hurt", "hurt", "Point gently to a toy's bandage and say hurt."],
  ["hot", "Hot", "hot", "Point to pretend steam; use a cool, safe prop."],
  ["cold", "Cold", "cold", "Touch a cool cup and describe cold."],
] as const;
const needs = needsSpecs.map(([id, label, _action, hint]) => ({
  id,
  label,
  action: `need-${id}`,
  hint,
  prompt: `Which one means ${label.toLowerCase()}?`,
}));
const oppositePairs = [
  ["big", "small", "Compare a big ball and a small ball."],
  ["tall", "short", "Build a tall tower and a short tower."],
  ["hot", "cold", "Compare pretend steam and an ice cube."],
  ["wet", "dry", "Compare a wet sponge and a dry sponge."],
  ["fast", "slow", "Roll two toy cars at different speeds."],
  ["happy", "sad", "Name the feeling without asking Ava to change it."],
  ["open", "closed", "Open and close a little toy box."],
  ["full", "empty", "Put blocks in a bowl, then take them out."],
  ["clean", "dirty", "Wash the pretend muddy toy."],
  ["heavy", "light", "Compare a soft feather and a toy block."],
] as const;
const opposites = oppositePairs.flatMap(([first, second, hint]) =>
  [first, second].map((id) => ({
    id,
    label: id[0]?.toUpperCase() + id.slice(1),
    action: `opposite-${id}`,
    opposite: id === first ? second : first,
    hint,
    prompt: `Which one is ${id}?`,
  })),
);
const FIRST_CHARACTER = /^./;
const positionSpecs = [
  ["inside", "The ball is inside the box."],
  ["outside", "The ball is outside the box."],
  ["on", "The ball is on the box."],
  ["under", "The ball is under the table."],
  ["behind", "Turn the scene to find the ball behind the box."],
  ["in-front", "The ball is in front of the box."],
  ["beside", "The ball is beside the box."],
  ["between", "The ball is between two boxes."],
  ["above", "The ball is above the box."],
  ["below", "The ball is below the table."],
  ["near", "The ball is near the box."],
  ["far", "The ball is far from the box."],
] as const;
const positions = positionSpecs.map(([id, hint]) => ({
  id,
  label: id.replaceAll("-", " ").replace(FIRST_CHARACTER, (letter) => letter.toUpperCase()),
  action: `position-${id}`,
  prompt: `Where is the ball? Find ${id.replaceAll("-", " ")}.`,
  hint,
}));
const phraseSpecs = [
  ["ava-jumps", "Ava jumps", "jump", "ava"],
  ["mommy-eats", "Mommy eats", "eat", "mommy"],
  ["daddy-hugs", "Daddy hugs", "hug", "daddy"],
  ["dog-runs", "Dog runs", "run", "dog"],
  ["ava-drinks", "Ava drinks", "drink", "ava"],
  ["mommy-waves", "Mommy waves", "wave", "mommy"],
  ["daddy-claps", "Daddy claps", "clap", "daddy"],
  ["dog-sleeps", "Dog sleeps", "sleep", "dog"],
  ["more-milk", "More milk", "milk", "ava"],
  ["more-water", "More water", "drink", "ava"],
  ["big-dog", "Big dog", "opposite-big-dog", "dog"],
  ["little-dog", "Little dog", "opposite-small-dog", "dog"],
  ["red-ball", "Red ball", "red-ball", "ava"],
  ["blue-ball", "Blue ball", "blue-ball", "ava"],
  ["door-open", "Door open", "opposite-open", "ava"],
  ["door-closed", "Door closed", "opposite-closed", "ava"],
  ["ava-dances", "Ava dances", "dance", "ava"],
  ["mommy-walks", "Mommy walks", "walk", "mommy"],
  ["daddy-sits", "Daddy sits", "sit", "daddy"],
  ["dog-jumps", "Dog jumps", "jump", "dog"],
] as const;
const phrases = phraseSpecs.map(([id, label, action, subject]) => ({
  id,
  label,
  action,
  subject,
  prompt: `Can you find ${label.toLowerCase()}?`,
  hint: `Try saying ${label.toLowerCase()} together. Pause to let Ava join in.`,
}));

export const AVA_COLLECTIONS: readonly AvaCollection[] = z.array(CollectionSchema).parse([
  {
    id: "ava-actions",
    title: "Action Words",
    subtitle: "What can we do?",
    description: "Twenty everyday actions. Watch, find, and combine them into little sentences.",
    color: "#e58651",
    cards: actions,
  },
  {
    id: "ava-needs",
    title: "My Wants & Needs",
    subtitle: "My words have power",
    description: "Useful words for asking, choosing, stopping, and telling you how she feels.",
    color: "#619d90",
    cards: needs,
  },
  {
    id: "ava-opposites",
    title: "Opposites & Descriptions",
    subtitle: "Same world, different words",
    description: "Ten contrasting pairs to compare size, speed, temperature, feelings, and more.",
    color: "#b58ac1",
    cards: opposites,
  },
  {
    id: "ava-positions",
    title: "Where Is It?",
    subtitle: "A little game of hide and seek",
    description: "Move around real 3D scenes to explore twelve useful location words.",
    color: "#709ac7",
    cards: positions,
  },
  {
    id: "ava-two-words",
    title: "Two Words Together",
    subtitle: "Little words, bigger ideas",
    description: "Combine people, actions, colors, and objects into meaningful phrases.",
    color: "#c69f52",
    cards: phrases,
  },
]);

export function getAvaCollection(id: AvaCollectionId): AvaCollection {
  const collection = AVA_COLLECTIONS.find((item) => item.id === id);
  if (!collection) throw new Error(`Unknown Ava collection: ${id}`);
  return collection;
}
export function avaSceneId(card: AvaLearningCard, subject = card.subject): string {
  return `${subject}-${card.action}`;
}
export function avaActionPhrase(action: string, subject: string): string {
  const verbs: Record<string, string> = {
    jump: "jumps",
    eat: "eats",
    drink: "drinks",
    sleep: "sleeps",
    wash: "washes",
    open: "opens",
    hug: "hugs",
    run: "runs",
    walk: "walks",
    dance: "dances",
    clap: "claps",
    wave: "waves",
    sit: "sits",
    stand: "stands",
    kick: "kicks",
    throw: "throws",
    catch: "catches",
    push: "pushes",
    pull: "pulls",
    close: "closes",
  };
  const names: Record<string, string> = { ava: "Ava", mommy: "Mommy", daddy: "Daddy", dog: "Dog" };
  return `${names[subject] ?? "Ava"} ${verbs[action] ?? action}`;
}
