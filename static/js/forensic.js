/**
 * Neural Lab | Triple-Engine Forensic Dashboard
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
            // Recalibrated for higher sensitivity
            if (s.ai_probability > 60) cls = "highlight-ai-high";
            else if (s.ai_probability > 25) cls = "highlight-ai-med";
            html += `<span class="${cls}" title="Neural Signal: ${s.ai_probability}%">${s.text}</span> `;
        });
        highlighter.innerHTML = html;
    },

    updateUI(res) {
        // Probabilities
        document.getElementById('ai-prob').innerText = res.ai_probability + '%';
        document.getElementById('human-prob').innerText = res.human_probability + '%';
        document.getElementById('ai-bar').style.width = res.ai_probability + '%';
        document.getElementById('human-bar').style.width = res.human_probability + '%';
        
        this.updateRadarChart(res.radar);
        this.updateConsensus(res.consensus);

        // Verification Matrix
        const f1 = document.getElementById('f1-val');
        const prec = document.getElementById('precision-val');
        const rec = document.getElementById('recall-val');
        const conf = document.getElementById('conf-val');

        if (f1) f1.innerText = res.performance.f1 + '%';
        if (prec) prec.innerText = res.performance.precision + '%';
        if (rec) rec.innerText = res.performance.recall + '%';
        if (conf) conf.innerText = res.performance.confidence + '%';

        const classification = document.getElementById('classification');
        const summaryCard = document.getElementById('summary-card');
        const verdictDesc = document.getElementById('verdict-desc');
        
        classification.innerText = res.classification;
        
        if (res.ai_probability > 75) {
            summaryCard.className = 'card rounded-2xl p-5 bg-red-50/50 border border-red-100 flex-shrink-0 w-[240px] lg:w-full flex flex-col justify-center';
            classification.className = 'text-xs font-black text-red-700 uppercase italic';
            verdictDesc.innerText = "Neural signature confirmed by Triple-Engine audit.";
        } else if (res.ai_probability > 35) {
            summaryCard.className = 'card rounded-2xl p-5 bg-amber-50/50 border border-amber-100 flex-shrink-0 w-[240px] lg:w-full flex flex-col justify-center';
            classification.className = 'text-xs font-black text-amber-700 uppercase italic';
            verdictDesc.innerText = "Mixed linguistic fragments detected. Audit contested.";
        } else {
            summaryCard.className = 'card rounded-2xl p-5 bg-emerald-50/50 border border-emerald-100 flex-shrink-0 w-[240px] lg:w-full flex flex-col justify-center';
            classification.className = 'text-xs font-black text-emerald-700 uppercase italic';
            verdictDesc.innerText = "Organic complexity verified across all models.";
        }
    },

    updateConsensus(engines) {
        const container = document.getElementById('consensus-status');
        const ids = ['engine-a-verdict', 'engine-b-verdict', 'engine-c-verdict'];
        
        engines.forEach((eng, i) => {
            const el = document.getElementById(ids[i]);
            if (el) {
                el.innerText = eng.verdict;
                el.className = `px-2 py-0.5 rounded text-[8px] font-black uppercase ${eng.verdict === 'AI' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`;
            }
        });

        const allAi = engines.every(e => e.verdict === 'AI');
        const allHuman = engines.every(e => e.verdict === 'Human');

        if (allAi || allHuman) {
            container.innerHTML = `<p class="text-[8px] font-black uppercase tracking-widest text-emerald-600">Absolute Consensus</p>`;
            container.className = 'mt-2 p-2 bg-emerald-50 rounded-lg text-center border border-emerald-100';
        } else {
            container.innerHTML = `<p class="text-[8px] font-black uppercase tracking-widest text-amber-600">Model Contention</p>`;
            container.className = 'mt-2 p-2 bg-amber-50 rounded-lg text-center border border-amber-100';
        }
    },

    updateRadarChart(data) {
        const poly = document.getElementById('radar-poly');
        if (!poly) return;
        const scale = 0.4;
        const points = [
            { x: 50, y: 50 - (data.lexical_diversity * scale) },
            { x: 50 + (data.neural_stability * scale), y: 50 },
            { x: 50 + (data.predictability * scale * 0.7), y: 50 + (data.predictability * scale * 0.7) },
            { x: 50 - (data.rhythm_variance * scale * 0.7), y: 50 + (data.rhythm_variance * scale * 0.7) },
            { x: 50 - (data.syntax_complexity * scale), y: 50 }
        ];
        poly.setAttribute('points', points.map(p => `${p.x},${p.y}`).join(' '));
    },

    saveToHistory(text, res) {
        const newItem = { id: Date.now(), timestamp: new Date().toLocaleTimeString(), date: new Date().toLocaleDateString(), snippet: text.substring(0, 100) + '...', ai_probability: res.ai_probability, classification: res.classification, full_text: text, full_res: res };
        this.history.unshift(newItem);
        localStorage.setItem('forensic_history', JSON.stringify(this.history.slice(0, 50)));
    },

    renderHistory() {
        const list = document.getElementById('history-list');
        if (!list) return;
        list.innerHTML = this.history.length === 0 ? '<p class="text-[10px] text-slate-400 italic text-center py-10">Archive Empty.</p>' : this.history.map(item => `
            <div onclick="ForensicEngine.loadFromHistory(${item.id})" class="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-slate-300 transition-all cursor-pointer shadow-sm">
                <div class="flex-1 min-w-0 pr-4">
                    <div class="flex items-center space-x-2 mb-1">
                        <span class="text-[9px] font-black text-slate-400 uppercase">${item.date}</span>
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
        if (view === 'editor') {
            editor.classList.remove('hidden');
            history.classList.add('hidden');
        } else {
            editor.classList.add('hidden');
            history.classList.remove('hidden');
            this.renderHistory();
        }
    },

    clearHistory() {
        if (confirm("Purge Archive?")) {
            localStorage.removeItem('forensic_history');
            this.history = [];
            this.renderHistory();
        }
    }
};

window.runAnalysis = () => ForensicEngine.runAnalysis();
window.switchView = (v) => ForensicEngine.switchView(v);
window.clearHistory = () => ForensicEngine.clearHistory();
window.ForensicEngine = ForensicEngine;

document.addEventListener('DOMContentLoaded', () => ForensicEngine.init());
