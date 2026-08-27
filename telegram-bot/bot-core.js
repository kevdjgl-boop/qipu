/**
 * @file bot-core.js
 * @description Lógica central del Bot de Telegram para Qipu 3.0.
 * Maneja comandos, vinculaciones, registro de transacciones por texto y lectura de facturas/boletas con IA Gemini Vision.
 */

import { parseExpenseMessage } from './parser.js';
import { getWalletDoc, addExpenseToWallet, getWalletQuickSummary, updateWalletDoc } from './firebase-service.js';
import { downloadTelegramPhotoAsBase64, analyzeReceiptWithGemini } from './gemini-vision.js';

// Memoria en caliente para mapeo chat_id -> { walletId, participantId }
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
 * Envía una acción de chat (ej: typing, upload_photo).
 */
export async function sendChatAction(botToken, chatId, action = 'typing') {
    try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, action })
        });
    } catch (e) {}
}

/**
 * Obtiene la sesión vinculada para un chatId.
 */
async function getSession(chatId, fallbackWalletId = null) {
    if (userSessions.has(String(chatId))) {
        return userSessions.get(String(chatId));
    }
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
export async function handleTelegramUpdate(update, botToken, defaultWalletId = null, config = {}) {
    if (!update.message) return;

    const message = update.message;
    const chatId = message.chat.id;
    const userName = message.from?.first_name || 'Amigo';
    const geminiApiKey = config.geminiApiKey || process.env.GEMINI_API_KEY || '';

    // =========================================================================
    // 📸 PROCESAR FOTOS / COMPROBANTES / FACTURAS / BOLETAS CON IA (GEMINI)
    // =========================================================================
    const isPhoto = message.photo && message.photo.length > 0;
    const isImageDoc = message.document && (
        message.document.mime_type?.startsWith('image/') ||
        message.document.mime_type === 'application/pdf'
    );

    if (isPhoto || isImageDoc) {
        const session = await getSession(chatId, defaultWalletId);
        if (!session || !session.walletId) {
            return await sendTelegramMessage(botToken, chatId,
                `⚠️ <b>Monedero no configurado.</b>\nPara leer facturas, primero vincula tu monedero con:\n\n👉 <code>/vincular ID_DE_TU_MONEDERO</code>`
            );
        }

        if (!geminiApiKey) {
            return await sendTelegramMessage(botToken, chatId,
                `📷 <b>¡Foto recibida!</b>\n\n` +
                `Para activar la <b>lectura automática de facturas y boletas con Inteligencia Artificial</b>, debes agregar tu <code>GEMINI_API_KEY</code> en tu archivo de configuración <code>.env</code>.\n\n` +
                `💡 <i>Es 100% gratuita y la obtienes en 1 minuto en Google AI Studio:</i>\nhttps://aistudio.google.com/app/apikey`
            );
        }

        await sendChatAction(botToken, chatId, 'typing');
        await sendTelegramMessage(botToken, chatId, `🔍 <b>Analizando comprobante con Inteligencia Artificial...</b> ⏳`);

        try {
            // Obtener el file_id (la foto con mejor resolución está al final del array)
            const fileId = isPhoto 
                ? message.photo[message.photo.length - 1].file_id 
                : message.document.file_id;

            // 1. Descargar imagen en Base64
            const { base64Data, mimeType } = await downloadTelegramPhotoAsBase64(fileId, botToken);

            // 2. Obtener estado del monedero para emparejar categorías y métodos
            const wallet = await getWalletDoc(session.walletId);
            if (!wallet) {
                return await sendTelegramMessage(botToken, chatId, `❌ Monedero no encontrado en la base de datos.`);
            }

            const categories = wallet.categories || [];
            const paymentMethods = wallet.paymentMethods || [];
            const participants = wallet.participants || [];

            // 3. Analizar con Gemini Vision
            const receiptData = await analyzeReceiptWithGemini(base64Data, mimeType, geminiApiKey, categories);

            const amount = parseFloat(receiptData.amount);
            if (isNaN(amount) || amount <= 0) {
                return await sendTelegramMessage(botToken, chatId, 
                    `⚠️ No pude detectar un monto total claro en este comprobante.\n\n` +
                    `💡 <i>Intenta enviar una foto más nítida o registrarlo por texto (ej: <code>${receiptData.merchant || 'Compra'} 35.00</code>).</i>`
                );
            }

            // 4. Emparejar Categoría
            let categoryName = receiptData.category || 'Varios';
            const matchedCategory = categories.find(c => 
                c.name.toLowerCase() === categoryName.toLowerCase() ||
                (c.subcategories && c.subcategories.some(s => s.toLowerCase() === categoryName.toLowerCase()))
            );
            if (matchedCategory) categoryName = matchedCategory.name;
            else if (categories.length > 0 && !matchedCategory) categoryName = categories[0].name;

            // 5. Emparejar Método de Pago
            let paymentMethodId = null;
            let paymentMethodName = '';
            const detectedPmKey = (receiptData.paymentMethod || '').toLowerCase();

            for (const pm of paymentMethods) {
                if (pm.name.toLowerCase().includes(detectedPmKey) || pm.type?.toLowerCase()?.includes(detectedPmKey)) {
                    paymentMethodId = pm.id;
                    paymentMethodName = pm.name;
                    break;
                }
            }
            if (!paymentMethodId && paymentMethods.length > 0) {
                paymentMethodId = paymentMethods[0].id;
                paymentMethodName = paymentMethods[0].name;
            }

            // 6. Determinar Pagador
            let payerId = session.participantId;
            if (!payerId || !participants.some(p => p.id === payerId)) {
                payerId = participants.length > 0 ? participants[0].id : 'default_payer';
            }
            const payer = participants.find(p => p.id === payerId);
            const payerName = payer ? payer.name : 'Tú';

            // 7. Armar el registro del gasto
            const expenseDate = receiptData.date || new Date().toISOString().split('T')[0];
            const description = receiptData.merchant 
                ? `${receiptData.merchant}${receiptData.description ? ' - ' + receiptData.description : ''}`
                : (receiptData.description || 'Gasto Comprobante');

            const expenseToSave = {
                amount: Math.round(amount * 100) / 100,
                description,
                category: categoryName,
                paymentMethodId,
                paymentMethodName: paymentMethodName || 'Efectivo',
                payerId,
                payerName,
                type: receiptData.isShared ? 'shared' : 'personal',
                date: expenseDate,
                isFixed: false,
                fixedRecurrenceMonths: 0,
                items: [],
                guests: []
            };

            // 8. Guardar en Firestore
            await addExpenseToWallet(session.walletId, expenseToSave);

            // 9. Confirmación al usuario
            const typeBadge = expenseToSave.type === 'shared' ? '👥 Compartido' : '👤 Personal';
            const msg = `🧾 <b>¡Comprobante Procesado con Éxito!</b> ✨\n\n` +
                        `🏢 <b>Establecimiento:</b> ${receiptData.merchant || 'Comercio'}\n` +
                        `💵 <b>Monto Total:</b> S/ ${expenseToSave.amount.toFixed(2)}\n` +
                        `📝 <b>Detalle:</b> ${expenseToSave.description}\n` +
                        `🏷️ <b>Categoría:</b> ${expenseToSave.category}\n` +
                        `💳 <b>Método de Pago:</b> ${expenseToSave.paymentMethodName}\n` +
                        `📅 <b>Fecha:</b> ${expenseToSave.date}\n` +
                        `👤 <b>Pagado por:</b> ${expenseToSave.payerName}\n` +
                        `📌 <b>Tipo:</b> ${typeBadge}\n\n` +
                        `⚡ <i>Registrado en tiempo real en tu app Qipu.</i>`;

            return await sendTelegramMessage(botToken, chatId, msg);

        } catch (err) {
            console.error("Error procesando foto/factura:", err);
            return await sendTelegramMessage(botToken, chatId,
                `❌ <b>Error al procesar la imagen:</b> ${err.message}\n\n` +
                `💡 Puedes registrarlo manualmente escribiendo: <code>Monto Descripción</code>`
            );
        }
    }

    // =========================================================================
    // 💬 PROCESAR MENSAJES DE TEXTO Y COMANDOS
    // =========================================================================
    if (!message.text) return;

    const rawText = message.text.trim();

    // 1. COMANDO /start
    if (rawText.startsWith('/start')) {
        const parts = rawText.split(' ');
        const payload = parts.length > 1 ? parts[1].trim() : null;

        if (payload) {
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
                        `📸 <b>¡Puedes enviar fotos de facturas o boletas directamente!</b>\n` +
                        `O escribe tus gastos en texto:\n` +
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
            `Registra tus gastos enviando un mensaje de texto o <b>enviando fotos de tus facturas y tickets</b> 📸.\n\n` +
            `🔗 <b>Paso 1: Vincula tu Monedero</b>\n` +
            `Escribe: <code>/vincular [ID_DE_TU_MONEDERO]</code>\n\n` +
            `📖 <b>Ejemplos de uso:</b>\n` +
            `• 📸 <i>Envía la foto de un voucher o ticket de compra</i>\n` +
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

            msg += `🚀 <i>¡Ya puedes registrar gastos! Prueba enviando una foto de un ticket o escribe:</i>\n<code>20 Taxi</code>`;

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
            `📸 <b>Lectura de Facturas y Boletas:</b>\n` +
            `• Toma una foto de tu ticket, boleta o voucher de pago y envíala aquí.\n` +
            `• La IA extraerá automáticamente el monto, establecimiento y categoría.\n\n` +
            `📝 <b>Registro por Texto:</b>\n` +
            `• <code>25 Almuerzo</code>\n` +
            `• <code>18.50 Uber transporte tarjeta</code>\n` +
            `• <code>120 Cena amigos compartido bcp</code>\n\n` +
            `⚡ <b>Comandos disponibles:</b>\n` +
            `• <code>/saldo</code> - Ver disponible y gastos del mes\n` +
            `• <code>/soy [Nombre]</code> - Cambiar quién registra el gasto\n` +
            `• <code>/vincular [ID]</code> - Cambiar monedero activo\n` +
            `• <code>/desvincular</code> - Desconectar este chat\n` +
            `• <code>/ayuda</code> - Ver esta guía`
        );
    }

    // 7. REGISTRO DIRECTO DE GASTO (PARSER DE TEXTO)
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
                `Prueba escribiendo algo como:\n👉 <code>35.00 Almuerzo</code> o <code>Taxi 15</code>\n` +
                `O envía una 📸 foto de tu comprobante.`
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
