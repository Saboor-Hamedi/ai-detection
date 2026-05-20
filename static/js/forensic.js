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
    const textarea = document.getElementById("input-text");
    if (!textarea) {
      console.log(
        "[SYSTEM] Forensic Engine entering Passive Mode: Editor not detected.",
      );
      return;
    }
    this.bindEvents();
    this.renderHistory();
    this.checkPlaceholder();
  },

  bindEvents() {
    const textarea = document.getElementById("input-text");
    const highlighter = document.getElementById("highlighter-layer");
    if (!textarea || !highlighter) return;

    textarea.addEventListener("input", (e) => {
      this.updateTelemetry(e.target.value);

      // Reset highlights on input change to maintain sync and clear stale styling
      highlighter.innerText = e.target.value;
      this.syncScroll();
      this.checkPlaceholder();
    });

    textarea.addEventListener("scroll", () => {
      this.syncScroll();
    });

    this.bindPdfAndDragEvents();
  },

  bindPdfAndDragEvents() {
    // File Input Handler
    const fileInput = document.getElementById("file-input");
    if (fileInput) {
      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          this.uploadFile(file);
          fileInput.value = ""; // Reset to allow re-upload of same file
        }
      });
    }

    // DRAG AND DROP PDF SUPPORT
    const wrapper = document.querySelector(".editor-wrapper");
    if (wrapper) {
      wrapper.addEventListener("dragover", (e) => {
        e.preventDefault();
        wrapper.style.borderColor = "#10b981";
        wrapper.style.background = "#f0fdf4";
      });

      wrapper.addEventListener("dragleave", () => {
        wrapper.style.borderColor = "transparent";
        wrapper.style.background = "#ffffff";
      });

      wrapper.addEventListener("drop", async (e) => {
        e.preventDefault();
        wrapper.style.borderColor = "transparent";
        wrapper.style.background = "#ffffff";

        const file = e.dataTransfer.files[0];
        if (file && file.type === "application/pdf") {
          this.uploadFile(file);
        } else {
          window.error("Only PDF files are supported for forensic ingestion.");
        }
      });
    }
  },

  clearEditor() {
    const textarea = document.getElementById("input-text");
    const highlighter = document.getElementById("highlighter-layer");
    if (textarea) {
      textarea.value = "";
      this.updateTelemetry("");
      this.checkPlaceholder();
    }
    if (highlighter) {
      highlighter.innerHTML = "";
    }
    this.lastResult = null;
    const reportBtn = document.getElementById("report-btn");
    if (reportBtn) reportBtn.classList.add("hidden");
  },

  updateTelemetry(text) {
    const charCount = document.getElementById("char-count");
    const wordCount = document.getElementById("word-count");
    if (charCount) charCount.innerText = `${text.length} Char`;
    if (wordCount) {
      const words = text
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0).length;
      wordCount.innerText = `${words} Word`;
    }
  },

  checkPlaceholder() {
    const textarea = document.getElementById("input-text");
    if (!textarea) return;

    const text = textarea.value;
    const actions = document.getElementById("placeholder-actions");
    if (actions) {
      actions.classList.toggle("hidden", text.length > 0);
    }
  },

  async pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      const textarea = document.getElementById("input-text");
      if (textarea && text) {
        textarea.value = text;
        textarea.dispatchEvent(new Event("input"));
        window.success("Clipboard Ingested.");
      } else if (!text) {
        window.error("Clipboard is empty.");
      }
    } catch (err) {
      window.error("Clipboard access denied. Use Ctrl+V.");
    }
  },

  async uploadFile(file) {
    const overlay = document.getElementById("loading-overlay");
    const textarea = document.getElementById("input-text");
    const visualTab = document.getElementById("tab-pdf");
    const clearBtn = document.getElementById("clear-btn");
    const cancelBtn = document.getElementById("cancel-btn");

    if (overlay) {
      overlay.classList.remove("hidden");
      overlay.classList.add("flex");
    }
    if (cancelBtn) cancelBtn.classList.remove("hidden");
    if (clearBtn) clearBtn.classList.add("hidden");

    this.abortController = new AbortController();
    this.currentPDFFile = file;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/v1/upload", {
        method: "POST",
        body: formData,
        signal: this.abortController.signal,
      }).then((r) => r.json());

      if (res.text) {
        textarea.value = res.text;
        textarea.dispatchEvent(new Event("input"));

        // Load High-Fidelity Visualizer
        if (res.visual_data) {
          this.visualData = res.visual_data;
          await PDFVisualizer.init(file, res.visual_data);
          // Hide empty state once PDF is rendered
          const emptyState = document.getElementById('pdf-empty-state');
          if (emptyState) emptyState.classList.add('hidden');
          if (visualTab) visualTab.classList.remove("hidden");
        }

        window.success("PDF Visual Audit Ready.");
      }
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("Extraction cancelled.");
      } else {
        console.error(err);
        window.error("Error extracting PDF metadata.");
      }
    } finally {
      if (overlay) {
        overlay.classList.add("hidden");
        overlay.classList.remove("flex");
      }
      if (cancelBtn) cancelBtn.classList.add("hidden");
      if (clearBtn) clearBtn.classList.remove("hidden");
      this.abortController = null;
    }
  },

  syncScroll() {
    const textarea = document.getElementById("input-text");
    const highlighter = document.getElementById("highlighter-layer");
    if (!textarea || !highlighter) return;
    requestAnimationFrame(() => {
      highlighter.scrollTop = textarea.scrollTop;
    });
  },

  async runAnalysis() {
    const textarea = document.getElementById("input-text");
    if (!textarea) return;

    const text = textarea.value;
    if (!text || text.length < 20) {
      window.error("Forensic stability requires at least 20 characters.");
      return;
    }

    const btn = document.getElementById("analyze-btn");
    const cancelBtn = document.getElementById("cancel-btn");
    const overlay = document.getElementById("loading-overlay");
    const clearBtn = document.getElementById("clear-btn");

    btn.disabled = true;
    if (cancelBtn) cancelBtn.classList.remove("hidden");
    if (clearBtn) clearBtn.classList.add("hidden");
    if (overlay) {
      overlay.classList.remove("hidden");
      overlay.classList.add("flex");
    }

    this.abortController = new AbortController();

    try {
      const res = await fetch("/api/v1/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: this.abortController.signal,
      }).then((r) => r.json());

      this.updateUI(res);
      this.applyForensicHighlighting(res.sentences);
      this.lastResult = res;
      const reportBtn = document.getElementById("report-btn");
      if (reportBtn) reportBtn.classList.remove("hidden");
      this.renderHistory();
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("Analysis cancelled.");
      } else {
        console.error(err);
        window.error("Neural Core Timeout.");
      }
    } finally {
      btn.disabled = false;
      if (cancelBtn) cancelBtn.classList.add("hidden");
      if (clearBtn) clearBtn.classList.remove("hidden");
      if (overlay) {
        overlay.classList.add("hidden");
        overlay.classList.remove("flex");
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
    if (!this.lastResult) {
      window.error("Run an analysis first.");
      return;
    }
    const r = this.lastResult;
    const bd = r.breakdown || {};
    const ref = Math.random().toString(36).substr(2, 8).toUpperCase();
    const ts = new Date().toLocaleString();

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
      ${bar(r.human_probability, "#10b981")}
      <div class="row" style="margin-bottom:4px;margin-top:10px;"><span style="font-size:10px;color:#64748b;">Neural (AI)</span><span style="font-weight:900;">${Math.round(r.ai_probability)}%</span></div>
      ${bar(r.ai_probability, "#ef4444")}
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
      <div class="metric-row"><span>Word Count</span><span style="font-weight:700;">${r.metrics?.word_count ?? "--"}</span></div>
      <div class="metric-row"><span>Perplexity</span><span style="font-weight:700;">${(r.perplexity || 0).toFixed(1)}</span></div>
      <div class="metric-row"><span>Burstiness</span><span style="font-weight:700;">${(r.burstiness || 0).toFixed(2)}</span></div>
    </div>
    <div style="flex:1;">
      <div class="metric-row"><span>Entropy</span><span style="font-weight:700;">${r.metrics?.entropy ?? "--"}</span></div>
      <div class="metric-row"><span>Lexical Stability</span><span style="font-weight:700;">${r.metrics?.stability ?? "--"}%</span></div>
      <div class="metric-row"><span>Audit Confidence</span><span style="font-weight:700;">${r.performance?.confidence ?? "--"}%</span></div>
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

    const win = window.open("", "_blank");
    if (!win) {
      window.error("Allow pop-ups to download the report.");
      return;
    }
    win.document.write(html);
    win.document.close();
  },

  applyForensicHighlighting(sentences) {
    const highlighter = document.getElementById("highlighter-layer");
    let html = "";
    sentences.forEach((s) => {
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
    document.getElementById("ai-prob").innerText =
      Math.round(res.ai_probability || 0) + "%";
    document.getElementById("human-prob").innerText =
      Math.round(res.human_probability || 0) + "%";
    document.getElementById("ai-bar").style.width = res.ai_probability + "%";
    document.getElementById("human-bar").style.width =
      res.human_probability + "%";

    this.updateRadarChart(res.radar);
    this.updateConsensus(res.breakdown);

    // Update Integrity Audit (Plagiarism)
    if (res.plagiarism) {
      const pIndex = document.getElementById("plag-index");
      const pTrace = document.getElementById("plag-trace");
      const pBar = document.getElementById("plag-bar");
      const pArchive = document.getElementById("integrity-archive-index");
      const topArchive = document.getElementById("top-archive-count");
      const histArchive = document.getElementById("history-archive-count");

      if (pIndex)
        pIndex.innerText = Math.round(res.plagiarism.index || 0) + "%";
      if (pTrace) pTrace.innerText = res.plagiarism.trace_count || 0;
      if (pArchive) pArchive.innerText = res.plagiarism.total_archives || 0;
      if (topArchive) topArchive.innerText = res.plagiarism.total_archives || 0;
      if (histArchive)
        histArchive.innerText = res.plagiarism.total_archives || 0;
      if (pBar) pBar.style.width = (res.plagiarism.index || 0) + "%";

      // Handle Forensic Source deep-linking
      const pSource = document.getElementById("plag-match-source");
      if (pSource) {
        if (res.plagiarism.sources && res.plagiarism.sources.length > 0) {
          pSource.classList.remove("hidden");
          // Render list of sources with titles and snippets
          pSource.innerHTML = `
                        <div class="mt-4 space-y-3">
                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Detected Forensic Traces:</p>
                            ${res.plagiarism.sources
                              .map(
                                (src) => `
                                <div onclick="SourceModal.open('${src.id}', '${src.title}')" class="p-3 bg-slate-50 border border-slate-100 rounded-lg hover:border-indigo-200 transition-all cursor-pointer group">
                                    <div class="flex items-center justify-between mb-1">
                                        <span class="text-[10px] font-black text-slate-900 truncate uppercase group-hover:text-indigo-600 transition-colors">${src.title}</span>
                                        <span class="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Compare</span>
                                    </div>
                                    <p class="text-[10px] text-slate-500 italic truncate">"${src.snippet}"</p>
                                </div>
                            `,
                              )
                              .join("")}
                        </div>
                    `;
        } else {
          pSource.classList.add("hidden");
        }
      }
    }

    // Update Matrix
    const map = {
      "f1-val": "f1",
      "precision-val": "precision",
      "recall-val": "recall",
      "conf-val": "confidence",
    };
    Object.entries(map).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) {
        const val =
          res.performance && res.performance[key] !== undefined
            ? res.performance[key]
            : null;
        el.innerText =
          val !== null
            ? (typeof val === "number" ? val.toFixed(2) : val) + "%"
            : "--";
      }
    });

    const classification = document.getElementById("classification");
    const summaryCard = document.getElementById("summary-card");
    const verdictDesc = document.getElementById("verdict-desc");

    classification.innerText = res.classification;

    // Dynamic Styling
    if (res.ai_probability > 68) {
      summaryCard.className =
        "card rounded-none lg:rounded-2xl p-12 lg:p-5 bg-red-50/50 border border-red-100 flex-shrink-0 w-[240px] lg:w-full h-full lg:h-auto flex flex-col justify-center overflow-hidden";
      classification.className =
        "text-[10px] lg:text-sm font-black text-red-700 uppercase italic";
    } else if (res.ai_probability > 35) {
      summaryCard.className =
        "card rounded-none lg:rounded-2xl p-12 lg:p-5 bg-amber-50/50 border border-amber-100 flex-shrink-0 w-[240px] lg:w-full h-full lg:h-auto flex flex-col justify-center overflow-hidden";
      classification.className =
        "text-[10px] lg:text-sm font-black text-amber-700 uppercase italic";
    } else {
      summaryCard.className =
        "card rounded-none lg:rounded-2xl p-12 lg:p-5 bg-emerald-50/50 border border-emerald-100 flex-shrink-0 w-[240px] lg:w-full h-full lg:h-auto flex flex-col justify-center overflow-hidden";
      classification.className =
        "text-[10px] lg:text-sm font-black text-emerald-700 uppercase italic";
    }

    // Dynamic update of new biometrics components
    const coherencyVal = res.coherency || (res.performance && res.performance.coherency) || [];
    const rhythmVal = res.rhythm_profile || (res.performance && res.performance.rhythm_profile) || [];
    const saturationVal = res.radar ? res.radar.lexical_diversity : null;

    this.updateCoherencyChart(coherencyVal);
    this.updateRhythmChart(rhythmVal);
    this.updateLexicalSaturation(saturationVal);
  },

  updateConsensus(breakdown) {
    if (!breakdown) return;
    const C = 188.5; // circumference for r=30
    const rings = [
      {
        ringId: "ring-ai-exact",
        valId: "ring-ai-exact-val",
        pct: breakdown.ai_exact ?? 0,
      },
      {
        ringId: "ring-ai-minor",
        valId: "ring-ai-minor-val",
        pct: breakdown.ai_minor ?? 0,
      },
      {
        ringId: "ring-human",
        valId: "ring-human-val",
        pct: breakdown.human ?? 0,
      },
    ];
    rings.forEach((r) => {
      const ring = document.getElementById(r.ringId);
      const val = document.getElementById(r.valId);
      if (ring)
        ring.style.strokeDashoffset = (C * (1 - r.pct / 100)).toFixed(2);
      if (val) val.textContent = Math.round(r.pct) + "%";
    });
  },

  updateRadarChart(data) {
    const poly = document.getElementById("radar-poly");
    if (!poly) return;

    const cx = 50,
      cy = 50,
      maxR = 36;
    // 5 metrics mapped to 5 axes at 72° intervals, starting from top (-90°)
    const metrics = [
      Math.min(100, Math.max(0, data.lexical_diversity ?? 0)),
      Math.min(100, Math.max(0, data.neural_stability ?? 0)),
      Math.min(100, Math.max(0, data.predictability ?? 0)),
      Math.min(100, Math.max(0, data.rhythm_variance ?? 0)),
      Math.min(100, Math.max(0, data.syntax_complexity ?? 0)),
    ];

    const points = metrics.map((val, i) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / 5;
      const r = (val / 100) * maxR;
      return {
        x: (cx + r * Math.cos(angle)).toFixed(2),
        y: (cy + r * Math.sin(angle)).toFixed(2),
      };
    });

    poly.setAttribute("points", points.map((p) => `${p.x},${p.y}`).join(" "));
  },

  saveToHistory(text, res) {
    // Function deprecated: Saving is now server-side and automatic.
  },

  async renderHistory() {
    const list = document.getElementById("history-list");
    if (!list) return;

    try {
      const data = await fetch("/api/v1/history").then((r) => r.json());
      this.history = data;

      list.innerHTML =
        this.history.length === 0
          ? '<p class="text-[10px] text-slate-400 italic text-center py-10">Archive Empty.</p>'
          : this.history
              .map(
                (item) => `
                <div class="group flex items-center justify-between p-5 bg-white border border-slate-100 rounded-xl hover:border-slate-300 transition-all shadow-sm relative overflow-hidden">
                    <div class="flex-1 min-w-0 pr-4">
                        <div class="flex items-center space-x-2 mb-2">
                            <span class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">${item.date}</span>
                            <span class="text-[9px] font-black ${item.ai_probability > 50 ? "text-red-500" : "text-emerald-500"} uppercase tracking-tight px-1.5 py-0.5 bg-slate-50 rounded">${item.classification}</span>
                        </div>
                        <p class="text-[11px] text-slate-500 truncate font-medium mb-4 italic leading-relaxed">"${item.snippet}"</p>
                        <button onclick="ForensicEngine.loadFromHistory('${item.id}')" class="text-[9px] font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-0.5 hover:text-slate-400 hover:border-slate-400 transition-all">
                            Review Fragment
                        </button>
                    </div>
                    <div class="flex items-center space-x-4 lg:space-x-8">
                        <div class="text-right">
                            <p class="text-lg lg:text-xl font-black text-slate-900 tabular-nums">${Math.round(item.ai_probability)}%</p>
                            <p class="text-[8px] font-black text-slate-300 uppercase tracking-widest">Neural</p>
                        </div>
                        <div class="text-right">
                            <p class="text-lg lg:text-xl font-black text-indigo-500 tabular-nums">${Math.round(item.plagiarism || 0)}%</p>
                            <p class="text-[8px] font-black text-slate-300 uppercase tracking-widest">Integrity</p>
                        </div>
                        <button onclick="event.stopPropagation(); ForensicEngine.deleteAudit('${item.id}')" class="p-2.5 bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            `,
              )
              .join("");
    } catch (err) {
      list.innerHTML =
        '<p class="text-[10px] text-red-400 italic text-center py-10">Persistence severed.</p>';
    }
  },

  loadFromHistory(id) {
    const item = this.history.find((h) => h.id === id);
    if (item) {
      document.getElementById("input-text").value = item.full_text;

      // Reconstruct the response object for UI update
      const metrics = typeof item.metrics === "string" ? JSON.parse(item.metrics) : item.metrics;
      const res = {
        ai_probability: parseFloat(item.ai_probability),
        human_probability: 100 - parseFloat(item.ai_probability),
        perplexity: item.perplexity,
        burstiness: item.burstiness,
        classification: item.classification,
        performance: metrics,
        radar:
          typeof item.radar === "string" ? JSON.parse(item.radar) : item.radar,
        consensus: [],
        sentences: metrics && metrics.sentences ? metrics.sentences : [],
        coherency: metrics && metrics.coherency ? metrics.coherency : [],
        rhythm_profile: metrics && metrics.rhythm_profile ? metrics.rhythm_profile : [],
      };

      this.updateUI(res);
      this.applyForensicHighlighting(res.sentences);
      if (window.switchView) window.switchView("editor");
    }
  },

  async deleteAudit(id) {
    const confirmed = await ConfirmModal.ask(
      "Purge Fragment?",
      "This individual forensic audit will be permanently removed from the research database.",
    );

    if (confirmed) {
      try {
        const res = await fetch(`/api/v1/history/${id}`, { method: "DELETE" });
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



  async clearHistory() {
    const confirmed = await ConfirmModal.ask(
      "Purge Research Archive?",
      "All saved forensic audits in your laboratory profile will be permanently deleted. This cannot be undone.",
    );

    if (confirmed) {
      try {
        await fetch("/api/v1/history/purge", { method: "POST" });
        this.history = [];
        this.renderHistory();
        window.success("Archive Purged.");
      } catch (err) {
        window.error("Purge failed.");
      }
    }
  },

  updateCoherencyChart(coherency) {
    const chart = document.getElementById("coherency-chart");
    const empty = document.getElementById("coherency-empty");
    const valText = document.getElementById("coherency-score-val");
    const statusText = document.getElementById("coherency-status");
    const nodes = document.getElementById("coherency-nodes");
    if (!chart) return;

    if (!coherency || coherency.length === 0) {
      if (empty) empty.classList.remove("hidden");
      if (valText) valText.innerText = "--%";
      if (statusText) statusText.innerText = "--";
      if (nodes) nodes.innerHTML = "";
      return;
    }

    if (empty) empty.classList.add("hidden");

    // Compute average coherency
    const avg = coherency.reduce((a, b) => a + b, 0) / coherency.length;
    if (valText) valText.innerText = Math.round(avg) + "%";

    let verdict = "Erratic";
    let verdictColor = "text-red-500";
    if (avg > 75) {
      verdict = "Flowing";
      verdictColor = "text-emerald-500";
    } else if (avg > 50) {
      verdict = "Standard";
      verdictColor = "text-amber-500";
    }
    if (statusText) {
      statusText.innerText = verdict;
      statusText.className = `text-[8px] lg:text-[10px] font-bold ${verdictColor} uppercase tracking-wider`;
    }

    // Generate Path points for 200 x 60 viewport
    const width = 200;
    const height = 60;
    const paddingX = 10;
    const paddingY = 10;
    const plotWidth = width - paddingX * 2;
    const plotHeight = height - paddingY * 2;

    const pointsCount = coherency.length;
    const stepX = pointsCount > 1 ? plotWidth / (pointsCount - 1) : plotWidth;

    let pathD = "";
    let areaD = "";
    let nodesHTML = "";

    coherency.forEach((val, i) => {
      const x = paddingX + i * stepX;
      const y = paddingY + plotHeight * (1 - val / 100);
      
      if (i === 0) {
        pathD = `M ${x} ${y}`;
        areaD = `M ${x} ${height} L ${x} ${y}`;
      } else {
        pathD += ` L ${x} ${y}`;
        areaD += ` L ${x} ${y}`;
      }

      if (i === pointsCount - 1) {
        areaD += ` L ${x} ${height} Z`;
      }

      nodesHTML += `<circle cx="${x}" cy="${y}" r="2" fill="#6366f1" class="hover:r-3 transition-all cursor-help"><title>Sentence ${i+1}: ${val}% Coherence</title></circle>`;
    });

    const areaPath = document.getElementById("coherency-path-area");
    const linePath = document.getElementById("coherency-path-line");
    if (areaPath) areaPath.setAttribute("d", areaD);
    if (linePath) linePath.setAttribute("d", pathD);
    if (nodes) nodes.innerHTML = nodesHTML;
  },

  updateRhythmChart(rhythmProfile) {
    const barsContainer = document.getElementById("rhythm-bars");
    const empty = document.getElementById("rhythm-empty");
    const valText = document.getElementById("rhythm-variance-val");
    const countText = document.getElementById("rhythm-count-val");
    if (!barsContainer) return;

    if (!rhythmProfile || rhythmProfile.length === 0) {
      if (empty) empty.classList.remove("hidden");
      if (valText) valText.innerText = "--";
      if (countText) countText.innerText = "--";
      barsContainer.innerHTML = "";
      return;
    }

    if (empty) empty.classList.add("hidden");

    // Compute variance (standard deviation)
    const count = rhythmProfile.length;
    const mean = rhythmProfile.reduce((a, b) => a + b, 0) / count;
    const variance = rhythmProfile.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / count;
    const stdDev = Math.sqrt(variance);

    if (valText) valText.innerText = stdDev.toFixed(2);
    if (countText) countText.innerText = count + " Sentences";

    // Generate vertical bars inside 200 x 60 viewport
    const width = 200;
    const height = 60;
    const paddingX = 5;
    const maxVal = Math.max(...rhythmProfile, 1);
    
    const plotHeight = height - 10;
    const barSpacing = 2;
    const totalSpacing = barSpacing * (count - 1);
    const plotWidth = width - paddingX * 2;
    const barWidth = Math.max(1, (plotWidth - totalSpacing) / count);

    let barsHTML = "";
    rhythmProfile.forEach((val, i) => {
      const x = paddingX + i * (barWidth + barSpacing);
      const h = (val / maxVal) * plotHeight;
      const y = height - h;
      
      barsHTML += `<rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="1" fill="#4f46e5" opacity="0.8" class="hover:opacity-100 transition-all cursor-help"><title>Sentence ${i+1}: ${val} words</title></rect>`;
    });

    barsContainer.innerHTML = barsHTML;
  },

  updateLexicalSaturation(uniqueRatio) {
    const empty = document.getElementById("saturation-empty");
    const content = document.getElementById("saturation-content");
    const valText = document.getElementById("saturation-ratio-val");
    const verdictText = document.getElementById("saturation-verdict");
    const uniqueBar = document.getElementById("saturation-unique-bar");
    const repeatBar = document.getElementById("saturation-repeat-bar");
    const uniquePct = document.getElementById("saturation-unique-pct");
    const repeatPct = document.getElementById("saturation-repeat-pct");

    if (uniqueRatio === null || uniqueRatio === undefined) {
      if (empty) { empty.classList.remove("hidden"); empty.style.display = ""; }
      if (content) content.classList.add("hidden");
      if (valText) valText.innerText = "--%";
      if (verdictText) verdictText.innerText = "--";
      return;
    }

    // Show content, hide empty state
    if (empty) empty.style.display = "none";
    if (content) content.classList.remove("hidden");

    const uniquePct_val = Math.round(uniqueRatio);
    const repeatPct_val = 100 - uniquePct_val;

    if (valText) valText.innerText = uniquePct_val + "%";

    // Animate bars
    if (uniqueBar) uniqueBar.style.width = uniquePct_val + "%";
    if (repeatBar) repeatBar.style.width = repeatPct_val + "%";

    // Show percentage labels only if bar is wide enough
    if (uniquePct) {
      uniquePct.innerText = uniquePct_val + "%";
      uniquePct.classList.toggle("hidden", uniquePct_val < 15);
    }
    if (repeatPct) {
      repeatPct.innerText = repeatPct_val + "%";
      repeatPct.classList.toggle("hidden", repeatPct_val < 15);
    }

    let verdict = "Repetitive";
    let verdictColor = "text-red-500";
    let uniqueColor = "bg-red-400";
    if (uniqueRatio > 65) {
      verdict = "Diverse";
      verdictColor = "text-emerald-500";
      uniqueColor = "bg-emerald-400";
    } else if (uniqueRatio > 45) {
      verdict = "Normal";
      verdictColor = "text-amber-500";
      uniqueColor = "bg-amber-400";
    }

    // Update bar color dynamically
    if (uniqueBar) uniqueBar.className = `h-full ${uniqueColor} rounded-l-full transition-all duration-1000 flex items-center justify-center`;

    if (verdictText) {
      verdictText.innerText = verdict;
      verdictText.className = `text-[8px] lg:text-[10px] font-bold ${verdictColor} uppercase tracking-wider`;
    }
    if (valText) {
      valText.className = `text-[10px] lg:text-sm font-black ${verdictColor}`;
    }
  },
};

window.runAnalysis = () => ForensicEngine.runAnalysis();
window.cancelAnalysis = () => ForensicEngine.cancelAnalysis();
window.clearHistory = () => ForensicEngine.clearHistory();
window.ForensicEngine = ForensicEngine;

document.addEventListener("DOMContentLoaded", () => ForensicEngine.init());
