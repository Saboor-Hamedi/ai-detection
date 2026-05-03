/**
 * Neural Lab | Account & Auth Controller
 * Handles profile dropdowns, secure session management, and auth modals.
 */

const AuthController = {
    isRegisterMode: false,

    toggleModal(show) {
        const modal = document.getElementById('auth-modal');
        const card = document.getElementById('auth-card');
        if (show) {
            modal.classList.remove('hidden');
            setTimeout(() => {
                card.classList.remove('scale-95', 'opacity-0');
            }, 10);
        } else {
            card.classList.add('scale-95', 'opacity-0');
            setTimeout(() => modal.classList.add('hidden'), 300);
        }
    },

    toggleMode() {
        this.isRegisterMode = !this.isRegisterMode;
        const title = document.getElementById('auth-title');
        const subtitle = document.getElementById('auth-subtitle');
        const regFields = document.getElementById('register-fields');
        const toggleBtn = document.getElementById('auth-mode-toggle');
        const submitBtn = document.getElementById('auth-submit-btn');

        if (this.isRegisterMode) {
            title.textContent = "New Researcher";
            subtitle.textContent = "Create your forensic profile to start your research.";
            regFields.classList.remove('hidden');
            submitBtn.textContent = "Initialize Profile";
            toggleBtn.innerHTML = 'Already registered? <span class="text-slate-900 border-b border-slate-900">Login</span>';
        } else {
            title.textContent = "Access Laboratory";
            subtitle.textContent = "Identify yourself to access the Neural Forensic Suite.";
            regFields.classList.add('hidden');
            submitBtn.textContent = "Authorize Access";
            toggleBtn.innerHTML = 'New Researcher? <span class="text-slate-900 border-b border-slate-900">Register</span>';
        }
    },

    async submit() {
        const errorDiv = document.getElementById('auth-error');
        errorDiv.classList.add('hidden');
        
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const name = document.getElementById('reg-name').value;

        const endpoint = this.isRegisterMode ? '/api/auth/register' : '/api/auth/login';
        const body = this.isRegisterMode ? { email, password, full_name: name } : { email, password };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            
            if (response.ok) {
                if (this.isRegisterMode) {
                    this.toggleMode(); 
                    window.success("Profile initialized. Access authorized.");
                } else {
                    window.location.reload(); 
                }
            } else {
                errorDiv.textContent = data.detail || "Authorization failed.";
                errorDiv.classList.remove('hidden');
                window.error(data.detail || "Authorization failed.");
            }
        } catch (e) {
            errorDiv.textContent = "Connection to Lab lost.";
            errorDiv.classList.remove('hidden');
            window.error("Neural link severed.");
        }
    }
};

// Global Exposure
window.openAuth = () => AuthController.toggleModal(true);
window.closeAuth = () => AuthController.toggleModal(false);
window.toggleAuthMode = () => AuthController.toggleMode();
window.submitAuth = () => AuthController.submit();
window.toggleAccountMenu = () => {
    const menu = document.getElementById('account-menu');
    if (menu) menu.classList.toggle('hidden');
};

window.handleLogout = async () => {
    try {
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        if (response.ok) {
            window.success("Session terminated. Re-routing...");
            setTimeout(() => window.location.reload(), 800);
        }
    } catch (e) { console.error("Logout failed", e); }
};

// Close dropdown/modal when clicking outside
window.addEventListener('click', function(e) {
    const menu = document.getElementById('account-menu');
    const trigger = document.getElementById('profile-trigger');
    const modal = document.getElementById('auth-modal');
    const card = document.getElementById('auth-card');
    
    if (menu && !menu.contains(e.target) && !trigger.contains(e.target)) {
        menu.classList.add('hidden');
    }
    
    if (e.target === modal) {
        window.closeAuth();
    }
});
