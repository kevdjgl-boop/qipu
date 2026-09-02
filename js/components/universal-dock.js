/**
 * @file universal-dock.js
 * @description Implementación 100% exacta y fidedigna de dock-demo.html en formato Web Component.
 * Incluye todos los presets de física, animaciones GSAP, metaball SVG, inercia, y menú de píldoras.
 */

export class UniversalDock extends HTMLElement {
  constructor() {
    super();
    this.M3 = {
      easeDecelerate: "cubic-bezier(0.05, 0.7, 0.1, 1.0)",
      easeSubtleBounce: "back.out(1.2)",
      easeAccelerate: "cubic-bezier(0.3, 0.0, 0.8, 0.15)",
      durationFast: 0.18,
      durationMedium: 0.22,
      durationSnap: 0.10
    };

    this.PRESS_PRESETS = {
      organic: {
        name: 'A. Orgánica (Rebote + Frenado Suave)',
        badgeClass: 'bg-indigo-100 text-indigo-800',
        stretchScaleX: 0.92,
        stretchScaleY: 1.13,
        stretchDuration: 0.08,
        counterScaleX: 1.04,
        counterScaleY: 0.97,
        counterDuration: 0.07,
        settleDuration: 0.24,
        settleEase: "cubic-bezier(0.05, 0.7, 0.1, 1.0)",
        iconStretchScaleX: 0.95,
        iconStretchScaleY: 1.07,
        dockMorphEase: "cubic-bezier(0.05, 0.7, 0.1, 1.0)",
        dockMorphDuration: 0.17,
        dockSnapDuration: 0.07,
        dockImpulseScaleY: 0.91,
        dockImpulseScaleX: 1.04,
        dockOvershootScaleY: 1.12,
        dockOvershootScaleX: 0.94,
        dockSettleEase: "back.out(1.36)",
        iconDisplacementX: 16,
        iconEntryDuration: 0.14,
        iconEntryEase: "back.out(1.2)",
        iconStagger: 0.012
      }
    };

    this.activePressPreset = 'organic';
    this.currentMode = 'nav';
    this.isNavMenuOpen = false;
    this.isChatAttachmentsOpen = false;
    this.isMuted = false;
    this.activeNavTabIndex = 1; // 1 = Movimientos / Dashboard por defecto
    this.lastActiveNavTabIndex = 1;
  }

  connectedCallback() {
    this.render();
    this.initBubbleButtonPhysics();
    this.initNavIndicator();
    this.attachEvents();
  }

