window.currentUserUID = null;

document.addEventListener("DOMContentLoaded", () => {
  const authDashboard = document.getElementById("authDashboard");
  const mainApp = document.getElementById("mainApplication");
  const logoutBtn = document.getElementById("logoutBtn");
  let firebaseAuthBound = false;

  document.getElementById("showSignupBtn")?.addEventListener("click", () => {
    document.getElementById("loginWrapper")?.classList.add("hidden");
    document.getElementById("signupWrapper")?.classList.remove("hidden");
  });

  document.getElementById("showLoginBtn")?.addEventListener("click", () => {
    document.getElementById("signupWrapper")?.classList.add("hidden");
    document.getElementById("loginWrapper")?.classList.remove("hidden");
  });

  function initFirebaseAuth() {
    if (firebaseAuthBound) return;
    const auth = window.firebaseAuth;
    if (!auth || !window.fbAuthState) return;
    firebaseAuthBound = true;

    window.fbAuthState(auth, (user) => {
      if (user) {
        window.currentUserUID = user.uid;
        authDashboard?.classList.add("hidden");
        mainApp?.classList.remove("hidden");
        const greetingEl = document.getElementById("userGreeting");
        if (greetingEl) {
          greetingEl.textContent = `Logged in: ${user.email ? user.email.split("@")[0] : user.uid}`;
        }

        const savedLang = localStorage.getItem(`lang_pref_${user.uid}`);
        if (savedLang) {
          const langSelect = document.getElementById("modalLanguageSelect");
          if (langSelect) langSelect.value = savedLang;
          if (typeof setLanguage === "function") setLanguage(savedLang);
        }

        if (window.mapController) {
          setTimeout(() => window.mapController.map.invalidateSize(), 200);
        }
      } else {
        window.currentUserUID = null;
        authDashboard?.classList.remove("hidden");
        mainApp?.classList.add("hidden");
      }
    });

    document.getElementById("loginForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail")?.value || "";
      const password = document.getElementById("loginPass")?.value || "";
      window.fbSignIn(auth, email, password)
        .catch((err) => alert("Login Error: " + err.message));
    });

    document.getElementById("signupForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("signupEmail")?.value || "";
      const password = document.getElementById("signupPass")?.value || "";
      window.fbCreateUser(auth, email, password)
        .catch((err) => alert("Signup Error: " + err.message));
    });

    logoutBtn?.addEventListener("click", () => {
      window.fbSignOut(auth).catch((err) => alert("Logout Error: " + err.message));
    });
  }

  window.addEventListener("firebase-auth-ready", initFirebaseAuth);
  initFirebaseAuth();
  setTimeout(initFirebaseAuth, 500);
});

window.togglePasswordVisibility = function (inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
    if (btn) btn.textContent = "🙈";
  } else {
    input.type = "password";
    if (btn) btn.textContent = "👁️";
  }
};
