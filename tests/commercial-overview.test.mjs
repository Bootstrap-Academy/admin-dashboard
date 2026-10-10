// What the commercial page and the navigation count as waiting. No DOM, no HTTP.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(
  new URL("../composables/commercialOverview.ts", import.meta.url),
  "utf8",
);
// The only import is a type; without it the file is a plain script.
const plain = source.replace(/^import type .*\n/m, "").replace(/^export /gm, "");
const code = ts.transpileModule(plain, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2023,
    module: ts.ModuleKind.None,
  },
}).outputText;
const { overviewTime, overviewDate, recordWork, waitingWork, caseLines } =
  new Function(
    code +
      "\nreturn {overviewTime, overviewDate, recordWork, waitingWork, caseLines};",
  )();

const at = (text) => Date.parse(text);
const item = (id, closed_at = null) => ({ id, closed_at });
const record = (case_id, review_due_at) => ({ case_id, review_due_at });

test("backend timestamps of both spellings become the same instant", () => {
  const instant = at("2026-09-12T08:14:03.123Z");
  for (const text of [
    "2026-09-12T08:14:03.123456Z",
    "2026-09-12T08:14:03.123456+00:00",
    "2026-09-12 08:14:03.123456+00",
    "2026-09-12 09:44:03.123456+0130",
    "2026-09-12T03:14:03.123-05",
  ])
    assert.equal(overviewTime(text), instant, text);
  assert.equal(overviewTime("2026-09-12 08:14+00"), at("2026-09-12T08:14Z"));
});

test("infinities, dates beyond the calendar and unreadable text never look like an ordinary day", () => {
  assert.equal(overviewTime("infinity"), Infinity);
  assert.equal(overviewTime("-infinity"), -Infinity);
  assert.equal(overviewTime("0044-03-15 12:00:00+00 BC"), -Infinity);
  assert.equal(overviewTime("9999999-01-01 00:00:00+00"), Infinity);
  assert(overviewTime("12026-01-01 00:00:00+00") > at("9999-12-31T23:59:59Z"));
  for (const text of ["", "soon", "2026-09-12", "2026-09-12 08:14:03"])
    assert.equal(overviewTime(text), null, text);
  for (const time of [null, Infinity, -Infinity])
    assert.equal(overviewDate(time, "de"), "");
});

test("a day is named in the business time zone", () => {
  // 22:30 UTC is already the next day in Berlin.
  const late = overviewTime("2026-09-30 22:30:00+00");
  assert.equal(overviewDate(late, "de"), "01.10.2026");
  assert.equal(overviewDate(late, "en-US"), "10/01/2026");
});

test("records are due up to and including the observed moment; later ones give the next date", () => {
  const now = at("2026-10-10T00:00:00Z");
  const work = recordWork(
    [
      record("a", "2026-09-12 08:00:00+00"),
      record("a", "2026-09-14 08:00:00+00"),
      record("a", "2027-04-01 08:00:00+00"),
      record("b", "2026-10-10 00:00:00+00"),
      record("c", "2026-10-10 00:00:01+00"),
      record("c", "2027-01-01 00:00:00+00"),
      record("d", "infinity"),
      record("e", "-infinity"),
      record("f", "not a date"),
    ],
    now,
  );
  assert.deepEqual(work.get("a"), {
    records: 3,
    due: 2,
    since: at("2026-09-12T08:00:00Z"),
    next: at("2027-04-01T08:00:00Z"),
  });
  assert.deepEqual(work.get("b"), { records: 1, due: 1, since: now, next: null });
  assert.deepEqual(work.get("c"), {
    records: 2,
    due: 0,
    since: null,
    next: at("2026-10-10T00:00:01Z"),
  });
  // No review date at all is neither due nor upcoming.
  assert.deepEqual(work.get("d"), { records: 1, due: 0, since: null, next: null });
  assert.deepEqual(work.get("e"), { records: 1, due: 1, since: -Infinity, next: null });
  // A record whose date cannot be read is shown as due instead of being skipped.
  assert.deepEqual(work.get("f"), { records: 1, due: 1, since: null, next: null });
  assert.deepEqual(waitingWork(work), {
    cases: 4,
    since: -Infinity,
    next: at("2026-10-10T00:00:01Z"),
  });
  assert.deepEqual(waitingWork(new Map()), { cases: 0, since: null, next: null });
});

test("cases are listed by what waits: longest due first, then upcoming, then the rest", () => {
  const now = at("2026-10-10T00:00:00Z");
  const cases = [
    item("clear-1"),
    item("later-far"),
    item("due-new"),
    item("closed", "2026-10-01T00:00:00Z"),
    item("later-near"),
    item("due-old"),
    item("closed-but-due", "2026-10-01T00:00:00Z"),
    item("clear-2"),
  ];
  const lines = caseLines(
    cases,
    recordWork(
      [
        record("later-far", "2028-01-01 00:00:00+00"),
        record("due-new", "2026-10-05 00:00:00+00"),
        record("later-near", "2027-01-01 00:00:00+00"),
        record("due-old", "2026-09-12 00:00:00+00"),
        record("closed-but-due", "2026-09-20 00:00:00+00"),
        record("clear-2", "infinity"),
      ],
      now,
    ),
  );
  assert.deepEqual(
    lines.map((line) => [line.row.id, line.state]),
    [
      ["due-old", "due"],
      // Work that is due is never hidden behind a closed case.
      ["closed-but-due", "due"],
      ["due-new", "due"],
      ["later-near", "later"],
      ["later-far", "later"],
      ["clear-1", "clear"],
      ["clear-2", "clear"],
      ["closed", "closed"],
    ],
  );
  assert.equal(lines[0].work.due, 1);
  assert.equal(lines[5].work, null);
  // Without any record list every open case is simply listed in its given order.
  assert.deepEqual(
    caseLines(cases, new Map()).map((line) => line.state),
    ["clear", "clear", "clear", "clear", "clear", "clear", "closed", "closed"],
  );
});
