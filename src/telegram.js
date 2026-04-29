export async function sendTelegramMessage({ botToken, chatId, text }) {
  const url = new URL(`https://api.telegram.org/bot${botToken}/sendMessage`);
  url.searchParams.set("chat_id", chatId);
  url.searchParams.set("text", text);
  url.searchParams.set("disable_web_page_preview", "true");

  const response = await fetch(url, { method: "POST" });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Telegram devolvió ${response.status}: ${body}`);
  }

  return response.json();
}

export async function sendTelegramPhoto({ botToken, chatId, caption, image, filename = "screenshot.jpg" }) {
  const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
  const form = new FormData();
  form.set("chat_id", chatId);
  if (caption) {
    form.set("caption", caption);
  }
  form.set("photo", new Blob([image], { type: "image/jpeg" }), filename);

  const response = await fetch(url, { method: "POST", body: form });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Telegram devolvió ${response.status}: ${body}`);
  }

  return response.json();
}
