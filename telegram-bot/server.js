/**
 * @file server.js
 * @description Servidor Node.js para ejecutar el Bot de Telegram localmente (Long-polling)
 * o en producción mediante Webhooks (Render, Railway, Fly.io, VPS).
 */

import http from 'http';
import { handleTelegramUpdate } from './bot-core.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const DEFAULT_WALLET_ID = process.env.DEFAULT_WALLET_ID || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const PORT = process.env.PORT || 3000;
const MODE = process.env.BOT_MODE || 'polling'; // 'polling' o 'webhook'

if (!BOT_TOKEN) {
    console.error("\n❌ ERROR: Falta TELEGRAM_BOT_TOKEN.");
    console.error("Crea un bot con @BotFather en Telegram y configúralo en tu archivo .env o variable de entorno.\n");
    process.exit(1);
}

console.log("=========================================");
console.log("  🤖 QIPU 3.0 - TELEGRAM BOT SERVER");
console.log("=========================================");
console.log(`Modo de ejecución: ${MODE.toUpperCase()}`);
if (DEFAULT_WALLET_ID) console.log(`Monedero por defecto: ${DEFAULT_WALLET_ID}`);
if (GEMINI_API_KEY) console.log(`IA Visión (Gemini): ACTIVADO ✅`);
else console.log(`IA Visión (Gemini): Desactivado (agrega GEMINI_API_KEY en .env para leer facturas/fotos)`);

/**
 * MODO LONG-POLLING (Ideal para desarrollo local o VPS sin certificado SSL externo)
 */
async function startPolling() {
    console.log("Iniciando Long Polling con Telegram API...");

    // Eliminar cualquier webhook previo para evitar conflictos
    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
    } catch (e) {}

    let offset = 0;

    async function poll() {
        try {
            const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${offset}&timeout=30`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                if (data.ok && Array.isArray(data.result)) {
                    for (const update of data.result) {
                        offset = update.update_id + 1;
                        await handleTelegramUpdate(update, BOT_TOKEN, DEFAULT_WALLET_ID, { geminiApiKey: GEMINI_API_KEY });
                    }
                }
            }
        } catch (err) {
            console.error("Error en polling:", err.message);
            await new Promise(r => setTimeout(r, 3000));
        }
        setImmediate(poll);
    }

    poll();
    console.log("✅ Bot listo y escuchando mensajes en Telegram.");
}

/**
 * MODO WEBHOOK (Para servidores HTTPS en producción)
 */
function startWebhookServer() {
    const server = http.createServer(async (req, res) => {
        if (req.method === 'POST' && req.url === '/webhook') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', async () => {
                try {
                    const update = JSON.parse(body);
                    await handleTelegramUpdate(update, BOT_TOKEN, DEFAULT_WALLET_ID, { geminiApiKey: GEMINI_API_KEY });
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true }));
                } catch (err) {
                    console.error("Error procesando webhook:", err);
                    res.writeHead(500);
                    res.end("Internal Server Error");
                }
            });
        } else if (req.method === 'GET' && req.url === '/') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end("<h1>🤖 Qipu 3.0 Telegram Bot is Running!</h1>");
        } else {
            res.writeHead(404);
            res.end();
        }
    });

    server.listen(PORT, () => {
        console.log(`✅ Servidor Webhook escuchando en el puerto ${PORT}`);
    });
}

if (MODE === 'webhook') {
    startWebhookServer();
} else {
    startPolling();
}