  render() {
    this.innerHTML = `
      <style>
        .dock-shadow {
          box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04);
        }
        .dock-shadow-lg {
          box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.14), 0 6px 16px -4px rgba(0, 0, 0, 0.06);
        }
        #universal-dock-wrapper .bubble-btn,
        #universal-dock-wrapper .nav-action-pill,
        #universal-dock-wrapper .nav-pill-icon,
        #universal-dock-wrapper .nav-pill-text,
        #universal-dock-wrapper .chat-item {
          transition: none !important;
          will-change: transform;
        }
        #layer-nav, #layer-chat, #layer-voice {
          transition: filter 0.05s ease;
        }
      </style>

      <div id="universal-dock-wrapper" class="w-full max-w-sm flex flex-col items-center justify-end pb-3 relative z-30 select-none mx-auto">
        
        <!-- MENÚ EMERGENTE DE ACCIONES DE NAVEGACIÓN (Píldoras Flotantes con Ancho Orgánico Adaptable) -->
        <div id="nav-actions-popup" class="hidden mb-[8px] self-end mr-0.5 flex flex-col gap-[4px] items-end z-40">
          
          <!-- Píldora 1: Registrar Gasto -->
          <button type="button" data-nav-action="Registrar Gasto"
            class="nav-action-pill bubble-btn w-auto h-[56px] flex items-center gap-[8px] pl-[24px] pr-[24px] bg-white rounded-full dock-shadow border border-slate-100/90 text-slate-800 hover:bg-slate-50 shrink-0 group overflow-hidden">
            <div class="nav-pill-icon w-6 h-6 flex items-center justify-center text-purple-700 shrink-0 will-change-transform">
              <span class="material-symbols-rounded text-[24px]">receipt_long</span>
            </div>
            <span class="nav-pill-text text-[15px] font-semibold text-slate-900 leading-none whitespace-nowrap will-change-transform">Registrar Gasto</span>
          </button>

          <!-- Píldora 2: Nuevo Ingreso -->
          <button type="button" data-nav-action="Nuevo Ingreso"
            class="nav-action-pill bubble-btn w-auto h-[56px] flex items-center gap-[8px] pl-[24px] pr-[24px] bg-white rounded-full dock-shadow border border-slate-100/90 text-slate-800 hover:bg-slate-50 shrink-0 group overflow-hidden">
            <div class="nav-pill-icon w-6 h-6 flex items-center justify-center text-emerald-700 shrink-0 will-change-transform">
              <span class="material-symbols-rounded text-[24px]">payments</span>
            </div>
            <span class="nav-pill-text text-[15px] font-semibold text-slate-900 leading-none whitespace-nowrap will-change-transform">Nuevo Ingreso</span>
          </button>

          <!-- Píldora 3: Escanear Boleta -->
          <button type="button" data-nav-action="Escanear Boleta"
            class="nav-action-pill bubble-btn w-auto h-[56px] flex items-center gap-[8px] pl-[24px] pr-[24px] bg-white rounded-full dock-shadow border border-slate-100/90 text-slate-800 hover:bg-slate-50 shrink-0 group overflow-hidden">
            <div class="nav-pill-icon w-6 h-6 flex items-center justify-center text-sky-700 shrink-0 will-change-transform">
              <span class="material-symbols-rounded text-[24px]">photo_camera</span>
            </div>
            <span class="nav-pill-text text-[15px] font-semibold text-slate-900 leading-none whitespace-nowrap will-change-transform">Escanear Boleta</span>
          </button>
        </div>

        <!-- MENÚ EMERGENTE DE ADJUNTOS EN CHAT (Fondo Blanco Puro y Espaciado Compacto Snug) -->
        <div id="chat-attachments-popup"
          class="hidden opacity-0 scale-75 mb-2.5 w-auto min-w-[140px] max-w-[155px] self-end mr-1 bg-white rounded-[22px] p-1.5 dock-shadow-lg border border-slate-100/90 flex flex-col gap-0.5 transform origin-bottom-right">
          <button type="button" data-chat-action="Fotos"
            class="bubble-btn flex items-center gap-2.5 px-2 py-1.5 rounded-[16px] hover:bg-slate-50 text-left group w-full">
            <div class="w-8 h-8 rounded-lg bg-[#D9F99D] text-[#1E2517] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform shrink-0">
              <span class="material-symbols-rounded text-lg">add_photo_alternate</span>
            </div>
            <span class="text-xs font-black text-slate-800 leading-none">Fotos</span>
          </button>
          <button type="button" data-chat-action="Archivos"
            class="bubble-btn flex items-center gap-2.5 px-2 py-1.5 rounded-[16px] hover:bg-slate-50 text-left group w-full">
            <div class="w-8 h-8 rounded-lg bg-[#D9F99D] text-[#1E2517] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform shrink-0">
              <span class="material-symbols-rounded text-lg">attach_file</span>
            </div>
            <span class="text-xs font-black text-slate-800 leading-none">Archivos</span>
          </button>
          <button type="button" data-chat-action="Cámara"
            class="bubble-btn flex items-center gap-2.5 px-2 py-1.5 rounded-[16px] hover:bg-slate-50 text-left group w-full">
            <div class="w-8 h-8 rounded-lg bg-[#D9F99D] text-[#1E2517] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform shrink-0">
              <span class="material-symbols-rounded text-lg">photo_camera</span>
            </div>
            <span class="text-xs font-black text-slate-800 leading-none">Cámara</span>
          </button>
        </div>

        <!-- ESCENARIO PRINCIPAL DEL DOCK (64px ALTURA) -->
        <div id="dock-stage" class="w-full h-[64px] relative">

          <!-- 🧭 ESTADO 1: NAVEGACIÓN SEPARADA (CÁPSULA IZQ + BOTÓN +) -->
          <div id="layer-nav" class="absolute inset-0 w-full h-full">
            <!-- Cápsula Izquierda (Anclada a la izquierda) -->
            <div id="nav-pill-left"
              class="absolute left-0 top-0 h-[64px] bg-white rounded-full dock-shadow border border-slate-100/80 flex items-center justify-between px-6 overflow-hidden relative"
              style="width: calc(100% - 76px);">
              
              <!-- Indicador Líquido Deslizante Activo (Rectángulo con Bordes Redondeados) -->
              <div id="nav-active-indicator"
                class="absolute top-1/2 -translate-y-1/2 left-0 w-[50px] h-[46px] rounded-[18px] bg-slate-100/90 border border-slate-200/80 pointer-events-none z-0 will-change-transform opacity-100"></div>

              <button type="button" data-nav-index="0"
                class="nav-tab-btn nav-icon bubble-btn relative z-10 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                title="Tarjetas">
                <span class="material-symbols-rounded text-[26px]">credit_card</span>
              </button>
              
              <button type="button" data-nav-index="1"
                class="nav-tab-btn nav-icon bubble-btn relative z-10 w-10 h-10 flex items-center justify-center text-slate-900 transition-colors"
                title="Movimientos">
                <span class="material-symbols-rounded text-[26px]">bar_chart</span>
              </button>
              
              <button type="button" data-nav-index="2"
                class="nav-tab-btn nav-icon bubble-btn relative z-10 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                title="Hablar con Mita">
                <span class="material-symbols-rounded text-[26px]">mic</span>
              </button>
              
              <button type="button" data-nav-index="3"
                class="nav-tab-btn nav-icon bubble-btn relative z-10 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                title="Buscar">
                <span class="material-symbols-rounded text-[26px]">search</span>
              </button>
            </div>

            <!-- Botón Cuadrado con Bordes Redondeados "+" (Anclado a la derecha, crece SOLO hacia la izquierda) -->
            <button type="button" id="nav-btn-plus"
              class="absolute right-0 top-0 w-[64px] h-[64px] rounded-[24px] bg-white text-slate-900 flex items-center justify-center dock-shadow border border-slate-100/80 shrink-0 bubble-btn"
              title="Nuevo Registro (+)">
              <span id="nav-plus-symbol"
                class="material-symbols-rounded text-3xl font-black will-change-transform inline-flex items-center justify-center pointer-events-none">add</span>
            </button>
          </div>

          <!-- 💬 ESTADO 2: BARRA DE CHAT UNIFICADA Y COMPLETA -->
          <div id="layer-chat"
            class="opacity-0 pointer-events-none absolute left-0 top-0 w-full h-[64px] bg-white rounded-full dock-shadow border border-slate-100/80 flex items-center justify-between px-3 gap-2 overflow-hidden">
            <!-- 1. Micrófono (Izquierda) -->
            <button type="button" id="chat-mic-btn"
              class="chat-item bubble-btn w-10 h-10 rounded-full flex items-center justify-center text-slate-900 hover:bg-slate-50 shrink-0"
              title="Enviar Nota de Voz">
              <span id="chat-mic-icon" class="material-symbols-rounded text-[26px] will-change-transform inline-flex items-center justify-center">mic</span>
            </button>

            <!-- 2. Input de Texto: "Pregunta a mita" -->
            <input type="text" id="chat-input" placeholder="Pregunta a mita" autocomplete="off"
              class="chat-item flex-1 bg-transparent border-0 text-sm font-bold text-slate-900 placeholder:text-slate-700/80 focus:outline-none outline-none leading-none px-2" />

            <!-- 3. Rayas Decibeles (Al presionar encoge a Modo Voz) -->
            <button type="button" id="chat-waveform-btn"
              class="chat-item bubble-btn w-10 h-10 rounded-full flex items-center justify-center text-slate-900 hover:bg-slate-50 shrink-0"
              title="Hablar en Vivo">
              <span class="material-symbols-rounded text-[26px] tracking-tighter">graphic_eq</span>
            </button>

            <!-- 4. Botón Verde "+" (Despliega menú Referencia 2) -->
            <button type="button" id="chat-plus-btn"
              class="chat-item bubble-btn w-11 h-11 rounded-full bg-[#B9F59B] text-slate-900 flex items-center justify-center shrink-0 font-black shadow-2xs"
              title="Adjuntar">
              <span id="chat-plus-icon"
                class="material-symbols-rounded text-[26px] font-black transition-transform duration-200">add</span>
            </button>
          </div>

          <!-- 🎙️ ESTADO 3: VOZ EN VIVO (CÁMARA IZQ + MUTE & CLOSE DER) -->
          <div id="layer-voice"
            class="opacity-0 pointer-events-none absolute inset-0 w-full h-[64px] flex items-center justify-between">
            <!-- Botón Cámara (Izquierda) -->
            <button type="button" id="voice-cam-btn"
              class="w-[64px] h-[64px] rounded-full bg-white text-slate-900 flex items-center justify-center dock-shadow border border-slate-100/80 bubble-btn shrink-0"
              title="Ver Boletas">
              <span id="voice-cam-icon" class="material-symbols-rounded text-[26px] text-slate-900 will-change-transform inline-flex items-center justify-center">videocam</span>
            </button>

            <div class="flex-1"></div>

            <!-- Contenedor Derecho: Botón Silenciar + Botón Cerrar -->
            <div id="voice-right-controls" class="flex items-center gap-3">
              <!-- Botón Silenciar Micrófono -->
              <button type="button" id="voice-mic-btn"
                class="w-[64px] h-[64px] rounded-full bg-white text-rose-600 flex items-center justify-center dock-shadow border border-slate-100/80 bubble-btn shrink-0"
                title="Silenciar / Hablar">
                <span id="voice-mic-icon" class="material-symbols-rounded text-2xl animate-pulse will-change-transform inline-flex items-center justify-center">mic</span>
              </button>

              <!-- Botón Cerrar (X) -->
              <button type="button" id="voice-close-btn"
                class="w-[64px] h-[64px] rounded-full bg-white text-slate-900 flex items-center justify-center dock-shadow border border-slate-100/80 bubble-btn shrink-0"
                title="Cerrar llamada en vivo">
                <span id="voice-close-icon" class="material-symbols-rounded text-2xl font-black will-change-transform inline-flex items-center justify-center">close</span>
              </button>
            </div>
          </div>

          <!-- 🔍 ESTADO 4: BARRA DE BÚSQUEDA INTEGRADA Y FLUIDA -->
          <div id="layer-search"
            class="opacity-0 pointer-events-none absolute left-0 top-0 w-full h-[64px] bg-white rounded-full dock-shadow border border-slate-100/80 flex items-center justify-between px-3 gap-2 overflow-hidden">
            <!-- 1. Icono de Lupa a la Izquierda -->
            <div id="search-prefix-icon"
              class="search-item w-10 h-10 rounded-full flex items-center justify-center text-slate-400 shrink-0 select-none pointer-events-none">
              <span class="material-symbols-rounded text-[26px] will-change-transform inline-flex items-center justify-center">search</span>
            </div>

            <!-- 2. Input de Búsqueda -->
            <input type="text" id="search-input" placeholder="Buscar movimientos, tarjetas..." autocomplete="off"
              class="search-item flex-1 bg-transparent border-0 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none outline-none leading-none px-1" />

            <!-- 3. Botón 'X' de Cerrar a la derecha para regresar a navegación -->
            <button type="button" id="search-close-btn"
              class="search-item bubble-btn w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 shrink-0"
              title="Cerrar búsqueda">
              <span id="search-close-icon" class="material-symbols-rounded text-[24px] font-bold will-change-transform inline-flex items-center justify-center">close</span>
            </button>
          </div>

        </div>
      </div>

      <!-- Filtro SVG Metaball Líquido (Gooey) -->
      <svg class="hidden" xmlns="http://www.w3.org/2000/svg" version="1.1">
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>
    `;
  }

