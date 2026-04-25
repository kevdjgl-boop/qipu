# Qipu App Frontend

Frontend moderno y reactivo construido con **React**, **Vite** y **TailwindCSS**. Optimizado para velocidad, escalabilidad y una experiencia de usuario premium.

---

## 🏗️ Contexto del Proyecto (Monorepo)
Este es el cliente web de **Qipu App**, una aplicación de gestión monetaria con arquitectura desacoplada.
*   **Backend**: Python/FastAPI (Ver [`../backend/README.md`](../backend/README.md)).
*   **Hosting**: Firebase Hosting (CDN Global).
*   **Seguridad**: Headers HSTS, CSP y Cookies HttpOnly.

---

## 🛠️ Entorno de Desarrollo (Local)

### 1. Prerrequisitos
*   **Node.js 18+**: [Descargar](https://nodejs.org/)
*   **NPM**: Incluido con Node.js.

### 2. Instalación

```bash
# Instalar dependencias del proyecto (Desarrollo)
npm install

# Instalación Estricta (Producción / CI)
# Usa el lockfile exacto para asegurar reproducibilidad
npm ci
```

### 3. Variables de Entorno (.env.local)

Crea un archivo `.env.local` en la raíz del frontend.

| Variable | Descripción | Valor Ejemplo (Local) |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | URL base de tu API Backend. | `"http://localhost:8002/api/v1"` |
| `VITE_GOOGLE_CLIENT_ID` | ID de cliente OAuth (mismo que backend). | `"tu-client-id.apps.googleusercontent.com"` |

### 4. Ejecución

Inicia el servidor de desarrollo de Vite.

```bash
npm run dev
```
La aplicación estará disponible en: `http://localhost:5173`

---

---

## 🎨 Arquitectura y Mejores Prácticas

El frontend se rige por 6 pilares fundamentales para asegurar calidad, consistencia y mantenibilidad.

### 1. Atomic Design ("No HTML Crudo")
Evitamos el uso de etiquetas HTML crudas con clases repetitivas.
*   **Componentes**: `src/components/ui/` (Button, Input, etc.).
*   **Regla**: Nunca escribas `<button className="...">`. Usa `<Button variant="primary">`.

### 2. Gestión de Estado de Servidor (TanStack Query)
No usamos `useEffect` + `useState` para llamar a la API.
*   **Herramienta**: `@tanstack/react-query`.
*   **Beneficios**: Caché automático, reintentos en fallos de red, deduplicación de peticiones y estados de carga/error estandarizados.
*   **Hook**: `useApiMutation` (wrapper personalizado).

### 3. Utilidad `cn()` (Tailwind Merge)
Resolvemos conflictos de clases CSS de manera inteligente.
*   **Problema**: `<Button className="bg-red-500">` no sobrescribía el color base.
*   **Solución**: Usamos `clsx` + `tailwind-merge` en la utilidad `src/utils/cn.js`.
*   **Uso**: `className={cn("clase-base", classNameProp)}`.

### 4. Regla "Cero Márgenes Externos"
Los componentes no deben tener márgenes externos (`m-4`).
*   **Filosofía**: El componente debe ser agnóstico a su posición.
*   **Implementación**: El componente padre define el espaciado usando `gap-4`, `space-y-4` o `p-4`.

### 5. Tokens de Diseño (Semántica)
No usamos colores hardcodeados (`bg-blue-600`).
*   **Configuración**: `tailwind.config.cjs` y `src/config/theme.cjs`.
*   **Tokens**: `primary`, `secondary`, `success`, `warning`, `failure`.
*   Permite cambiar el branding de toda la app modificando un solo archivo.

### 6. Formularios Desacoplados (RHF + Zod)
Separamos la validación de la presentación.
*   **Lógica**: `react-hook-form` maneja el estado del formulario.
*   **Validación**: `zod` define las reglas de negocio (schemas) en `src/schemas/`.
*   **UI**: Los componentes `Input` se conectan automáticamente mediante `register`.

### 7. Design System (Typography & Colors)
We use a standardized system for consistent UI and Dark Mode support.
*   **Typography**: Semantic classes `.type-h1`, `.type-body`, etc. (defined in `src/index.css`).
    *   *Note*: These classes include `text-text-default` color by default.
*   **Colors**: Semantic variables `text-text-default`, `text-text-muted`, `text-text-inverted`.
    *   **Semantic Utilities**: `.text-semantic-error`, `.text-semantic-success` for consistent feedback colors.
*   **Component Colors**: Standardized via `tailwind.config.cjs` (Global Tokens) mapped to `src/config/flowbite-theme.js` (Component Theme).
*   **Components**: Standardized UI components in `src/components/ui/` (`Button`, `Input`, `Modal`).
*   **Font**: **Inter** is the default font family.
*   **Documentation**: Ver sección [Guía Oficial de Estilo](#guía-oficial-de-estilo-design-system) al final de este documento.

### 8. Arquitectura de Estilos (Source of Truth)
Para mantener la consistencia sin duplicar código, seguimos esta jerarquía:

*   **`tailwind.config.cjs` (La Verdad Global)**:
    *   Aquí definimos **QUÉ** son nuestros estilos (Tokens).
    *   Ejemplo: Qué color exacto es `primary-600` o qué fuente es `sans`.
    *   *Uso*: Si quieres cambiar el color azul de toda la marca, **solo tocas este archivo** y se actualiza en toda la app.

*   **`src/index.css` (Patrones Globales)**:
    *   Aquí definimos **CÓMO** se aplican los estilos base repetitivos.
    *   Ejemplo: Variables CSS (`--bg-primary`) y clases de utilidad compuestas (`.type-h1`, `.type-body`).
    *   *Uso*: Si quieres cambiar el tamaño de letra de todos los títulos H1, lo haces aquí.

*   **Componentes (`src/components/ui/*.jsx`)**:
    *   Aquí aplicamos los estilos a elementos específicos.
    *   *Uso*: Los componentes consumen los tokens de la configuración. No definen colores nuevos, solo los usan.

---

## 🧩 Características Clave

### 1. Sistema de Roles (RoleGuard)
El frontend maneja permisos de visualización mediante el componente `RoleGuard`.

```jsx
<RoleGuard allowedRoles={['pro', 'admin']} fallback={<Forbidden />}>
  <PremiumFeature />
</RoleGuard>
```

### 2. Chatbot IA
Integración con Google Gemini a través del backend.
*   **Componente**: `src/components/ChatWidget.jsx`
*   **Configuración**: Se conecta automáticamente a la API definida en `VITE_API_BASE_URL`.

---

## 🚀 Entorno de Producción (Firebase Hosting)

El frontend se despliega como una **Single Page Application (SPA)** estática.

### 1. Build
```bash
npm run build
```
Esto genera la carpeta `dist/` optimizada para producción.

### 2. Despliegue
```bash
firebase deploy --only hosting
```

### 3. Variables en Producción
Asegúrate de configurar las variables de entorno en tu sistema de CI/CD (GitHub Actions) o crear un `.env.production` local antes de construir, ya que Vite "quema" estas variables en el código estático.

---

## 📱 Guía Móvil (PWA & WebView)

Esta aplicación está optimizada para funcionar como una app nativa en Android/iOS.

*   **Viewport**: Bloqueado para evitar zoom (`user-scalable=no`).
*   **Safe Areas**: Soporte para "notches" en móviles modernos.
*   **Capacitor**: Recomendado para empaquetar como APK.
    *   *Nota*: Para Google Auth en APK, debes usar el plugin nativo de Capacitor, ya que Google bloquea OAuth en WebViews estándar.

---

## 🛡️ Seguridad

### Auditoría
Ejecuta regularmente para detectar vulnerabilidades en dependencias:
```bash
npm audit
```

---

## 📘 Guía Oficial de Estilo (Design System)

> **IMPORTANTE**: La documentación completa de estilos, tokens, colores y componentes se ha movido a su propio documento para mantener este README limpio.

👉 **[Ver DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)**

Por favor, consulta ese documento para:
*   Paleta de Colores y Tokens Semánticos.
*   Tipografía y Escalas.
*   Espaciado y Layouts.
*   Z-Index y Capas.
*   Componentes UI Estándar (`Button`, `Input`, `Modal`).
*   Iconografía y Animaciones.

### Reglas Críticas Recientes
1.  **Sidebar Móvil (Drawer)**:
    *   Actúa como un overlay con backdrop (`z-40/z-50`).
    *   **Bloqueo de Scroll**: Al abrirse, debe bloquear el scroll del `body` (`overflow: hidden`) para evitar que el usuario scrollee el dashboard de fondo.
    *   **Navegación**: El botón "Atrás" dentro del sidebar debe regresar al menú principal, no cerrar el drawer.

2.  **Inputs Estándar (34px)**:
    *   Todos los inputs (`Input`, `Select`, `PhoneInput`) deben tener una altura exacta de **34px**.
    *   Uso de `py-1.5` y `text-sm` (NO `text-xs`) para garantizar legibilidad y touch targets en móviles.

---

## 🛡️ Seguridad de Datos Financieros

> 📄 Ver documento completo: [`/SECURITY.md`](../SECURITY.md)

#### Reglas Críticas para Frontend
4. **Formateo seguro de montos**: Usar `Intl.NumberFormat` para mostrar cantidades.

#### Prácticas de Seguridad (de SECURITY.md)
| Práctica | Descripción |
|----------|-------------|
| **No logging** | Nunca usar `console.log` con balances o cuentas. |
| **Input masking** | Formatear montos en tiempo real (`$1,234.56`). |
| **Clipboard protection** | Limpiar clipboard 30s después de copiar datos sensibles. |
| **Disable autocomplete** | Usar `autoComplete="off"` en inputs de montos. |

```jsx
// ❌ PROHIBIDO
console.log("Balance:", user.balance);

// ✅ PERMITIDO
if (import.meta.env.DEV) console.log("User ID:", user.id);
```

#### Checklist Pre-Deploy
- [ ] No hay `console.log` con datos sensibles en producción.
- [ ] Variables de entorno no exponen secretos del backend.
- [ ] Inputs financieros tienen `autoComplete="off"`.
- [ ] Session timeout implementado (15 min).

---

## 📝 Estándares de Desarrollo de Formularios

Para garantizar una UX consistente y evitar errores comunes, **todo formulario** (`Modal`, `Page`, `Card`) debe cumplir "sí o sí" con los siguientes requisitos mínimos:

### 1. Estado "Sucio" (`isDirty`)
*   **Regla**: El botón de "Guardar" debe estar **DESHABILITADO** si el usuario no ha realizado ningún cambio.
*   **Implementación**: `disabled={!isDirty || isLoading}`.
*   **Por qué**: Evita llamadas innecesarias a la API y da feedback visual de que la acción ya se realizó.

### 2. Estado de Carga (`isLoading`)
*   **Regla**: Al enviar, el botón debe mostrar un spinner y bloquearse para evitar doble envío.
*   **Implementación**: `isLoading={mutation.isLoading}`.

### 3. Validación Cliente (Zod)
*   **Regla**: No confiar solo en el backend. Usar esquemas Zod para feedback inmediato.
*   **Implementación**: `resolver: zodResolver(schema)`.

### 4. Auto-Focus
*   **Regla**: Al abrir un modal o formulario, el primer input debe tener el foco automáticamente.
*   **Implementación**: `autoFocus` en el primer `<Input />`.

### 5. Reinicio de Estado (`reset`)
*   **Regla**: El formulario debe limpiarse o volver a valores por defecto al cerrar/cancelar.
*   **Implementación**: `useEffect(() => reset(defaults), [item])`.

### 6. Feedback de Error
*   **Regla**: Si falla la API, mostrar un Toast o mensaje de error legible.
*   **Implementación**: `onError` en `useMutation` o `try/catch` con `toast.error()`.

### 7. Accesibilidad Básica
*   **Regla**: Todo input debe tener un `Label` asociado o `aria-label`.
*   **Implementación**: Usar componente `<Label />` o prop `label`.