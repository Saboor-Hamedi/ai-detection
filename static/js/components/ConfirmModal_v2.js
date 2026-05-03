/**
 * Neural Lab | Industrial Confirmation Modal
 * Minimalist, geometric, and non-blocking.
 */

const ConfirmModal = {
    overlay: null,
    resolve: null,

    init() {
        if (this.overlay) return;

        this.overlay = document.createElement('div');
        this.overlay.className = 'fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm hidden opacity-0 transition-opacity duration-300';
        this.overlay.innerHTML = `
            <div class="bg-white w-full max-w-[340px] rounded-[5px] shadow-[0_40px_100px_rgba(0,0,0,0.15)] overflow-hidden border border-slate-100 transform scale-95 transition-transform duration-300">
                <div class="px-8 pt-8 pb-4 text-left">
                    <h2 id="modal-title" class="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-2">Protocol Confirmation</h2>
                    <p id="modal-message" class="text-[12px] font-medium text-slate-500 leading-relaxed">Are you sure you want to proceed with this destructive action?</p>
                </div>
                <div class="px-8 pb-8 pt-4 flex space-x-3">
                    <button id="modal-cancel" class="flex-1 py-3 bg-slate-50 text-slate-400 rounded-[3px] text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors">
                        Cancel
                    </button>
                    <button id="modal-confirm" class="flex-1 py-3 bg-red-500 text-white rounded-[3px] text-[9px] font-black uppercase tracking-widest hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all">
                        Confirm
                    </button>
                </div>
                <div class="h-8 bg-slate-50 border-t border-slate-100 flex items-center justify-center">
                    <p class="text-[7px] font-black text-slate-300 uppercase tracking-[0.4em]">Forensic Lock Active</p>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        this.overlay.querySelector('#modal-cancel').addEventListener('click', () => this.close(false));
        this.overlay.querySelector('#modal-confirm').addEventListener('click', () => this.close(true));
    },

    async ask(title, message) {
        this.init();
        
        this.overlay.querySelector('#modal-title').textContent = title || "Protocol Confirmation";
        this.overlay.querySelector('#modal-message').textContent = message || "Are you sure?";
        
        this.overlay.classList.remove('hidden');
        setTimeout(() => {
            this.overlay.classList.add('opacity-100');
            this.overlay.querySelector('div').classList.add('scale-100');
        }, 10);

        return new Promise((resolve) => {
            this.resolve = resolve;
        });
    },

    close(value) {
        this.overlay.classList.remove('opacity-100');
        this.overlay.querySelector('div').classList.remove('scale-100');
        
        setTimeout(() => {
            this.overlay.classList.add('hidden');
            if (this.resolve) this.resolve(value);
        }, 300);
    }
};

window.ConfirmModal = ConfirmModal;
