# 🤖 Qipu 3.0 - Bot de Telegram para Registro de Gastos

Permite registrar gastos en tu monedero de Qipu en tiempo real directamente enviando mensajes por Telegram desde tu celular o computadora.

---

## 🚀 Guía Rápida de Configuración (3 Minutos)

### 1. Crear tu Bot en Telegram
1. Abre Telegram y busca a **[@BotFather](https://t.me/BotFather)**.
2. Envía el comando `/newbot`.
3. Asigna un nombre a tu bot (ej: `Mi Qipu Gastos`) y un usuario (ej: `MiQipuGastosBot`).
4. **Copia el Token HTTP API** que te entrega @BotFather.

---

### 2. Configuración Local (Modo Polling)
1. Entra a la carpeta `telegram-bot`:
   ```bash
   cd telegram-bot
   ```
2. Crea tu archivo `.env` a partir de `.env.example`:
   ```bash
   # En Windows PowerShell:
   Copy-Item .env.example .env
   ```
3. Pega tu Token en el archivo `.env`:
   ```env
   TELEGRAM_BOT_TOKEN=123456789:ABCDefghIJKlmnoPQRstuvWXyz
   ```
4. Inicia el bot:
   ```bash
   npm start
   ```
   *¡Listo! Tu bot ya estará escuchando en Telegram.*

---

### 3. Vincular con tu Monedero de Qipu
1. Abre tu bot en Telegram y dale a **Iniciar** o escribe `/start`.
2. Escribe el comando de vinculación con tu ID de Monedero:
   ```text
   /vincular TU_ID_DE_MONEDERO
   ```
   *(Encuentras tu ID en Qipu Web -> Ajustes -> Conexión -> ID DE MONEDERO)*.
3. Si en tu monedero hay varios integrantes, selecciona quién eres:
   ```text
   /soy Carlos
   ```

---

## 📝 Cómo Registrar Gastos

Simplemente escribe lo que compraste de forma natural:

| Mensaje en Telegram | Resultado en Qipu |
| :--- | :--- |
| `25.50 Almuerzo` | Gasto de **S/ 25.50** en *Alimentación*, Personal. |
| `Taxi 18.00 efectivo transporte` | Gasto de **S/ 18.00** en *Transporte* pagado en *Efectivo*. |
| `120.00 Cena amigos compartido bcp` | Gasto compartido de **S/ 120.00** en *Alimentación* dividido entre el grupo. |
| `/saldo` | Te muestra tu presupuesto, gasto mensual y saldo disponible al instante. |

---

## 🌐 Despliegue Gratuito en la Nube (24/7 sin tu PC prendida)

### Opción A: Render / Railway / Fly.io
1. Sube este repositorio a GitHub.
2. En Render.com crea un **Web Service** o **Background Worker** apuntando a `telegram-bot/server.js`.
3. Agrega la variable de entorno `TELEGRAM_BOT_TOKEN`.

### Opción B: Cloudflare Workers (Serverless 100% Gratis)
1. Sube el archivo `worker.js` a Cloudflare Workers.
2. Agrega el secreto `TELEGRAM_BOT_TOKEN`.
3. Configura el webhook de Telegram con:
   ```url
   https://api.telegram.org/bot<TU_TOKEN>/setWebhook?url=https://tu-worker.workers.dev/webhook
   ```
