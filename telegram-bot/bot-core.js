/**
 * @file bot-core.js
 * @description Lógica central del Bot de Telegram para Qipu 3.0.
 * Maneja comandos, vinculaciones y registro de transacciones.
 */

import { parseExpenseMessage } from './parser.js';
import { getWalletDoc, addExpenseToWallet, getWalletQuickSummary, updateWalletDoc } from './firebase-service.js';

// Memoria en caliente para mapeo chat_id -> { walletId, participantId }
// En producción, también se sincroniza en el campo telegramUsers del documento wallet en Firestore.
const userSessions = new Map();

/**
 * Envía un mensaje a través de la API de Telegram.
 */
export async function sendTelegramMessage(botToken, chatId, text, options = {}) {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const payload = {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        ...options
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        console.error("Error enviando mensaje a Telegram:", await res.text());
    }
    return res;
}

/**
 * Obtiene la sesión vinculada para un chatId.
 */
async function getSession(chatId, fallbackWalletId = null) {
    if (userSessions.has(String(chatId))) {
        return userSessions.get(String(chatId));
    }

    // Si no está en memoria local, buscar si hay algún wallet con este chatId en Firestore
    // (Opcional: usar fallback si se especificó)
    if (fallbackWalletId) {
        return { walletId: fallbackWalletId, participantId: null };
    }
    return null;
}

/**
 * Guarda la sesión del usuario.
 */
export function setSession(chatId, walletId, participantId = null) {
    userSessions.set(String(chatId), { walletId, participantId });
}

/**
 * Procesa una actualización (Update) entrante de Telegram.
 */
