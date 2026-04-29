import path from "node:path";
import { loadEnvFile, getEnv, getRequiredEnv, toBoolean, toInteger } from "./env.js";
import { formatIsoDateForDisplay, formatIsoDateTimeForDisplay } from "./date.js";
import { runApplusCheck } from "./applus.js";
import { sendTelegramMessage, sendTelegramPhoto } from "./telegram.js";
import { readState, writeState } from "./state.js";

function buildConfig() {
  const licensePlate = getRequiredEnv("APPLUS_LICENSE_PLATE").replace(/\s+/g, "").toUpperCase();
  const contactEmail = getRequiredEnv("APPLUS_CONTACT_EMAIL");
  const contactPhone = getRequiredEnv("APPLUS_CONTACT_PHONE");
  const minDate = getRequiredEnv("APPLUS_MIN_DATE");
  const telegramBotToken = getRequiredEnv("TELEGRAM_BOT_TOKEN");
  const telegramChatId = getRequiredEnv("TELEGRAM_CHAT_ID");

  return {
    applusUrl: getEnv("APPLUS_URL", "https://aibs.appluscorp.com/?MenuActivo=mrNuevaReserva"),
    applusLanguage: getEnv("APPLUS_LANGUAGE", "es"),
    applusUidCentro: getEnv("APPLUS_UID_CENTRO"),
    licensePlate,
    contactEmail,
    contactPhone,
    minDate,
    telegramBotToken,
    telegramChatId,
    sendStartupNotification: toBoolean(getEnv("SEND_STARTUP_NOTIFICATION"), true),
    heartbeatIntervalMs: toInteger(getEnv("HEARTBEAT_INTERVAL_MINUTES"), 60) * 60 * 1000,
    pollIntervalMs: toInteger(getEnv("POLL_INTERVAL_MS"), 300000),
    headless: toBoolean(getEnv("HEADLESS"), true),
    runOnce: toBoolean(getEnv("RUN_ONCE"), false),
    stateFile: getEnv("STATE_FILE", ".itv-watcher-state.json"),
  };
}

function buildHeartbeatMessage(config, report) {
  const lines = [];
  if (report.matchingDates.length > 0) {
    const dateLines = report.matchingDates.slice(0, 5).map((date) => `• ${formatIsoDateForDisplay(date)}`);
    lines.push("📅 Fechas detectadas ahora mismo:");
    lines.push(...dateLines);
    if (report.matchingDates.length > dateLines.length) {
      lines.push(`• ... y ${report.matchingDates.length - dateLines.length} fecha(s) más`);
    }
  }

  lines.push(
    report.selectedCenterNoAvailability
      ? "⚠️ El centro seleccionado no tiene disponibilidad en este momento."
      : "🛰️ Sigo vigilando la ITV y el proceso sigue activo.",
  );
  lines.push(`Matrícula: ${config.licensePlate}`);
  lines.push(`Fecha mínima: ${formatIsoDateForDisplay(config.minDate)}`);

  if (report.selectedCenterNoAvailability) {
    lines.splice(1, 0, "Sigo intentando encontrar huecos compatibles y te avisaré en cuanto aparezcan.");
    lines.push("Seguimos intentando con el centro seleccionado.");
  }

  return lines.join("\n");
}

