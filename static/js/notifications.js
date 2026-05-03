/**
 * Neural Lab | Industrial Toast Engine
 * Handles high-fidelity, non-blocking laboratory notifications.
 */

const Toast = {
    container: null,

    init() {
        if (this.container) return;
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.className = 'fixed top-6 right-6 flex flex-col space-y-3 z-[300] items-end pointer-events-none';
        document.body.appendChild(this.container);
    },

    show(message, type = 'info') {
        this.init();
        
        const toast = document.createElement('div');
        toast.className = 'pointer-events-auto transform transition-all duration-500 translate-y-[-20px] opacity-0 bg-slate-900 text-white px-6 py-3.5 rounded-xl shadow-2xl flex items-center space-x-4 border border-slate-800 min-w-[280px] max-w-[400px]';
        
        const accentColor = type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : '#64748b');
        
        toast.innerHTML = `
            <div class="w-2 h-2 rounded-full animate-pulse" style="background: ${accentColor}"></div>
            <div class="flex flex-col">
                <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">${type} notification</span>
                <span class="text-[11px] font-bold tracking-tight">${message}</span>
            </div>
        `;

        this.container.appendChild(toast);

        // Slide In (Top Down)
        setTimeout(() => {
            toast.classList.remove('translate-y-[-20px]', 'opacity-0');
        }, 10);

        // Auto-Dismiss
        setTimeout(() => {
            toast.classList.add('translate-y-[-20px]', 'opacity-0');
            setTimeout(() => toast.remove(), 500);
        }, 4000);
    }
};

window.notify = (msg, type) => Toast.show(msg, type);
window.success = (msg) => Toast.show(msg, 'success');
window.error = (msg) => Toast.show(msg, 'error');
