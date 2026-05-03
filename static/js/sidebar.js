/**
 * Neural Lab | Sidebar Controller
 * Handles responsive toggling and layout transitions.
 */

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainWrapper = document.getElementById('main-wrapper');
    if (!sidebar || !mainWrapper) return;

    const isMobile = window.innerWidth < 1024;
    
    if (isMobile) {
        const isOpen = sidebar.classList.toggle('mobile-open');
        mainWrapper.classList.toggle('mobile-sidebar-open', isOpen);
        sidebar.classList.toggle('collapsed-sidebar', !isOpen);
    } else {
        const isCollapsed = sidebar.classList.toggle('collapsed-sidebar');
        mainWrapper.classList.toggle('sidebar-collapsed-main', isCollapsed);
    }
}

function handleResize() {
    const sidebar = document.getElementById('sidebar');
    const mainWrapper = document.getElementById('main-wrapper');
    if (!sidebar || !mainWrapper) return;
    
    if (window.innerWidth < 1024) {
        mainWrapper.classList.remove('sidebar-collapsed-main');
        sidebar.classList.add('collapsed-sidebar');
        sidebar.classList.remove('mobile-open');
        mainWrapper.classList.remove('mobile-sidebar-open');
    } else {
        sidebar.classList.remove('mobile-open');
        sidebar.classList.remove('collapsed-sidebar');
        mainWrapper.classList.remove('sidebar-collapsed-main');
        mainWrapper.classList.remove('mobile-sidebar-open');
    }
}

// Industrial Navigation Controller
window.switchView = function(view) {
    const path = window.location.pathname;
    const isSettings = path === '/settings' || path === '/settings/';

    if (view === 'editor') {
        if (isSettings) {
            window.location.href = '/';
        } else {
            // On Forge: Clear hash and switch
            if (window.location.hash) {
                history.replaceState(null, null, ' ');
            }
            if (window.ForensicEngine) window.ForensicEngine.switchView('editor');
        }
        return;
    }

    if (isSettings) {
        // Redirect to Forge with deep link
        window.location.href = '/#' + view;
        return;
    }

    // Update Hash for state persistence
    window.location.hash = view;

    // Delegate to ForensicEngine
    if (window.ForensicEngine && typeof window.ForensicEngine.switchView === 'function') {
        window.ForensicEngine.switchView(view);
    }
};

// Global Initialization
window.addEventListener('resize', handleResize);
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash) window.switchView(hash);
});

// Initial State Check
document.addEventListener('DOMContentLoaded', () => {
    if (window.innerWidth < 1024) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.add('collapsed-sidebar');
    }

    // Handle Initial Deep Link
    const initialHash = window.location.hash.replace('#', '');
    if (initialHash) {
        setTimeout(() => window.switchView(initialHash), 100);
    }
});
