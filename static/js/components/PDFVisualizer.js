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

        // Forensic highlighting removed as per user request to keep original PDF clean
        // while maintaining text selection layer.
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

        reportPage.innerHTML = `
            <div class="border-b-8 border-slate-900 pb-12 mb-16 flex justify-between items-end">
                <div class="space-y-2">
                    <h1 class="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">Forensic Audit<br>Certificate</h1>
                    <p class="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em]">Neural Lab Industrial Core v3.5</p>
                </div>
                <div class="text-right">
                    <div class="mb-4">
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Reference</p>
                        <p class="text-lg font-black text-slate-900 uppercase tracking-tighter">#${Math.random().toString(36).substr(2, 8).toUpperCase()}</p>
                    </div>
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Issued Date</p>
                        <p class="text-sm font-bold text-slate-600 uppercase">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                </div>
            </div>

            <div class="flex gap-20 mb-20">
                <div class="flex-1 p-14 border-4 border-slate-900 rounded-[48px] flex flex-col items-center justify-center text-center bg-white shadow-2xl relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-full h-2 bg-slate-900 opacity-10"></div>
                    <p class="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Neural Signature Index</p>
                    <div class="text-8xl font-black mb-6 tracking-tighter text-slate-900">${Math.round(data.ai_probability)}%</div>
                    <p class="text-3xl font-black uppercase tracking-tight text-slate-900 mb-2">${data.classification}</p>
                    <div class="mt-10 pt-10 border-t border-slate-100 w-full">
                         <p class="text-[12px] font-bold text-slate-400 leading-relaxed max-w-[200px] mx-auto">Forensic validation of machine-generated neural patterns.</p>
                    </div>
                </div>

                <div class="flex-[1.4] space-y-12 py-6">
                    <h3 class="text-md font-black text-slate-900 uppercase tracking-[0.4em] border-b-2 border-slate-900 pb-4 inline-block">Linguistic DNA</h3>
                    
                    <div class="space-y-10">
                        <div>
                            <div class="flex justify-between text-[12px] font-black uppercase mb-3 text-slate-600">
                                <span>Perplexity (Complexity)</span>
                                <span class="text-slate-900">${data.perplexity.toFixed(1)}</span>
                            </div>
                            <div class="h-4 bg-slate-50 rounded-full overflow-hidden border border-slate-200">
                                <div class="h-full bg-slate-900" style="width: ${Math.min(100, data.perplexity/2)}%"></div>
                            </div>
                        </div>

                        <div>
                            <div class="flex justify-between text-[12px] font-black uppercase mb-3 text-slate-600">
                                <span>Burstiness (Rhythm)</span>
                                <span class="text-slate-900">${data.burstiness.toFixed(1)}</span>
                            </div>
                            <div class="h-4 bg-slate-50 rounded-full overflow-hidden border border-slate-200">
                                <div class="h-full bg-slate-900" style="width: ${Math.min(100, data.burstiness*10)}%"></div>
                            </div>
                        </div>

                        <div>
                            <div class="flex justify-between text-[12px] font-black uppercase mb-3 text-slate-600">
                                <span>Lexical diversity</span>
                                <span class="text-slate-900">${(data.metrics.stability).toFixed(1)}%</span>
                            </div>
                            <div class="h-4 bg-slate-50 rounded-full overflow-hidden border border-slate-200">
                                <div class="h-full bg-slate-900" style="width: ${data.metrics.stability}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-12 mb-20">
                <div class="p-12 bg-slate-50 rounded-[40px] border border-slate-100 shadow-sm">
                    <h3 class="text-[12px] font-black text-slate-900 uppercase tracking-[0.3em] mb-8">Forensic Indicators</h3>
                    <div class="space-y-5">
                        ${data.consensus.map(c => `
                            <div class="flex justify-between items-center pb-3 border-b border-slate-200/50">
                                <span class="text-[13px] font-bold text-slate-600">${c.name}</span>
                                <span class="text-[11px] font-black uppercase px-3 py-1.5 rounded bg-white text-slate-900 shadow-sm border border-slate-100">${c.verdict}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="p-12 bg-slate-900 rounded-[40px] text-white shadow-xl relative overflow-hidden">
                    <div class="absolute top-0 right-0 p-4 opacity-10">
                        <svg class="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                    </div>
                    <h3 class="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Audit Metadata</h3>
                    <div class="space-y-5">
                        <div class="flex justify-between text-[13px]">
                            <span class="font-medium opacity-60">Verified Instructor</span>
                            <span class="font-black text-white">Prof. S. Neural</span>
                        </div>
                        <div class="flex justify-between text-[13px]">
                            <span class="font-medium opacity-60">Word Count</span>
                            <span class="font-black text-white">${data.metrics.word_count}</span>
                        </div>
                        <div class="flex justify-between text-[13px]">
                            <span class="font-medium opacity-60">Info Entropy</span>
                            <span class="font-black text-white">${data.metrics.entropy}</span>
                        </div>
                        <div class="flex justify-between text-[13px]">
                            <span class="font-medium opacity-60">Confidence Level</span>
                            <span class="font-black text-emerald-400">${data.performance.confidence}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mt-auto pt-16 border-t border-slate-200">
                <div class="flex justify-between items-center">
                    <div class="flex items-center space-x-6">
                        <div class="w-16 h-16 border-2 border-slate-900 p-3 flex items-center justify-center grayscale opacity-40">
                            <svg class="w-full h-full text-slate-900" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                        </div>
                        <p class="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] max-w-[200px]">Forensic Lock Sequence Active | Lab Protocol 3.5</p>
                    </div>
                    <div class="text-right">
                        <p class="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Authenticity Stamp</p>
                        <div class="h-6 w-32 bg-slate-900 opacity-5 ml-auto"></div>
                    </div>
                </div>
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