function summarizeMatch(config, report) {
  const lines = [
    "✅ Hay disponibilidad ITV compatible con tu filtro.",
    `Matrícula: ${config.licensePlate}`,
    `Fecha mínima: ${formatIsoDateForDisplay(config.minDate)}`,
  ];

  if (report.firstAvailableSlot) {
    lines.push(`🕒 Primer hueco visible: ${formatIsoDateTimeForDisplay(report.firstAvailableSlot)}`);
  }

  if (report.matchingSelectableDays.length > 0) {
    const dayLines = report.matchingSelectableDays.slice(0, 5).map((day) => {
      const label = day.firstAvailable ? formatIsoDateTimeForDisplay(day.firstAvailable) : formatIsoDateForDisplay(day.date);
      return `• ${label}`;
    });
    if (dayLines.length > 0) {
      lines.push("📅 Días disponibles:");
      lines.push(...dayLines);
      if (report.matchingSelectableDays.length > dayLines.length) {
        lines.push(`• ... y ${report.matchingSelectableDays.length - dayLines.length} día(s) más`);
      }
    }
  } else if (report.matchingDates.length > 0) {
    const dayLines = report.matchingDates.slice(0, 5).map((date) => `• ${formatIsoDateForDisplay(date)}`);
    if (dayLines.length > 0) {
      lines.push("📅 Fechas detectadas:");
      lines.push(...dayLines);
      if (report.matchingDates.length > dayLines.length) {
        lines.push(`• ... y ${report.matchingDates.length - dayLines.length} fecha(s) más`);
      }
    }
  }
  return lines.join("\n");
}

async function main() {
  await loadEnvFile();
  const config = buildConfig();
  const statePath = path.resolve(config.stateFile);
  const state = await readState(statePath);

  console.log(`Watcher iniciado para ${config.licensePlate}. Revisando desde ${config.minDate}.`);

  if (config.sendStartupNotification) {
    await sendTelegramMessage({
      botToken: config.telegramBotToken,
      chatId: config.telegramChatId,
      text: [
        "🚀 El watcher de ITV ya está funcionando.",
        `Matrícula: ${config.licensePlate}`,
        `Fecha mínima: ${formatIsoDateForDisplay(config.minDate)}`,
      ].join("\n"),
    });
    state.lastHeartbeatAt = Date.now();
    await writeState(statePath, state);
    console.log("Aviso de inicio enviado por Telegram.");
  }

  while (true) {
    const startedAt = new Date().toISOString();
    const now = Date.now();
    const lastHeartbeatAt = Number.isFinite(state.lastHeartbeatAt) ? state.lastHeartbeatAt : 0;
    try {
      const report = await runApplusCheck(config);
      const signature = JSON.stringify({
        pageUrl: report.pageUrl,
        dates: report.matchingDates,
        selectable: report.matchingSelectableDays.map((day) => day.firstAvailable || day.date),
        isMatch: report.isMatch,
        firstAvailableSlot: report.firstAvailableSlot,
      });

      if (report.isMatch) {
        if (state.lastSignature !== signature) {
          const message = summarizeMatch(config, report);
          if (report.screenshotBuffer) {
            await sendTelegramPhoto({
              botToken: config.telegramBotToken,
              chatId: config.telegramChatId,
              caption: message,
              image: report.screenshotBuffer,
              filename: `itv-disponibilidad-${report.screenshotVariant || "captura"}-${report.firstAvailableSlot ? report.firstAvailableSlot.replace(/[:\s]/g, "-") : startedAt}.jpg`,
            });
          } else {
            await sendTelegramMessage({
              botToken: config.telegramBotToken,
              chatId: config.telegramChatId,
              text: message,
            });
          }
          state.lastSignature = signature;
          state.lastMatchAt = startedAt;
          state.lastHeartbeatAt = now;
          await writeState(statePath, state);
          console.log(report.screenshotBuffer ? `Captura enviada por Telegram (${report.screenshotVariant || "desconocida"}).` : "Aviso enviado por Telegram.");
        } else {
          console.log("La misma disponibilidad sigue presente; aviso ya enviado.");
        }
      } else {
        console.log(`🔎 Sin coincidencias en este ciclo (${startedAt}).`);
        const heartbeatDue = config.heartbeatIntervalMs > 0 && now - lastHeartbeatAt >= config.heartbeatIntervalMs;
        if (heartbeatDue) {
          await sendTelegramMessage({
            botToken: config.telegramBotToken,
            chatId: config.telegramChatId,
            text: buildHeartbeatMessage(config, report),
          });
          state.lastHeartbeatAt = now;
          await writeState(statePath, state);
          console.log("Heartbeat enviado por Telegram.");
        }
      }
    } catch (error) {
      console.error("Error en la comprobación:", error instanceof Error ? error.message : error);
    }

    if (config.runOnce) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