  getTabPosition(btnElement) {
    const pillLeft = this.querySelector('#nav-pill-left');
    const indicator = this.querySelector('#nav-active-indicator');
    if (!pillLeft || !indicator || !btnElement) return 0;
    const pillRect = pillLeft.getBoundingClientRect();
    const btnRect = btnElement.getBoundingClientRect();
    const indWidth = indicator.offsetWidth || 50;
    const btnCenterX = (btnRect.left - pillRect.left) + (btnRect.width / 2);
    return btnCenterX - (indWidth / 2);
  }

  initNavIndicator() {
    const pillLeft = this.querySelector('#nav-pill-left');
    const indicator = this.querySelector('#nav-active-indicator');
    const tabs = pillLeft ? pillLeft.querySelectorAll('.nav-tab-btn') : [];
    if (!pillLeft || !indicator || tabs.length === 0) return;

    if (this.activeNavTabIndex === 2 || this.activeNavTabIndex === 3) {
      this.activeNavTabIndex = (this.lastActiveNavTabIndex !== undefined && this.lastActiveNavTabIndex !== 2 && this.lastActiveNavTabIndex !== 3) ? this.lastActiveNavTabIndex : 1;
    }

    const targetBtn = tabs[this.activeNavTabIndex] || tabs[1] || tabs[0];
    const posX = this.getTabPosition(targetBtn);
    gsap.set(indicator, { x: posX, scale: 1, opacity: 1 });

    tabs.forEach((tab, idx) => {
      if (idx === this.activeNavTabIndex) {
        tab.classList.remove('text-slate-400');
        tab.classList.add('text-slate-900');
      } else {
        tab.classList.remove('text-slate-900');
        tab.classList.add('text-slate-400');
      }
    });
  }

