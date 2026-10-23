import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkupPrice,
  emptyInspection,
  parseInspection,
  urgentTotal,
  type Finding,
} from "../lib/autocheck";
test("pricing respects every category and plan", () => {
  assert.equal(checkupPrice("compact", "essential"), 149);
  assert.equal(checkupPrice("sedan", "complete"), 299);
  assert.equal(checkupPrice("suv", "premium"), 524);
});
test("urgent estimates exclude future repairs and handle cents", () => {
  const base = {
    id: "1",
    system: "Freios" as const,
    title: "Pastilhas",
    notes: "",
  };
  const findings: Finding[] = [
    { ...base, priority: "urgent", estimate: 120.5 },
    { ...base, id: "2", priority: "soon", estimate: 999 },
    { ...base, id: "3", priority: "urgent", estimate: 80.25 },
  ];
  assert.equal(urgentTotal(findings), 200.75);
  assert.equal(urgentTotal(findings.filter((f) => f.id !== "1")), 80.25);
  assert.equal(urgentTotal([]), 0);
});
test("local storage round trip and invalid payload protection", () => {
  assert.deepEqual(
    parseInspection(JSON.stringify(emptyInspection)),
    emptyInspection,
  );
  for (const value of [
    "null",
    "{}",
    "broken",
    JSON.stringify({ ...emptyInspection, category: "unknown" }),
    JSON.stringify({ ...emptyInspection, findings: [{ estimate: -1 }] }),
  ])
    assert.throws(() => parseInspection(value));
});
