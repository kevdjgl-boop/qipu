// ================================================================
// MÓDULO DE EXPORTACIÓN DE DATOS - QIPU 3.0
// ================================================================
// NOTA: appState vive en app.js (ES Module). Se accede vía window.appState
// gracias al Object.defineProperty expuesto en app.js.

// ----- HELPER: Descargar un string como archivo -----
function _downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 150);
}

// ----- HELPER: Convertir array de objetos a CSV -----
function _arrayToCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val) => {
    const str = val === null || val === undefined ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  return [
    headers.map(escape).join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(','))
  ].join('\n');
}

// ----- HELPER: Nombre de participante por ID -----
function _getParticipantName(id) {
  if (!id) return 'Desconocido';
  if (id.startsWith('guest_')) return 'Invitado';
  const state = window.appState || {};
  const p = (state.participants || []).find(x => x.id === id);
  return p ? p.name : id;
}

// ----- HELPER: Nombre de método de pago por ID -----
function _getMethodName(id) {
  if (!id) return '';
  const state = window.appState || {};
  const m = (state.paymentMethods || []).find(x => x.id === id);
  return m ? m.name : id;
}

// ----- HELPER: Fecha formateada DD/MM/YYYY -----
function _fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ----- HELPER: Obtener filas de gastos -----
function _getExpenseRows() {
  const state = window.appState || {};
  return (state.expenses || [])
    .filter(e => !e.isProjected)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .map(e => ({
      'Tipo': 'Gasto',
      'Fecha': _fmtDate(e.date),
      'Descripción': e.description || '',
      'Monto': (parseFloat(e.amount) || 0).toFixed(2),
      'Subtipo': e.type === 'shared' ? 'Compartido' : 'Personal',
      'Categoría': e.category || '',
      'Subcategoría': e.subcategory || '',
      'Participante / Pagador': _getParticipantName(e.payerId),
      'Método de Pago': _getMethodName(e.paymentMethodId),
      'Es Fijo': e.isFixed ? 'Sí' : 'No',
      'Notas': e.notes || '',
    }));
}

// ----- HELPER: Obtener filas de ingresos -----
function _getIncomeRows() {
  const state = window.appState || {};
  const rows = [];
  (state.participants || []).forEach(p => {
    const incomes = p.incomes || [];
    if (incomes.length === 0) {
      rows.push({
        'Tipo': 'Ingreso',
        'Fecha': '',
        'Descripción': 'Presupuesto Base',
        'Monto': (parseFloat(p.budget) || 0).toFixed(2),
        'Subtipo': '',
        'Categoría': '',
        'Subcategoría': '',
        'Participante / Pagador': p.name,
        'Método de Pago': '',
        'Es Fijo': '',
        'Notas': '',
      });
    } else {
      incomes.forEach(inc => {
        rows.push({
          'Tipo': 'Ingreso',
          'Fecha': _fmtDate(inc.date),
          'Descripción': inc.name || 'Ingreso',
          'Monto': (parseFloat(inc.amount) || 0).toFixed(2),
          'Subtipo': '',
          'Categoría': '',
          'Subcategoría': '',
          'Participante / Pagador': p.name,
          'Método de Pago': '',
          'Es Fijo': '',
          'Notas': '',
        });
      });
    }
  });
  return rows;
}

// ================================================================
// 1. EXPORTAR GASTOS A CSV
// ================================================================
window.exportExpensesCSV = function () {
  const rows = _getExpenseRows();
  if (rows.length === 0) {
    ui.alert('Sin datos', 'No hay gastos registrados para exportar.', 'warning');
    return;
  }
  const csv = _arrayToCSV(rows);
  const dateStr = new Date().toISOString().split('T')[0];
  _downloadFile('\uFEFF' + csv, `qipu_gastos_${dateStr}.csv`, 'text/csv;charset=utf-8');
  ui.alert('¡Listo!', `Se exportaron <b>${rows.length} gastos</b> correctamente.`, 'success');
};

// ================================================================
// 2. EXPORTAR INGRESOS A CSV
// ================================================================
window.exportIncomesCSV = function () {
  const rows = _getIncomeRows();
  if (rows.length === 0) {
    ui.alert('Sin datos', 'No hay participantes ni ingresos registrados.', 'warning');
    return;
  }
  const csv = _arrayToCSV(rows);
  const dateStr = new Date().toISOString().split('T')[0];
  _downloadFile('\uFEFF' + csv, `qipu_ingresos_${dateStr}.csv`, 'text/csv;charset=utf-8');
  ui.alert('¡Listo!', `Se exportaron <b>${rows.length} registros de ingresos</b>.`, 'success');
};

// ================================================================
// 3. EXPORTAR GASTOS + INGRESOS JUNTOS EN UN SOLO CSV
// ================================================================
window.exportAllCSV = function () {
  const expenseRows = _getExpenseRows();
  const incomeRows = _getIncomeRows();
  const allRows = [...incomeRows, ...expenseRows]; // Ingresos primero, luego gastos

  if (allRows.length === 0) {
    ui.alert('Sin datos', 'No hay registros para exportar.', 'warning');
    return;
  }
  const csv = _arrayToCSV(allRows);
  const dateStr = new Date().toISOString().split('T')[0];
  _downloadFile('\uFEFF' + csv, `qipu_completo_${dateStr}.csv`, 'text/csv;charset=utf-8');
  ui.alert('¡Listo!',
    `CSV completo exportado:<br>
     <b>${incomeRows.length}</b> ingresos + <b>${expenseRows.length}</b> gastos.<br>
     <span class="text-xs text-gray-400">Columna "Tipo" diferencia cada registro.</span>`,
    'success');
};

// ================================================================
// 4. EXPORTAR BACKUP COMPLETO JSON
// ================================================================
window.exportFullBackupJSON = function () {
  const state = window.appState;
  if (!state) {
    ui.alert('Error', 'Los datos aún no se han cargado. Espera un momento e intenta de nuevo.', 'error');
    return;
  }
  const backup = {
    _meta: {
      exportedAt: new Date().toISOString(),
      version: '3.0',
      appName: 'Qipu',
      totalExpenses: (state.expenses || []).length,
      totalParticipants: (state.participants || []).length,
      totalCategories: (state.categories || []).length,
      totalPaymentMethods: (state.paymentMethods || []).length,
    },
    ...state
  };
  const jsonString = JSON.stringify(backup, null, 2);
  const dateStr = new Date().toISOString().split('T')[0];
  _downloadFile(jsonString, `qipu_backup_completo_${dateStr}.json`, 'application/json');
  ui.alert(
    '¡Backup guardado!',
    `Archivo <b>qipu_backup_${dateStr}.json</b> descargado.<br>
     <span class="text-xs text-gray-400">Guárdalo en un lugar seguro. Importable con "Restaurar".</span>`,
    'success'
  );
};

// ================================================================
// INICIALIZAR LISTENERS
// ================================================================
window.setupExportListeners = function () {
  const map = {
    'export-full-json-btn': window.exportFullBackupJSON,
    'export-expenses-csv-btn': window.exportExpensesCSV,
    'export-incomes-csv-btn': window.exportIncomesCSV,
    'export-all-csv-btn': window.exportAllCSV,
  };
  Object.entries(map).forEach(([id, fn]) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  });
};