  setActiveNavTab(index, btnElement) {
    if (this.currentMode !== 'nav') return;
    const pillLeft = this.querySelector('#nav-pill-left');
    const indicator = this.querySelector('#nav-active-indicator');
    const tabs = pillLeft ? pillLeft.querySelectorAll('.nav-tab-btn') : [];
    if (!indicator || !btnElement) return;

    if (index === 2) {
      const iconSpan = btnElement.querySelector('.material-symbols-rounded');
      if (iconSpan) {
        gsap.killTweensOf(iconSpan);
        gsap.fromTo(iconSpan, { scale: 0.85, y: -1.7 }, { scale: 1, y: 0, duration: 0.24, ease: "back.out(1.85)" });
      }
      this.dispatchEvent(new CustomEvent('dock:tab-change', {
        detail: { index, tabName: btnElement.getAttribute('title') }
      }));
      setTimeout(() => {
        this.transitionToChat();
      }, 150);
      return;
    }

    if (index === 3) {
      const iconSpan = btnElement.querySelector('.material-symbols-rounded');
      if (iconSpan) {
        gsap.killTweensOf(iconSpan);
        gsap.fromTo(iconSpan, { scale: 0.85, y: -1.7 }, { scale: 1, y: 0, duration: 0.24, ease: "back.out(1.85)" });
      }
      this.dispatchEvent(new CustomEvent('dock:tab-change', {
        detail: { index, tabName: btnElement.getAttribute('title') }
      }));
      setTimeout(() => {
        this.transitionToSearch();
      }, 150);
      return;
    }

    const previousIndex = this.activeNavTabIndex;
    this.activeNavTabIndex = index;
    this.lastActiveNavTabIndex = index;
    const preset = this.PRESS_PRESETS[this.activePressPreset];
    const targetX = this.getTabPosition(btnElement);

    const isMoving = previousIndex !== index;
    const stretchScaleX = isMoving ? 1.24 : 1.068;
    const stretchScaleY = isMoving ? 0.88 : 0.95;

    gsap.killTweensOf(indicator);
    const tl = gsap.timeline();

    tl.to(indicator, {
      scaleX: stretchScaleX,
      scaleY: stretchScaleY,
      duration: 0.10,
      ease: "power2.in"
    }, 0)
    .to(indicator, {
      x: targetX,
      duration: 0.28,
      ease: preset.dockSettleEase
    }, 0)
    .to(indicator, {
      scaleX: 1,
      scaleY: 1,
      duration: 0.18,
      ease: "back.out(2.0)"
    }, 0.12);

    const iconSpan = btnElement.querySelector('.material-symbols-rounded');
    if (iconSpan) {
      gsap.killTweensOf(iconSpan);
      gsap.fromTo(iconSpan, {
        scale: 0.85,
        y: -1.7
      }, {
        scale: 1,
        y: 0,
        duration: 0.24,
        ease: "back.out(1.85)"
      });
    }

    tabs.forEach((tab, idx) => {
      if (idx === index) {
        tab.classList.remove('text-slate-400');
        tab.classList.add('text-slate-900');
      } else {
        tab.classList.remove('text-slate-900');
        tab.classList.add('text-slate-400');
      }
    });

    this.dispatchEvent(new CustomEvent('dock:tab-change', {
      detail: { index, tabName: btnElement.getAttribute('title') }
    }));
  }

  setMode(mode) {
    if (mode === 'nav') {
      this.transitionToNav();
    } else if (mode === 'chat') {
      this.transitionToChat();
    } else if (mode === 'voice') {
      this.transitionToVoice();
    } else if (mode === 'search') {
      this.transitionToSearch();
    }
  }

  setTab(index) {
    const pillLeft = this.querySelector('#nav-pill-left');
    const tabs = pillLeft ? pillLeft.querySelectorAll('.nav-tab-btn') : [];
    if (tabs[index]) {
      this.setActiveNavTab(index, tabs[index]);
    }
  }

  transitionToChat() {
    if (this.currentMode === 'chat') return;
    this.currentMode = 'chat';
    this.closeChatAttachments();
    this.closeNavMenu();

    const preset = this.PRESS_PRESETS[this.activePressPreset];
    const navPillLeft = this.querySelector('#nav-pill-left');
    const navBtnPlus = this.querySelector('#nav-btn-plus');
    const navIcons = navPillLeft.querySelectorAll('.nav-icon');
    const navIndicator = this.querySelector('#nav-active-indicator');
    const navPlusSymbol = this.querySelector('#nav-plus-symbol');
    const layerNav = this.querySelector('#layer-nav');
    const layerChat = this.querySelector('#layer-chat');
    const chatItems = this.querySelectorAll('.chat-item');

    const tl = gsap.timeline();

    tl.call(() => {
      layerNav.style.filter = "url(#goo)";
    }, null, 0);

    tl.to([navIcons, navIndicator, navPlusSymbol], {
      scale: 0,
      opacity: 0,
      duration: preset.dockSnapDuration,
      ease: "power2.in",
      transformOrigin: "50% 50%"
    }, 0);

    tl.to(navBtnPlus, {
      width: "100%",
      borderRadius: "9999px",
      duration: preset.dockMorphDuration,
      ease: preset.dockMorphEase
    }, 0)
    .to(navPillLeft, {
      width: "100%",
      duration: preset.dockMorphDuration,
      ease: preset.dockMorphEase
    }, 0);

    tl.call(() => {
      layerChat.style.opacity = 1;
      layerChat.style.pointerEvents = "auto";
      layerChat.style.width = "100%";
      layerNav.style.opacity = 0;
      layerNav.style.pointerEvents = "none";
      layerNav.style.filter = "none";
    }, null, preset.dockMorphDuration * 0.55);

    tl.fromTo(layerChat, {
      scaleY: preset.dockImpulseScaleY,
      scaleX: preset.dockImpulseScaleX
    }, {
      scaleY: preset.dockOvershootScaleY,
      scaleX: preset.dockOvershootScaleX,
      duration: preset.dockMorphDuration * 0.45,
      ease: "power2.out"
    }, preset.dockMorphDuration * 0.55)
    .to(layerChat, {
      scaleY: 1,
      scaleX: 1,
      duration: preset.dockMorphDuration * 0.55,
      ease: preset.dockSettleEase
    });

    tl.fromTo(chatItems, {
      scale: 0.3,
      x: -22,
      y: 0,
      opacity: 0,
      transformOrigin: "50% 50%"
    }, {
      scale: 1,
      x: 0,
      y: 0,
      opacity: 1,
      duration: 0.24,
      ease: "back.out(1.3)",
      stagger: {
        each: 0.045,
        from: "start"
      }
    }, preset.dockMorphDuration * 0.55);

    this.dispatchEvent(new CustomEvent('dock:mode-change', { detail: { mode: 'chat' } }));
  }

