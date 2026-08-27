/**
 * @file worker.js
 * @description Cloudflare Worker para ejecutar el bot de Telegram en arquitectura Serverless gratuita.
 */

import { handleTelegramUpdate } from './bot-core.js';

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        if (request.method === 'POST' && url.pathname === '/webhook') {
            try {
                const botToken = env.TELEGRAM_BOT_TOKEN;
                const defaultWalletId = env.DEFAULT_WALLET_ID || null;
                const geminiApiKey = env.GEMINI_API_KEY || '';

                if (!botToken) {
                    return new Response("Missing TELEGRAM_BOT_TOKEN", { status: 500 });
                }

                const update = await request.json();
                ctx.waitUntil(handleTelegramUpdate(update, botToken, defaultWalletId, { geminiApiKey }));

                return new Response(JSON.stringify({ ok: true }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (err) {
                return new Response(`Error: ${err.message}`, { status: 500 });
            }
        }

        if (url.pathname === '/') {
            return new Response("🤖 Qipu 3.0 Telegram Bot Worker is Active!", {
                headers: { 'Content-Type': 'text/plain' }
            });
        }

        return new Response("Not Found", { status: 404 });
    }
};
