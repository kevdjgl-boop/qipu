# Sistema de Diseño (Design System)

> **Fuente de Verdad Única**: Este documento define los estándares visuales, de interacción y de arquitectura CSS para **Dev Monetary App**.
> **Filosofía**: Diseño Atómico + Tokens Semánticos.
> **Estado**: Producción (v2.1) - Enfoque "Semantic First".

---

## Tabla de Contenidos

1.  [Principios Core](#1-principios-core)
2.  [Tokens Semánticos (The "API")](#2-tokens-semánticos-the-api)
3.  [Tokens Primitivos (The "Raw Materials")](#3-tokens-primitivos-the-raw-materials)
4.  [Biblioteca de Componentes](#4-biblioteca-de-componentes)
5.  [Layout & Responsive](#5-layout--responsive)
6.  [Guía de Mantenimiento y Evolución (How-To)](#6-guía-de-mantenimiento-y-evolución-how-to)
7.  [Checklist de Calidad y Estándares](#7-checklist-de-calidad-y-estándares)

---

## 1. Principios Core

1.  **Semantic First**: Nunca uses colores "raw" (ej. `bg-gray-50`) en tus componentes. Usa siempre **tokens semánticos** (ej. `bg-surface-subtle`). Esto garantiza que el *Dark Mode* funcione automáticamente sin esfuerzo extra.
2.  **Densidad de Información**: Nuestra app maneja muchos datos (finanzas). Usamos una escala tipográfica y de espaciado "Densa" para maximizar la visibilidad sin sacrificar legibilidad.
3.  **Componentes Tontos, Contenedores Listos**: Los componentes UI (`src/components/ui`) son puramente visuales. No deben tener lógica de negocio compleja ni llamadas a API directas.

---

## 2. Arquitectura del Sistema (¿Por qué index.css?)

Nuestro sistema usa una arquitectura de **3 Capas** para soportar Dark Mode y re-branding sin dolor.

### Capa 1: Valores Primitivos (`theme.cjs`)
*   **Qué es**: Diccionario de colores crudos (Hex codes).
*   **Función**: Define "Qué colores existen" (ej. Indigo, Slate, Cyan).
*   **Uso**: Solo configuración. No se usa directamente en la UI.

### Capa 2: Variables Semánticas (`index.css`)
*   **Qué es**: Variables CSS (`--bg-surface-default`).
*   **Función**: La "Magia" del Dark Mode.
    *   En `:root` (Light), `--bg-surface-default` vale `#ffffff`.
    *   En `.dark` (Dark), `--bg-surface-default` cambia automáticamente a `#1e293b`.
*   **Por qué existe**: Tailwind puramente estático no puede cambiar valores en tiempo de ejecución tan fácilmente sin clases duplicadas (`dark:bg-slate-800`). Las variables CSS permiten que el navegador cambie el tema instantáneamente.

### Capa 3: Clases de Utilidad (`tailwind.config.cjs`)
*   **Qué es**: Mapeo de Clases Tailwind -> Variables CSS.
*   **Función**: Conecta todo. Le dice a Tailwind: "Cuando escriba `bg-surface-default`, usa la variable `--bg-surface-default`".

---

## 3. Tokens Semánticos (The "API")

Estos son los **únicos** nombres de clase que deberías usar para colorear o estilizar elementos. Están definidos en `tailwind.config.cjs` y mapeados a variables CSS en `index.css`.

### Colores de Superficie y Texto

| Categoría | Token (Clase Tailwind) | Variable CSS | Light Mode (Hex) | Dark Mode (Hex) | Uso Correcto |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Fondos** | `bg-surface-default` | `--bg-surface-default` | Blanco (`#ffffff`) | Slate 800 (`#1e293b`) | Tarjetas, Modales, Sidebar, Dropdowns. |
| | `bg-surface-subtle` | `--bg-surface-subtle` | Gray 50 (`#f9fafb`) | Slate 900 (`#0f172a`) | Fondo de página, rows alternos, inputs inactivos. |
| | `bg-surface-hover` | *N/A (Utility)* | Gray 100 | Slate 700/50 | Estados hover en listas y botones ghost. |
| **Textos** | `text-text-default` | `--text-default` | Gray 900 (`#111827`) | Slate 50 (`#f8fafc`) | Texto principal, Títulos, Inputs. |
| | `text-text-muted` | `--text-text-muted` | Gray 500 (`#6b7280`) | Slate 400 (`#94a3b8`) | Subtítulos, Placeholders, Iconos secundarios. |
| | `text-text-inverted` | `--text-text-inverted` | Blanco (`#ffffff`) | Slate 900 (`#0f172a`) | Texto sobre botones sólidos (Primary/Danger). |

### Bordes y Estructura

| Token (Clase) | Variable CSS | Uso |
| :--- | :--- | :--- |
| `border-border-default` | `--border-default` | Líneas sutiles, bordes de inputs, separación de items en lista. |
| `border-border-strong` | `--border-strong` | Bordes externos de modales, separadores de secciones importantes. |

### Espaciado (Nuevo)
*   **Contenedores Grandes**: `p-container-lg` (32px). Para modales grandes, login, empty states.
*   **Secciones/Cards**: `p-section` (24px). Para cuerpos de modales, tarjetas grandes, secciones de sidebar.
*   **Elementos/Móvil**: `p-container-sm` (16px). Para tarjetas pequeñas, cards en listas, contenedores en móvil.
*   **Gap Estándar**: `gap-4` (16px) es el estándar para separación entre elementos flex/grid.

### Sombras y Bordes
*   **Radii**:
    *   `rounded-lg` (8px): Cards, Inputs, Botones (default), Items de lista.
    *   `rounded-xl` (12px): Contenedores medianos, elementos interactivos destacados.
    *   `rounded-[2rem]` (32px): Modales (borde superior o completo), Paneles grandes.
    *   **Prohibido**: `rounded-md` (usar `rounded-lg`).
*   **Sombras**:
    *   `shadow-sm`: Cards, items de lista, botones secundarios. (Reemplaza a `shadow-md` en listas).
    *   `shadow-lg`: Modales, Dropdowns, Elementos flotantes.
    *   **Nota**: En Dark Mode, las sombras son menos visibles; confiar en `border-border-default`.

### Animaciones
*   **Fade In**: `animate-fade-in` (0.3s ease-out). Para aparición de modales, skeleton loaders.
*   **Slide Up**: `animate-slide-up` (0.4s ease-out). Para listas que cargan, toasts.
*   `animate-slide-up`: Aparición suave desde abajo (cards, items).
*   **Spin**: `animate-spin`. Para estados de carga (iconos).

### Comportamiento de Formularios
*   **Botones de Acción**:
    *   **Guardar/Registrar**: Debe estar **DESHABILITADO** (`disabled`) si el formulario no ha sido modificado (`!isDirty`) o está cargando (`isLoading`).
    *   **Cancelar**: Debe usar la variante `ghost`. Al hacer hover, debe mostrar el fondo `bg-surface-hover`.
*   **Inicialización**:
    *   Al pre-llenar datos con `setValue` (ej. billetera por defecto), usar `{ shouldDirty: false }` para evitar habilitar el botón de guardar prematuramente.

### Tipografía (Escala Densa)

Hemos desactivado la escala por defecto de Tailwind para forzar una consistencia estricta.

| Token Clase | Tamaño (px) | Line Height | Uso Semántico |
| :--- | :--- | :--- | :--- |
| `type-h1` | **20px** | 28px | Títulos de Página Principales. |
| `type-h2` | **18px** | 28px | Subtítulos de sección, Encabezados de Modal Grande. |
| `type-h3` | **16px** | 24px | Encabezados de Widgets, Títulos de Tarjetas. |
| `type-body` | **14px** | 24px | **Body Default**. Párrafos, lectura general. |
| `type-small` | **12px** | 16px | Metadata, Fechas, Ayudas de campo. |
| `type-tiny` | **11px** | 14px | **Labels**, Badges, uppercase tracking. |

> **Nota**: `type-*` son clases compuestas (apply) definidas en `index.css` que incluyen size, weight y color por defecto.

---

## 3. Tokens Primitivos (The "Raw Materials")

Usados internamente por el sistema o para casos muy específicos (ej. un gráfico).

*   **Primary (Indigo)**: Marca, acciones principales. `text-primary-600`.
*   **Secondary (Cyan)**: Acentos, elementos decorativos.
*   **Success (Emerald)**: Confirmaciones, balances positivos.
*   **Failure (Red)**: Errores, destrucciones, balances negativos.
*   **Warning (Amber)**: Alertas, estados pendientes.
*   **Info (Blue)**: Información neutral.

---

## 4. Biblioteca de Componentes

Todo nuevo desarrollo debe usar estos componentes base ubicados en `src/components/ui/`.

### Input & Form Elements
Estandarizados a una altura de **34px** (`sm` sizing) para densidad.

*   **`<Input />`**: Wrapper de Flowbite.
    *   *Prop `variant`*: `'default'` (bordeado) o `'filled'` (fondo sutil, sin borde).
    *   *Uso*: Siempre acompañado de un `<Label />`.
*   **`<Select />`**: Dropdown nativo estilizado. Mismas dimensiones que Input.
*   **`<PhoneInput />`**: Input especializado con selector de bandera.
*   **`<Label />`**: Texto `11px uppercase bold` (`type-tiny`) color `text-muted`. Va **encima** del input (`mb-1.5`).

### Botones (Button)
*   **Altura**: Min 44px para touch targets, excepto variantes `xs` o `sm` para tablas.
*   **Variantes Clave**:
    *   `primary`: Acción principal (Guardar).
    *   `dark`: Acción alternativa fuerte o "Cancel" en dark mode. 
    *   `ghost`: Acciones secundarias (Cancelar), botones en tablas.
    *   `danger-outline`: Eliminar/Borrar (requiere confirmación).

### Feedback (Modal, Toast, Alert)
*   **`<Modal />`**:
    *   Usa `rounded-[2rem]` y backdrop blur.
    *   Footer siempre debe tener `mt-auto` si está en un layout flex vertical (como en sidebars de modales).
*   **`<Toast />`**: Notificaciones flotantes (arriba-derecha). Auto-dismiss 4s.

---

## 5. Layout & Responsive

### Breakpoints
Usamos los estándares (Mobile First):
*   `< sm`: Móvil (1 columna, 100% width).
*   `md` (768px): Tablet (Sidebar colapsado o iconos).
*   `lg` (1024px): Desktop (Sidebar expandido, Grids de 2-3 columnas).
*   `xl` (1280px): Large Desktop (Grids de 4 columnas).

### Sidebar Layout
*   **Móvil**: Drawer overlay (`fixed`, `z-50`).
*   **Desktop**: Columna fija (`sticky` o `fixed` a la izquierda). El contenido principal debe tener margin-left acorde (`lg:ml-[300px]`).

### Modales Responsivos
*   En **Móvil**, los modales complejos (ej. `ExpenseModal`) ocupan casi toda la pantalla (`h-[85vh]`).
*   Los botones de acción en móvil se fijan abajo (`sticky bottom-0`) o se apilan.

---

## 6. Guía de Mantenimiento y Evolución (How-To)

Esta sección explica cómo modificar la línea gráfica del sistema de forma segura.

### Cambio de Colores de Marca (Rebranding)
Si deseas cambiar el color "Primary" (actualmente Indigo) o "Secondary" (Cyan):
1.  **Fuente**: Ve a `src/config/theme.cjs`.
2.  **Acción**: Modifica los objetos `colors.primary` o `colors.secondary`.
3.  **Resultado**: Automáticamente se propagará a todos los botones, bordes de foco y textos primarios gracias a Tailwind. No necesitas tocar `index.css`.

### Modificación de Modo Oscuro (Dark Mode)
Si deseas ajustar el contraste del tema oscuro:
1.  **Fuente**: Ve a `src/index.css`.
2.  **Acción**: Busca el bloque `.dark` dentro de `@layer base`.
3.  **Variables**: 
    *   Ajusta `--bg-surface-default` para cambiar el fondo de las tarjetas.
    *   Ajusta `--bg-surface-subtle` para el fondo de la página.
    *   *Nota*: Recomendamos usar la paleta `slate` (azulada) o `gray` (neutra) de Tailwind, no colores negros puros (`#000`).

### Agregar una nueva Variante de Botón
1.  **Fuente**: `src/components/ui/Button.jsx`.
2.  **Acción**: Agrega una nueva clave al objeto `customTheme.color`.
3.  **Uso**: `<Button variant="nueva-variante" ... />`.

---

## 7. Checklist de Calidad y Estándares

Para garantizar que el producto cumpla con los estándares de la industria, verifica estos puntos al desarrollar:

### Accesibilidad (A11y) - *Prioridad Alta*
*   [ ] **Contraste**: ¿El texto es legible? (El sistema usa `text-gray-500` como mínimo para textos pequeños, lo cual cumple AA).
*   [ ] **Focus Rings**: ¿Puedes navegar con `Tab`? **Nunca** elimines `focus:ring` sin proveer una alternativa. Nuestros botones y inputs tienen `focus:ring-4` por defecto.
*   [ ] **Etiquetas**: ¿Todos los inputs tienen `<Label>` o `aria-label`?
*   [ ] **Semántica**: Usa `<button>` para acciones y `<a>` (Link) para navegación. No uses `<div>` con `onClick`.

### Performance
*   [ ] **Vite/Build**: El sistema usa `PurgeCSS` (via Tailwind) automáticamente. Solo se incluye el CSS que usas.
*   [ ] **Iconos**: Usamos `react-icons`. Importa solo el icono que necesitas (ej. `import { FaUser } from 'react-icons/fa'`) para facilitar el Tree Shaking.

### UX Móvil
*   [ ] **Touch Targets**: Botones e inputs deben ser fácilmente tocables (mínimo 44px de altura visual o padding generoso).
*   [ ] **Input Types**: Usa `type="email"`, `type="tel"`, `type="number"` para activar el teclado correcto en móviles.

---
