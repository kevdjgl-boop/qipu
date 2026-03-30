# Estructura UI de Componentes Web V3.0

Esta documentación sintetiza el árbol de la arquitectura híbrida implementada utilizando Vanilla JS Web Components y renderizadores de plantillas.

## Árbol de Directorios
\`\`\`
/js
 ├── /components
 │    ├── layout-principal.js    # Componente <layout-principal>
 │    ├── modal-billetera.js     # Componente <modal-billetera>
 │    └── modal-transaccion.js   # Componente <modal-transaccion>
 │
 ├── /renderers
 │    └── lists.js               # Funciones puras que retornan Template Literals
 │
 └── main.js                    # Punto de entrada principal (ES Module)
\`\`\`

## Etiquetas HTML Personalizadas Creadas (Light DOM)
Mediante \`this.innerHTML\`, estos componentes inyectan el contenido al DOM convencional sin un \`#shadow-root\`, garantizando compatibilidad 100% con las clases globales de Tailwind CSS y permitiendo re-utilización semántica.

### 1. \`<layout-principal>\`
Crea la base responsiva de la aplicación. Maneja el Loader, Backdrop, Menú móvil, y dispone los *slots* para Sidebar y *Main content*.

**Uso:**
\`\`\`html
<layout-principal></layout-principal>
\`\`\`

### 2. \`<modal-transaccion>\`
Contiene la vista principal para registros de gastos/ingresos que se levantará con Tailwind CSS.

**Uso:**
\`\`\`html
<modal-transaccion></modal-transaccion>
\`\`\`

### 3. \`<modal-billetera>\`
Maneja el modal de Métodos de Pago y/o Conexión/Crear billetera, permitiendo ser invocado de forma aislada.

**Uso:**
\`\`\`html
<modal-billetera></modal-billetera>
\`\`\`

---
*Todos los componentes son inicializados importando \`main.js\` como script type="module" en \`index.html\`.*