  transitionToNav() {
    if (this.currentMode === 'nav') return;
    this.currentMode = 'nav';
    this.closeChatAttachments();
    this.closeNavMenu();

    const searchInput = this.querySelector('#search-input');
    if (searchInput) {
      searchInput.value = '';
      searchInput.blur();
    }

    this.activeNavTabIndex = (this.lastActiveNavTabIndex !== undefined && this.lastActiveNavTabIndex !== 2 && this.lastActiveNavTabIndex !== 3)
      ? this.lastActiveNavTabIndex
      : 1;

    const preset = this.PRESS_PRESETS[this.activePressPreset];
    const navPillLeft = this.querySelector('#nav-pill-left');
    const navBtnPlus = this.querySelector('#nav-btn-plus');
    const navIcons = navPillLeft.querySelectorAll('.nav-icon');
    const navIndicator = this.querySelector('#nav-active-indicator');
    const navPlusSymbol = this.querySelector('#nav-plus-symbol');
    const layerNav = this.querySelector('#layer-nav');
    const layerChat = this.querySelector('#layer-chat');
    const layerSearch = this.querySelector('#layer-search');
    const chatItems = this.querySelectorAll('.chat-item');
    const searchItems = layerSearch ? layerSearch.querySelectorAll('.search-item') : [];

    const tl = gsap.timeline();

    tl.to([...chatItems, ...searchItems], {
      scale: 0,
      opacity: 0,
      duration: preset.dockSnapDuration,
      ease: "power2.in"
    }, 0);

    tl.call(() => {
      layerNav.style.filter = "url(#goo)";
    }, null, preset.dockSnapDuration * 0.7);

    tl.set([layerChat, layerSearch], { opacity: 0, pointerEvents: "none" }, preset.dockSnapDuration * 0.8)
      .set(layerNav, { opacity: 1, pointerEvents: "auto" }, preset.dockSnapDuration * 0.8)
      .fromTo(navBtnPlus, {
        width: "100%",
        borderRadius: "9999px"
      }, {
        width: "64px",
        borderRadius: "24px",
        duration: preset.dockMorphDuration,
        ease: preset.dockMorphEase
      }, preset.dockSnapDuration * 0.8)
      .fromTo(navPillLeft, {
        width: "100%"
      }, {
        width: "calc(100% - 76px)",
        duration: preset.dockMorphDuration,
        ease: preset.dockMorphEase
      }, preset.dockSnapDuration * 0.8);

    tl.fromTo([navBtnPlus, navPillLeft], {
      scaleY: preset.dockImpulseScaleY,
      scaleX: preset.dockImpulseScaleX
    }, {
      scaleY: 1,
      scaleX: 1,
      duration: preset.dockMorphDuration * 0.6,
      ease: preset.dockSettleEase
    }, preset.dockSnapDuration + 0.04);

    tl.call(() => {
      layerNav.style.filter = "none";
    }, null, preset.dockSnapDuration + preset.dockMorphDuration + 0.06);

    // 3. Símbolo '+' del botón derecho: APARECE DE INMEDIATO (0.09s) DESDE SU EJE CENTRAL 50% 50%
    tl.fromTo(navPlusSymbol, {
      scale: 0,
      opacity: 0,
      x: 0,
      y: 0,
      transformOrigin: "50% 50%"
    }, {
      scale: 1,
      opacity: 1,
      x: 0,
      y: 0,
      duration: 0.09,
      ease: "back.out(2.5)"
    }, preset.dockSnapDuration * 0.5);

    // 4. Iconos y Asentamiento Milimétrico del Indicador tras estabilizarse el ancho de la cápsula
    const morphEndTime = preset.dockSnapDuration * 0.8 + preset.dockMorphDuration;

    tl.fromTo(navIcons, {
      scale: 0.3,
      x: -22,
      y: 0,
      opacity: 0,
      transformOrigin: "50% 50%"
    }, {
      scale: 1,
      x: 0,
      y: 0,
      opacity: 1,
      duration: 0.24,
      ease: "back.out(1.3)",
      stagger: {
        each: 0.045,
        from: "start"
      }
    }, preset.dockSnapDuration + 0.03);

    tl.call(() => this.initNavIndicator(), null, morphEndTime);
    tl.fromTo(navIndicator, {
      scale: 0,
      opacity: 0
    }, {
      scale: 1,
      opacity: 1,
      duration: 0.18,
      ease: "back.out(2.0)"
    }, morphEndTime);

    tl.eventCallback("onComplete", () => {
      this.initNavIndicator();
    });

    this.dispatchEvent(new CustomEvent('dock:mode-change', { detail: { mode: 'nav' } }));
    this.dispatchEvent(new CustomEvent('dock:tab-change', { detail: { index: this.activeNavTabIndex } }));
  }

  transitionToVoice() {
    if (this.currentMode === 'voice') return;
    this.currentMode = 'voice';
    this.closeChatAttachments();

    const layerChat = this.querySelector('#layer-chat');
    const chatMicIcon = this.querySelector('#chat-mic-icon');
    const chatRightItems = [
      this.querySelector('#chat-input'),
      this.querySelector('#chat-waveform-btn'),
      this.querySelector('#chat-plus-btn')
    ];

    const layerVoice = this.querySelector('#layer-voice');
    const voiceCamBtn = this.querySelector('#voice-cam-btn');
    const voiceCamIcon = this.querySelector('#voice-cam-icon');
    const voiceMicBtn = this.querySelector('#voice-mic-btn');
    const voiceCloseBtn = this.querySelector('#voice-close-btn');
    const voiceMicIcon = this.querySelector('#voice-mic-icon');
    const voiceCloseIcon = this.querySelector('#voice-close-icon');
    const voiceRightControls = this.querySelector('#voice-right-controls');

    const tl = gsap.timeline();

    tl.to(chatRightItems, {
      scale: 0.5,
      x: -25,
      opacity: 0,
      duration: 0.18,
      ease: "power2.out",
      stagger: 0.015
    }, 0);

    tl.to(layerChat, {
      width: "64px",
      duration: 0.32,
      ease: "power3.out"
    }, 0);

    tl.to(chatMicIcon, {
      scale: 0,
      rotation: -30,
      opacity: 0,
      duration: 0.14,
      ease: "power2.out",
      transformOrigin: "50% 50%"
    }, 0);

    tl.set(layerChat, { opacity: 0, pointerEvents: "none" }, 0.14)
      .set(layerVoice, { opacity: 1, pointerEvents: "auto" }, 0.14);

    tl.fromTo(voiceCamIcon, {
      scale: 0,
      rotation: 35,
      opacity: 0,
      transformOrigin: "50% 50%"
    }, {
      scale: 1,
      rotation: 0,
      opacity: 1,
      duration: 0.24,
      ease: "back.out(2.2)"
    }, 0.12);

    tl.fromTo(voiceCamBtn, {
      scaleY: 1.15,
      scaleX: 0.86
    }, {
      scaleY: 0.94,
      scaleX: 1.06,
      duration: 0.10,
      ease: "power2.out"
    }, 0.15)
    .to(voiceCamBtn, {
      scaleY: 1,
      scaleX: 1,
      duration: 0.16,
      ease: "back.out(2.4)"
    });

    tl.call(() => {
      voiceRightControls.style.filter = "url(#goo)";
    }, null, 0.06);

    tl.fromTo(voiceMicBtn, {
      x: -60,
      scaleX: 1.18,
      scaleY: 0.85,
      opacity: 0
    }, {
      x: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      duration: 0.28,
      ease: "back.out(1.8)"
    }, 0.08);

    tl.fromTo(voiceCloseBtn, {
      x: -110,
      scaleX: 1.22,
      scaleY: 0.82,
      opacity: 0
    }, {
      x: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      duration: 0.30,
      ease: "back.out(1.9)"
    }, 0.11);

    tl.call(() => {
      voiceRightControls.style.filter = "none";
    }, null, 0.38);

    tl.fromTo([voiceMicIcon, voiceCloseIcon], {
      x: -24,
      scale: 0.25,
      opacity: 0,
      transformOrigin: "50% 50%"
    }, {
      scale: 1,
      x: 0,
      opacity: 1,
      duration: 0.26,
      ease: "back.out(2.2)",
      stagger: 0.035
    }, 0.12);

    this.dispatchEvent(new CustomEvent('dock:mode-change', { detail: { mode: 'voice' } }));
  }

