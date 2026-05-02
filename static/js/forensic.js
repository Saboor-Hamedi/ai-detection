/**
 * Neural Lab | Forensic Engine Frontend
 */

const ForensicEngine = {
    history: JSON.parse(localStorage.getItem('forensic_history') || '[]'),

    init() {
        this.bindEvents();
        this.renderHistory();
    },

    bindEvents() {
        const textarea = document.getElementById('input-text');
        const highlighter = document.getElementById('highlighter-layer');

        textarea.addEventListener('input', (e) => {
            document.getElementById('char-count').innerText = `${e.target.value.length} Characters`;
            // For real-time typing, we just sync the text
            if (!highlighter.innerHTML.includes('<span')) {
                highlighter.innerText = e.target.value;
            }
            this.syncScroll();
        });

        textarea.addEventListener('scroll', () => {
            this.syncScroll();
        });
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
        const text = document.getElementById('input-text').value;
        if (!text || text.length < 20) {
            alert("Forensic stability requires at least 20 characters.");
            return;
        }

        const btn = document.getElementById('analyze-btn');
        const btnText = document.getElementById('btn-text');
        const loader = document.getElementById('loader');

        btn.disabled = true;
        loader.classList.remove('hidden');

        try {
            const res = await fetch('/detect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            }).then(r => r.json());

            this.updateUI(res);
            this.applyForensicHighlighting(res.sentences);
            this.saveToHistory(text, res);

        } catch (err) {
            console.error(err);
            alert("Forensic Engine offline.");
        } finally {
            btn.disabled = false;
            loader.classList.add('hidden');
        }
    },

    applyForensicHighlighting(sentences) {
        const highlighter = document.getElementById('highlighter-layer');
        let html = "";

        sentences.forEach(s => {
            let cls = "highlight-human";
            // Tightened thresholds for industrial forensic accuracy
            if (s.ai_probability > 70) cls = "highlight-ai-high";
            else if (s.ai_probability > 25) cls = "highlight-ai-med";
            
            // Fixed: Space is now OUTSIDE the span so the color only hugs the text
            html += `<span class="${cls}" title="AI Probability: ${s.ai_probability}%">${s.text}</span> `;
        });

        highlighter.innerHTML = html;
    },

    updateUI(res) {
        // Probabilities
        document.getElementById('ai-prob').innerText = res.ai_probability + '%';
        document.getElementById('human-prob').innerText = res.human_probability + '%';
        document.getElementById('ai-bar').style.width = res.ai_probability + '%';
        document.getElementById('human-bar').style.width = res.human_probability + '%';
        
        // Radar Chart Update
        this.updateRadarChart(res.radar);

        // Consensus Update
        this.updateConsensus(res.consensus);

        // Performance Statistics (Restored)
        const f1 = document.getElementById('f1-val');
        const f1Bar = document.getElementById('f1-bar');
        const prec = document.getElementById('precision-val');
        const rec = document.getElementById('recall-val');

        if (f1) f1.innerText = res.performance.f1 + '%';
        if (f1Bar) f1Bar.style.width = res.performance.f1 + '%';
        if (prec) prec.innerText = res.performance.precision + '%';
        if (rec) rec.innerText = res.performance.recall + '%';

        // Metrics (Defensive check)
        const ppl = document.getElementById('ppl-val');
        const read = document.getElementById('reading-ease');
        const stab = document.getElementById('stability');
        const wc = document.getElementById('word-count');

        if (ppl) ppl.innerText = res.perplexity;
        if (read) read.innerText = res.metrics.reading_ease;
        if (stab) stab.innerText = res.metrics.stability + '%';
        if (wc) wc.innerText = res.metrics.word_count;

        const classification = document.getElementById('classification');
        const summaryCard = document.getElementById('summary-card');
        const verdictDesc = document.getElementById('verdict-desc');
        
        classification.innerText = res.classification;
        
        if (res.ai_probability > 80) {
            summaryCard.className = 'card rounded-2xl p-5 bg-red-50/50 border border-red-100 transition-colors duration-500 flex-shrink-0 w-[180px] lg:w-full flex flex-col justify-center';
            classification.className = 'text-xs font-black text-red-700 uppercase italic';
            verdictDesc.innerText = "Forensic evidence suggests high neural predictability.";
        } else if (res.ai_probability > 45) {
            summaryCard.className = 'card rounded-2xl p-5 bg-amber-50/50 border border-amber-100 transition-colors duration-500 flex-shrink-0 w-[180px] lg:w-full flex flex-col justify-center';
            classification.className = 'text-xs font-black text-amber-700 uppercase italic';
            verdictDesc.innerText = "Mixed linguistic signals detected.";
        } else {
            summaryCard.className = 'card rounded-2xl p-5 bg-emerald-50/50 border border-emerald-100 transition-colors duration-500 flex-shrink-0 w-[180px] lg:w-full flex flex-col justify-center';
            classification.className = 'text-xs font-black text-emerald-700 uppercase italic';
            verdictDesc.innerText = "Organic complexity confirmed.";
        }
    },

    updateConsensus(engines) {
        const engineA = engines[0];
        const engineB = engines[1];
        
        const elA = document.getElementById('engine-a-verdict');
        const elB = document.getElementById('engine-b-verdict');
        const statusBox = document.getElementById('consensus-status');
        
        if (elA) {
            elA.innerText = engineA.verdict;
            elA.className = `px-2 py-0.5 rounded text-[8px] font-bold uppercase ${engineA.verdict === 'AI' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`;
        }
        
        if (elB) {
            elB.innerText = engineB.verdict;
            elB.className = `px-2 py-0.5 rounded text-[8px] font-bold uppercase ${engineB.verdict === 'AI' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`;
        }
        
        if (statusBox) {
            if (engineA.verdict === engineB.verdict) {
                statusBox.innerHTML = `<p class="text-[9px] font-black uppercase tracking-widest text-emerald-600">Agreed: ${engineA.verdict}</p>`;
                statusBox.className = 'mt-3 p-2 bg-emerald-50 rounded-lg text-center border border-emerald-100';
            } else {
                statusBox.innerHTML = `<p class="text-[9px] font-black uppercase tracking-widest text-amber-600">Contested Results</p>`;
                statusBox.className = 'mt-3 p-2 bg-amber-50 rounded-lg text-center border border-amber-100';
            }
        }
    },

    updateRadarChart(data) {
        const poly = document.getElementById('radar-poly');
        if (!poly) return;

        const center = 50;
        const scale = 0.4;

        const points = [
            { x: 50, y: 50 - (data.lexical_diversity * scale) },
            { x: 50 + (data.neural_stability * scale), y: 50 },
            { x: 50 + (data.predictability * scale * 0.7), y: 50 + (data.predictability * scale * 0.7) },
            { x: 50 - (data.syntax_complexity * scale * 0.7), y: 50 + (data.syntax_complexity * scale * 0.7) },
            { x: 50 - (data.burstiness * scale), y: 50 }
        ];

        const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');
        poly.setAttribute('points', pointsStr);
    },

    saveToHistory(text, res) {
        const newItem = {
            id: Date.now(),
            timestamp: new Date().toLocaleTimeString(),
            date: new Date().toLocaleDateString(),
            snippet: text.substring(0, 100) + '...',
            ai_probability: res.ai_probability,
            classification: res.classification,
            full_text: text,
            full_res: res
        };
        this.history.unshift(newItem);
        this.history = this.history.slice(0, 50);
        localStorage.setItem('forensic_history', JSON.stringify(this.history));
    },

    renderHistory() {
        const list = document.getElementById('history-list');
        if (!list) return;
        if (this.history.length === 0) {
            list.innerHTML = '<p class="text-[10px] text-slate-400 italic text-center py-10">No records found.</p>';
            return;
        }
        list.innerHTML = this.history.map(item => `
            <div onclick="ForensicEngine.loadFromHistory(${item.id})" class="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-slate-300 transition-all cursor-pointer shadow-sm">
                <div class="flex-1 min-w-0 pr-4">
                    <div class="flex items-center space-x-2 mb-1">
                        <span class="text-[9px] font-black text-slate-400 uppercase">${item.date} ${item.timestamp}</span>
                        <span class="text-[9px] font-bold ${item.ai_probability > 50 ? 'text-red-500' : 'text-emerald-500'} uppercase">${item.classification}</span>
                    </div>
                    <p class="text-[11px] text-slate-600 truncate font-medium">${item.snippet}</p>
                </div>
                <div class="text-right">
                    <p class="text-lg font-black text-slate-800 tabular-nums">${item.ai_probability}%</p>
                </div>
            </div>
        `).join('');
    },

    loadFromHistory(id) {
        const item = this.history.find(h => h.id === id);
        if (item) {
            document.getElementById('input-text').value = item.full_text;
            this.updateUI(item.full_res);
            this.applyForensicHighlighting(item.full_res.sentences);
            this.switchView('editor');
        }
    },

    switchView(view) {
        const editor = document.getElementById('view-editor');
        const history = document.getElementById('view-history');
        const navEditor = document.getElementById('nav-editor');
        const navHistory = document.getElementById('nav-history');

        if (view === 'editor') {
            if (editor) editor.classList.remove('hidden');
            if (history) history.classList.add('hidden');
            if (navEditor) navEditor.className = "group w-full flex items-center p-2 bg-slate-50 rounded-md text-slate-900 text-[10px] font-bold uppercase tracking-widest text-left";
            if (navHistory) navHistory.className = "group w-full flex items-center p-2 text-slate-400 hover:text-slate-900 rounded-md text-[10px] font-bold uppercase tracking-widest text-left";
        } else {
            if (editor) editor.classList.add('hidden');
            if (history) history.classList.remove('hidden');
            if (navHistory) navHistory.className = "group w-full flex items-center p-2 bg-slate-50 rounded-md text-slate-900 text-[10px] font-bold uppercase tracking-widest text-left";
            if (navEditor) navEditor.className = "group w-full flex items-center p-2 text-slate-400 hover:text-slate-900 rounded-md text-[10px] font-bold uppercase tracking-widest text-left";
            this.renderHistory();
        }
    },

    clearHistory() {
        if (confirm("Purge records?")) {
            localStorage.removeItem('forensic_history');
            this.history = [];
            this.renderHistory();
        }
    }
};

// Global handlers
window.runAnalysis = () => ForensicEngine.runAnalysis();
window.switchView = (v) => ForensicEngine.switchView(v);
window.clearHistory = () => ForensicEngine.clearHistory();
window.ForensicEngine = ForensicEngine;

document.addEventListener('DOMContentLoaded', () => ForensicEngine.init());
