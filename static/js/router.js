/**
 * Neural Lab | Forensic Router
 * Manages Clean URLs, View Swapping, and History API state.
 */

const ForensicRouter = {
  views: ["editor", "archive", "pdf"],

  init() {
    console.log("[SYSTEM] Navigation Engine Active.");

    // 1. Initial Path Resolution
    const path = window.location.pathname.replace("/", "") || "editor";
    this.switchView(path, false);

    // 2. Handle Browser Back/Forward
    window.onpopstate = (event) => {
      const path = window.location.pathname.replace("/", "") || "editor";
      this.switchView(path, false);
    };
  },

  switchView(view, push = true) {
    const path = window.location.pathname;
    const isSettings = path.includes("/settings");
    const targetPath = view === "editor" ? "/" : `/${view}`;

    if (isSettings) {
      // CROSS-PAGE REDIRECT: We are on a different HTML page (Settings).
      // Only redirect if we are trying to go to a DIFFERENT page.
      if (path !== targetPath && path !== targetPath + "/") {
        window.location.href = targetPath;
      }
      return;
    }

    // Normalization (Archive -> History Div)
    const targetView = view === "archive" ? "history" : view;
    const cleanPath = view === "editor" ? "/" : `/${view}`;

    if (push) {
      window.history.pushState({ view }, "", cleanPath);
    }

    // --- DOM MANIPULATION ---
    const views = {
      editor: document.getElementById("view-editor"),
      history: document.getElementById("view-history"),
      pdf: document.getElementById("view-pdf"),
    };

    const navs = {
      editor: document.getElementById("nav-editor"),
      archive: document.getElementById("nav-history"),
      pdf: document.getElementById("nav-pdf"),
    };

    const tabs = {
      editor: document.getElementById("tab-editor"),
      pdf: document.getElementById("tab-pdf"),
    };

    // 1. Reset All
    Object.values(views).forEach((v) => v?.classList.add("hidden"));

    // Reset Nav Classes
    const navBase =
      "group w-full flex items-center p-2 text-slate-400 hover:text-slate-900 rounded-md text-[10px] font-bold uppercase tracking-widest text-left transition-colors";
    Object.values(navs).forEach((n) => {
      if (n) n.className = navBase;
    });

    // Reset Tab Classes
    const tabBase =
      "text-[10px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-transparent pb-1";
    Object.values(tabs).forEach((t) => {
      if (t) {
        const wasHidden = t.classList.contains("hidden");
        t.className = tabBase + (wasHidden ? " hidden" : "");
      }
    });

    // 2. Activate Selection
    if (views[targetView]) views[targetView].classList.remove("hidden");

    if (view === "editor") {
      if (tabs.editor)
        tabs.editor.className =
          "text-[10px] font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-1";
      if (navs.editor)
        navs.editor.className =
          "group w-full flex items-center p-2 bg-slate-50 rounded-md text-slate-900 text-[10px] font-bold uppercase tracking-widest text-left";
    } else if (view === "archive") {
      if (navs.archive)
        navs.archive.className =
          "group w-full flex items-center p-2 bg-slate-50 rounded-md text-slate-900 text-[10px] font-bold uppercase tracking-widest text-left";
      if (window.ForensicEngine) window.ForensicEngine.renderHistory();
    } else if (view === "pdf") {
      if (tabs.pdf)
        tabs.pdf.className =
          "text-[10px] font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-1";
      if (navs.pdf)
        navs.pdf.className =
          "group w-full flex items-center p-2 bg-slate-50 rounded-md text-slate-900 text-[10px] font-bold uppercase tracking-widest text-left";
    }

    // Mobile Sidebar Close on Navigate
    if (window.innerWidth < 1024 && typeof toggleSidebar === "function") {
      const sidebar = document.getElementById("sidebar");
      if (sidebar && sidebar.classList.contains("mobile-open")) {
        toggleSidebar();
      }
    }
  },
};

// Global Exposure
window.switchView = (view) => ForensicRouter.switchView(view);
document.addEventListener("DOMContentLoaded", () => ForensicRouter.init());
