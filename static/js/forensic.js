/**
 * Neural Lab | Forensic Logic Layer
 * Industrial Version 2.0 (Component Based)
 */

const ForensicEngine = {
    history: [],
    abortController: null,
    currentPDFFile: null,
    visualData: null,
    lastResult: null,

    init() {
        const textarea = document.getElementById('input-text');
        if (!textarea) {
            console.log("[SYSTEM] Forensic Engine entering Passive Mode: Editor not detected.");
            return;
        }
        this.bindEvents();
        this.renderHistory();
        this.checkPlaceholder();

        // Hash-Aware Initialization
        const hash = window.location.hash.replace('#', '');
        if (hash === 'history' || hash === 'editor' || hash === 'visual-pdf') {
            this.switchView(hash);
        }
    },

    bindEvents() {
        const textarea = document.getElementById('input-text');
        const highlighter = document.getElementById('highlighter-layer');
        if (!textarea || !highlighter) return;

        textarea.addEventListener('input', (e) => {
            const charCount = document.getElementById('char-count');
            if (charCount) charCount.innerText = `${e.target.value.length} Characters`;
            
            if (!highlighter.innerHTML.includes('<span')) {
                highlighter.innerText = e.target.value;
            }
            this.syncScroll();
            this.checkPlaceholder();
        });

        textarea.addEventListener('scroll', () => {
            this.syncScroll();
        });

        this.bindPdfAndDragEvents();
    },

    bindPdfAndDragEvents() {

        // File Input Handler
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files[0]) this.uploadFile(e.target.files[0]);
            });
        }

        // DRAG AND DROP PDF SUPPORT
        const wrapper = document.querySelector('.editor-wrapper');
        if (wrapper) {
            wrapper.addEventListener('dragover', (e) => {
                e.preventDefault();
                wrapper.style.borderColor = '#10b981';
                wrapper.style.background = '#f0fdf4';
            });

            wrapper.addEventListener('dragleave', () => {
                wrapper.style.borderColor = 'transparent';
                wrapper.style.background = '#ffffff';
            });

            wrapper.addEventListener('drop', async (e) => {
                e.preventDefault();
                wrapper.style.borderColor = 'transparent';
                wrapper.style.background = '#ffffff';
                
                const file = e.dataTransfer.files[0];
                if (file && file.type === 'application/pdf') {
                    this.uploadFile(file);
                } else {
                    window.error("Only PDF files are supported for forensic ingestion.");
                }
            });
        }
    },

    clearEditor() {
        const textarea = document.getElementById('input-text');
        const highlighter = document.getElementById('highlighter-layer');
        if (textarea) {
            textarea.value = '';
            const charCount = document.getElementById('char-count');
            if (charCount) charCount.innerText = '0 Characters';
            this.checkPlaceholder();
        }
        if (highlighter) {
            highlighter.innerHTML = '';
        }
        this.lastResult = null;
        const reportBtn = document.getElementById('report-btn');
        if (reportBtn) reportBtn.classList.add('hidden');
    },

    checkPlaceholder() {
        const textarea = document.getElementById('input-text');
        if (!textarea) return;

        const text = textarea.value;
        const actions = document.getElementById('placeholder-actions');
        if (actions) {
            actions.classList.toggle('hidden', text.length > 0);
        }
    },

    async uploadFile(file) {
        const overlay = document.getElementById('loading-overlay');
        const textarea = document.getElementById('input-text');
        const visualTab = document.getElementById('tab-visual-pdf');
        
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.classList.add('flex');
        }
        this.currentPDFFile = file;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/v1/upload', {
                method: 'POST',
                body: formData
            }).then(r => r.json());

            if (res.text) {
                textarea.value = res.text;
                textarea.dispatchEvent(new Event('input'));
                
                // Load High-Fidelity Visualizer
                if (res.visual_data) {
                    this.visualData = res.visual_data;
                    await PDFVisualizer.init(file, res.visual_data);
                    if (visualTab) visualTab.classList.remove('hidden');
                }
                
                window.success("PDF Visual Audit Ready.");
            }
        } catch (err) {
            console.error(err);
            window.error("Error extracting PDF metadata.");
        } finally {
            if (overlay) {
                overlay.classList.add('hidden');
                overlay.classList.remove('flex');
            }
        }
    },

    syncScroll() {
        const textarea = document.getElementById('input-text');
        const highlighter = document.getElementById('highlighter-layer');
        if (!textarea || !highlighter) return;
        requestAnimationFrame(() => {
            highlighter.style.transform = `translateY(-${textarea.scrollTop}px)`;
        });
    },

    async runAnalysis() {
        const textarea = document.getElementById('input-text');
        if (!textarea) return;

        const text = textarea.value;
        if (!text || text.length < 20) {
            window.error("Forensic stability requires at least 20 characters.");
            return;
        }

        const btn = document.getElementById('analyze-btn');
        const cancelBtn = document.getElementById('cancel-btn');
        const overlay = document.getElementById('loading-overlay');

        btn.disabled = true;
        if (cancelBtn) cancelBtn.classList.remove('hidden');
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.classList.add('flex');
        }

        this.abortController = new AbortController();

        try {
            const res = await fetch('/api/v1/detect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
                signal: this.abortController.signal
            }).then(r => r.json());

            this.updateUI(res);
            this.applyForensicHighlighting(res.sentences);
            this.lastResult = res;
            const reportBtn = document.getElementById('report-btn');
            if (reportBtn) reportBtn.classList.remove('hidden');
            this.renderHistory();

        } catch (err) {
            if (err.name === 'AbortError') {
                console.log("Analysis cancelled.");
            } else {
                console.error(err);
                window.error("Neural Core Timeout.");
            }
        } finally {
            btn.disabled = false;
            if (cancelBtn) cancelBtn.classList.add('hidden');
            if (overlay) {
                overlay.classList.add('hidden');
                overlay.classList.remove('flex');
            }
            this.abortController = null;
        }
    },

    cancelAnalysis() {
        if (this.abortController) {
            this.abortController.abort();
        }
    },

    downloadReport() {
        if (!this.lastResult) { window.error("Run an analysis first."); return; }
        const r = this.lastResult;
        const bd = r.breakdown || {};
        const ref = Math.random().toString(36).substr(2, 8).toUpperCase();
        const ts  = new Date().toLocaleString();

        const bar = (pct, color) => `
            <div style="background:#f8fafc;border-radius:99px;overflow:hidden;height:10px;width:100%;margin-top:6px;">
                <div style="height:100%;width:${pct}%;background:${color};border-radius:99px;"></div>
            </div>`;

        const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<title>Neural Lab — Forensic Audit Certificate ${ref}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  @page { size: auto; margin: 0mm; }
  body { font-family: Arial, Helvetica, sans-serif; color:#0f172a; background:#fff; padding: 1.5in 1.5in; font-size:11px; position: relative; min-height: 100vh; }
  h1  { font-size:26px; font-weight:900; letter-spacing:-0.5px; text-transform:uppercase; margin-bottom: 4px; }
  h2  { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.2em; color:#94a3b8; margin-bottom:16px; }
  .divider { border:none; border-top:4px solid #0f172a; margin:32px 0; }
  .row  { display:flex; justify-content:space-between; align-items:flex-start; }
  .card { border:1px solid #f1f5f9; border-radius:12px; padding:24px 28px; }
  .big  { font-size:36px; font-weight:900; }
  .label{ font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.15em; color:#94a3b8; margin-top:4px; }
  .metric-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f8fafc; font-size:11px; }
  .ring-row { display:flex; gap:32px; margin-top:10px; }
  .ring-item { flex:1; text-align:center; }
  .ring-pct  { font-size:24px; font-weight:900; margin-bottom:4px; }
  .ring-lbl  { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#64748b; }
  .verdict   { font-size:18px; font-weight:900; text-transform:uppercase; letter-spacing:0.05em; }
  .disclaimer{ font-size:9px; color:#94a3b8; line-height:1.6; margin-top:48px; border-top:1px solid #f1f5f9; padding-top:24px; }
  .report-footer { position: absolute; bottom: 1in; left: 3in; font-size: 8px; color: #cbd5e1; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; }
  @media print { body { padding: 1.2in 1.2in; } .report-footer { bottom: 0.8in; } }
</style>
</head><body>

<!-- HEADER -->
<div class="row" style="align-items:flex-end; margin-bottom:8px;">
  <div>
    <h1>Forensic Audit Certificate</h1>
    <p style="font-size:9px;color:#94a3b8;margin-top:4px;letter-spacing:0.2em;">NEURAL LAB INDUSTRIAL CORE v3.0</p>
  </div>
  <div style="text-align:right;">
    <p style="font-size:9px;font-weight:700;">REF: ${ref}</p>
    <p style="font-size:9px;color:#94a3b8;">${ts}</p>
  </div>
</div>
<hr class="divider">

<!-- VERDICT + SIGNATURE -->
<div class="row" style="gap:24px; margin-bottom:24px;">
  <div class="card" style="flex:1;">
    <h2>Final Verdict</h2>
    <p class="verdict">${r.classification}</p>
    <div style="margin-top:16px;">
      <div class="row" style="margin-bottom:4px;"><span style="font-size:10px;color:#64748b;">Human</span><span style="font-weight:900;">${Math.round(r.human_probability)}%</span></div>
      ${bar(r.human_probability, '#10b981')}
      <div class="row" style="margin-bottom:4px;margin-top:10px;"><span style="font-size:10px;color:#64748b;">Neural (AI)</span><span style="font-weight:900;">${Math.round(r.ai_probability)}%</span></div>
      ${bar(r.ai_probability, '#ef4444')}
    </div>
  </div>

  <div class="card" style="flex:1;">
    <h2>Three-Way Breakdown</h2>
    <div class="ring-row">
      <div class="ring-item">
        <div class="ring-pct" style="color:#ef4444;">${Math.round(bd.ai_exact || 0)}%</div>
        <div class="ring-lbl">Exact AI<br>Match</div>
      </div>
      <div class="ring-item">
        <div class="ring-pct" style="color:#f59e0b;">${Math.round(bd.ai_minor || 0)}%</div>
        <div class="ring-lbl">Minor AI<br>Changes</div>
      </div>
      <div class="ring-item">
        <div class="ring-pct" style="color:#10b981;">${Math.round(bd.human || 0)}%</div>
        <div class="ring-lbl">Human<br>Written</div>
      </div>
    </div>
  </div>
</div>

<!-- METRICS -->
<div class="card" style="margin-bottom:24px;">
  <h2>Forensic Metrics</h2>
  <div class="row" style="gap:24px;">
    <div style="flex:1;">
      <div class="metric-row"><span>Word Count</span><span style="font-weight:700;">${r.metrics?.word_count ?? '--'}</span></div>
      <div class="metric-row"><span>Perplexity</span><span style="font-weight:700;">${(r.perplexity||0).toFixed(1)}</span></div>
      <div class="metric-row"><span>Burstiness</span><span style="font-weight:700;">${(r.burstiness||0).toFixed(2)}</span></div>
    </div>
    <div style="flex:1;">
      <div class="metric-row"><span>Entropy</span><span style="font-weight:700;">${r.metrics?.entropy ?? '--'}</span></div>
      <div class="metric-row"><span>Lexical Stability</span><span style="font-weight:700;">${r.metrics?.stability ?? '--'}%</span></div>
      <div class="metric-row"><span>Audit Confidence</span><span style="font-weight:700;">${r.performance?.confidence ?? '--'}%</span></div>
    </div>
  </div>
</div>

<!-- DISCLAIMER -->
<div class="disclaimer">
  <strong>Important Notice:</strong> This certificate is generated by the Neural Lab Forensic Engine (GPT-2 perplexity + entropy + burstiness analysis). It is intended as a self-audit tool to help researchers understand the linguistic profile of their work. This report does not constitute a formal academic ruling and should not be submitted as evidence of AI-use or human-authorship in any disciplinary proceeding. The engine operates with a calibrated confidence window; all results carry inherent uncertainty.
</div>

<div class="report-footer">
  REF: ${ref} | Verified Audit Log | Neural Lab Industrial Core
</div>

<script>window.onload = () => setTimeout(() => { window.print(); }, 400);<\/script>
</body></html>`;

        const win = window.open('', '_blank');
        if (!win) { window.error("Allow pop-ups to download the report."); return; }
        win.document.write(html);
        win.document.close();
    },

    applyForensicHighlighting(sentences) {
        const highlighter = document.getElementById('highlighter-layer');
        let html = "";
        sentences.forEach(s => {
            if (s.ai_probability > 60) {
                html += `<span class="highlight-ai-high" title="Neural Signal: ${s.ai_probability}%">${s.text}</span>`;
            } else if (s.ai_probability > 25) {
                html += `<span class="highlight-ai-med" title="Neural Signal: ${s.ai_probability}%">${s.text}</span>`;
            } else {
                // Human — plain text, no highlight
                html += s.text;
            }
        });
        highlighter.innerHTML = html;
    },

    updateUI(res) {
        document.getElementById('ai-prob').innerText = Math.round(res.ai_probability || 0) + '%';
        document.getElementById('human-prob').innerText = Math.round(res.human_probability || 0) + '%';
        document.getElementById('ai-bar').style.width = res.ai_probability + '%';
        document.getElementById('human-bar').style.width = res.human_probability + '%';
        
        this.updateRadarChart(res.radar);
        this.updateConsensus(res.breakdown);

        // Update Matrix
        const map = { 'f1-val': 'f1', 'precision-val': 'precision', 'recall-val': 'recall', 'conf-val': 'confidence' };
        Object.entries(map).forEach(([id, key]) => {
            const el = document.getElementById(id);
            if (el) {
                const val = (res.performance && res.performance[key] !== undefined) ? res.performance[key] : null;
                el.innerText = val !== null ? (typeof val === 'number' ? val.toFixed(2) : val) + '%' : '--';
            }
        });

        const classification = document.getElementById('classification');
        const summaryCard = document.getElementById('summary-card');
        const verdictDesc = document.getElementById('verdict-desc');
        
        classification.innerText = res.classification;
        
        // Dynamic Styling
        if (res.ai_probability > 68) {
            summaryCard.className = 'card rounded-none lg:rounded-2xl p-12 lg:p-5 bg-red-50/50 border border-red-100 flex-shrink-0 w-[240px] lg:w-full h-full lg:h-auto flex flex-col justify-center overflow-hidden';
            classification.className = 'text-[10px] lg:text-sm font-black text-red-700 uppercase italic';
        } else if (res.ai_probability > 35) {
            summaryCard.className = 'card rounded-none lg:rounded-2xl p-12 lg:p-5 bg-amber-50/50 border border-amber-100 flex-shrink-0 w-[240px] lg:w-full h-full lg:h-auto flex flex-col justify-center overflow-hidden';
            classification.className = 'text-[10px] lg:text-sm font-black text-amber-700 uppercase italic';
        } else {
            summaryCard.className = 'card rounded-none lg:rounded-2xl p-12 lg:p-5 bg-emerald-50/50 border border-emerald-100 flex-shrink-0 w-[240px] lg:w-full h-full lg:h-auto flex flex-col justify-center overflow-hidden';
            classification.className = 'text-[10px] lg:text-sm font-black text-emerald-700 uppercase italic';
        }
    },

    updateConsensus(breakdown) {
        if (!breakdown) return;
        const C = 188.5; // circumference for r=30
        const rings = [
            { ringId: 'ring-ai-exact', valId: 'ring-ai-exact-val', pct: breakdown.ai_exact ?? 0 },
            { ringId: 'ring-ai-minor', valId: 'ring-ai-minor-val', pct: breakdown.ai_minor ?? 0 },
            { ringId: 'ring-human',    valId: 'ring-human-val',    pct: breakdown.human    ?? 0 },
        ];
        rings.forEach(r => {
            const ring = document.getElementById(r.ringId);
            const val  = document.getElementById(r.valId);
            if (ring) ring.style.strokeDashoffset = (C * (1 - r.pct / 100)).toFixed(2);
            if (val)  val.textContent = Math.round(r.pct) + '%';
        });
    },

    updateRadarChart(data) {
        const poly = document.getElementById('radar-poly');
        if (!poly) return;

        const cx = 50, cy = 50, maxR = 36;
        // 5 metrics mapped to 5 axes at 72° intervals, starting from top (-90°)
        const metrics = [
            Math.min(100, Math.max(0, data.lexical_diversity   ?? 0)),
            Math.min(100, Math.max(0, data.neural_stability    ?? 0)),
            Math.min(100, Math.max(0, data.predictability      ?? 0)),
            Math.min(100, Math.max(0, data.rhythm_variance     ?? 0)),
            Math.min(100, Math.max(0, data.syntax_complexity   ?? 0)),
        ];

        const points = metrics.map((val, i) => {
            const angle = -Math.PI / 2 + (2 * Math.PI * i / 5);
            const r = (val / 100) * maxR;
            return {
                x: (cx + r * Math.cos(angle)).toFixed(2),
                y: (cy + r * Math.sin(angle)).toFixed(2)
            };
        });

        poly.setAttribute('points', points.map(p => `${p.x},${p.y}`).join(' '));
    },

    saveToHistory(text, res) {
        // Function deprecated: Saving is now server-side and automatic.
    },

    async renderHistory() {
        const list = document.getElementById('history-list');
        if (!list) return;

        try {
            const data = await fetch('/api/v1/history').then(r => r.json());
            this.history = data;

            list.innerHTML = this.history.length === 0 ? '<p class="text-[10px] text-slate-400 italic text-center py-10">Archive Empty.</p>' : this.history.map(item => `
                <div class="group flex items-center justify-between p-5 bg-white border border-slate-100 rounded-xl hover:border-slate-300 transition-all shadow-sm relative overflow-hidden">
                    <div class="flex-1 min-w-0 pr-4">
                        <div class="flex items-center space-x-2 mb-2">
                            <span class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">${item.date}</span>
                            <span class="text-[9px] font-black ${item.ai_probability > 50 ? 'text-red-500' : 'text-emerald-500'} uppercase tracking-tight px-1.5 py-0.5 bg-slate-50 rounded">${item.classification}</span>
                        </div>
                        <p class="text-[11px] text-slate-500 truncate font-medium mb-4 italic leading-relaxed">"${item.snippet}"</p>
                        <button onclick="ForensicEngine.loadFromHistory('${item.id}')" class="text-[9px] font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-0.5 hover:text-slate-400 hover:border-slate-400 transition-all">
                            Review Fragment
                        </button>
                    </div>
                    <div class="flex items-center space-x-6">
                        <div class="text-right">
                            <p class="text-xl font-black text-slate-900 tabular-nums">${Math.round(item.ai_probability)}%</p>
                            <p class="text-[8px] font-black text-slate-300 uppercase tracking-widest">Neural Score</p>
                        </div>
                        <button onclick="event.stopPropagation(); ForensicEngine.deleteAudit('${item.id}')" class="p-2.5 bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            list.innerHTML = '<p class="text-[10px] text-red-400 italic text-center py-10">Persistence severed.</p>';
        }
    },

    loadFromHistory(id) {
        const item = this.history.find(h => h.id === id);
        if (item) {
            document.getElementById('input-text').value = item.full_text;
            
            // Reconstruct the response object for UI update
            const res = {
                ai_probability: parseFloat(item.ai_probability),
                human_probability: 100 - parseFloat(item.ai_probability),
                perplexity: item.perplexity,
                burstiness: item.burstiness,
                classification: item.classification,
                performance: typeof item.metrics === 'string' ? JSON.parse(item.metrics) : item.metrics,
                radar: typeof item.radar === 'string' ? JSON.parse(item.radar) : item.radar,
                consensus: [], 
                sentences: [] 
            };
            
            this.updateUI(res);
            this.switchView('editor');
            
            // Trigger a fresh analysis if sentence highlights are missing
            // (Industrial Choice: Don't store 1000s of sentence results in DB, recalculate on load)
        }
    },

    async deleteAudit(id) {
        const confirmed = await ConfirmModal.ask(
            "Purge Fragment?",
            "This individual forensic audit will be permanently removed from the research database."
        );

        if (confirmed) {
            try {
                const res = await fetch(`/api/v1/history/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    this.renderHistory();
                    window.success("Fragment Purged.");
                } else {
                    throw new Error("Deletion failed.");
                }
            } catch (err) {
                window.error("Persistence error.");
            }
        }
    },

    switchView(view) {
        const editor = document.getElementById('view-editor');
        const history = document.getElementById('view-history');
        const visual = document.getElementById('view-visual-pdf');
        
        const tabEditor = document.getElementById('tab-editor');
        const tabVisual = document.getElementById('tab-visual-pdf');

        const navEditor = document.getElementById('nav-editor');
        const navHistory = document.getElementById('nav-history');

        // 1. Reset Content Views
        [editor, history, visual].forEach(v => v?.classList.add('hidden'));

        // 2. Nuclear Reset Footer Tabs (Baseline Inactive)
        if (tabEditor) tabEditor.className = "text-[10px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-transparent pb-1";
        if (tabVisual) {
            const isHidden = tabVisual.classList.contains('hidden');
            tabVisual.className = `text-[10px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-transparent pb-1 ${isHidden ? 'hidden' : ''}`;
        }

        // 3. Nuclear Reset Sidebar Navigation (Baseline Inactive)
        const sidebarBaseClass = "group w-full flex items-center p-2 text-slate-400 hover:text-slate-900 rounded-md text-[10px] font-bold uppercase tracking-widest text-left transition-colors";
        if (navEditor) navEditor.className = sidebarBaseClass;
        if (navHistory) navHistory.className = sidebarBaseClass;

        // 4. Apply Active States
        if (view === 'editor') {
            if (editor) editor.classList.remove('hidden');
            if (tabEditor) tabEditor.className = "text-[10px] font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-1";
            if (navEditor) navEditor.className = "group w-full flex items-center p-2 bg-slate-50 rounded-md text-slate-900 text-[10px] font-bold uppercase tracking-widest text-left";
        } else if (view === 'history') {
            if (history) history.classList.remove('hidden');
            if (navHistory) navHistory.className = "group w-full flex items-center p-2 bg-slate-50 rounded-md text-slate-900 text-[10px] font-bold uppercase tracking-widest text-left";
            this.renderHistory();
        } else if (view === 'visual-pdf') {
            if (visual) visual.classList.remove('hidden');
            if (tabVisual) tabVisual.className = "text-[10px] font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-1";
        }
    },

    async clearHistory() {
        const confirmed = await ConfirmModal.ask(
            "Purge Research Archive?",
            "All saved forensic audits in your laboratory profile will be permanently deleted. This cannot be undone."
        );

        if (confirmed) {
            try {
                await fetch('/api/v1/history/purge', { method: 'POST' });
                this.history = [];
                this.renderHistory();
                window.success("Archive Purged.");
            } catch (err) {
                window.error("Purge failed.");
            }
        }
    }
};

window.runAnalysis = () => ForensicEngine.runAnalysis();
window.cancelAnalysis = () => ForensicEngine.cancelAnalysis();
window.clearHistory = () => ForensicEngine.clearHistory();
window.ForensicEngine = ForensicEngine;

document.addEventListener('DOMContentLoaded', () => ForensicEngine.init());
