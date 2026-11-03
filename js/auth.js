window.currentUserUID = null;

document.addEventListener("DOMContentLoaded", () => {
    const authDashboard = document.getElementById("authDashboard");
    const mainApp = document.getElementById("mainApplication");
    const logoutBtn = document.getElementById("logoutBtn");

    document.getElementById("showSignupBtn")?.addEventListener("click", () => {
        document.getElementById("loginWrapper").classList.add("hidden");
        document.getElementById("signupWrapper").classList.remove("hidden");
    });

    document.getElementById("showLoginBtn")?.addEventListener("click", () => {
        document.getElementById("signupWrapper").classList.add("hidden");
        document.getElementById("loginWrapper").classList.remove("hidden");
    });

    setTimeout(() => {
        const auth = window.firebaseAuth;
        if (!auth) return;

        window.fbAuthState(auth, (user) => {
            if (user) {
                window.currentUserUID = user.uid;
                authDashboard.classList.add("hidden");
                mainApp.classList.remove("hidden");
                document.getElementById("userGreeting").textContent = `Logged in: ${user.email.split('@')[0]}`;

                const savedLang = localStorage.getItem(`lang_pref_${user.uid}`);
                if (savedLang) {
                    document.getElementById('modalLanguageSelect').value = savedLang;
                    setLanguage(savedLang);
                }

                if (window.mapController) setTimeout(() => window.mapController.map.invalidateSize(), 200);
            } else {
                window.currentUserUID = null;
                authDashboard.classList.remove("hidden");
                mainApp.classList.add("hidden");
            }
        });

        document.getElementById("loginForm")?.addEventListener("submit", (e) => {
            e.preventDefault();
            window.fbSignIn(auth, document.getElementById("loginEmail").value, document.getElementById("loginPass").value)
                .catch(err => alert("Login Error: " + err.message));
        });

        document.getElementById("signupForm")?.addEventListener("submit", (e) => {
            e.preventDefault();
            window.fbCreateUser(auth, document.getElementById("signupEmail").value, document.getElementById("signupPass").value)
                .catch(err => alert("Signup Error: " + err.message));
        });

        logoutBtn?.addEventListener("click", () => window.fbSignOut(auth));
    }, 500);
});
window.togglePasswordVisibility = function (inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === "password") {
        input.type = "text";
        btn.textContent = "🙈";
    } else {
        input.type = "password";
        btn.textContent = "👁️";
    }
};