  transitionFromVoiceToChat() {
    this.currentMode = 'chat';
    const preset = this.PRESS_PRESETS[this.activePressPreset];
    const layerChat = this.querySelector('#layer-chat');
    const chatMicIcon = this.querySelector('#chat-mic-icon');
    const chatItems = this.querySelectorAll('.chat-item');

    const layerVoice = this.querySelector('#layer-voice');
    const voiceCamIcon = this.querySelector('#voice-cam-icon');
    const voiceMicBtn = this.querySelector('#voice-mic-btn');
    const voiceCloseBtn = this.querySelector('#voice-close-btn');
    const voiceRightControls = this.querySelector('#voice-right-controls');

    const tl = gsap.timeline();

    tl.call(() => {
      voiceRightControls.style.filter = "url(#goo)";
    }, null, 0);

    tl.to([voiceCloseBtn, voiceMicBtn], {
      x: -40,
      scale: 0.3,
      opacity: 0,
      duration: 0.08,
      ease: "power2.in",
      stagger: 0.01
    }, 0);

    tl.to(voiceCamIcon, {
      scale: 0,
      rotation: 30,
      opacity: 0,
      duration: 0.08,
      ease: "power2.in",
      transformOrigin: "50% 50%"
    }, 0);

    tl.set(layerVoice, { opacity: 0, pointerEvents: "none" }, 0.06)
      .set(layerChat, { opacity: 1, pointerEvents: "auto", width: "64px" }, 0.06)
      .to(layerChat, {
        width: "100%",
        duration: 0.18,
        ease: "power2.out"
      }, 0.06);

    tl.fromTo(chatMicIcon, {
      scale: 0,
      rotation: -30,
      opacity: 0,
      transformOrigin: "50% 50%"
    }, {
      scale: 1,
      rotation: 0,
      opacity: 1,
      duration: 0.14,
      ease: "back.out(1.4)"
    }, 0.07);

    tl.fromTo(layerChat, {
      scaleY: preset.dockImpulseScaleY,
      scaleX: preset.dockImpulseScaleX
    }, {
      scaleY: 1,
      scaleX: 1,
      duration: 0.16,
      ease: preset.dockSettleEase
    }, 0.14);

    tl.fromTo(chatItems, {
      scale: 0.3,
      x: -16,
      opacity: 0,
      transformOrigin: "50% 50%"
    }, {
      scale: 1,
      x: 0,
      opacity: 1,
      duration: 0.16,
      ease: "back.out(1.3)",
      stagger: {
        each: 0.025,
        from: "start"
      }
    }, 0.12);

    tl.call(() => {
      voiceRightControls.style.filter = "none";
    }, null, 0.20);

    this.dispatchEvent(new CustomEvent('dock:mode-change', { detail: { mode: 'chat' } }));
  }

  transitionToSearch() {
    if (this.currentMode === 'search') return;
    this.currentMode = 'search';
    this.closeChatAttachments();
    this.closeNavMenu();

    const preset = this.PRESS_PRESETS[this.activePressPreset];
    const navPillLeft = this.querySelector('#nav-pill-left');
    const navBtnPlus = this.querySelector('#nav-btn-plus');
    const navIcons = navPillLeft.querySelectorAll('.nav-icon');
    const navIndicator = this.querySelector('#nav-active-indicator');
    const navPlusSymbol = this.querySelector('#nav-plus-symbol');
    const layerNav = this.querySelector('#layer-nav');
    const layerSearch = this.querySelector('#layer-search');
    const searchItems = layerSearch.querySelectorAll('.search-item');
    const searchInput = this.querySelector('#search-input');

    const tl = gsap.timeline();

    tl.call(() => {
      layerNav.style.filter = "url(#goo)";
    }, null, 0);

    tl.to([navIcons, navIndicator, navPlusSymbol], {
      scale: 0,
      opacity: 0,
      duration: preset.dockSnapDuration,
      ease: "power2.in",
      transformOrigin: "50% 50%"
    }, 0);

    tl.to(navBtnPlus, {
      width: "100%",
      borderRadius: "9999px",
      duration: preset.dockMorphDuration,
      ease: preset.dockMorphEase
    }, 0)
    .to(navPillLeft, {
      width: "100%",
      duration: preset.dockMorphDuration,
      ease: preset.dockMorphEase
    }, 0);

    tl.call(() => {
      layerSearch.style.opacity = 1;
      layerSearch.style.pointerEvents = "auto";
      layerSearch.style.width = "100%";
      layerNav.style.opacity = 0;
      layerNav.style.pointerEvents = "none";
      layerNav.style.filter = "none";
      if (searchInput) searchInput.focus();
    }, null, preset.dockMorphDuration * 0.55);

    tl.fromTo(layerSearch, {
      scaleY: preset.dockImpulseScaleY,
      scaleX: preset.dockImpulseScaleX
    }, {
      scaleY: preset.dockOvershootScaleY,
      scaleX: preset.dockOvershootScaleX,
      duration: preset.dockMorphDuration * 0.45,
      ease: "power2.out"
    }, preset.dockMorphDuration * 0.55)
    .to(layerSearch, {
      scaleY: 1,
      scaleX: 1,
      duration: preset.dockMorphDuration * 0.55,
      ease: preset.dockSettleEase
    });

    tl.fromTo(searchItems, {
      scale: 0.3,
      x: -16,
      y: 0,
      opacity: 0,
      transformOrigin: "50% 50%"
    }, {
      scale: 1,
      x: 0,
      y: 0,
      opacity: 1,
      duration: 0.24,
      ease: "back.out(1.2)",
      stagger: {
        each: 0.045,
        from: "start"
      }
    }, preset.dockMorphDuration * 0.55);

    this.dispatchEvent(new CustomEvent('dock:mode-change', { detail: { mode: 'search' } }));
  }

