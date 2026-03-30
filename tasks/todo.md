# Plan: Refactorización a Componentes Vanilla JS (Qipu 3.0)

## Fase 1: Preparación (Terminada)
- [x] Crear directorio `_backup_pre_componentes`.
- [x] Respaldar archivos `.html` y `.js` (y `.css` si aplica).

## Fase 2: Análisis y Estructuración
- [/] Analizar `app_legacy.html`, `expense_modal_standalone.html` y `app.js` para extraer la lógica y estructura DOM de cada componente.
- [x] Definir el árbol de directorios dentro de `js/components/` y `js/renderers/`.

## Fase 3: Desacoplamiento (Web Components)
- [x] Implementar `<layout-principal>`: Contenedor global.
- [x] Implementar `<modal-billetera>`: Extracción de la lógica visual del modal de nueva billetera.
- [x] Implementar `<modal-transaccion>`: Extracción del ingreso/egreso.
- [x] Construir funciones renderizadoras en `js/renderers/` utilizando template literals y retornando HTML para listas como historial y métodos.
- [x] Modificar componentes para inyectar su contenido en el Light DOM (`this.innerHTML`).

## Fase 4: Integración Inicial
- [x] Crear el script de entrada `js/main.js` (o reescribir `app.js` como ES Module).
- [x] Importar y registrar en `customElements` los primeros modales.
- [x] Adaptar el `index.html` básico para hacer uso de las etiquetas semánticas.

## Fase 5: Documentación y Cierre de la prueba de concepto
- [x] Agregar anotaciones JSDoc a clases, métodos y renderizadores.
- [x] Crear el archivo `ESTRUCTURA_UI.md` documentando el árbol y las etiquetas personalizadas creadas.
- [x] Verificación final visual en el navegador y registro de lecciones (`tasks/lessons.md`).

## Fase 6: Migración Completa de Vistas (Escalando la arquitectura)
- [x] Implementar `<sidebar-principal>`: Menú lateral de configuración (Ajustes, Billetera, Conexión).
- [x] Implementar `<vista-dashboard>`: Sección de Resumen General y Gráficas de balance.
- [x] Implementar `<vista-historial>`: Lista de transacciones y filtros por fecha/etiqueta.
- [x] Implementar `<modal-participante>`: Extracción del formulario "Añadir Integrante".
- [x] Implementar `<modal-repartir>`: Extracción del flujo "Cuentas Claras" (Liquidación).
- [x] Implementar `<modal-ahorros>`: Sistema de distribución de excedentes a metas.
- [x] Implementación en `main.js`: Lógica de enrutamiento/tabs para intercambiar entre `<vista-dashboard>` y `<vista-historial>`.

## Fase 6.1: Componentes Secundarios/Modales Omitidos (Fix UI Incompleta)
- [x] Extraer `<modal-importacion>` (Backup JSON)
- [x] Extraer `<modal-categorias>` (Config. Categorías)
- [x] Extraer `<modal-metodos-pago>` (Config. Métodos de pago)
- [x] Extraer `<modal-metodo-detalle>` (Resumen mensual de TC/Efectivo)
- [x] Extraer `<modal-perfil>` (User Profile / Auth)
- [x] Extraer `<modal-ingreso-rapido>` (Quick Income)
- [x] Extraer `<modal-global>` (Alertas custom)
- [x] Integrar todos al final del `index.html` y registrarlos en `js/main.js`
