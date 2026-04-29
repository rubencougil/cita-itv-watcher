# Cita ITV Watcher

[![GitHub Actions CI](https://github.com/rubencougil/cita-itv-watcher/actions/workflows/pages.yml/badge.svg?branch=main)](https://github.com/rubencougil/cita-itv-watcher/actions/workflows/pages.yml)

Watcher para la web de Applus+ ITV que revisa disponibilidad de citas y avisa por Telegram cuando detecta huecos a partir de una fecha mínima.

## Qué hace

- 🌐 Abre la web de Applus+.
- 🧾 Rellena matrícula y, cuando el flujo lo pide, email y teléfono de contacto.
- 🔎 Busca señales de disponibilidad en la página.
- 📅 Filtra resultados por una fecha mínima configurable.
- 📬 Envía aviso por Telegram cuando encuentra una cita compatible.
- 📸 Incluye una captura de pantalla de la vista de horas disponibles cuando la web expone huecos compatibles.

## Configuración

Copia `.env.example` a `.env` y ajusta estos valores:

- `APPLUS_LICENSE_PLATE`
- `APPLUS_CONTACT_EMAIL`
- `APPLUS_CONTACT_PHONE`
- `APPLUS_MIN_DATE`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `SEND_STARTUP_NOTIFICATION`
- `HEARTBEAT_INTERVAL_MINUTES`

Opcionales:

- `APPLUS_URL`
- `APPLUS_LANGUAGE`
- `APPLUS_UID_CENTRO`
- `POLL_INTERVAL_MS`
- `HEADLESS`
- `RUN_ONCE`

Si tu ITV necesita un centro concreto, puedes indicar `APPLUS_UID_CENTRO`. Si no, el watcher usa la página inicial.

`HEARTBEAT_INTERVAL_MINUTES` controla cada cuánto tiempo se envía un mensaje de "sigo vivo" por Telegram cuando no hay novedades.

Cuando el watcher detecta disponibilidad compatible, intenta abrir el día con huecos y manda una captura de la pantalla de horas junto al aviso.

## Uso

```bash
npm install
npm start
```

Para ejecutar una sola comprobación:

```bash
RUN_ONCE=true npm start
```

Para previsualizar la landing:

```bash
npm run landing
```

La landing se publica desde `landing/` y el workflow de GitHub Pages está preparado para desplegarla automáticamente al hacer push a `main`.

Para validar los helpers puros:

```bash
npm test
```

## Nota

Este proyecto está orientado a detectar disponibilidad y notificarte. No intenta completar automáticamente una reserva final.
