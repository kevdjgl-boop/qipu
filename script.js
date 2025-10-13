  <!-- Scripts de Firebase -->
    <script type="module">
        // Importaciones de Firebase
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, doc, setDoc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
        import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
        
        setLogLevel('Debug');

        // --- Variables Globales y Configuración de Firebase (OBLIGATORIO) ---
        // Verificar si estamos en el entorno Canvas (donde existen estas variables)
        const IS_CANVAS_ENV = typeof __initial_auth_token !== 'undefined';

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
        // FIX: Corregir el error de ReferenceError: Cannot access 'initialAuthToken' before initialization
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        
        let app, db, auth;
        let userId = 'loading';
        const FINANCE_DOC_ID = 'main_finance_state'; 
        // FIX: Cambiar la referencia a una ruta privada por usuario
        const getFinanceDocRef = (db) => doc(db, 'artifacts', appId, 'users', userId, 'finance_tracker', FINANCE_DOC_ID);
        const LOCAL_STORAGE_KEY = 'finance_tracker_local_data'; // Clave para guardar localmente

        const MONTH_NAMES = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];

        let appState = {
            participants: [
                { id: 'p1', name: 'Alice', budget: 1000, sharedSavingsPercent: 10, independentSavingsPercent: 5 },
                { id: 'p2', name: 'Bob', budget: 1200, sharedSavingsPercent: 10, independentSavingsPercent: 5 },
            ],
            categories: [
                { name: 'Hogar', subcategories: ['Servicios', 'Comida', 'Limpieza', 'Mascotas'] },
                { name: 'Salidas', subcategories: ['Restaurantes', 'Cine', 'Bar'] }
            ],
            paymentMethods: [
                { id: 'm1', name: 'Efectivo', type: 'cash' },
                { id: 'm2', name: 'Débito', type: 'cash' },
            ],
            // FIX: Nueva estructura de datos para la estabilidad
            expenses: []
        };
        
        // FIX CRÍTICO DE FECHA: Inicializar la fecha de filtro al día 1 del mes actual
        let currentFilterDate = new Date();
        currentFilterDate.setDate(1); 
        
        // --- Utilidades ---
        const generateUUID = () => crypto.randomUUID();
        
        const showModal = (message) => {
            document.getElementById('modal-text').textContent = message;
            document.getElementById('message-modal').classList.remove('hidden');
            document.getElementById('message-modal').classList.add('flex');
        };

        document.getElementById('close-modal-btn').addEventListener('click', () => {
            document.getElementById('message-modal').classList.add('hidden');
            document.getElementById('message-modal').classList.remove('flex');
        });
        
        const formatCurrency = (value) => {
            // Moneda Soles Peruanos (S/)
            return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
        };

        const formatDate = (isoString) => {
            if (!isoString) return '';
            // El formato de la fecha es YYYY-MM-DD
            const [year, month, day] = isoString.split('-').map(Number);
            // new Date(year, monthIndex, day)
            const date = new Date(year, month - 1, day); 
            // FIX: Formato solo DÍA
            return date.toLocaleDateString('es-ES', { day: '2-digit' });
        }
        
        /** Devuelve el string YYYY-MM para filtrar el mes actual. */
        const getFilterMonthString = (date) => {
            // Se asegura de obtener la cadena YYYY-MM correcta
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            return `${year}-${month}`;
        }

        /** Calcula la fecha del ciclo y la fecha de pago límite. */
        function getCycleDates(method) {
            if (method.type !== 'credit' || !method.cycleStartDay || !method.paymentDay) return { cycleStart: null, paymentDate: null };

            const now = new Date(currentFilterDate);
            let year = now.getFullYear();
            let month = now.getMonth();
            
            // Determinar si estamos en el ciclo actual o el anterior
            if (now.getDate() < method.cycleStartDay) {
                month = month === 0 ? 11 : month - 1;
                year = now.getMonth() === 0 ? year - 1 : year;
            }

            // Fecha de inicio de ciclo (Facturación)
            const cycleStart = new Date(year, month, method.cycleStartDay);
            
            // Fecha de pago límite (Generalmente el mes siguiente)
            let paymentMonth = cycleStart.getMonth();
            let paymentYear = cycleStart.getFullYear();
            
            // Avanzar un mes para la fecha de pago
            paymentMonth++;
            if (paymentMonth > 11) {
                paymentMonth = 0;
                paymentYear++;
            }
            
            // Ajustar el día de pago límite (si el día no existe en el mes, Date ajustará al último día)
            const paymentDate = new Date(paymentYear, paymentMonth, method.paymentDay);
            
            return {
                // Devolvemos el string YYYY-MM-DD
                cycleStart: cycleStart.toISOString().split('T')[0],
                paymentDate: paymentDate.toISOString().split('T')[0]
            };
        }


        // --- Inicialización y Autenticación de Firebase (o Carga Local) ---
        async function initializeFirebase() {
            if (IS_CANVAS_ENV) {
                // Modo Firebase (Entorno Canvas)
                try {
                    app = initializeApp(firebaseConfig);
                    db = getFirestore(app);
                    auth = getAuth(app);
                    
                    // Primero, autenticar o iniciar sesión anónima
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                        await signInAnonymously(auth);
                    }

                    onAuthStateChanged(auth, (user) => {
                        if (user) {
                            // Una vez autenticado, obtener el UID
                            userId = user.uid;
                            document.getElementById('auth-status').innerHTML = `
                                ✅ Autenticado. Tu ID de Colaboración es: <strong>${userId}</strong>.
                                Todos los cambios se guardan en tiempo real (Firebase).
                            `;
                            setupListenersAndLoadData(true);
                        } else {
                            userId = 'anonymous';
                            document.getElementById('auth-status').textContent = '⚠️ Sesión anónima. Tus datos se guardan de forma temporal.';
                            setupListenersAndLoadData(true);
                        }
                    });
                } catch (error) {
                    console.error("Error al inicializar Firebase o autenticar:", error);
                    document.getElementById('auth-status').textContent = `❌ Error al conectar con Firebase: ${error.message}`;
                    // Fallback a Local Storage si Firebase falla
                    loadLocalState();
                    setupListenersAndLoadData(false);
                }
            } else {
                // Modo Local (PC / Desarrollo sin Canvas)
                loadLocalState();
                document.getElementById('auth-status').innerHTML = `
                    💾 Modo Local (PC). Los datos se guardan en el navegador.
                `;
                setupListenersAndLoadData(false);
            }
        }
        
        function setupListenersAndLoadData(isFirebaseMode) {
            setupMonthSelectorListeners(); // FIX: Aseguramos que esto se ejecute primero.
            setupPaymentMethodListeners();
            setupParticipantModalListeners(); 
            setupExpenseModalListeners(); 
            // FIX: Los listeners del historial se adjuntan en el renderizado
            if (isFirebaseMode) {
                setupFirestoreListener(); 
            } else {
                renderUI(); // Renderizar inmediatamente si es modo local
            }
        }
        
        // --- Gestión de Estado (Local vs. Firebase) ---

        function loadLocalState() {
            const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedData) {
                try {
                    const loadedData = JSON.parse(savedData);
                    appState = { 
                        ...appState, 
                        ...loadedData,
                        participants: loadedData.participants || appState.participants,
                        categories: loadedData.categories || appState.categories,
                        paymentMethods: loadedData.paymentMethods || appState.paymentMethods,
                        expenses: loadedData.expenses || appState.expenses
                    };
                } catch (e) {
                    console.error("Error al cargar estado local:", e);
                }
            }
        }

        async function saveState(updates) {
            // 1. Actualizar el estado en memoria
            appState = { ...appState, ...updates };

            if (IS_CANVAS_ENV && db && userId !== 'loading') {
                // 2. Modo Firebase (Guardado en la nube)
                try {
                    const docRef = getFinanceDocRef(db);
                    await setDoc(docRef, appState, { merge: true });
                } catch (error) {
                    console.error("Error al guardar el estado en Firestore:", error);
                    // Si falla Firestore, guardar localmente como fallback (aunque no es perfecto en Canvas)
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appState));
                }
            } else {
                // 2. Modo Local (Guardado en localStorage)
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appState));
                renderUI(); // Forzar re-renderizado en modo local
            }
        }
        
        function setupFirestoreListener() {
            if (!db || userId === 'loading') return;
            // FIX CRÍTICO: Llamar a la función getFinanceDocRef para obtener la referencia del documento, 
            // no pasar la función misma.
            const docRef = getFinanceDocRef(db);
            
            onSnapshot(docRef, docSnap => {
                if (docSnap.exists()) {
                    const loadedData = docSnap.data();
                    appState = { 
                        ...appState, 
                        ...loadedData,
                        participants: loadedData.participants || appState.participants,
                        categories: loadedData.categories || appState.categories,
                        paymentMethods: loadedData.paymentMethods || appState.paymentMethods,
                        expenses: loadedData.expenses || appState.expenses
                    };
                } else {
                    // Si el documento no existe, lo creamos con el estado inicial
                    setDoc(docRef, appState);
                }
                renderUI();
            }, error => {
                console.error("Error al escuchar cambios en Firestore:", error);
                showModal("Error de conexión en tiempo real. Revisa la consola.");
            });
        }


        // --- Configuración de Listeners del Modal de Participantes (FIX: Define la función) ---
        
        function setupParticipantModalListeners() {
            const participantModal = document.getElementById('add-participant-modal');
            const participantForm = document.getElementById('participant-form');
            const sidebar = document.getElementById('participant-sidebar');
            const backdrop = document.getElementById('sidebar-backdrop');
            
            // Lógica para abrir/cerrar Sidebar
            const toggleSidebar = (open) => {
                if (open) {
                    sidebar.classList.add('open');
                    backdrop.classList.add('open');
                } else {
                    sidebar.classList.remove('open');
                    backdrop.classList.remove('open');
                }
            };
            
            document.getElementById('open-participants-sidebar-btn').addEventListener('click', () => toggleSidebar(true));
            document.getElementById('close-sidebar-btn').addEventListener('click', () => toggleSidebar(false));
            backdrop.addEventListener('click', () => toggleSidebar(false)); // Cierre al hacer clic en el fondo

            
            // Botón de Abrir Modal de Adición/Edición (dentro del Sidebar)
            document.getElementById('open-add-participant-modal-sidebar').addEventListener('click', (e) => {
                document.getElementById('participant-id-to-edit').value = '';
                document.getElementById('participant-modal-title').textContent = 'Añadir Nuevo Participante';
                participantForm.reset();
                participantModal.classList.remove('hidden');
                participantModal.classList.add('flex');
            });

            
            document.getElementById('close-participant-modal-btn').addEventListener('click', () => {
                participantModal.classList.add('hidden');
                participantModal.classList.remove('flex');
            });

            // Listener de Guardar/Editar
            participantForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const idToEdit = document.getElementById('participant-id-to-edit').value;
                const name = document.getElementById('p-name').value.trim();
                const budget = parseFloat(document.getElementById('p-budget').value) || 0;
                const ssa = Math.max(0, Math.min(100, parseFloat(document.getElementById('p-shared-savings').value) || 0));
                const isa = Math.max(0, Math.min(100, parseFloat(document.getElementById('p-independent-savings').value) || 0));

                if (ssa + isa > 100) {
                    showModal(`Error: La suma de los porcentajes de ahorro (${name}) no puede superar el 100%.`);
                    return;
                }

                if (idToEdit) {
                    // EDITAR
                    const newParticipants = appState.participants.map(p => {
                        if (p.id === idToEdit) {
                            return { ...p, name, budget, sharedSavingsPercent: ssa, independentSavingsPercent: isa };
                        }
                        return p;
                    });
                    saveState({ participants: newParticipants });
                    showModal(`Configuración de ${name} actualizada.`);
                } else {
                    // AÑADIR
                    const newId = `p${generateUUID().substring(0, 4)}`;
                    const newParticipant = { id: newId, name, budget, sharedSavingsPercent: ssa, independentSavingsPercent: isa };
                    const newParticipants = [...appState.participants, newParticipant];
                    saveState({ participants: newParticipants });
                    showModal(`Participante ${name} añadido.`);
                }

                participantModal.classList.add('hidden');
                participantModal.classList.remove('flex');
            });
        }

        // --- Configuración de Listeners del Modal de Edición de Gasto (NUEVO) ---
        function setupExpenseModalListeners() {
            const modal = document.getElementById('edit-expense-modal');
            const guestInputContainer = document.getElementById('guest-payer-input-container');
            const guestNameInput = document.getElementById('guest-payer-name');

            document.getElementById('close-edit-expense-modal-btn').addEventListener('click', () => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                guestInputContainer.classList.add('hidden'); // Ocultar input de invitado al cerrar
                guestNameInput.value = '';
            });
            
            document.getElementById('add-guest-payer-btn').addEventListener('click', () => {
                guestInputContainer.classList.toggle('hidden');
                document.getElementById('edit-expense-payer').value = ''; // Deseleccionar participante si se añade invitado
                guestNameInput.focus();
            });


            document.getElementById('edit-expense-form').addEventListener('submit', (e) => {
                e.preventDefault();
                
                const id = document.getElementById('edit-expense-id').value;
                const newDescription = document.getElementById('edit-expense-description').value.trim();
                const newAmount = parseFloat(document.getElementById('edit-expense-amount').value);
                const newCategory = document.getElementById('edit-expense-category').value;
                let newPayerId = document.getElementById('edit-expense-payer').value;
                let newPayerName = '';

                // Lógica de Invitado
                const guestName = guestNameInput.value.trim();
                if (guestName && guestInputContainer.classList.contains('hidden') === false) {
                    newPayerId = `guest_${generateUUID()}`; // Generar ID para invitado
                    newPayerName = guestName;
                } else if (!newPayerId) {
                    // Si no se seleccionó participante ni se ingresó invitado
                    showModal("Por favor, selecciona un pagador o añade un invitado.");
                    return;
                }

                if (newAmount <= 0 || !newDescription || !newCategory) {
                    showModal("Por favor, completa la descripción, el monto y la categoría.");
                    return;
                }

                const updatedExpenses = appState.expenses.map(exp => {
                    if (exp.id === id) {
                        return { 
                            ...exp, 
                            description: newDescription, 
                            amount: newAmount, 
                            category: newCategory,
                            payerId: newPayerId,
                            payerNameGuest: newPayerName, // Guardar nombre del invitado si aplica
                            // Simplificamos la subcategoría al editar desde el historial, manteniendo el valor anterior si es posible
                            subcategory: appState.categories.find(c => c.name === newCategory)?.subcategories.includes(exp.subcategory) ? exp.subcategory : ''
                        };
                    }
                    return exp;
                });

                saveState({ expenses: updatedExpenses });
                showModal(`Gasto actualizado correctamente.`);
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                guestInputContainer.classList.add('hidden');
                guestNameInput.value = '';
            });
        }
        
        // --- Lógica de Negocio y Cálculos (Cuadro Dinámico) ---

        /** Ejecuta todos los cálculos financieros para N participantes. */
        function calculateSummary(state, filteredExpenses) {
            const participants = state.participants;
            
            // Inicializar totales para cada participante
            const participantData = participants.map(p => ({
                ...p,
                spent: 0, // Gasto personal incurrido (FIX: Inicializado a 0)
                contributionPaid: 0, // Total pagado de su bolsillo (personal + compartido)
                expectedContribution: 0, // Total que debería haber pagado (personal + parte compartida)
                remainingBudget: 0, 
                balance: 0, // Diferencia: contributionPaid - expectedContribution (Debe/Le Deben)
                totalSavingsGoal: 0, // Ahorro Mutuo + Individual
                sharedSavingsGoal: (p.budget * p.sharedSavingsPercent) / 100,
                independentSavingsGoal: (p.budget * p.independentSavingsPercent) / 100,
                availableForSpending: p.budget * (1 - (p.sharedSavingsPercent + p.independentSavingsPercent) / 100)
            }));
            
            participantData.forEach(p => {
                p.totalSavingsGoal = p.sharedSavingsGoal + p.independentSavingsGoal;
            });

            // Mapear participantes por ID
            const participantMap = new Map(participantData.map(p => [p.id, p]));
            let totalSpent = 0;
            let totalIndependentSpent = 0; // Nuevo total de gastos personales (global)

            // 1. Procesar Gastos (solo los filtrados por mes)
            filteredExpenses.forEach(expense => {
                const amount = expense.amount || 0;
                totalSpent += amount;

                // El pagador puede ser un participante o un invitado (guest)
                const payer = participantMap.get(expense.payerId); 
                
                // Solo si el pagador es un participante activo, se ajusta su contributionPaid
                if (payer) {
                    payer.contributionPaid += amount;
                }

                if (expense.type === 'personal' || expense.type === 'fixed') {
                    // FIX CRÍTICO: Si es personal, debe contar al individuo y al total global.
                    totalIndependentSpent += amount; 
                    if (payer) {
                        payer.expectedContribution += amount;
                        payer.spent += amount; // Gasto personal del individuo
                    }
                } else if (expense.type === 'shared') {
                    
                    // Lógica para reparto: Participantes activos + 1 si el pagador es un invitado
                    let numPayees = participants.length;
                    
                    // Si el pagador es un invitado, se asume que también debe pagar su parte (N+1)
                    if (expense.payerId.startsWith('guest_')) {
                        // Si el invitado paga, el gasto se reparte entre N participantes + el invitado (N+1)
                        numPayees = participants.length + 1;
                    } else {
                        // Si un participante activo paga, el gasto se divide solo entre los N participantes activos.
                        numPayees = participants.length;
                    }
                    
                    // La parte que le corresponde a cada participante (y al invitado si se incluye)
                    const splitAmount = amount / numPayees; 
                    
                    // El monto esperado se divide entre todos los participantes activos
                    participantData.forEach(p => {
                        p.expectedContribution += splitAmount;
                    });
                    
                    // Aseguramos que splitAmount exista en el objeto expense para la visualización.
                    expense.splitAmount = splitAmount; 
                }
            });

            // 2. Cálculos Finales
            let globalTotalRemainingBudget = 0;
            let globalSharedSavingsGoal = 0;

            participantData.forEach(p => {
                // Saldo restante: Dinero disponible - (Gasto personal + Gasto compartido esperado)
                p.remainingBudget = p.availableForSpending - p.expectedContribution;
                
                // Balance (Quien debe a quien): Dinero que pagó vs. Dinero que debía
                // FIX: Redondeamos a 2 decimales el balance para evitar errores de coma flotante en la UI
                p.balance = Math.round((p.contributionPaid - p.expectedContribution) * 100) / 100;

                globalTotalRemainingBudget += p.remainingBudget;
                globalSharedSavingsGoal += p.sharedSavingsGoal;
            });

            return {
                globalTotalRemainingBudget,
                globalSharedSavingsGoal, // Nuevo campo para el dashboard
                totalSpent, // Nuevo campo para el dashboard
                totalIndependentSpent, // Nuevo total independiente
                participantData,
            };
        }
        
        // --- Lógica de Renderizado y Animación ---

        function animateNumber(elementId, finalValue) {
            const element = document.getElementById(elementId);
            if (!element) return;
            
            const currentValueText = element.textContent.replace(/[S/$,]/g, '').trim().replace(',', '.');
            const currentValue = parseFloat(currentValueText) || 0;
            
            const data = { value: currentValue };
            
            gsap.to(data, {
                value: finalValue,
                duration: 1.0,
                ease: "power2.out",
                onUpdate: () => {
                    element.textContent = formatCurrency(data.value);
                    if (data.value < 0) {
                        element.classList.remove('text-green-300');
                        element.classList.add('text-red-300');
                    } else {
                        element.classList.remove('text-red-300');
                        element.classList.add('text-green-300');
                    }
                }
            });
        }
        
        /** Renderiza el resumen dinámico en el Dashboard. */
        function renderDashboard(summary) {
            animateNumber('display-remaining-budget', summary.globalTotalRemainingBudget);
            
            // Gasto Total del Ciclo
            document.getElementById('display-total-spent').textContent = formatCurrency(summary.totalSpent);
            
            // NOTE: Se quita 'display-independent-spent' de aquí para simplificar el CARD 1
            
            // Ahorro Mutuo (Dentro del Card 2)
            const sharedSavingsGoalEl = document.getElementById('display-shared-savings-goal');
            if (sharedSavingsGoalEl) {
                sharedSavingsGoalEl.textContent = formatCurrency(summary.globalSharedSavingsGoal);
            }

            // Tarjetas de Participantes (Resumen en Sección 1)
            const participantSummaryCardsEl = document.getElementById('participant-summary-cards');
            participantSummaryCardsEl.innerHTML = ''; 

            summary.participantData.forEach(p => {
                const remainingColor = p.remainingBudget < 0 ? 'text-red-600' : 'text-green-600';
                
                const cardHtml = `
                    <div class="section-card border-l-4 border-teal-500 p-4 text-left">
                        <p class="text-sm font-semibold text-gray-700 leading-tight">${p.name}</p>
                        
                        <div class="mt-1">
                            <p class="text-xs text-gray-500">Saldo Restante:</p>
                            <span class="text-xl font-bold ${remainingColor} leading-none block">${formatCurrency(p.remainingBudget)}</span>
                        </div>

                        <div class="flex justify-between items-center text-xs mt-2 pt-2 border-t border-gray-200">
                            <div>
                                <p class="text-gray-500">Ahorro Indep.:</p>
                                <span class="font-bold text-teal-600">${formatCurrency(p.independentSavingsGoal)}</span>
                            </div>
                            <!-- CAMBIO: Gasto Personal Individual -->
                            <div>
                                <p class="text-gray-500">Gasto Personal:</p>
                                <span class="font-bold text-red-600">${formatCurrency(p.spent)}</span>
                            </div>
                        </div>
                    </div>
                `;
                participantSummaryCardsEl.insertAdjacentHTML('beforeend', cardHtml);
            });
        }

        /** Renderiza la lista compacta de participantes y la configuración de ahorro. */
        function renderParticipantsConfig(participants, summary) {
            const listEl = document.getElementById('participants-list');
            listEl.innerHTML = '';

            participants.forEach(p => {
                const summaryData = summary.participantData.find(pd => pd.id === p.id) || p;
                const balanceColor = summaryData.remainingBudget < 0 ? 'text-red-600' : 'text-green-600';
                
                // Se recrea la tarjeta que el usuario aprobó anteriormente (Purple Card)
                const configHtml = `
                    <div id="config-${p.id}" class="participant-card space-y-2 flex-shrink-0 relative w-full">
                        <button data-id="${p.id}" class="remove-participant-btn absolute top-2 right-2 text-gray-400 hover:text-red-600 transition p-1 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <h4 class="font-extrabold text-xl text-purple-900 pr-6">${p.name}</h4>
                        
                        <p class="text-sm text-gray-600">Presupuesto Asignado: <span class="font-semibold">${formatCurrency(p.budget)}</span></p>
                        
                        <p class="text-lg font-extrabold text-gray-800 border-t border-purple-200 pt-2">
                           Saldo Restante: <span class="${balanceColor}">${formatCurrency(summaryData.remainingBudget)}</span>
                        </p>
                        
                        <div class="flex justify-between text-xs pt-1 border-t border-purple-200">
                            <p class="text-purple-700">Ahorro Mutuo: <span class="font-bold">${p.sharedSavingsPercent}%</span></p>
                            <p class="text-purple-700">Ahorro Indep.: <span class="font-bold">${p.independentSavingsPercent}%</span></p>
                        </div>

                        <button data-id="${p.id}" class="edit-participant-btn w-full py-1 mt-2 bg-purple-400 text-white text-sm font-bold rounded-lg hover:bg-purple-500 transition">
                            Editar
                        </button>
                    </div>
                `;
                listEl.insertAdjacentHTML('beforeend', configHtml);
            });
            
            listEl.querySelectorAll('.edit-participant-btn').forEach(btn => {
                btn.addEventListener('click', (e) => openParticipantEditModal(e.currentTarget.getAttribute('data-id')));
            });

            listEl.querySelectorAll('.remove-participant-btn').forEach(btn => {
                btn.addEventListener('click', (e) => removeParticipant(e.currentTarget.getAttribute('data-id')));
            });
            
            updateExpenseFormParticipants(participants);
        }

        /** Renderiza el selector de mes con el nombre del mes y el año. */
        function renderMonthSelector() {
            const monthNameEl = document.getElementById('current-month-name');
            const yearEl = document.getElementById('current-year');

            const monthIndex = currentFilterDate.getMonth();
            const year = currentFilterDate.getFullYear();

            monthNameEl.textContent = MONTH_NAMES[monthIndex];
            yearEl.textContent = year;
        }

        /** Rellena el modal de edición de gasto con la información de un gasto. */
        function openExpenseEditModal(expenseId) {
            const expense = appState.expenses.find(e => e.id === expenseId);
            if (!expense) return;

            document.getElementById('edit-expense-id').value = expense.id;
            document.getElementById('edit-expense-description').value = expense.description;
            document.getElementById('edit-expense-amount').value = expense.amount;
            
            const categorySelect = document.getElementById('edit-expense-category');
            const payerSelect = document.getElementById('edit-expense-payer');
            const guestInputContainer = document.getElementById('guest-payer-input-container');
            const guestNameInput = document.getElementById('guest-payer-name');

            // 1. Cargar Categorías
            categorySelect.innerHTML = '<option value="" disabled selected>Selecciona Categoría</option>';
            appState.categories.forEach(cat => {
                const selected = cat.name === expense.category ? 'selected' : '';
                categorySelect.insertAdjacentHTML('beforeend', `<option value='${cat.name}' ${selected}>${cat.name}</option>`);
            });

            // 2. Cargar Pagadores (Participantes)
            payerSelect.innerHTML = '<option value="" disabled selected>Selecciona Pagador</option>';
            appState.participants.forEach(p => {
                const selected = p.id === expense.payerId ? 'selected' : '';
                payerSelect.insertAdjacentHTML('beforeend', `<option value='${p.id}' ${selected}>${p.name}</option>`);
            });

            // 3. Manejar Invitado
            const isGuest = expense.payerId && expense.payerId.startsWith('guest_');

            if (isGuest) {
                guestInputContainer.classList.remove('hidden');
                guestNameInput.value = expense.payerNameGuest || expense.description; // Usar el nombre guardado o descripción
                payerSelect.value = ''; // Asegurar que el select esté vacío
            } else {
                guestInputContainer.classList.add('hidden');
                guestNameInput.value = '';
                payerSelect.value = expense.payerId; // Seleccionar participante si existe
            }
            
            document.getElementById('edit-expense-modal').classList.remove('hidden');
            document.getElementById('edit-expense-modal').classList.add('flex');
        }


        /** Renderiza la lista de categorías dentro del modal. */
        function renderCategoriesModal(categories) {
            const displayEl = document.getElementById('categories-display');
            const categorySelect = document.getElementById('expense-category');
            const editCategorySelect = document.getElementById('edit-expense-category');
            displayEl.innerHTML = '';
            categorySelect.innerHTML = '<option value="" disabled selected>Selecciona Categoría</option>';
            editCategorySelect.innerHTML = '<option value="" disabled selected>Selecciona Categoría</option>';


            if (categories.length === 0) {
                displayEl.innerHTML = '<p class="text-sm text-gray-500 italic" id="no-categories">No hay categorías definidas.</p>';
            } else {
                categories.forEach(cat => {
                    // Display list in modal
                    const catHtml = `
                        <div class="p-3 bg-white rounded-lg border border-gray-200 flex justify-between items-start">
                            <div class="flex-1">
                                <span class="font-bold text-gray-800">${cat.name}</span>
                                <p class="text-xs text-gray-600 mt-1">Subcategorías: ${cat.subcategories.join(', ') || 'Ninguna'}</p>
                            </div>
                            <button data-name="${cat.name}" class="remove-category-btn text-red-500 hover:text-red-700 ml-4 p-1 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>
                            </button>
                        </div>
                    `;
                    displayEl.insertAdjacentHTML('beforeend', catHtml);

                    // Select option in main form and edit form
                    categorySelect.insertAdjacentHTML('beforeend', `<option value='${cat.name}'>${cat.name}</option>`);
                    editCategorySelect.insertAdjacentHTML('beforeend', `<option value='${cat.name}'>${cat.name}</option>`);
                });
                
                // Attach delete listeners
                displayEl.querySelectorAll('.remove-category-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => removeCategory(e.currentTarget.getAttribute('data-name')));
                });
            }
        }

        /** Configura los listeners para la navegación del selector de mes. */
        function setupMonthSelectorListeners() {
            renderMonthSelector(); 
            
            const updateMonth = (delta) => {
                currentFilterDate.setMonth(currentFilterDate.getMonth() + delta);
                renderMonthSelector();
                renderUI();
            };

            // FIX CRÍTICO: Aseguramos que los listeners se adjunten correctamente y con lógica limpia.
            const prevBtn = document.getElementById('prev-month-btn');
            const nextBtn = document.getElementById('next-month-btn');
            
            if (prevBtn) prevBtn.onclick = () => updateMonth(-1);
            if (nextBtn) nextBtn.onclick = () => updateMonth(1);
        }

        // --- Gestión de Participantes (Modal y Edición) ---
        
        // Estas variables se declaran globalmente para ser accesibles desde setupParticipantModalListeners
        const participantModal = document.getElementById('add-participant-modal');
        const participantForm = document.getElementById('participant-form');
        
        
        function openParticipantEditModal(id) {
            const p = appState.participants.find(p => p.id === id);
            if (!p) return;
            
            document.getElementById('participant-id-to-edit').value = id;
            document.getElementById('participant-modal-title').textContent = `Editar Participante: ${p.name}`;
            
            document.getElementById('p-name').value = p.name;
            document.getElementById('p-budget').value = p.budget;
            document.getElementById('p-shared-savings').value = p.sharedSavingsPercent;
            document.getElementById('p-independent-savings').value = p.independentSavingsPercent;

            participantModal.classList.remove('hidden');
            participantModal.classList.add('flex');
        }

        function removeParticipant(idToRemove) {
            if (appState.participants.length <= 1) {
                showModal("Debe haber al menos un participante.");
                return;
            }
            const newParticipants = appState.participants.filter(p => p.id !== idToRemove);
            const newExpenses = appState.expenses.filter(e => e.payerId !== idToRemove);
            saveState({ participants: newParticipants, expenses: newExpenses });
            showModal(`Participante y sus gastos asociados eliminados.`);
        }
        
        // --- Renderizado y Lógica de Métodos de Pago (NUEVO: Edición) ---
        
        document.getElementById('open-payment-methods-modal-btn').addEventListener('click', () => {
            document.getElementById('payment-methods-modal').classList.remove('hidden');
            document.getElementById('payment-methods-modal').classList.add('flex');
        });

        document.getElementById('close-payment-methods-modal-btn').addEventListener('click', () => {
            document.getElementById('payment-methods-modal').classList.add('hidden');
            document.getElementById('payment-methods-modal').classList.remove('flex');
            resetPaymentForm();
        });
        
        function setupPaymentMethodListeners() {
            // Lógica condicional para campos de Tarjeta de Crédito en el MODAL
            document.getElementById('method-type').addEventListener('change', (e) => {
                const ccConfigFields = document.getElementById('cc-config-fields');
                if (e.target.value === 'credit') {
                    ccConfigFields.classList.remove('hidden');
                } else {
                    ccConfigFields.classList.add('hidden');
                }
            });

            // Lógica para guardar/editar método
            document.getElementById('payment-method-form').addEventListener('submit', (e) => {
                e.preventDefault();
                
                const idToEdit = document.getElementById('method-id-to-edit').value;
                const name = document.getElementById('method-name').value.trim();
                const type = document.getElementById('method-type').value;
                
                if (type === 'credit') {
                    const cycleDay = parseInt(document.getElementById('cc-config-cycle-day').value);
                    const paymentDay = parseInt(document.getElementById('cc-config-payment-day').value);

                    if (isNaN(cycleDay) || isNaN(paymentDay) || cycleDay < 1 || cycleDay > 31 || paymentDay < 1 || paymentDay > 31) {
                         showModal("Para la Tarjeta de Crédito, los días de ciclo y pago deben ser números válidos entre 1 y 31.");
                        return;
                    }
                }
                
                let newMethods;
                
                if (idToEdit) {
                    // EDICIÓN
                    newMethods = appState.paymentMethods.map(m => {
                        if (m.id === idToEdit) {
                            const updatedMethod = { id: m.id, name, type };
                            if (type === 'credit') {
                                updatedMethod.cycleStartDay = parseInt(document.getElementById('cc-config-cycle-day').value);
                                updatedMethod.paymentDay = parseInt(document.getElementById('cc-config-payment-day').value);
                            }
                            return updatedMethod;
                        }
                        return m;
                    });
                    showModal(`Método "${name}" actualizado.`);
                } else {
                    // AÑADIR
                    const newMethod = { id: 'm' + generateUUID(), name, type };
                    if (type === 'credit') {
                        newMethod.cycleStartDay = parseInt(document.getElementById('cc-config-cycle-day').value);
                        newMethod.paymentDay = parseInt(document.getElementById('cc-config-payment-day').value);
                    }
                    newMethods = [...appState.paymentMethods, newMethod];
                    showModal(`Método "${name}" añadido.`);
                }
                
                saveState({ paymentMethods: newMethods });
                // FIX: Cierra el modal automáticamente después de guardar/añadir
                document.getElementById('payment-methods-modal').classList.add('hidden');
                document.getElementById('payment-methods-modal').classList.remove('flex');
                resetPaymentForm();
            });
            
            document.getElementById('cancel-edit-method-btn').addEventListener('click', resetPaymentForm);
        }
        
        function resetPaymentForm() {
            document.getElementById('method-id-to-edit').value = '';
            document.getElementById('payment-method-form').reset();
            document.getElementById('cc-config-fields').classList.add('hidden');
            document.getElementById('payment-form-title').textContent = 'Añadir Nuevo Método:';
            document.getElementById('save-method-btn').textContent = 'Añadir Método';
            document.getElementById('cancel-edit-method-btn').classList.add('hidden');
        }

        function openPaymentMethodEditModal(id) {
            const method = appState.paymentMethods.find(m => m.id === id);
            if (!method) return;
            
            document.getElementById('method-id-to-edit').value = id;
            document.getElementById('payment-form-title').textContent = `Editar Método: ${method.name}`;
            document.getElementById('save-method-btn').textContent = 'Guardar Cambios';
            document.getElementById('cancel-edit-method-btn').classList.remove('hidden');

            document.getElementById('method-name').value = method.name;
            document.getElementById('method-type').value = method.type;
            
            const ccConfigFields = document.getElementById('cc-config-fields');
            if (method.type === 'credit') {
                ccConfigFields.classList.remove('hidden');
                document.getElementById('cc-config-cycle-day').value = method.cycleStartDay;
                document.getElementById('cc-config-payment-day').value = method.paymentDay;
            } else {
                ccConfigFields.classList.add('hidden');
            }
        }
        
        function removePaymentMethod(idToRemove) {
            if (idToRemove === 'm1' || idToRemove === 'm2') {
                showModal("No puedes eliminar los métodos de pago predeterminados (Efectivo/Débito).");
                return;
            }
            const newMethods = appState.paymentMethods.filter(m => m.id !== idToRemove);
            saveState({ paymentMethods: newMethods });
        }

        function renderPaymentMethodsModal(methods) {
            const displayEl = document.getElementById('payment-methods-display');
            const expenseSelect = document.getElementById('expense-payment-method-id');
            
            displayEl.innerHTML = '';
            expenseSelect.innerHTML = '<option value="" disabled selected>Selecciona Método de Pago</option>';

            if (methods.length === 0) {
                displayEl.innerHTML = '<p class="text-sm text-gray-500 italic">No hay métodos definidos.</p>';
            }

            methods.forEach(m => {
                const isCredit = m.type === 'credit';
                
                // Modal Display
                const methodDetails = isCredit 
                    ? `Ciclo: Día ${m.cycleStartDay} | Pago: Día ${m.paymentDay}`
                    : 'Transacción inmediata.';
                    
                const methodColor = isCredit ? 'yellow' : 'gray';

                const methodHtml = `
                    <div class="p-3 bg-white rounded-lg border border-${methodColor}-200 flex justify-between items-center">
                        <div class="flex-1">
                            <span class="font-bold text-gray-800">${m.name}</span>
                            <p class="text-xs text-gray-600 mt-1">${methodDetails}</p>
                        </div>
                        <div class="flex space-x-2">
                            <button data-id="${m.id}" class="edit-method-btn text-blue-500 hover:text-blue-700 transition p-1 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zm-5.121 5.121l-4.243 4.243A1 1 0 005 14.828V17h2.172a1 1 0 00.707-.293l4.243-4.243-2.828-2.828z" /></svg>
                            </button>
                            <button data-id="${m.id}" class="remove-method-btn text-red-500 hover:text-red-700 transition p-1 rounded-full ${m.id === 'm1' || m.id === 'm2' ? 'hidden' : ''}">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>
                            </button>
                        </div>
                    </div>
                `;
                displayEl.insertAdjacentHTML('beforeend', methodHtml);

                // Expense Form Select
                expenseSelect.insertAdjacentHTML('beforeend', `<option value='${m.id}'>${m.name}</option>`);
            });
            
            // Attach listeners to newly rendered buttons
            displayEl.querySelectorAll('.remove-method-btn').forEach(btn => {
                btn.addEventListener('click', (e) => removePaymentMethod(e.currentTarget.getAttribute('data-id')));
            });
            displayEl.querySelectorAll('.edit-method-btn').forEach(btn => {
                btn.addEventListener('click', (e) => openPaymentMethodEditModal(e.currentTarget.getAttribute('data-id')));
            });
        }
        
        // --- Otras Funciones de UI ---
        
        function renderUI() {
            const currentMonthStart = new Date();
            currentMonthStart.setDate(1); // Asegurar que la fecha de hoy esté alineada
            
            const filterMonthString = getFilterMonthString(currentFilterDate);
            let filteredExpenses = appState.expenses.filter(e => e.date && e.date.startsWith(filterMonthString));

            // CRITICAL FIX: Si la vista actual no tiene gastos pero hay datos en el estado,
            // y la vista no está en el mes actual, la forzamos al mes actual para que el usuario vea sus nuevos gastos.
            const todayMonthString = getFilterMonthString(new Date());
            if (filteredExpenses.length === 0 && appState.expenses.length > 0 && filterMonthString !== todayMonthString) {
                currentFilterDate = new Date(); // Centra en el mes actual
                filteredExpenses = appState.expenses.filter(e => e.date && e.date.startsWith(todayMonthString));
                renderMonthSelector(); // Rerenderiza el selector de mes si la fecha cambió
            }

            const summary = calculateSummary(appState, filteredExpenses);
            
            renderMonthSelector();
            renderDashboard(summary); // Nuevo nombre de función
            renderParticipantsConfig(appState.participants, summary); // Pasa summary para mostrar el saldo
            renderCategoriesModal(appState.categories); 
            renderPaymentMethodsModal(appState.paymentMethods);
            
            // DIAGNÓSTICO
            document.getElementById('expense-diagnostic').textContent = `Total de gastos cargados (todos los meses): ${appState.expenses.length}. Gastos en el ciclo actual: ${filteredExpenses.length}`;
            // FIN DIAGNÓSTICO

            renderExpenseReportByCategory(filteredExpenses, summary); // CAMBIO: Usar la nueva función de reporte
            renderFixedExpensesSummary(summary); // Renderizar Gastos Fijos
            renderSharedBalanceSummary(summary); // FIX: Ahora se llama aquí para el Dashboard
            
            // Disparar eventos para actualizar opciones dependientes
            document.getElementById('expense-payment-method-id').dispatchEvent(new Event('change'));
            document.getElementById('expense-category').dispatchEvent(new Event('change'));
        }
        
        // --- FUNCIÓN AISLADA PARA CREAR TARJETA DE GASTO (NUEVA ESTRATEGIA) ---
        function createExpenseCardHTML(expense, participantsMap, paymentMethodsMap) {
            // Obtener el nombre del pagador (puede ser un invitado)
            let payerName = participantsMap.get(expense.payerId);
            if (!payerName && expense.payerNameGuest) {
                 payerName = `${expense.payerNameGuest} (Invitado)`;
            } else if (!payerName) {
                 payerName = 'Desconocido';
            }

            const isShared = expense.type === 'shared';
            const isFixed = expense.type === 'fixed';
            const paymentMethod = paymentMethodsMap.get(expense.paymentMethodId);
            
            const splitAmount = expense.splitAmount || 0; 
            const color = isShared ? 'red' : (isFixed ? 'purple' : 'blue');
            const subcategoryLabel = expense.subcategory ? `(${expense.subcategory})` : '';

            let balanceTags = '';
            let ccInfo = '';
            let expenseTypeLabel = isFixed ? 'Gasto Fijo' : (isShared ? 'Compartido' : 'Personal');

            // Lógica para etiquetas de Contribución
            if (isShared) {
                // Si es compartido, la división es entre los participantes activos
                balanceTags = appState.participants.map(p => {
                    const isPayer = p.id === expense.payerId;
                    // FIX: Asegurar que splitAmount esté formateado
                    const formattedSplitAmount = formatCurrency(splitAmount);

                    let tagColor;
                    let tagText;

                    if (isPayer) {
                        tagColor = 'bg-blue-600 text-white'; 
                        tagText = `Pagó (Total): ${formatCurrency(expense.amount)}`;
                    } else {
                        tagColor = 'bg-red-100 text-red-700';
                        tagText = `Debe: ${formattedSplitAmount}`;
                    }
                    
                    return `<span class='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tagColor} mr-1'>${p.name}: ${tagText}</span>`;
                }).join('');
                
                // Si el pagador fue un invitado, añadir una etiqueta de Pagador
                 if (expense.payerId.startsWith('guest_')) {
                    balanceTags += `<span class='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700 ml-1'>Pagador: ${payerName}</span>`;
                }


            } else {
                // Gasto Personal o Fijo
                const methodTagColor = paymentMethod && paymentMethod.type === 'cash' ? 'bg-gray-200 text-gray-700' : 'bg-yellow-200 text-yellow-800';
                const paymentTagText = paymentMethod && paymentMethod.type === 'credit' ? `T. Crédito: ${paymentMethod.name}` : paymentMethod ? paymentMethod.name : 'N/A';

                const paymentTag = `<span class='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${methodTagColor}'>${paymentTagText}</span>`;
                
                balanceTags = `<span class='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800'>Pagador: ${payerName}</span> ${paymentTag}`;
            }
            
            // Usamos las propiedades seguras (ccCycleStart, ccPaymentDate)
            if (paymentMethod && paymentMethod.type === 'credit' && expense.ccCycleStart && expense.ccPaymentDate) {
                ccInfo = `<p class='text-xs text-yellow-700 mt-1'>Facturación: ${formatDate(expense.ccCycleStart)} | Pago Límite: ${formatDate(expense.ccPaymentDate)}</p>`;
            }
            
            // Etiqueta de Gasto Fijo
            const fixedLabel = isFixed ? `<span class="text-xs font-semibold text-purple-600 ml-2">(${expense.fixedRecurrenceMonths} meses)</span>` : '';

            // --- CONSTRUCCIÓN FINAL DEL ITEM ---
            return `
                <div class='p-3 bg-white border border-gray-200 rounded-lg shadow-sm transition duration-300 expense-item-enter' data-expense-id='${expense.id}'>
                    <div class='flex justify-between items-start expense-header' data-toggle='${expense.id}'>
                        <div class='flex-1 min-w-0'>
                            <p class='font-bold text-gray-800'>${expense.description} <span class='text-sm text-gray-500 ml-2'>${subcategoryLabel}</span> ${fixedLabel}</p>
                            <p class='text-xs text-gray-500 mt-1'><span class='font-semibold'>${expenseTypeLabel}</span> | Día: ${formatDate(expense.date)}</p>
                        </div>
                        <div class='flex flex-col items-end ml-4'>
                            <p class='text-2xl font-extrabold text-${color}-600'>${formatCurrency(expense.amount)}</p>
                        </div>
                    </div>
                    
                    <!-- Contenido Desplegable (Inicialmente oculto) -->
                    <div id='detail-${expense.id}' class='expense-detail hidden'>
                        <div class='flex gap-2 mt-4 mb-2 justify-end'>
                            <button data-id='${expense.id}' class='edit-expense-btn text-gray-500 hover:text-blue-500 transition duration-150 text-xs font-bold'>
                                <i class='fas fa-edit'></i> Editar
                            </button>
                            <button data-id='${expense.id}' class='delete-btn text-gray-500 hover:text-red-500 transition duration-150 text-xs font-bold'>
                                <i class='fas fa-trash'></i> Eliminar
                            </button>
                        </div>
                        <div class='pt-2 border-t border-dashed border-gray-200 space-y-2'>
                            <div class='flex flex-wrap gap-1'>${balanceTags}</div>
                            ${ccInfo}
                        </div>
                    </div>
                </div>
            `;
        }

        /** * Renderiza el historial agrupado por Categoría. (ESTRATEGIA FINAL: Inyección segura).
         */
        function renderExpenseReportByCategory(filteredExpenses, summary) {
            const reportEl = document.getElementById('expense-report-by-category');
            reportEl.innerHTML = '';

            if (filteredExpenses.length === 0) {
                reportEl.innerHTML = `<p class='text-gray-500 text-center py-8 italic'>No hay gastos registrados en este ciclo. ¡Añade uno para empezar!</p>`;
                return;
            }

            const participantsMap = new Map(appState.participants.map(p => [p.id, p.name]));
            const paymentMethodsMap = new Map(appState.paymentMethods.map(m => [m.id, m]));
            
            // 1. Agrupar gastos por categoría
            const groupedExpenses = filteredExpenses.reduce((acc, expense) => {
                const category = expense.category || 'Sin Categoría';
                if (!acc[category]) {
                    acc[category] = [];
                }
                acc[category].push(expense);
                return acc;
            }, {});

            
            // 2. Renderizar cada grupo de categoría
            Object.keys(groupedExpenses).sort().forEach(categoryName => {
                const expenses = groupedExpenses[categoryName];
                const categoryTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);

                // **ESTRATEGIA CRÍTICA FINAL: Usar DIVs simples en lugar de UL/LI**
                const categoryContainer = document.createElement('div');
                categoryContainer.className = "bg-gray-100 p-4 rounded-xl border border-gray-300 shadow-sm";
                
                // Header de Categoría
                let categoryHTML = `
                    <div class='flex justify-between items-center pb-2 mb-3 border-b border-gray-300'>
                        <h3 class='text-xl font-extrabold text-gray-700'>${categoryName}</h3>
                        <span class='text-lg font-bold text-gray-800'>${formatCurrency(categoryTotal)}</span>
                    </div>
                    <div id='category-list-${categoryName.replace(/\s/g, '-')}' class='space-y-3'>
                `;
                
                // 3. Renderizar items dentro de la categoría, inyectando directamente en la variable HTML
                expenses.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(expense => {
                    categoryHTML += createExpenseCardHTML(expense, participantsMap, paymentMethodsMap);
                });
                
                categoryHTML += `</div>`; // Cerrar el div contenedor de la lista

                categoryContainer.innerHTML = categoryHTML;
                
                // 4. Adjuntamos la categoría ya completa al contenedor principal
                reportEl.appendChild(categoryContainer);
            });
            
            // 5. Re-adjuntar listeners para los botones de Editar/Eliminar y el TOGGLE
            // Usamos delegación de eventos en el contenedor padre para elementos dinámicos
            reportEl.removeEventListener('click', handleExpenseReportClick); // Evitar duplicados
            reportEl.addEventListener('click', handleExpenseReportClick);

            // 6. Aplicar GSAP a los elementos recién inyectados
            reportEl.querySelectorAll('.expense-item-enter').forEach(el => {
                 gsap.from(el, { opacity: 0, y: -10, duration: 0.5, ease: "power2.out" });
            });
        }
        
        /** Manejador global para los clics en los botones de editar/eliminar en el informe. */
        function handleExpenseReportClick(e) {
            const target = e.target.closest('button, .expense-header');
            if (!target) return;
            
            const id = target.getAttribute('data-id');

            // Lógica para desplegar/contraer
            if (target.classList.contains('expense-header')) {
                const expenseId = target.getAttribute('data-toggle');
                const detailEl = document.getElementById(`detail-${expenseId}`);
                if (detailEl) {
                    detailEl.classList.toggle('hidden');
                    if (!detailEl.classList.contains('hidden')) {
                         gsap.from(detailEl, { height: 0, opacity: 0, duration: 0.3, ease: "power2.out" });
                    }
                }
                return;
            }

            // Lógica para editar/eliminar
            if (!id) return;

            if (target.classList.contains('edit-expense-btn')) {
                openExpenseEditModal(id);
            } else if (target.classList.contains('delete-btn')) {
                removeExpense(id);
            }
        }

        // --- Renderizado de Gastos Fijos (NUEVO) ---
        function renderFixedExpensesSummary(summary) {
            const fixedEl = document.getElementById('fixed-expenses-summary');
            // Filtrar todos los gastos fijos, independientemente del mes actual
            const fixedExpenses = appState.expenses.filter(e => e.type === 'fixed');

            if (fixedExpenses.length === 0) {
                 fixedEl.innerHTML = '<p class="text-gray-500 italic">No hay gastos fijos registrados.</p>';
                 return;
            }

            fixedEl.innerHTML = fixedExpenses.map(exp => {
                const totalAmount = formatCurrency(exp.amount * exp.fixedRecurrenceMonths);
                const payerName = appState.participants.find(p => p.id === exp.payerId)?.name || 'N/A';
                
                return `
                    <div class="p-3 bg-red-50 rounded-lg border border-red-300">
                        <p class="font-bold text-red-800 text-sm">${exp.description}</p>
                        <p class="text-xs text-gray-700">Pagador: ${payerName} | ${exp.fixedRecurrenceMonths} meses</p>
                        <p class="text-xs text-red-600 font-semibold">Total Recurrente: ${totalAmount}</p>
                    </div>
                `;
            }).join('');
        }
        
        /** Renderiza el resumen de balance compartido con mejor UI. */
        function renderSharedBalanceSummary(summary) {
            const sharedBalanceEl = document.getElementById('shared-balance-summary');
            // Usar una tolerancia baja para evitar errores de coma flotante
            const balances = summary.participantData.filter(p => Math.abs(p.balance) > 0.01);

            if (balances.length === 0) {
                sharedBalanceEl.innerHTML = `
                    <div class="text-center p-4 bg-indigo-50 rounded-lg">
                        <i class="fas fa-handshake text-indigo-500 text-3xl mb-2"></i>
                        <p class="text-indigo-700 font-bold">¡Cuentas claras!</p>
                        <p class="text-sm text-indigo-600">Todos están al día en este ciclo.</p>
                    </div>
                `;
                return;
            }
            
            sharedBalanceEl.innerHTML = balances.map(p => {
                const isPositive = p.balance > 0;
                const icon = isPositive ? '<i class="fas fa-arrow-circle-up mr-2"></i>' : '<i class="fas fa-arrow-circle-down mr-2"></i>';
                const textColor = isPositive ? 'balance-positive' : 'balance-negative';
                const action = isPositive ? 'Le deben' : 'Debe';
                const amount = formatCurrency(Math.abs(p.balance));

                return `
                    <div class="p-3 bg-white border border-gray-100 rounded-lg shadow-sm flex items-center justify-between">
                        <span class="font-semibold text-gray-800">${p.name}</span>
                        <p class="font-extrabold text-sm ${textColor} flex items-center">
                            ${icon} ${action}: ${amount}
                        </p>
                    </div>
                `;
            }).join('');
        }
        
        function updateExpenseFormParticipants(participants) {
            const paidBySelect = document.getElementById('expense-paid-by');
            paidBySelect.innerHTML = '';
            participants.forEach(p => {
                paidBySelect.insertAdjacentHTML('beforeend', `<option value='${p.id}'>${p.name}</option>`);
            });
        }
        
        document.getElementById('expense-type').addEventListener('change', (e) => {
            const recurrenceContainer = document.getElementById('fixed-recurrence-container');
            if (e.target.value === 'fixed') {
                recurrenceContainer.classList.remove('hidden');
                document.getElementById('fixed-recurrence-months').required = true;
            } else {
                recurrenceContainer.classList.add('hidden');
                document.getElementById('fixed-recurrence-months').required = false;
            }
        });
        
        document.getElementById('expense-category').addEventListener('change', (e) => {
            const categoryName = e.target.value;
            const subcategorySelect = document.getElementById('expense-subcategory');
            subcategorySelect.innerHTML = '<option value="" disabled selected>Selecciona Subcategoría</option>';
            
            const selectedCategory = appState.categories.find(c => c.name === categoryName);
            
            if (selectedCategory && selectedCategory.subcategories.length > 0) {
                selectedCategory.subcategories.forEach(sub => {
                    subcategorySelect.insertAdjacentHTML('beforeend', `<option value='${sub}'>${sub}</option>`);
                });
                subcategorySelect.disabled = false;
                subcategorySelect.classList.remove('bg-gray-100');
            } else {
                subcategorySelect.disabled = true;
                subcategorySelect.classList.add('bg-gray-100');
            }
        });
        
        document.getElementById('open-categories-modal-btn').addEventListener('click', () => {
            document.getElementById('categories-modal').classList.remove('hidden');
            document.getElementById('categories-modal').classList.add('flex');
        });
        
        document.getElementById('close-categories-modal-btn').addEventListener('click', () => {
            document.getElementById('categories-modal').classList.add('hidden');
            document.getElementById('categories-modal').classList.remove('flex');
        });

        document.getElementById('category-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('category-name').value.trim();
            const subcategoriesString = document.getElementById('subcategory-list').value.trim();
            
            if (!name) return;

            const newCategories = [...appState.categories];
            const existingIndex = newCategories.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
            const subcategories = subcategoriesString ? subcategoriesString.split(',').map(s => s.trim()).filter(s => s) : [];

            if (existingIndex !== -1) {
                newCategories[existingIndex].subcategories = Array.from(new Set([...newCategories[existingIndex].subcategories, ...subcategories]));
            } else {
                newCategories.push({ name, subcategories });
            }
            
            saveState({ categories: newCategories });
            showModal(`Categoría guardada.`)
            e.target.reset();
        });
        
        function removeCategory(nameToRemove) {
            const newCategories = appState.categories.filter(c => c.name !== nameToRemove);
            saveState({ categories: newCategories });
        }
        
        document.getElementById('expense-payment-method-id').addEventListener('change', (e) => {
            const selectedMethodId = e.target.value;
            const method = appState.paymentMethods.find(m => m.id === selectedMethodId);
            const ccDetails = document.getElementById('credit-card-details');
            
            if (method && method.type === 'credit') {
                ccDetails.classList.remove('hidden');
                
                const { cycleStart, paymentDate } = getCycleDates(method);
                
                document.getElementById('cc-cycle-start-display').textContent = formatDate(cycleStart);
                document.getElementById('cc-payment-date-display').textContent = formatDate(paymentDate);
            } else {
                ccDetails.classList.add('hidden');
                document.getElementById('cc-cycle-start-display').textContent = '-';
                document.getElementById('cc-payment-date-display').textContent = '-';
            }
        });
        
        document.getElementById('expense-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const description = document.getElementById('expense-description').value.trim();
            const amount = parseFloat(document.getElementById('expense-amount').value);
            const paidBy = document.getElementById('expense-paid-by').value;
            const type = document.getElementById('expense-type').value;
            const category = document.getElementById('expense-category').value;
            const subcategory = document.getElementById('expense-subcategory').value;
            const paymentMethodId = document.getElementById('expense-payment-method-id').value;
            
            const paymentMethod = appState.paymentMethods.find(m => m.id === paymentMethodId);

            if (amount <= 0 || !description || !paidBy || !category || !paymentMethod) {
                showModal("Por favor, completa la descripción, el monto, quién pagó, la categoría y el método de pago.");
                return;
            }
            
            let cycleStart = null;
            let paymentDate = null;
            let fixedRecurrenceMonths = 0;

            if (paymentMethod.type === 'credit') {
                const dates = getCycleDates(paymentMethod);
                cycleStart = dates.cycleStart;
                paymentDate = dates.paymentDate;
            }
            
            if (type === 'fixed') {
                fixedRecurrenceMonths = parseInt(document.getElementById('fixed-recurrence-months').value) || 1;
            }


            const now = new Date();
            // FIX CRÍTICO: Garantizamos todos los campos por defecto para estabilidad.
            const newExpense = {
                id: generateUUID(),
                type: type,
                description: description,
                amount: amount,
                payerId: paidBy,
                payerNameGuest: '', // Vacío para participantes activos
                category: category,
                subcategory: subcategory,
                paymentMethodId: paymentMethodId,
                ccCycleStart: cycleStart, // Puede ser null
                ccPaymentDate: paymentDate, // Puede ser null
                date: now.toISOString().split('T')[0], // Clave para el filtro YYYY-MM-DD
                dateCreated: now.toISOString(), // Nuevo campo para ordenación si es necesario
                splitAmount: 0, // Se calcula en calculateSummary
                fixedRecurrenceMonths: fixedRecurrenceMonths // 0 si no es fijo
            };

            const newExpenses = [...appState.expenses, newExpense];
            saveState({ expenses: newExpenses });
            e.target.reset(); 
            
            document.getElementById('expense-subcategory').disabled = true;
            document.getElementById('expense-subcategory').classList.add('bg-gray-100');
            document.getElementById('expense-category').value = '';
            document.getElementById('expense-payment-method-id').value = '';
            document.getElementById('credit-card-details').classList.add('hidden');
            document.getElementById('fixed-recurrence-container').classList.add('hidden');
        });
        
        async function removeExpense(idToRemove) {
            const newExpenses = appState.expenses.filter(e => e.id !== idToRemove);
            await saveState({ expenses: newExpenses });
        }

        // Iniciar la aplicación
        window.onload = initializeFirebase;

