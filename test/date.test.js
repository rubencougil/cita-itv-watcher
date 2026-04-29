import test from "node:test";
import assert from "node:assert/strict";
import {
  compareIsoDates,
  extractDatesFromText,
  formatIsoDateForDisplay,
  formatIsoDateTimeForDisplay,
  isOnOrAfter,
  normalizeIsoDate,
} from "../src/date.js";

test("normaliza ISO", () => {
  assert.equal(normalizeIsoDate("2026-06-17"), "2026-06-17");
});

test("normaliza fecha con barra", () => {
  assert.equal(normalizeIsoDate("17/06/2026"), "2026-06-17");
});

test("normaliza fecha en español", () => {
  assert.equal(normalizeIsoDate("17 de junio de 2026"), "2026-06-17");
});

test("extrae varias fechas", () => {
  const dates = extractDatesFromText("Citas 17/06/2026, 2026-06-18 y 19 de junio de 2026");
  assert.deepEqual(dates, ["2026-06-17", "2026-06-18", "2026-06-19"]);
});

test("compara fechas", () => {
  assert.equal(compareIsoDates("2026-06-18", "2026-06-17"), 1);
  assert.equal(compareIsoDates("2026-06-17", "2026-06-17"), 0);
  assert.equal(compareIsoDates("2026-06-16", "2026-06-17"), -1);
});

test("filtra por fecha mínima", () => {
  assert.equal(isOnOrAfter("2026-06-17", "2026-06-17"), true);
  assert.equal(isOnOrAfter("2026-06-16", "2026-06-17"), false);
});

test("formatea fecha para telegram", () => {
  assert.equal(formatIsoDateForDisplay("2026-06-01"), "lun 1 jun 2026");
});

test("formatea fecha y hora para telegram", () => {
  assert.equal(formatIsoDateTimeForDisplay("2026-06-01 07:00:00"), "lun 1 jun 2026 · 07:00");
});
