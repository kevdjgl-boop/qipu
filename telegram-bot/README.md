# 🤖 Qipu 3.0 - Bot de Telegram para Registro de Gastos con IA

Permite registrar gastos en tu monedero de Qipu en tiempo real directamente enviando mensajes de texto o **fotos de tus facturas, boletas y tickets** por Telegram.

---

## 🚀 Guía Rápida de Configuración

### 1. Crear tu Bot en Telegram
1. Abre Telegram y busca a **[@BotFather](https://t.me/BotFather)**.
2. Envía el comando `/newbot`.
3. Asigna un nombre a tu bot (ej: `Mi Qipu Gastos`) y un usuario (ej: `MiQipuGastosBot`).
4. **Copia el Token HTTP API** que te entrega @BotFather.

---

### 2. Configuración en `.env`
En la carpeta `telegram-bot`, crea o edita tu archivo `.env`:
```env
TELEGRAM_BOT_TOKEN=8781477451:AAFnJum2lDeTkt2lFhDptlNBNYNzS5e96H0
DEFAULT_WALLET_ID=restored_1765520245071
GEMINI_API_KEY=tu_gemini_api_key_aqui
BOT_MODE=polling
```

> 💡 **Lectura de Facturas con IA:** Para activar el escaneo de comprobantes por foto, obtén tu API Key gratuita de Gemini en [Google AI Studio](https://aistudio.google.com/app/apikey) y pégala en `GEMINI_API_KEY`.

---

### 3. Iniciar el Bot Localmente
```bash
cd telegram-bot
npm start
```

---

## 📝 Modos de Registro de Gastos

### 📸 Opción 1: Enviar Foto de Factura / Boleta / Ticket / Voucher
Solo toma una foto de tu comprobante y envíasela al bot:
- Extraerá el **monto total**, **nombre del comercio**, **fecha**, **método de pago** y **categoría**.
- Lo guardará automáticamente en tu monedero de Qipu.

### ✍️ Opción 2: Mensaje de Texto Natural
| Mensaje en Telegram | Resultado en Qipu |
| :--- | :--- |
| `25.50 Almuerzo` | Gasto de **S/ 25.50** en *Alimentación*, Personal. |
| `Taxi 18.00 efectivo transporte` | Gasto de **S/ 18.00** en *Transporte* pagado en *Efectivo*. |
| `120.00 Cena amigos compartido bcp` | Gasto compartido de **S/ 120.00** dividido entre los integrantes. |
| `/saldo` | Te muestra tu presupuesto, gasto mensual y saldo disponible. |

---

## 🌐 Despliegue en la Nube (24/7 sin tu PC prendida)

### Opción A: Render / Railway / Fly.io
1. Sube este repositorio a GitHub.
2. En Render.com crea un **Web Service** apuntando a `telegram-bot/server.js`.
3. Configura las variables de entorno: `TELEGRAM_BOT_TOKEN`, `DEFAULT_WALLET_ID`, `GEMINI_API_KEY`.

### Opción B: Cloudflare Workers (Serverless 100% Gratis)
1. Sube el archivo `worker.js` a Cloudflare Workers.
2. Agrega los secretos: `TELEGRAM_BOT_TOKEN`, `DEFAULT_WALLET_ID`, `GEMINI_API_KEY`.
3. Configura el webhook de Telegram con:
   ```url
   https://api.telegram.org/bot<TU_TOKEN>/setWebhook?url=https://tu-worker.workers.dev/webhook
   ```