  transitionFromSearchToNav() {
    this.transitionToNav();
  }

  toggleNavMenu() {
    if (this.isNavMenuOpen) {
      this.closeNavMenu();
    } else {
      this.openNavMenu();
    }
  }

  openNavMenu() {
    const popup = this.querySelector('#nav-actions-popup');
    const icon = this.querySelector('#nav-plus-symbol');
    const pills = popup ? popup.querySelectorAll('.nav-action-pill') : [];
    const texts = popup ? popup.querySelectorAll('.nav-pill-text') : [];
    const icons = popup ? popup.querySelectorAll('.nav-pill-icon') : [];
    if (!popup) return;
    this.isNavMenuOpen = true;
    popup.classList.remove('hidden');

    if (icon) {
      gsap.to(icon, {
        rotation: 45,
        duration: 0.22,
        ease: "back.out(1.85)"
      });
    }

    // 1. Las cápsulas se expanden en orden secuencial rítmico de abajo hacia arriba (-15% deformación/rebote)
    gsap.killTweensOf(pills);
    gsap.fromTo(pills, {
      scaleX: 0.38,
      scaleY: 0.88,
      opacity: 0,
      transformOrigin: "right center"
    }, {
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      duration: 0.28,
      ease: "back.out(1.36)",
      stagger: {
        each: 0.055,
        from: "end" // 1. Escanear Boleta -> 2. Nuevo Ingreso -> 3. Registrar Gasto
      }
    });

    // 2. Los iconos circulares brotan en su turno correspondiente (-15% rebote)
    gsap.killTweensOf(icons);
    gsap.fromTo(icons, {
      scale: 0.3,
      x: 6,
      opacity: 0
    }, {
      scale: 1,
      x: 0,
      opacity: 1,
      duration: 0.24,
      ease: "back.out(1.7)",
      stagger: {
        each: 0.055,
        from: "end"
      }
    });

    // 3. Los textos entran con inercia coordinada por orden (-15% rebote)
    gsap.killTweensOf(texts);
    gsap.fromTo(texts, {
      x: 15,
      scaleX: 0.83,
      opacity: 0,
      transformOrigin: "right center"
    }, {
      x: 0,
      scaleX: 1,
      opacity: 1,
      duration: 0.26,
      ease: "back.out(1.28)",
      stagger: {
        each: 0.055,
        from: "end"
      }
    });
  }

  closeNavMenu() {
    const popup = this.querySelector('#nav-actions-popup');
    const icon = this.querySelector('#nav-plus-symbol');
    const pills = popup ? popup.querySelectorAll('.nav-action-pill') : [];
    const texts = popup ? popup.querySelectorAll('.nav-pill-text') : [];
    const icons = popup ? popup.querySelectorAll('.nav-pill-icon') : [];
    if (!popup || !this.isNavMenuOpen) return;
    this.isNavMenuOpen = false;

    const preset = this.PRESS_PRESETS[this.activePressPreset];

    if (icon) {
      gsap.to(icon, {
        rotation: 0,
        duration: 0.18,
        ease: "power2.out"
      });
    }

    gsap.killTweensOf(texts);
    gsap.to(texts, {
      x: 14,
      opacity: 0,
      duration: 0.10,
      ease: "power2.in",
      stagger: {
        each: 0.015,
        from: "start"
      }
    });

    gsap.killTweensOf(pills);
    gsap.to(pills, {
      scaleX: 0.38,
      opacity: 0,
      transformOrigin: "right center",
      duration: preset.dockSnapDuration * 1.2,
      ease: "power2.in",
      stagger: {
        each: 0.015,
        from: "start"
      },
      onComplete: () => {
        popup.classList.add('hidden');
        gsap.set([pills, texts, icons], { clearProps: "all" });
      }
    });
  }

  selectNavOption(pillElement, label) {
    if (!this.isNavMenuOpen) return;
    this.isNavMenuOpen = false;

    const popup = this.querySelector('#nav-actions-popup');
    const icon = this.querySelector('#nav-plus-symbol');
    const allPills = popup ? popup.querySelectorAll('.nav-action-pill') : [];
    const allTexts = popup ? popup.querySelectorAll('.nav-pill-text') : [];
    const allIcons = popup ? popup.querySelectorAll('.nav-pill-icon') : [];
    const unselectedPills = Array.from(allPills).filter(p => p !== pillElement);
    const selectedText = pillElement.querySelector('.nav-pill-text');

    const tl = gsap.timeline({
      onComplete: () => {
        popup.classList.add('hidden');
        gsap.set([allPills, allTexts, allIcons], { clearProps: "all" });
        this.dispatchEvent(new CustomEvent('dock:action', { detail: { action: label } }));
      }
    });

    if (icon) {
      tl.to(icon, {
        rotation: 0,
        duration: 0.18,
        ease: "power2.out"
      }, 0);
    }

    tl.to(unselectedPills, {
      scaleX: 0.38,
      x: 8,
      opacity: 0,
      duration: 0.12,
      ease: "power2.in",
      transformOrigin: "right center",
      stagger: 0.015
    }, 0);

    tl.to(pillElement, {
      scaleX: 1.04,
      scaleY: 1.068,
      duration: 0.12,
      ease: "back.out(1.7)"
    }, 0.03)
    .to(selectedText, {
      x: -3.5,
      duration: 0.12,
      ease: "power2.out"
    }, 0.03)
    .to(pillElement, {
      scaleX: 0.38,
      opacity: 0,
      x: 6,
      duration: 0.15,
      ease: "power2.in",
      transformOrigin: "right center"
    }, 0.15);
  }

  toggleChatAttachments() {
    if (this.isChatAttachmentsOpen) {
      this.closeChatAttachments();
    } else {
      this.openChatAttachments();
    }
  }

