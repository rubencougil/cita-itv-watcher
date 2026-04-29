import { chromium } from "playwright";
import { extractDatesFromText, isOnOrAfter } from "./date.js";

const DEFAULT_ENTRY_URL = "https://aibs.appluscorp.com/?MenuActivo=mrNuevaReserva";
const SPANISH_MONTH_TO_NUMBER = new Map([
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

function normalizeUrl(config) {
  if (config.applusUidCentro) {
    const language = config.applusLanguage || "es";
    return `https://aibs.appluscorp.com/Reserva/IniciarNuevaReservaExt?UIDCentro=${encodeURIComponent(config.applusUidCentro)}&language=${encodeURIComponent(language)}`;
  }
  return config.applusUrl || DEFAULT_ENTRY_URL;
}

async function dismissCookieBanner(page) {
  const candidates = [
    page.locator("button.ch2-allow-all-btn"),
    page.locator("button.ch2-deny-all-btn"),
    page.locator("button.ch2-open-settings-btn"),
    page.getByText("ACEPTAR TODAS LAS COOKIES", { exact: true }),
    page.getByText("RECHAZAR TODAS LAS COOKIES", { exact: true }),
    page.getByText("CONFIGURACIÓN DE COOKIES", { exact: true }),
    page.getByText("Aceptar todas las cookies", { exact: true }),
    page.getByText("Rechazar todas las cookies", { exact: true }),
    page.getByText("Configuración de cookies", { exact: true }),
  ];

  for (let attempt = 0; attempt < 10; attempt += 1) {
    for (const candidate of candidates) {
      if (await candidate.count().catch(() => 0)) {
        try {
          await candidate.first().click({ timeout: 3000, force: true });
          await page.waitForTimeout(500).catch(() => {});
          return;
        } catch {
          // Ignore cookie banner failures and continue.
        }
      }
    }
    await page.waitForTimeout(500).catch(() => {});
  }
}

async function fillIfPresent(page, locator, value) {
  try {
    if (await locator.count()) {
      await locator.first().fill(value, { timeout: 5000 });
      return true;
    }
  } catch {
    // Ignore and continue with alternative selectors.
  }
  return false;
}

async function fillVehicleData(page, config) {
  const plate = config.licensePlate.replace(/\s+/g, "").toUpperCase();
  const selectors = [
    page.getByPlaceholder(/0000\s?XXX/i),
    page.getByRole("textbox"),
    page.locator('input[name*="matr" i]'),
    page.locator('input[id*="matr" i]'),
  ];

  for (const selector of selectors) {
    if (await fillIfPresent(page, selector, plate)) {
      return;
    }
  }

  throw new Error("No se encontró el campo de matrícula en la página inicial.");
}

async function clickSearchButton(page) {
  const buttons = [
    page.getByRole("link", { name: /Pedir cita ITV ahora/i }),
    page.getByRole("button", { name: /Pedir cita ITV ahora/i }),
    page.getByText(/Pedir cita ITV ahora/i, { exact: false }),
  ];

  for (const button of buttons) {
    try {
      if (await button.count().catch(() => 0)) {
        await button.first().click({ timeout: 5000 });
        return;
      }
    } catch {
      // Try next locator.
    }
  }

  throw new Error("No se encontró el botón para continuar con la reserva.");
}

async function fillContactData(page, config) {
  const emailSelectors = [
    page.locator("#txtEMail"),
    page.locator('input[name="CorreoElectronico"]'),
    page.getByLabel(/email/i),
    page.getByPlaceholder(/email/i),
    page.locator('input[type="email"]'),
  ];
  const phoneSelectors = [
    page.locator("#txtTelefono"),
    page.locator('input[name="TelefonoContacto"]'),
    page.getByLabel(/tel[eé]fono/i),
    page.getByPlaceholder(/tel[eé]fono/i),
    page.locator('input[type="tel"]'),
    page.locator('input[name*="phone" i]'),
  ];

  for (let attempt = 0; attempt < 15; attempt += 1) {
    const emailCount = await emailSelectors[0].count().catch(() => 0);
    const phoneCount = await phoneSelectors[0].count().catch(() => 0);
    if (emailCount > 0 && phoneCount > 0) {
      break;
    }
    await page.waitForTimeout(1000).catch(() => {});
  }

  for (const selector of emailSelectors) {
    if (await fillIfPresent(page, selector, config.contactEmail)) break;
  }
  for (const selector of phoneSelectors) {
    if (await fillIfPresent(page, selector, config.contactPhone)) break;
  }
}

async function submitContactForm(page) {
  try {
    const privacyCheckbox = page.locator('#acepto_politica_privacidad');
    if (await privacyCheckbox.count().catch(() => 0)) {
      await privacyCheckbox.first().evaluate((element) => {
        element.checked = true;
        element.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await page.locator('#LOPDAceptada').evaluate((element) => {
        element.value = "True";
      }).catch(() => {});
      await page.locator('#LOPDPromocion').evaluate((element) => {
        element.value = "False";
      }).catch(() => {});
      await page.locator('#LOPDInformacion').evaluate((element) => {
        element.value = "True";
      }).catch(() => {});
      await page.locator('#CitaEnCalendario').evaluate((element) => {
        element.value = "False";
      }).catch(() => {});
    }
  } catch {
    // Ignore and try to submit anyway.
  }

  const form = page.locator('form#form_alta');
  if (await form.count().catch(() => 0)) {
    try {
      const continueButton = page.locator('input[type="submit"][value*="Introducir datos personales y continuar"]');
      for (let attempt = 0; attempt < 15; attempt += 1) {
        if (await continueButton.count().catch(() => 0)) {
          break;
        }
        await page.waitForTimeout(1000).catch(() => {});
      }
      if (await continueButton.count().catch(() => 0)) {
        await continueButton.first().click({ timeout: 10000, force: true });
      } else {
        await form.first().evaluate((element) => {
          if (typeof element.requestSubmit === "function") {
            element.requestSubmit();
          } else {
            element.submit();
          }
        });
      }
      await page.waitForLoadState("domcontentloaded", { timeout: 45000 }).catch(() => {});
      await page.waitForTimeout(1500).catch(() => {});
      await page.getByText("Elige tu fecha y hora", { exact: true }).first().waitFor({ timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000).catch(() => {});
      return true;
    } catch {
      // Fall through to the button click fallback.
    }
  }

  const submitCandidates = [
    page.locator('input[type="submit"]'),
    page.locator('button[type="submit"]'),
    page.getByRole("button", { name: /Introducir datos personales y continuar/i }),
    page.getByRole("button", { name: /continuar/i }),
  ];

  for (const candidate of submitCandidates) {
    try {
      if (await candidate.count().catch(() => 0)) {
        await candidate.first().click({ timeout: 5000, force: true });
        await page.waitForLoadState("domcontentloaded", { timeout: 45000 }).catch(() => {});
        return true;
      }
    } catch {
      // Try the next candidate.
    }
  }

  return false;
}

async function openCalendarStep(page) {
  const calendarHrefLocator = page.locator('a[href*="NavegarAVistaSiguiente"][href*="actualViewName=Eleccion_Estacion"]');
  const calendarLink = page.getByRole("link", { name: "Elige tu fecha y hora" });

  for (let attempt = 0; attempt < 15; attempt += 1) {
    if ((await calendarHrefLocator.count().catch(() => 0)) > 0 || (await calendarLink.count().catch(() => 0)) > 0) {
      break;
    }
    await page.waitForTimeout(1000).catch(() => {});
  }

  try {
    await calendarHrefLocator.first().click({ timeout: 10000, force: true });
    await page.waitForURL(/NavegarAVistaSiguiente.*actualViewName=Eleccion_Estacion/i, { timeout: 15000 }).catch(() => {});
    return "href-click";
  } catch {
    // Try the accessible link next.
  }

  try {
    await calendarLink.first().click({ timeout: 10000, force: true });
    await page.waitForURL(/NavegarAVistaSiguiente.*actualViewName=Eleccion_Estacion/i, { timeout: 15000 }).catch(() => {});
    return "role-click";
  } catch {
    return "none";
  }
}

function extractVisibleCalendarMonth(text) {
  const match = String(text).match(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+(\d{4})\b/iu);
  if (!match) {
    return null;
  }

  const monthNumber = SPANISH_MONTH_TO_NUMBER.get(match[1].toLowerCase());
  if (!monthNumber) {
    return null;
  }

  return `${match[2]}-${String(monthNumber).padStart(2, "0")}`;
}

function compareYearMonth(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

async function advanceCalendarToMonth(page, targetMonth) {
  const controls = [
    page.locator("#btnAdelanteCalendarioMv"),
    page.locator("#btnAdelanteCalendario"),
  ];

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const bodyText = await page.locator("body").innerText({ timeout: 10000 }).catch(() => "");
    const visibleMonth = extractVisibleCalendarMonth(bodyText);
    if (visibleMonth && compareYearMonth(visibleMonth, targetMonth) >= 0) {
      return visibleMonth;
    }

    let clicked = false;
    for (const control of controls) {
      if (await control.count().catch(() => 0)) {
        try {
          await control.first().click({ timeout: 5000, force: true });
          await page.waitForTimeout(900).catch(() => {});
          clicked = true;
          break;
        } catch {
          // Try the next control.
        }
      }
    }

    if (!clicked) {
      return visibleMonth;
    }
  }

  const finalBodyText = await page.locator("body").innerText({ timeout: 10000 }).catch(() => "");
  return extractVisibleCalendarMonth(finalBodyText);
}

function extractSelectableDayDate(dayId) {
  const match = String(dayId || "").match(/^casillaDia(\d{4}-\d{2}-\d{2})$/u);
  return match ? match[1] : "";
}

async function inspectAvailability(page, config) {
  const bodyText = await page.locator("body").innerText({ timeout: 10000 }).catch(() => "");
  const scriptText = await page
    .locator("script")
    .allTextContents()
    .then((texts) => texts.join("\n"))
    .catch(() => "");

  const selectableDays = [];
  const selectableLocator = page.locator('.dia_detalle[data-seleccionable="1"]');
  const selectableCount = await selectableLocator.count().catch(() => 0);
  for (let index = 0; index < selectableCount; index += 1) {
    const day = selectableLocator.nth(index);
    const dayId = await day.getAttribute("id").catch(() => "");
    const firstAvailable = await day.getAttribute("data-PrimeraHoraDisponible").catch(() => "");
    const dateFromId = extractSelectableDayDate(dayId);
    const dateFromFirstAvailable = firstAvailable ? String(firstAvailable).slice(0, 10) : "";
    selectableDays.push({
      id: dayId,
      date: dateFromFirstAvailable || dateFromId,
      firstAvailable,
      text: await day.innerText({ timeout: 2000 }).catch(() => ""),
    });
  }

  const fhPrimerHuecoMatch = scriptText.match(/fhPrimerHueco\s*=\s*"([^"]+)"/u);
  const fhPrimerHueco = fhPrimerHuecoMatch ? fhPrimerHuecoMatch[1] : "";
  const selectableDates = selectableDays
    .flatMap((day) => [day.date, ...extractDatesFromText(day.firstAvailable), ...extractDatesFromText(day.text)])
    .filter(Boolean);
  const matchingSelectableDays = selectableDays.filter((day) => isOnOrAfter(day.date, config.minDate));
  const firstAvailableSlot =
    matchingSelectableDays.find((day) => day.firstAvailable)?.firstAvailable ||
    fhPrimerHueco ||
    matchingSelectableDays[0]?.date ||
    "";

  const dates = [
    ...extractDatesFromText(bodyText),
    ...extractDatesFromText(scriptText),
    ...selectableDates,
    ...(fhPrimerHueco ? extractDatesFromText(fhPrimerHueco) : []),
  ];
  const uniqueDates = [...new Set(dates)].sort();
  const matchingDates = uniqueDates.filter((date) => isOnOrAfter(date, config.minDate));
  const noAvailabilityMarkers = [
    /no hay citas/i,
    /sin disponibilidad/i,
    /no existen citas/i,
    /no se han encontrado/i,
    /sin huecos/i,
    /el centro seleccionado no tiene disponibilidad/i,
    /le proponemos una reserva/i,
    /ver otros centros disponibles/i,
  ];

  const selectedCenterNoAvailability = /actualmente,\s*el centro seleccionado no tiene disponibilidad/i.test(bodyText);
  const hasNegativeSignal =
    selectedCenterNoAvailability || noAvailabilityMarkers.some((pattern) => pattern.test(bodyText) || pattern.test(scriptText));
  return {
    bodyText,
    scriptText,
    selectableDays,
    matchingSelectableDays,
    fhPrimerHueco,
    firstAvailableSlot,
    dates: uniqueDates,
    matchingDates,
    hasNegativeSignal,
    selectedCenterNoAvailability,
    pageUrl: page.url(),
  };
}

async function captureAvailabilityScreenshot(page, report) {
  const availableDays = report.matchingSelectableDays;
  if (availableDays.length > 1) {
    return {
      variant: "month",
      buffer: await page.screenshot({
        fullPage: true,
        type: "jpeg",
        quality: 85,
        animations: "disabled",
      }),
    };
  }

  const dayToOpen = availableDays[0] || report.selectableDays[0];
  if (dayToOpen?.id) {
    await page.locator(`#${dayToOpen.id}`).click({ force: true, timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1200).catch(() => {});
  }

  return {
    variant: "hours",
    buffer: await page.screenshot({
      fullPage: true,
      type: "jpeg",
      quality: 85,
      animations: "disabled",
    }),
  };
}

export async function runApplusCheck(config) {
  const url = normalizeUrl(config);
  const browser = await chromium.launch({ headless: config.headless });
  const context = await browser.newContext({
    locale: config.applusLanguage || "es-ES",
    viewport: { width: 1440, height: 1400 },
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await dismissCookieBanner(page);
    await fillVehicleData(page, config);
    await clickSearchButton(page);
    await page.waitForLoadState("domcontentloaded", { timeout: 45000 }).catch(() => {});
    await fillContactData(page, config);
    await submitContactForm(page);
    await page.waitForTimeout(2000).catch(() => {});
    const calendarOpenMethod = await openCalendarStep(page);
    await page.waitForSelector('.dia_detalle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const targetMonth = String(config.minDate).slice(0, 7);
    const visibleMonth = await advanceCalendarToMonth(page, targetMonth).catch(() => null);
    if (visibleMonth && compareYearMonth(visibleMonth, targetMonth) >= 0) {
      await page.waitForSelector('.dia_detalle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1000);
    }

    const report = await inspectAvailability(page, config);
    const isMatch = report.matchingDates.length > 0 && !report.hasNegativeSignal;
    let screenshotBuffer = null;
    let screenshotVariant = null;
    if (isMatch) {
      const capture = await captureAvailabilityScreenshot(page, report).catch(() => null);
      screenshotBuffer = capture?.buffer || null;
      screenshotVariant = capture?.variant || null;
    }

    return {
      ...report,
      isMatch,
      screenshotBuffer,
      calendarOpenMethod,
      screenshotVariant,
    };
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}
