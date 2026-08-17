/**
 * @file test-parser.js
 * @description Suite de pruebas automatizadas para el parser de Telegram.
 */

import { parseExpenseMessage } from './parser.js';

const mockWalletState = {
    categories: [
        { name: "Alimentación", subcategories: ["Supermercado", "Restaurantes", "Snacks"] },
        { name: "Transporte", subcategories: ["Taxi", "Gasolina", "Pasajes"] },
        { name: "Servicios", subcategories: ["Luz", "Agua", "Internet"] },
        { name: "Salud", subcategories: ["Farmacia", "Consultas"] },
        { name: "Varios", subcategories: [] }
    ],
    paymentMethods: [
        { id: "pm_cash", name: "Efectivo", type: "cash" },
        { id: "pm_bcp", name: "BCP Débito", type: "debit" },
        { id: "pm_tc", name: "BBVA Crédito", type: "credit" }
    ],
    participants: [
        { id: "part_carlos", name: "Carlos" },
        { id: "part_ana", name: "Ana" }
    ]
};

const testCases = [
    {
        input: "25.50 Almuerzo",
        expected: { amount: 25.50, description: "Almuerzo", category: "Alimentación", type: "personal" }
    },
    {
        input: "Almuerzo 30",
        expected: { amount: 30, description: "Almuerzo", category: "Alimentación", type: "personal" }
    },
    {
        input: "S/ 18.00 Taxi transporte efectivo",
        expected: { amount: 18.00, description: "Taxi", category: "Transporte", paymentMethodId: "pm_cash", type: "personal" }
    },
    {
        input: "120 Cena amigos compartido bcp",
        expected: { amount: 120, description: "Cena Amigos", category: "Alimentación", paymentMethodId: "pm_bcp", type: "shared" }
    },
    {
        input: "/gasto 45.00 Farmacia salud",
        expected: { amount: 45.00, description: "Farmacia", category: "Salud", type: "personal" }
    },
    {
        input: "85.90 Supermercado plaza vea tarjeta",
        expected: { amount: 85.90, description: "Plaza Vea", category: "Alimentación", paymentMethodId: "pm_bcp", type: "personal" }
    }
];

console.log("=========================================");
console.log("  🧪 EJECUTANDO PRUEBAS DEL PARSER");
console.log("=========================================");

let passed = 0;
let failed = 0;

for (const t of testCases) {
    const res = parseExpenseMessage(t.input, mockWalletState, "part_carlos");
    if (!res) {
        console.error(`❌ FALLÓ [${t.input}]: Retornó null`);
        failed++;
        continue;
    }

    let ok = true;
    for (const [key, val] of Object.entries(t.expected)) {
        if (res[key] !== val) {
            console.error(`❌ FALLÓ [${t.input}]: Propiedad '${key}' esperada: ${val}, obtenida: ${res[key]}`);
            ok = false;
        }
    }

    if (ok) {
        console.log(`✅ PASÓ [${t.input}] -> S/ ${res.amount} | ${res.description} | ${res.category} | ${res.paymentMethodName || 'Default'} | ${res.type}`);
        passed++;
    } else {
        failed++;
    }
}

console.log("=========================================");
console.log(`Resultado: ${passed} pasadas, ${failed} falladas.`);
if (failed > 0) process.exit(1);
