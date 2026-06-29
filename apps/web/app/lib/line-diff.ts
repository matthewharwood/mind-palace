// A minimal LCS line diff for the write-code "show me the answer" view: compare
// the learner's lines against the expected solution and mark each line same /
// removed (theirs, not in the solution) / added (the solution's, missing from
// theirs). Pure → unit-tested; the id is built here so the JSX key isn't a raw
// array index.

export type DiffOp = { id: string; type: "same" | "add" | "remove"; text: string };

export function lineDiff(before: readonly string[], after: readonly string[]): DiffOp[] {
  const n = before.length;
  const m = after.length;
  // lcs[i][j] = length of the longest common subsequence of before[i:] / after[j:].
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      const row = lcs[i] ?? [];
      const nextRow = lcs[i + 1] ?? [];
      row[j] =
        before[i] === after[j]
          ? (nextRow[j + 1] ?? 0) + 1
          : Math.max(nextRow[j] ?? 0, row[j + 1] ?? 0);
    }
  }

  const ops: DiffOp[] = [];
  const push = (type: DiffOp["type"], text: string): void => {
    ops.push({ id: `d${ops.length}`, type, text });
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (before[i] === after[j]) {
      push("same", before[i] ?? "");
      i += 1;
      j += 1;
    } else if ((lcs[i + 1]?.[j] ?? 0) >= (lcs[i]?.[j + 1] ?? 0)) {
      push("remove", before[i] ?? "");
      i += 1;
    } else {
      push("add", after[j] ?? "");
      j += 1;
    }
  }
  while (i < n) {
    push("remove", before[i] ?? "");
    i += 1;
  }
  while (j < m) {
    push("add", after[j] ?? "");
    j += 1;
  }
  return ops;
}
