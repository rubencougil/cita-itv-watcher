const SPANISH_MONTHS = new Map([
  ["enero", 1],
  ["febrero", 2],
  ["marzo", 3],
  ["abril", 4],
  ["mayo", 5],
  ["junio", 6],
  ["julio", 7],
  ["agosto", 8],
  ["septiembre", 9],
  ["setiembre", 9],
  ["octubre", 10],
  ["noviembre", 11],
  ["diciembre", 12],
]);

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatWithParts(date, options) {
  const formatter = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", ...options });
  const parts = formatter.formatToParts(date);
  return {
    weekday: parts.find((part) => part.type === "weekday")?.value || "",
    day: parts.find((part) => part.type === "day")?.value || "",
    month: parts.find((part) => part.type === "month")?.value || "",
    year: parts.find((part) => part.type === "year")?.value || "",
  };
}

export function normalizeIsoDate(value) {
  const trimmed = String(value).trim();

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  const slash = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/u);
  if (slash) {
    const year = slash[3].length === 2 ? `20${slash[3]}` : slash[3];
    return `${year}-${pad(slash[2])}-${pad(slash[1])}`;
  }

  const spanish = trimmed.toLowerCase().match(/^(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})$/u);
  if (spanish) {
    const month = SPANISH_MONTHS.get(spanish[2]);
    if (!month) {
      throw new Error(`Mes no reconocido: ${spanish[2]}`);
    }
    return `${spanish[3]}-${pad(month)}-${pad(spanish[1])}`;
  }

  throw new Error(`Fecha no reconocida: ${value}`);
}

export function compareIsoDates(left, right) {
  const a = normalizeIsoDate(left);
  const b = normalizeIsoDate(right);
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function extractDatesFromText(text) {
  const results = new Set();
  const source = String(text);

  for (const match of source.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/gu)) {
    results.add(`${match[1]}-${match[2]}-${match[3]}`);
  }

  for (const match of source.matchAll(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/gu)) {
    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
    results.add(`${year}-${pad(match[2])}-${pad(match[1])}`);
  }

  for (const match of source.matchAll(/\b(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})\b/giu)) {
    const month = SPANISH_MONTHS.get(match[2].toLowerCase());
    if (!month) continue;
    results.add(`${match[3]}-${pad(month)}-${pad(match[1])}`);
  }

  return [...results].sort();
}

export function isOnOrAfter(dateValue, minimumValue) {
  return compareIsoDates(dateValue, minimumValue) >= 0;
}

export function formatIsoDateForDisplay(value) {
  const iso = normalizeIsoDate(value);
  const [year, month, day] = iso.split("-").map((part) => Number.parseInt(part, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  const { weekday, day: dayOfMonth, month: monthName, year: yearLabel } = formatWithParts(date, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return [weekday, dayOfMonth, monthName, yearLabel]
    .filter(Boolean)
    .join(" ")
    .replace(/\./gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

export function formatIsoDateTimeForDisplay(value) {
  const normalized = String(value).trim().replace("T", " ");
  const [datePart, timePart = ""] = normalized.split(/\s+/u);
  const dateLabel = formatIsoDateForDisplay(datePart);
  const timeLabel = timePart ? timePart.slice(0, 5) : "";
  return timeLabel ? `${dateLabel} · ${timeLabel}` : dateLabel;
}
