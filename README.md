# Cita ITV Watcher

[![CI](https://github.com/rubencougil/cita-itv-watcher/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/rubencougil/cita-itv-watcher/actions/workflows/ci.yml)
[![GitHub Actions Pages](https://github.com/rubencougil/cita-itv-watcher/actions/workflows/pages.yml/badge.svg?branch=main)](https://github.com/rubencougil/cita-itv-watcher/actions/workflows/pages.yml)

Watcher para la web de Applus+ ITV que revisa disponibilidad de citas y avisa por Telegram cuando detecta huecos compatibles a partir de una fecha mínima.

## Resumen

Este proyecto abre la web de reservas de ITV, completa el flujo inicial cuando hace falta, inspecciona el calendario de disponibilidad y te avisa por Telegram cuando aparece una cita que cumple tu filtro.

Cuando detecta huecos compatibles:

- envía un mensaje de Telegram con la información clave,
- adjunta una captura de pantalla de la vista relevante,
- y guarda un estado interno para no repetir el mismo aviso una y otra vez.

Además, si no hay novedades, puede mandar un `heartbeat` periódico para que sepas que el watcher sigue vivo.

## Funcionalidades

- 🌐 Abre la web de Applus+ ITV.
- 🧾 Rellena la matrícula y, cuando el flujo lo pide, el email y el teléfono de contacto.
- 🔎 Detecta días y horarios disponibles en el calendario.
- 📅 Filtra resultados por una fecha mínima configurable.
- 📬 Notifica por Telegram cuando encuentra una cita compatible.
- 📸 Incluye una captura de la pantalla de disponibilidad en el aviso.
- 🛰️ Envía un `heartbeat` periódico cuando no hay novedades.
- 🧪 Incluye CI para validar sintaxis, tests y una ejecución controlada del watcher.

## Cómo funciona

El flujo general es este:

1. Abre la web de Applus+.
2. Rellena matrícula y datos de contacto.
3. Continúa hasta la pantalla del calendario.
4. Busca días disponibles en el mes actual.
5. Si el mes visible no alcanza la fecha mínima, avanza hasta el mes objetivo.
6. Cuando encuentra huecos compatibles, envía un mensaje por Telegram.
7. Si hay varios días disponibles, manda captura de la vista del mes.
8. Si solo hay un día disponible, entra en ese día y manda captura de la vista de horas.

## Requisitos

- Node.js 18 o superior.
- Una cuenta de Telegram para recibir avisos.
- Una matrícula, email y teléfono que usarás en el formulario de Applus+.

## Inicio rápido

```bash
git clone https://github.com/rubencougil/cita-itv-watcher.git
cd cita-itv-watcher
npm install
npx playwright install chromium
cp .env.example .env
npm start
```

Si quieres una sola comprobación y que el proceso termine al acabar:

```bash
RUN_ONCE=true npm start
```

## Configuración

Copia [.env.example](.env.example) a `.env` y rellena los valores.

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `APPLUS_URL` | No | URL inicial de la web de Applus+. Por defecto usa la portada de reservas. |
| `APPLUS_LANGUAGE` | No | Idioma de la web. `es` por defecto. |
| `APPLUS_UID_CENTRO` | No | Centro ITV concreto, si la web lo requiere. |
| `APPLUS_LICENSE_PLATE` | Sí | Matrícula del vehículo, por ejemplo `5774KMW`. |
| `APPLUS_CONTACT_EMAIL` | Sí | Email de contacto para el formulario de Applus+. |
| `APPLUS_CONTACT_PHONE` | Sí | Teléfono de contacto para el formulario de Applus+. |
| `APPLUS_MIN_DATE` | Sí | Fecha mínima a partir de la cual quieres recibir avisos. Formato `YYYY-MM-DD`. |
| `TELEGRAM_BOT_TOKEN` | Sí | Token del bot de Telegram creado con BotFather. |
| `TELEGRAM_CHAT_ID` | Sí | ID del chat donde quieres recibir los avisos. |
| `SEND_STARTUP_NOTIFICATION` | No | `true` o `false`. Envía un aviso de arranque al iniciar el watcher. |
| `HEARTBEAT_INTERVAL_MINUTES` | No | Cada cuántos minutos mandar un mensaje de seguimiento si no hay novedades. |
| `POLL_INTERVAL_MS` | No | Cada cuántos milisegundos repetir la comprobación. `300000` por defecto. |
| `HEADLESS` | No | `true` o `false`. Ejecuta Playwright sin interfaz visible. |
| `RUN_ONCE` | No | `true` para hacer una sola comprobación y salir. |
| `STATE_FILE` | No | Fichero donde se guarda el estado de la última notificación. |

### Ejemplo de `.env`

```bash
APPLUS_URL=https://aibs.appluscorp.com/?MenuActivo=mrNuevaReserva
APPLUS_LANGUAGE=es
APPLUS_LICENSE_PLATE=5774KMW
APPLUS_CONTACT_EMAIL=you@example.com
APPLUS_CONTACT_PHONE=600000000
APPLUS_MIN_DATE=2026-06-17
TELEGRAM_BOT_TOKEN=123456789:replace-me
TELEGRAM_CHAT_ID=123456789
SEND_STARTUP_NOTIFICATION=true
HEARTBEAT_INTERVAL_MINUTES=60
POLL_INTERVAL_MS=300000
HEADLESS=true
RUN_ONCE=false
STATE_FILE=.itv-watcher-state.json
```

## Mensajes de Telegram

El watcher puede enviar tres tipos de mensajes:

- **Arranque**: confirma que el proceso ha arrancado.
- **Heartbeat**: informa de que sigue vigilando si no hay novedades.
- **Disponibilidad**: avisa cuando detecta citas compatibles y adjunta una captura.

La captura cambia según el caso:

- si hay varios días compatibles, se envía la vista del mes,
- si hay un único día compatible, se abre ese día y se envía la vista de horas.

## Uso diario

### Ejecutar continuamente

```bash
npm start
```

### Hacer una sola comprobación

```bash
RUN_ONCE=true npm start
```

### Cambiar la frecuencia de comprobación

```bash
POLL_INTERVAL_MS=120000 npm start
```

### Desactivar el mensaje de arranque

```bash
SEND_STARTUP_NOTIFICATION=false npm start
```

## Verificación y calidad

Este repositorio incluye varias capas de validación:

- `npm run check` comprueba la sintaxis de los módulos principales.
- `npm test` ejecuta los tests de fechas y utilidades.
- GitHub Actions ejecuta un workflow de CI con instalación, tests y una pasada de arranque controlada.

Scripts disponibles:

```bash
npm run check
npm test
npm run landing
```

## Landing del proyecto

La carpeta [landing/](landing) contiene una página pública para GitHub Pages.

- El workflow de Pages publica automáticamente la carpeta `landing/`.
- La landing está marcada para no indexarse por buscadores.
- Puedes previsualizarla localmente con:

```bash
npm run landing
```

## Estructura del proyecto

- `src/` lógica principal del watcher.
- `test/` tests de utilidades.
- `landing/` página pública del proyecto.
- `.github/workflows/` workflows de CI y Pages.

## Solución de problemas

### No llega la captura

Comprueba primero:

- que `APPLUS_MIN_DATE` sea correcta,
- que el watcher esté apuntando al centro ITV esperado,
- que el bot de Telegram tenga acceso al chat,
- y que el estado interno no esté bloqueando un aviso repetido.

### La app no encuentra disponibilidad

Posibles causas:

- el centro seleccionado no tiene huecos para la fecha mínima,
- Applus+ muestra el mes anterior al que te interesa,
- o el flujo de la web cambió y necesita un ajuste del selector.

### Telegram no recibe mensajes

Revisa:

- que `TELEGRAM_BOT_TOKEN` sea correcto,
- que `TELEGRAM_CHAT_ID` coincida con el chat real,
- y que el bot haya recibido al menos un mensaje o interacción previa.

### El navegador headless falla

Prueba a ejecutar con:

```bash
HEADLESS=false npm start
```

Así podrás ver el flujo completo de Playwright en una ventana visible.

## Notas

- Este proyecto está pensado para detectar disponibilidad y avisarte.
- No intenta completar automáticamente la reserva final.
- No está afiliado con Applus+.

## Licencia

MIT License.
