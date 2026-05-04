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



// Global Initialization
window.addEventListener('resize', handleResize);

// Initial State Check
document.addEventListener('DOMContentLoaded', () => {
    if (window.innerWidth < 1024) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.add('collapsed-sidebar');
    }
});
