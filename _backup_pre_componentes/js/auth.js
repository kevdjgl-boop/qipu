import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyA63OZWFM30Tu17DGxAmbtVsNFWeQU3k4s",
    authDomain: "qipu-d1dcd.firebaseapp.com",
    projectId: "qipu-d1dcd",
    storageBucket: "qipu-d1dcd.firebasestorage.app",
    messagingSenderId: "398775085739",
    appId: "1:398775085739:web:be8643b5d9fea9ef8da5ee",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const resetForm = document.getElementById('reset-form'); // Nuevo formulario
const toggleLink = document.getElementById('toggle-form');
const forgotPasswordLink = document.getElementById('forgot-password-link'); // Nuevo enlace
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message'); // Nuevo mensaje de éxito

// Redirigir si ya está logueado
onAuthStateChanged(auth, user => {
    if (user) {
        window.location.href = 'app.html';
    }
});

// Ocultar mensajes
const hideMessages = () => {
    errorMessage.classList.add('hidden');
    successMessage.classList.add('hidden');
};

// Alternar entre formularios
toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    hideMessages();
    loginForm.classList.toggle('hidden');
    registerForm.classList.toggle('hidden');
    resetForm.classList.add('hidden'); // Ocultar reset si estaba visible
    if (loginForm.classList.contains('hidden')) {
        toggleLink.textContent = '¿Ya tienes una cuenta? Inicia Sesión';
    } else {
        toggleLink.textContent = '¿No tienes una cuenta? Regístrate';
    }
});

// Mostrar formulario de recuperar contraseña
forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    hideMessages();
    loginForm.classList.add('hidden');
    registerForm.classList.add('hidden');
    resetForm.classList.remove('hidden');
    toggleLink.textContent = 'Volver a Iniciar Sesión'; // Cambiar el enlace principal
});

// Mostrar errores
const showError = (message) => {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
};

// Mostrar éxito
const showSuccess = (message) => {
    successMessage.textContent = message;
    successMessage.classList.remove('hidden');
};

// Manejar inicio de sesión
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessages();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        // La redirección la maneja onAuthStateChanged
    } catch (error) {
        showError('Correo o contraseña incorrectos.');
        console.error("Login error:", error);
    }
});

// Manejar registro
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessages();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        // La redirección la maneja onAuthStateChanged
    } catch (error) {
        if (error.code === 'auth/weak-password') {
            showError('La contraseña debe tener al menos 6 caracteres.');
        } else if (error.code === 'auth/email-already-in-use') {
            showError('Este correo electrónico ya está registrado.');
        } else {
            showError('Ocurrió un error al registrar la cuenta.');
        }
        console.error("Register error:", error);
    }
});

// NUEVO: Manejar recuperación de contraseña
resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessages();
    const email = document.getElementById('reset-email').value;
    try {
        await sendPasswordResetEmail(auth, email);
        showSuccess('¡Enlace de recuperación enviado! Revisa tu correo electrónico.');
        // Opcional: volver al login después de un tiempo
        setTimeout(() => {
            resetForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            toggleLink.textContent = '¿No tienes una cuenta? Regístrate';
        }, 3000);
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            showError('No se encontró ningún usuario con este correo electrónico.');
        } else {
            showError('Ocurrió un error al enviar el correo.');
        }
        console.error("Password reset error:", error);
    }
});
