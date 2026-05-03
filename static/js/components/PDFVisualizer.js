/**
 * Neural Lab | High-Fidelity PDF Visualizer
 * Powered by PDF.js and Neural Core V3
 */

const PDFVisualizer = {
    pdf: null,
    visualData: null,
    container: document.getElementById('pdf-container'),

    async init(file, visualData) {
        this.visualData = visualData;
        this.container.innerHTML = ''; 
        
        const arrayBuffer = await file.arrayBuffer();
        const pdfData = new Uint8Array(arrayBuffer);
        
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        
        this.pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        
        for (let i = 1; i <= this.pdf.numPages; i++) {
            await this.renderPage(i);
        }
    },

    async renderPage(num) {
        const page = await this.pdf.getPage(num);
        const viewport = page.getViewport({ scale: 1.1 });
        
        const pageWrapper = document.createElement('div');
        pageWrapper.className = 'relative bg-white mb-8 select-layer-custom';
        pageWrapper.style.width = `${viewport.width}px`;
        pageWrapper.style.height = `${viewport.height}px`;

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.display = 'block';
        pageWrapper.appendChild(canvas);

        // FORENSIC HIGHLIGHT LAYER (Behind the text)
        const highlightLayer = document.createElement('div');
        highlightLayer.className = 'absolute top-0 left-0 w-full h-full pointer-events-none mix-blend-multiply opacity-80';
        pageWrapper.appendChild(highlightLayer);

        const textLayer = document.createElement('div');
        textLayer.className = 'textLayer absolute top-0 left-0 w-full h-full';
        pageWrapper.appendChild(textLayer);

        this.container.appendChild(pageWrapper);

        await page.render({ canvasContext: context, viewport: viewport }).promise;
        
        const textContent = await page.getTextContent();
        await pdfjsLib.renderTextLayer({
            textContent: textContent,
            container: textLayer,
            viewport: viewport,
            textDivs: []
        }).promise;

        const pageData = this.visualData.find(p => p.page === num);
        if (pageData) {
            this.applyHighlights(highlightLayer, pageData.elements, viewport);
        }
    },

    applyHighlights(layer, elements, viewport) {
        elements.forEach(el => {
            if (!el.text) return;
            
            const [x0, y0, x1, y1] = el.bbox;
            const rect = viewport.convertToViewportRectangle([x0, y0, x1, y1]);
            
            const left = Math.min(rect[0], rect[2]);
            const top = Math.min(rect[1], rect[3]);
            const width = Math.abs(rect[0] - rect[2]);
            const height = Math.abs(rect[1] - rect[3]);

            const highlight = document.createElement('div');
            highlight.className = 'absolute forensic-marker transition-all duration-500';
            
            // Tighten the highlight to the text height
            highlight.style.left = `${left}px`;
            highlight.style.top = `${top + 1}px`; 
            highlight.style.width = `${width}px`;
            highlight.style.height = `${height - 2}px`;
            
            const prob = el.ai_probability || 0;
            
            if (prob > 60) {
                highlight.style.background = '#fee2e2'; // Light Red
                highlight.style.borderBottom = '1.5px solid #ef4444';
            } else if (prob > 25) {
                highlight.style.background = '#fef3c7'; // Light Amber
                highlight.style.borderBottom = '1.5px solid #f59e0b';
            } else {
                highlight.style.background = '#dcfce7'; // Light Emerald
                highlight.style.borderBottom = '1.5px solid #10b981';
            }

            layer.appendChild(highlight);
        });
    },

    appendReportPage(data) {
        if (!data) return;
        const existing = document.getElementById('forensic-report-page');
        if (existing) existing.remove();

        const reportPage = document.createElement('div');
        reportPage.id = 'forensic-report-page';
        reportPage.className = 'relative bg-white mb-20 p-20 flex flex-col font-sans shadow-lg mx-auto';
        reportPage.style.width = '892px'; 
        reportPage.style.minHeight = '1260px';

        const isAI = data.ai_probability > 60;
        const color = isAI ? '#ef4444' : '#10b981';

        reportPage.innerHTML = `
            <div class="border-b-4 border-slate-900 pb-10 mb-12 flex justify-between items-end">
                <div>
                    <h1 class="text-4xl font-black text-slate-900 tracking-tighter uppercase">Forensic Audit Certificate</h1>
                    <p class="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-[0.4em]">Neural Lab Industrial Core v3.0</p>
                </div>
                <div class="text-right">
                    <p class="text-[11px] font-black text-slate-900 uppercase tracking-widest">Doc-Ref: ${Math.random().toString(36).substr(2, 8).toUpperCase()}</p>
                    <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">${new Date().toLocaleDateString()}</p>
                </div>
            </div>

            <div class="flex gap-16 mb-20">
                <div class="flex-1 p-12 border-4 border-slate-900 rounded-[40px] flex flex-col items-center justify-center text-center bg-white shadow-xl">
                    <p class="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Neural Consensus</p>
                    <div class="text-7xl font-black mb-4 tracking-tighter" style="color: ${color}">${Math.round(data.ai_probability)}%</div>
                    <p class="text-2xl font-black uppercase tracking-tight text-slate-900">${data.classification}</p>
                    <div class="mt-8 pt-8 border-t border-slate-100 w-full">
                         <p class="text-[11px] font-bold text-slate-500 leading-relaxed">Verification of machine-generated neural patterns found in the linguistic structure.</p>
                    </div>
                </div>

                <div class="flex-[1.4] space-y-10 py-4">
                    <h3 class="text-sm font-black text-slate-900 uppercase tracking-[0.3em] border-b-2 border-slate-100 pb-4">Linguistic DNA Analysis</h3>
                    
                    <div class="space-y-8">
                        <div>
                            <div class="flex justify-between text-[11px] font-black uppercase mb-2 text-slate-600">
                                <span>Perplexity (Complexity)</span>
                                <span class="text-slate-900">${data.perplexity.toFixed(1)}</span>
                            </div>
                            <div class="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                <div class="h-full bg-slate-900" style="width: ${Math.min(100, data.perplexity/2)}%"></div>
                            </div>
                        </div>

                        <div>
                            <div class="flex justify-between text-[11px] font-black uppercase mb-2 text-slate-600">
                                <span>Burstiness (Human Pulse)</span>
                                <span class="text-slate-900">${data.burstiness.toFixed(1)}</span>
                            </div>
                            <div class="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                <div class="h-full bg-slate-900" style="width: ${Math.min(100, data.burstiness*10)}%"></div>
                            </div>
                        </div>

                        <div>
                            <div class="flex justify-between text-[11px] font-black uppercase mb-2 text-slate-600">
                                <span>Lexical diversity</span>
                                <span class="text-slate-900">${(data.metrics.stability).toFixed(1)}%</span>
                            </div>
                            <div class="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                <div class="h-full bg-slate-900" style="width: ${data.metrics.stability}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-10 mb-20">
                <div class="p-10 bg-slate-50 rounded-[30px] border border-slate-100">
                    <h3 class="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em] mb-6">Forensic Markers</h3>
                    <div class="space-y-4">
                        ${data.consensus.map(c => `
                            <div class="flex justify-between items-center pb-2 border-b border-slate-100/50">
                                <span class="text-[12px] font-bold text-slate-600">${c.name}</span>
                                <span class="text-[10px] font-black uppercase px-2 py-1 rounded bg-white ${c.verdict.includes('AI') ? 'text-red-500 shadow-sm' : 'text-emerald-500 shadow-sm'}">${c.verdict}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="p-10 bg-slate-900 rounded-[30px] text-white">
                    <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Document Metadata</h3>
                    <div class="space-y-4">
                        <div class="flex justify-between text-[12px]">
                            <span class="font-medium opacity-60">Word Count</span>
                            <span class="font-black">${data.metrics.word_count}</span>
                        </div>
                        <div class="flex justify-between text-[12px]">
                            <span class="font-medium opacity-60">Info Entropy</span>
                            <span class="font-black">${data.metrics.entropy}</span>
                        </div>
                        <div class="flex justify-between text-[12px]">
                            <span class="font-medium opacity-60">Audit Confidence</span>
                            <span class="font-black text-emerald-400">${data.performance.confidence}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mt-auto pt-16 border-t border-slate-100 text-center">
                <div class="flex justify-center space-x-12 mb-8 opacity-20">
                     <div class="w-20 h-20 border border-slate-900 p-4 flex items-center justify-center grayscale">
                        <svg class="w-full h-full text-slate-900" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                    </div>
                </div>
                <p class="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">Forensic Lock Enabled | Neural Lab Industrial</p>
            </div>
        `;

        this.container.appendChild(reportPage);
        
        switchView('visual-pdf');
        setTimeout(() => {
            reportPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
};

window.PDFVisualizer = PDFVisualizer;
