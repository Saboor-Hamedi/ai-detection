/**
 * Neural Lab | Source Comparison Modal
 * Industrial component for side-by-side forensic analysis.
 */

const SourceModal = {
  modal: null,

  init() {
    if (document.getElementById("source-modal")) return;

    const html = `
        <div id="source-modal" class="fixed inset-0 z-[500] hidden flex items-center justify-center p-4 lg:p-10">
            <!-- Overlay -->
            <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onclick="SourceModal.close()"></div>
            
            <!-- Modal Body -->
            <div class="relative bg-white w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-300">
                
                <!-- Header -->
                <div class="h-14 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
                    <div class="flex items-center space-x-3">
                        <div class="w-6 h-6 bg-indigo-500 rounded flex items-center justify-center shadow-lg shadow-indigo-100">
                            <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h2 id="sm-title" class="text-xs lg:text-sm font-black text-slate-900 uppercase tracking-tighter">Source Record</h2>
                    </div>
                    <button onclick="SourceModal.close()" class="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <!-- Comparison Content -->
                <div class="flex-1 overflow-hidden flex flex-col">
                    <div id="sm-content" class="flex-1 overflow-y-auto p-10 lg:p-14 text-slate-700 leading-relaxed font-sans text-base prose prose-slate max-w-none no-scrollbar">
                        <!-- Content injected here -->
                    </div>
                </div>

                <!-- Footer -->
                <div class="h-14 px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end flex-shrink-0">
                    <div class="flex items-center space-x-3">
                         <a id="sm-full-view" href="#" target="_blank" class="px-4 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition-all">On Page</a>
                        <button onclick="SourceModal.close()" class="px-6 py-1.5 bg-slate-900 text-white rounded text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all">Close</button>
                    </div>
                </div>
            </div>
        </div>
        `;

    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    this.modal = document.getElementById("source-modal");
  },

  async open(auditId, title) {
    this.init();
    const contentArea = document.getElementById("sm-content");
    const titleArea = document.getElementById("sm-title");
    const linkArea = document.getElementById("sm-full-view");

    titleArea.innerText = title;
    contentArea.innerHTML =
      '<div class="flex items-center justify-center h-full"><div class="w-8 h-8 border-2 border-indigo-500 border-t-transparent animate-spin rounded-full"></div></div>';
    linkArea.href = `/view/${auditId}`;

    this.modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    try {
      // 1. Fetch Source Content via dedicated Forensic Retrieval
      const res = await fetch(`/api/v1/audit/${auditId}`);
      if (!res.ok)
        throw new Error("Forensic record not found in global archive.");

      const record = await res.json();

      // 2. Perform Forensic Highlighting
      const rawUserText = document.getElementById("input-text").value;
      const cleanUserText = this.stripMarkdown(rawUserText);
      const rawSourceText = record.full_text;

      const highlightedHtml = this.highlightOverlap(
        rawSourceText,
        cleanUserText,
      );
      contentArea.innerHTML = highlightedHtml;
    } catch (err) {
      contentArea.innerHTML = `<p class="text-red-500 font-bold text-center">Neural Link Severed: ${err.message}</p>`;
    }
  },

  stripMarkdown(text) {
    if (!text) return "";
    return text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/#+\s+/g, "")
      .replace(/[*_]{1,3}/g, "")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .replace(/^>\s+/gm, "")
      .replace(/\s+/g, " ")
      .trim();
  },

  highlightOverlap(rawSource, cleanUser) {
    if (!cleanUser) return rawSource;

    const normalizedUser = cleanUser.toLowerCase();
    const paragraphs = rawSource.split(/\n\n+/);

    return paragraphs
      .map((p) => {
        const cleanP = this.stripMarkdown(p);
        if (cleanP.length > 20) {
          let hasMatch = false;
          const searchP = cleanP.toLowerCase();
          const windowSize = 40;

          // Forensic Windowing: Scan the paragraph in 40-char blocks
          for (let i = 0; i <= searchP.length - windowSize; i += 10) {
            const chunk = searchP.substring(i, i + windowSize);
            if (normalizedUser.includes(chunk)) {
              hasMatch = true;
              break;
            }
          }

          if (hasMatch) {
            return `<p class="mb-3 bg-indigo-50/80 text-slate-900 px-1 rounded">${p}</p>`;
          }
        }
        return `<p class="mb-6">${p}</p>`;
      })
      .join("");
  },

  close() {
    if (this.modal) {
      this.modal.classList.add("hidden");
      document.body.style.overflow = "";
    }
  },
};

window.SourceModal = SourceModal;
