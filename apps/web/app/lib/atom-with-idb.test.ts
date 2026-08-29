import { expect, test } from "bun:test";
import { createStore } from "jotai/vanilla";
import * as z from "zod";

import { atomWithIDB } from "./atom-with-idb";

const ExampleSchema = z.object({ count: z.int().nonnegative() });

test("remote IDB writes refresh the memory atom without broadcasting them again", async () => {
  let notifyRemoteWrite: () => void = () => undefined;
  let remoteValue: z.infer<typeof ExampleSchema> | undefined;
  const persistedLocally: z.infer<typeof ExampleSchema>[] = [];
  const exampleAtom = atomWithIDB(
    ExampleSchema,
    () => undefined,
    (value) => persistedLocally.push(value),
    { count: 0 },
    {
      subscribe: (onChange) => {
        notifyRemoteWrite = onChange;
        return () => {
          notifyRemoteWrite = () => undefined;
        };
      },
      read: async () => remoteValue,
    },
  );
  const store = createStore();
  const unsubscribe = store.sub(exampleAtom, () => undefined);

  await Promise.resolve();
  await Promise.resolve();
  expect(store.get(exampleAtom)).toEqual({ count: 0 });

  remoteValue = { count: 3 };
  notifyRemoteWrite();
  await Promise.resolve();
  await Promise.resolve();

  expect(store.get(exampleAtom)).toEqual({ count: 3 });
  expect(persistedLocally).toEqual([]);
  unsubscribe();
});

test("mount refreshes missed remote writes and ignores an outdated read after a local write", async () => {
  const { promise: pendingRead, resolve: resolveRead } =
    Promise.withResolvers<z.infer<typeof ExampleSchema>>();
  const persistedLocally: z.infer<typeof ExampleSchema>[] = [];
  const exampleAtom = atomWithIDB(
    ExampleSchema,
    () => undefined,
    (value) => persistedLocally.push(value),
    { count: 0 },
    {
      subscribe: () => () => undefined,
      read: () => pendingRead,
    },
  );
  const store = createStore();
  const unsubscribe = store.sub(exampleAtom, () => undefined);

  store.set(exampleAtom, { count: 4 });
  resolveRead({ count: 2 });
  await Promise.resolve();
  await Promise.resolve();

  expect(store.get(exampleAtom)).toEqual({ count: 4 });
  expect(persistedLocally).toEqual([{ count: 4 }]);
  unsubscribe();
});