  openChatAttachments() {
    const popup = this.querySelector('#chat-attachments-popup');
    const icon = this.querySelector('#chat-plus-icon');
    const items = popup ? popup.querySelectorAll('.bubble-btn') : [];
    if (!popup) return;
    this.isChatAttachmentsOpen = true;
    popup.classList.remove('hidden');

    if (icon) {
      icon.style.transform = 'rotate(45deg)';
    }

    gsap.killTweensOf(popup);
    gsap.fromTo(popup, {
      scale: 0,
      opacity: 0,
      transformOrigin: "bottom right"
    }, {
      scale: 1,
      opacity: 1,
      duration: 0.22,
      ease: "back.out(1.6)"
    });

    gsap.killTweensOf(items);
    gsap.fromTo(items, {
      scale: 0.4,
      opacity: 0
    }, {
      scale: 1,
      opacity: 1,
      duration: 0.16,
      ease: "back.out(1.4)",
      stagger: 0.02,
      delay: 0.02
    });
  }

  closeChatAttachments() {
    const popup = this.querySelector('#chat-attachments-popup');
    const icon = this.querySelector('#chat-plus-icon');
    if (!popup || !this.isChatAttachmentsOpen) return;
    this.isChatAttachmentsOpen = false;

    if (icon) {
      icon.style.transform = 'rotate(0deg)';
    }

    gsap.killTweensOf(popup);
    gsap.to(popup, {
      scale: 0,
      opacity: 0,
      transformOrigin: "bottom right",
      duration: 0.12,
      ease: "power2.in",
      onComplete: () => {
        popup.classList.add('hidden');
      }
    });
  }

  initBubbleButtonPhysics() {
    const bubbleButtons = this.querySelectorAll('.bubble-btn');
    bubbleButtons.forEach(btn => {
      const icon = btn.querySelector('.material-symbols-rounded') || btn.querySelector('span') || btn.querySelector('svg');

      btn.addEventListener('pointerdown', (e) => {
        const config = this.PRESS_PRESETS[this.activePressPreset];
        gsap.killTweensOf(btn);
        if (icon) gsap.killTweensOf(icon);

        const tl = gsap.timeline();
        tl.to(btn, {
          scaleX: config.stretchScaleX,
          scaleY: config.stretchScaleY,
          duration: config.stretchDuration,
          ease: "power2.out"
        })
        .to(btn, {
          scaleX: config.counterScaleX,
          scaleY: config.counterScaleY,
          duration: config.counterDuration,
          ease: "power1.inOut"
        })
        .to(btn, {
          scaleX: 1,
          scaleY: 1,
          scale: 1,
          duration: config.settleDuration,
          ease: config.settleEase
        });

        if (icon) {
          gsap.timeline({ delay: 0.015 })
            .to(icon, {
              scaleX: config.iconStretchScaleX,
              scaleY: config.iconStretchScaleY,
              duration: config.stretchDuration,
              ease: "power2.out"
            })
            .to(icon, {
              scaleX: 1,
              scaleY: 1,
              scale: 1,
              duration: config.settleDuration,
              ease: config.settleEase
            });
        }
      });
    });
  }

  attachEvents() {
    // Pestañas de Navegación
    this.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-nav-index'), 10);
        this.setActiveNavTab(index, btn);
      });
    });

    // Botón + de Nav
    this.querySelector('#nav-btn-plus')?.addEventListener('click', () => this.toggleNavMenu());

    // Píldoras del menú +
    this.querySelectorAll('.nav-action-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const label = pill.getAttribute('data-nav-action');
        this.selectNavOption(pill, label);
      });
    });

    // Botones de Chat
    this.querySelector('#chat-mic-btn')?.addEventListener('click', () => this.transitionToVoice());
    this.querySelector('#chat-waveform-btn')?.addEventListener('click', () => this.transitionToVoice());
    this.querySelector('#chat-plus-btn')?.addEventListener('click', () => this.toggleChatAttachments());

    // Opciones de adjuntos en Chat
    this.querySelectorAll('[data-chat-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-chat-action');
        this.closeChatAttachments();
        this.dispatchEvent(new CustomEvent('dock:chat-action', { detail: { action } }));
      });
    });

    // Botones de Modo Voz
    this.querySelector('#voice-close-btn')?.addEventListener('click', () => this.transitionFromVoiceToChat());
    this.querySelector('#voice-mic-btn')?.addEventListener('click', () => {
      this.isMuted = !this.isMuted;
      const icon = this.querySelector('#voice-mic-icon');
      if (this.isMuted) {
        if (icon) {
          icon.textContent = 'mic_off';
          icon.classList.remove('animate-pulse', 'text-rose-600');
          icon.classList.add('text-slate-400');
        }
      } else {
        if (icon) {
          icon.textContent = 'mic';
          icon.classList.add('animate-pulse', 'text-rose-600');
          icon.classList.remove('text-slate-400');
        }
      }
      this.dispatchEvent(new CustomEvent('dock:mute-toggle', { detail: { isMuted: this.isMuted } }));
    });

    // Botones y Eventos de Modo Búsqueda
    this.querySelector('#search-back-btn')?.addEventListener('click', () => this.transitionFromSearchToNav());
    this.querySelector('#search-close-btn')?.addEventListener('click', () => this.transitionFromSearchToNav());
    this.querySelector('#search-input')?.addEventListener('input', (e) => {
      this.dispatchEvent(new CustomEvent('dock:search', { detail: { query: e.target.value } }));
    });

    // Cerrar menú al hacer clic afuera
    document.addEventListener('click', (e) => {
      const navPopup = this.querySelector('#nav-actions-popup');
      const navBtn = this.querySelector('#nav-btn-plus');
      if (this.isNavMenuOpen && navPopup && !navPopup.contains(e.target) && !navBtn?.contains(e.target)) {
        this.closeNavMenu();
      }

      const chatPopup = this.querySelector('#chat-attachments-popup');
      const chatBtn = this.querySelector('#chat-plus-btn');
      if (this.isChatAttachmentsOpen && chatPopup && !chatPopup.contains(e.target) && !chatBtn?.contains(e.target)) {
        this.closeChatAttachments();
      }
    });

    window.addEventListener('resize', () => this.initNavIndicator());
  }
}

// Registro global del Custom Element
if (!customElements.get('universal-dock')) {
  customElements.define('universal-dock', UniversalDock);
}