export async function handleTelegramUpdate(update, botToken, defaultWalletId = null) {
    if (!update.message || !update.message.text) return;

    const message = update.message;
    const chatId = message.chat.id;
    const rawText = message.text.trim();
    const userName = message.from?.first_name || 'Amigo';

    // 1. COMANDO /start
    if (rawText.startsWith('/start')) {
        const parts = rawText.split(' ');
        const payload = parts.length > 1 ? parts[1].trim() : null;

        if (payload) {
            // Se abrió con deeplink: t.me/Bot?start=WALLETID
            setSession(chatId, payload);
            try {
                const wallet = await getWalletDoc(payload);
                if (wallet) {
                    const participants = wallet.participants || [];
                    const pList = participants.map((p, i) => `<b>${i + 1}.</b> ${p.name} (<code>/soy ${p.id}</code>)`).join('\n');
                    
                    return await sendTelegramMessage(botToken, chatId, 
                        `🎉 <b>¡Conectado a Qipu!</b>\n\n` +
                        `Monedero: <b>${wallet.name || 'Mi Monedero'}</b>\n\n` +
                        `👥 <b>¿Quién eres en este grupo?</b>\n${pList || 'Sin participantes registrados'}\n\n` +
                        `💡 <i>Para vincular tu nombre, escribe:</i>\n<code>/soy [Tu Nombre o ID]</code>\n\n` +
                        `O simplemente empieza a escribir tus gastos:\n` +
                        `👉 <code>25 Almuerzo</code>\n` +
                        `👉 <code>50 Taxi compartido efectivo</code>`
                    );
                }
            } catch (err) {
                console.error("Error al validar wallet en /start:", err);
            }
        }

        return await sendTelegramMessage(botToken, chatId,
            `👋 <b>¡Hola ${userName}! Bienvenido a Qipu Bot</b> 💰\n\n` +
            `Registra tus gastos al instante enviando un mensaje directo.\n\n` +
            `🔗 <b>Paso 1: Vincula tu Monedero</b>\n` +
            `Escribe: <code>/vincular [ID_DE_TU_MONEDERO]</code>\n` +
            `<i>(Encuentras tu ID en el botón Ajustes / Billetera de la app web Qipu)</i>\n\n` +
            `📖 <b>Ejemplos de registro rápido:</b>\n` +
            `• <code>25.50 Almuerzo</code>\n` +
            `• <code>Almuerzo 30 yape comida</code>\n` +
            `• <code>120 Cena compartido tarjeta</code>\n\n` +
            `Escribe <code>/ayuda</code> para ver todos los comandos.`
        );
    }

    // 2. COMANDO /vincular <walletId> [participantId]
    if (rawText.startsWith('/vincular') || rawText.startsWith('/link')) {
        const parts = rawText.split(/\s+/);
        if (parts.length < 2) {
            return await sendTelegramMessage(botToken, chatId,
                `⚠️ <b>Formato incorrecto.</b>\nUsa: <code>/vincular ID_MONEDERO</code>\n\nEjemplo: <code>/vincular w_123456</code>`
            );
        }

        const walletId = parts[1].trim();
        try {
            const wallet = await getWalletDoc(walletId);
            if (!wallet) {
                return await sendTelegramMessage(botToken, chatId,
                    `❌ <b>Monedero no encontrado.</b>\nVerifica que el ID sea exacto desde tu aplicación web Qipu.`
                );
            }

            const participants = wallet.participants || [];
            let matchedParticipant = null;

            if (parts.length >= 3) {
                const target = parts.slice(2).join(' ').toLowerCase();
                matchedParticipant = participants.find(p => p.id === target || p.name.toLowerCase().includes(target));
            } else if (participants.length === 1) {
                matchedParticipant = participants[0];
            }

            setSession(chatId, walletId, matchedParticipant ? matchedParticipant.id : null);

            let msg = `✅ <b>¡Monedero vinculado con éxito!</b>\n\n` +
                      `📁 <b>Grupo:</b> ${wallet.name || 'Monedero Qipu'}\n`;

            if (matchedParticipant) {
                msg += `👤 <b>Participante:</b> ${matchedParticipant.name}\n\n`;
            } else {
                msg += `👤 <b>Participante:</b> No asignado (usa <code>/soy TuNombre</code> para identificarte)\n\n`;
            }

            msg += `🚀 <i>¡Ya puedes registrar gastos! Prueba enviando:</i>\n<code>20 Taxi</code>`;

            return await sendTelegramMessage(botToken, chatId, msg);
        } catch (err) {
            return await sendTelegramMessage(botToken, chatId, `❌ Error al vincular: ${err.message}`);
        }
    }

    // 3. COMANDO /soy <nombre_o_id>
    if (rawText.startsWith('/soy') || rawText.startsWith('/yo')) {
        const session = await getSession(chatId, defaultWalletId);
        if (!session || !session.walletId) {
            return await sendTelegramMessage(botToken, chatId, `⚠️ Primero debes vincular tu monedero con <code>/vincular ID_MONEDERO</code>`);
        }

        const nameOrId = rawText.replace(/^\/(soy|yo)\s+/i, '').trim().toLowerCase();
        if (!nameOrId) {
            return await sendTelegramMessage(botToken, chatId, `⚠️ Indica tu nombre. Ejemplo: <code>/soy Carlos</code>`);
        }

        const wallet = await getWalletDoc(session.walletId);
        if (!wallet) return await sendTelegramMessage(botToken, chatId, `❌ Error leyendo monedero.`);

        const participants = wallet.participants || [];
        const match = participants.find(p => p.id.toLowerCase() === nameOrId || p.name.toLowerCase().includes(nameOrId));

        if (!match) {
            const avail = participants.map(p => `• ${p.name}`).join('\n');
            return await sendTelegramMessage(botToken, chatId, `❌ No encontré a "${nameOrId}".\n\nIntegrantes disponibles:\n${avail}`);
        }

        setSession(chatId, session.walletId, match.id);
        return await sendTelegramMessage(botToken, chatId, `👤 <b>Identidad guardada:</b> Ahora tus gastos se registrarán a nombre de <b>${match.name}</b> ✨`);
    }

    // 4. COMANDO /desvincular
    if (rawText === '/desvincular') {
        userSessions.delete(String(chatId));
        return await sendTelegramMessage(botToken, chatId, `🔌 <b>Monedero desvinculado.</b> Puedes vincular otro con <code>/vincular ID_MONEDERO</code>`);
    }

    // 5. COMANDO /saldo
    if (rawText === '/saldo' || rawText === '/balance') {
        const session = await getSession(chatId, defaultWalletId);
        if (!session || !session.walletId) {
            return await sendTelegramMessage(botToken, chatId, `⚠️ No tienes un monedero vinculado. Usa <code>/vincular ID</code>`);
        }

        try {
            const summary = await getWalletQuickSummary(session.walletId, session.participantId);
            if (!summary) return await sendTelegramMessage(botToken, chatId, `❌ Monedero no encontrado.`);

            let msg = `📊 <b>Estado de ${summary.walletName}</b>\n\n` +
                      `💰 <b>Presupuesto Total:</b> S/ ${summary.totalBudget.toFixed(2)}\n` +
                      `📉 <b>Gastado este mes:</b> S/ ${summary.totalSpent.toFixed(2)}\n` +
                      `🟢 <b>Disponible Global:</b> S/ ${summary.totalRemaining.toFixed(2)}\n`;

            if (summary.participantName) {
                msg += `\n👤 <b>Tus Números (${summary.participantName}):</b>\n` +
                       `• Presupuesto: S/ ${summary.participantBudget.toFixed(2)}\n` +
                       `• Has gastado: S/ ${summary.participantSpent.toFixed(2)}\n` +
                       `• Tu disponible: S/ ${summary.participantRemaining.toFixed(2)}\n`;
            }

            if (summary.recentExpenses && summary.recentExpenses.length > 0) {
                msg += `\n🧾 <b>Últimos gastos:</b>\n`;
                summary.recentExpenses.forEach(e => {
                    msg += `• <i>${e.description}</i>: S/ ${(parseFloat(e.amount) || 0).toFixed(2)} (${e.category || 'Varios'})\n`;
                });
            }

            return await sendTelegramMessage(botToken, chatId, msg);
        } catch (err) {
            return await sendTelegramMessage(botToken, chatId, `❌ Error consultando saldo: ${err.message}`);
        }
    }

    // 6. COMANDO /ayuda
    if (rawText === '/ayuda' || rawText === '/help') {
        return await sendTelegramMessage(botToken, chatId,
            `💡 <b>Guía de Uso de Qipu Bot</b>\n\n` +
            `📝 <b>Cómo registrar gastos:</b>\n` +
            `Simplemente envía un mensaje con el monto y descripción:\n` +
            `• <code>25 Almuerzo</code>\n` +
            `• <code>18.50 Uber transporte tarjeta</code>\n` +
            `• <code>120 Cena amigos compartido bcp</code>\n\n` +
            `⚡ <b>Comandos disponibles:</b>\n` +
            `• <code>/saldo</code> - Ver disponible y gastos del mes\n` +
            `• <code>/soy [Nombre]</code> - Cambiar a quién se le asigna el gasto\n` +
            `• <code>/vincular [ID]</code> - Cambiar monedero activo\n` +
            `• <code>/desvincular</code> - Desconectar este chat\n` +
            `• <code>/ayuda</code> - Ver esta guía`
        );
    }

    // 7. REGISTRO DIRECTO DE GASTO (PARSER DE MENSAJE)
    const session = await getSession(chatId, defaultWalletId);
    if (!session || !session.walletId) {
        return await sendTelegramMessage(botToken, chatId,
            `⚠️ <b>Monedero no configurado.</b>\nPara registrar <i>"${rawText}"</i>, primero vincula tu monedero:\n\n👉 <code>/vincular ID_DE_TU_MONEDERO</code>`
        );
    }

    try {
        const wallet = await getWalletDoc(session.walletId);
        if (!wallet) {
            return await sendTelegramMessage(botToken, chatId, `❌ Monedero no encontrado en la base de datos.`);
        }

        const parsedExpense = parseExpenseMessage(rawText, wallet, session.participantId);

        if (!parsedExpense) {
            return await sendTelegramMessage(botToken, chatId,
                `❓ No detecté un monto válido en tu mensaje.\n\n` +
                `Prueba escribiendo algo como:\n👉 <code>35.00 Almuerzo</code> o <code>Taxi 15</code>`
            );
        }

        // Guardar el gasto en Firestore
        const savedExpense = await addExpenseToWallet(session.walletId, parsedExpense);

        const typeBadge = parsedExpense.type === 'shared' ? '👥 Compartido' : '👤 Personal';
        const msg = `✅ <b>Gasto registrado en Qipu</b>\n\n` +
                    `💵 <b>Monto:</b> S/ ${parsedExpense.amount.toFixed(2)}\n` +
                    `📝 <b>Detalle:</b> ${parsedExpense.description}\n` +
                    `🏷️ <b>Categoría:</b> ${parsedExpense.category}\n` +
                    `💳 <b>Método:</b> ${parsedExpense.paymentMethodName || 'Efectivo'}\n` +
                    `👤 <b>Pagado por:</b> ${parsedExpense.payerName}\n` +
                    `📌 <b>Tipo:</b> ${typeBadge}\n\n` +
                    `⚡ <i>Se actualizó en tiempo real en tu Dashboard web.</i>`;

        return await sendTelegramMessage(botToken, chatId, msg);
    } catch (err) {
        console.error("Error registrando gasto vía Telegram:", err);
        return await sendTelegramMessage(botToken, chatId, `❌ Error al registrar gasto: ${err.message}`);
    }
}
