# Lecciones Aprendidas (Lessons Learned)

## Web Components H√≠bridos (Light DOM) - Refactorizaci√≥n V3

* **Ventaja del Light DOM:** Utilizar `this.innerHTML` en vez de `this.attachShadow({mode: 'open'})` permite a la aplicaci√≥n heredar inmediatamente todo el poder de Tailwind CSS y utilidades globales sin necesidad de reinyectar el `<style>` de Tailwind en cada componente, manteniendo los archivos de componentes puramente como JS.
* **Separaci√≥n de Responsabilidades:** Utilizar ES Modules (`import/export`) combinando `customElements.define` permite escalar vistas monol√≠ticas largu√≠simas como `app_legacy.html` a etiquetas sem√°nticas diminutas en `index.html` (`<layout-principal>`, `<modal-transaccion>`).
* **Renderizadores Puros:** Para datos iterativos (`lists.js`), al usar simples *Template Literals*, la aplicaci√≥n mantiene el performance alt√≠simo sin la sobrecarga inicial del ciclo de vida de Web Components, dejando los Custom Elements √∫nicamente para macro-estructuras (Modales, Layouts).
* **RESPETO ABSOLUTO AL DOM Y CSS GLOBAL:** Nunca se debe reemplazar el `<head>` o el `<body class="...">` de la aplicaci√≥n original al componentizar ni reescribir wrappers con *Tailwind CSS* a menos que sea expl√≠citamente requerido. Al inyectar ranuras (Slots) de JS en Web Components, no se deben usar contenedores `div` intermedios con clases de Tailwind que sobreescriban u oculten el Flexbox Grid original. Siempre verifica los `<div>` anidados contra el archivo original `app_legacy.html`.


## Regla de ComponentizaciÛn HÌbrida Estricta
- **ERROR:** Al migrar a Web Components, los elementos perdieron su identidad exacta y su conexiÛn nativa con las escuchas de DOM de app.js y Flowbite. La app dejÛ de sentirse como la original.
- **LECCI”N Y REGLA:** Bajo ninguna circunstancia se debe alterar NADA del HTML original ni de sus frameworks si el usuario pide una refactorizaciÛn de arquitectura. La migraciÛn debe ser 100% no-destructiva respecto a tags visuales, imports y comportamiento (NO DELETIONS). Si el cÛdigo no puede mantener la identidad original 1:1, es prefrible no refactorizar.
