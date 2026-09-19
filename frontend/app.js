const API_BASE = '/api';

// State Variables
let activeModel = '';
let activeEngSessionId = null;
let activeSupportSessionId = null;
let activeProposalId = null;
let generating = false;

// Presets Definition
const maintPresets = [
    {
        label: "Transformer X Overheating",
        equipment: "Transformer X",
        text: "Oil temperature sensor is reading 95°C, humming noise has increased, radiator is hot to touch, cooling fan appears stationary."
    },
    {
        label: "MCC Panel Ground Fault",
        equipment: "MCC Panel A",
        text: "Main circuit breaker tripped. Visual sign of blackening on copper terminals. Insulation resistance measured at 0.5 Megaohms."
    },
    {
        label: "GIS SF6 Gas Leak",
        equipment: "GIS Switchgear B",
        text: "Low SF6 gas pressure warning triggered on DevOps (SF6 pressure drops below 0.42 MPa). Ambient temperature is 35°C."
    }
];

const propPresets = [
    {
        label: "33kV Substation Extension",
        customer: "State Grid India",
        project: "33kV Substation Extension",
        capacity: "25MVA",
        location: "Bihar, India"
    },
    {
        label: "11kV Industrial Power Room",
        customer: "Tata Steel Corp",
        project: "11kV Distribution Switchroom",
        capacity: "15MVA",
        location: "Jamshedpur, India"
    }
];

// Document Upload state
let selectedUploadFile = null;

/* =================================================================
   INITIALIZATION & TAB SWITCHING
   ================================================================= */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    lucide.createIcons();

    // Tab Switching
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.getAttribute('data-tab');
            
            // Toggle active sidebar items
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Toggle active content tabs
            document.querySelectorAll('.tab-section').forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById(`tab-${targetTab}`).classList.add('active');

            // Update Header title
            document.getElementById('active-tab-title').innerText = item.querySelector('.nav-title').innerText;
            
            // Lazy load the factory chart if selected to prevent 0x0 size bug
            if (targetTab === 'telemetry') {
                initFactoryTelemetry();
            }
        });
    });

    // Hydrate Presets
    hydratePresets();

    // Check Backend Server Status
    checkServerStatus();
    setInterval(checkServerStatus, 5000);

    // Hydrate Sub-tabs
    setupSubtabs();

    // Hydrate use case events
    setupEngineeringHandlers();
    setupSupportHandlers();
    setupMaintenanceHandlers();
    setupSearchHandlers();
    setupProposalHandlers();
    setupDocumentHandlers();
});

function setupSubtabs() {
    // Maintenance sub-tabs
    const maintTabBtns = document.querySelectorAll('.maint-tab-btn');
    maintTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            maintTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const target = btn.getAttribute('data-maint-tab');
            document.querySelectorAll('.maint-sub-section').forEach(s => s.classList.remove('active'));
            document.getElementById(`maint-tab-${target}`).classList.add('active');
        });
    });

    // Proposal sub-tabs
    const propTabBtns = document.querySelectorAll('.prop-tab-btn');
    propTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            propTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const target = btn.getAttribute('data-prop-tab');
            document.querySelectorAll('.prop-sub-section').forEach(s => s.classList.remove('active'));
            document.getElementById(`prop-tab-${target}`).classList.add('active');
        });
    });
}

function hydratePresets() {
    // Maintenance Presets
    const maintList = document.getElementById('maint-presets');
    maintList.innerHTML = '';
    maintPresets.forEach(p => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'preset-card';
        btn.innerHTML = `<span>${p.label}</span><i data-lucide="sparkles"></i>`;
        btn.addEventListener('click', () => {
            document.getElementById('maint-equipment').value = p.equipment;
            document.getElementById('maint-telemetry').value = p.text;
            document.getElementById('maint-output-panel').innerHTML = `
                <div class="glass-panel p-6 h-full flex-center text-center text-muted" id="maint-output-idle">
                    <div class="space-y-2">
                        <i data-lucide="alert-triangle" class="icon-lg text-muted"></i>
                        <h4>Preset Applied</h4>
                        <p class="text-xs">Form loaded with symptoms. Click "Initiate Diagnosis" to analyze.</p>
                    </div>
                </div>
            `;
            lucide.createIcons();
        });
        maintList.appendChild(btn);
    });

    // Proposal Presets
    const propList = document.getElementById('prop-presets');
    propList.innerHTML = '';
    propPresets.forEach(p => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'preset-card';
        btn.innerHTML = `<span>${p.label}</span><i data-lucide="sparkles"></i>`;
        btn.addEventListener('click', () => {
            document.getElementById('prop-customer').value = p.customer;
            document.getElementById('prop-proj-name').value = p.project;
            document.getElementById('prop-capacity').value = p.capacity;
            document.getElementById('prop-location').value = p.location;
            
            document.getElementById('proposal-draftboard-panel').innerHTML = `
                <div class="glass-panel p-12 rounded-2xl h-full flex-center text-center text-muted" id="prop-draft-idle">
                    <div class="space-y-2">
                        <i data-lucide="sparkles" class="icon-lg text-muted"></i>
                        <h4>Preset Loaded</h4>
                        <p class="text-xs">Parameters applied. Click "Draft Tender Proposal" to begin generation.</p>
                    </div>
                </div>
            `;
            lucide.createIcons();
        });
        propList.appendChild(btn);
    });
}

/* =================================================================
   STATUS API CHECK
   ================================================================= */
async function checkServerStatus() {
    try {
        const r = await fetch(`${API_BASE}/status`);
        const data = await r.json();
        
        // Update connection display
        const dot = document.getElementById('status-dot');
        const text = document.getElementById('status-text');
        
        if (data.ollama_connected) {
            dot.className = 'status-dot online';
            text.innerText = 'Ollama Online';
        } else {
            dot.className = 'status-dot offline';
            text.innerText = 'Ollama Offline';
        }

        // Hydrate Models Dropdown if empty or defaults need loading
        const select = document.getElementById('model-select');
        if (data.ollama_models.length > 0 && select.options[0].text.startsWith('Loading')) {
            select.innerHTML = '';
            data.ollama_models.forEach(model => {
                const opt = document.createElement('option');
                opt.value = model;
                opt.text = `Ollama: ${model}`;
                if (model.startsWith('qwen') || model.startsWith('llama')) {
                    opt.selected = true;
                    activeModel = model;
                }
                select.appendChild(opt);
            });
            select.addEventListener('change', (e) => {
                activeModel = e.target.value;
            });
        }

        // Update DB Statistics panels
        document.getElementById('stat-docs').innerText = data.database_stats.documents;
        document.getElementById('stat-chats').innerText = data.database_stats.chat_sessions;
        document.getElementById('stat-proposals').innerText = data.database_stats.proposals;

    } catch (err) {
        document.getElementById('status-dot').className = 'status-dot offline';
        document.getElementById('status-text').innerText = 'Server Offline';
    }
}

/* =================================================================
   USE CASE 1: ENGINEERING KNOWLEDGE ASSISTANT
   ================================================================= */
function setupEngineeringHandlers() {
    fetchEngineeringSessions();

    document.getElementById('btn-new-eng-chat').addEventListener('click', createNewEngSession);
    document.getElementById('eng-chat-form').addEventListener('submit', handleEngChatSubmit);
}

async function fetchEngineeringSessions() {
    try {
        const r = await fetch(`${API_BASE}/chat/sessions?feature_type=engineering`);
        if (r.ok) {
            const data = await r.json();
            const list = document.getElementById('eng-sessions-list');
            list.innerHTML = '';
            
            data.forEach(s => {
                const item = document.createElement('div');
                item.className = `session-tab ${s.id === activeEngSessionId ? 'active' : ''}`;
                item.innerHTML = `
                    <div style="display:flex; align-items:center; gap:8px;">
                        <i data-lucide="message-square"></i>
                        <span>${s.title}</span>
                    </div>
                    <button class="session-delete-btn" data-id="${s.id}">
                        <i data-lucide="trash-2" style="width:12px;height:12px;"></i>
                    </button>
                `;
                
                item.querySelector('.session-delete-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteSession(s.id, 'engineering');
                });

                item.addEventListener('click', () => {
                    activeEngSessionId = s.id;
                    fetchEngineeringMessages(s.id);
                    document.querySelectorAll('#eng-sessions-list .session-tab').forEach(el => el.classList.remove('active'));
                    item.classList.add('active');
                });

                list.appendChild(item);
            });
            lucide.createIcons();
            
            if (data.length > 0) {
                const exists = data.some(s => s.id === activeEngSessionId);
                if (!activeEngSessionId || !exists) {
                    activeEngSessionId = data[0].id;
                    fetchEngineeringSessions();
                    return;
                }
                fetchEngineeringMessages(activeEngSessionId);
            } else if (data.length === 0) {
                activeEngSessionId = null;
                showEngChatPlaceholder();
            }
        }
    } catch (e) {
        console.error(e);
    }
}

async function createNewEngSession() {
    const title = `Eng Chat - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    try {
        const r = await fetch(`${API_BASE}/chat/session?title=${encodeURIComponent(title)}&feature_type=engineering`, {
            method: 'POST'
        });
        if (r.ok) {
            const newSession = await r.json();
            activeEngSessionId = newSession.id;
            await fetchEngineeringSessions();
        }
    } catch (e) {
        console.error(e);
    }
}

async function deleteSession(id, featureType) {
    if (!confirm("Delete this conversation?")) return;
    try {
        const r = await fetch(`${API_BASE}/chat/session/${id}`, { method: 'DELETE' });
        if (r.ok) {
            if (featureType === 'engineering') {
                if (activeEngSessionId === id) activeEngSessionId = null;
                fetchEngineeringSessions();
            } else if (featureType === 'customer_support') {
                if (activeSupportSessionId === id) activeSupportSessionId = null;
                initSupportSession();
            }
        }
    } catch (e) {
        console.error(e);
    }
}

async function fetchEngineeringMessages(sid) {
    // Enable inputs
    document.getElementById('eng-chat-input').disabled = false;
    document.getElementById('btn-send-eng').disabled = false;
    
    try {
        const r = await fetch(`${API_BASE}/chat/session/${sid}`);
        if (r.ok) {
            const data = await r.json();
            const log = document.getElementById('eng-chat-log');
            log.innerHTML = '';
            
            data.messages.forEach(m => {
                appendChatMessage(log, m.sender, m.text, m.citations);
            });
            log.scrollTop = log.scrollHeight;
        }
    } catch (e) {
        console.error(e);
    }
}

function showEngChatPlaceholder() {
    const log = document.getElementById('eng-chat-log');
    log.innerHTML = `
        <div class="text-center space-y-4" style="margin: auto; max-width: 400px; padding: 24px 0;">
            <i data-lucide="bot" style="width:40px;height:40px;margin:0 auto;color:var(--color-blue);"></i>
            <h4 class="font-bold">Ask anything about specs or manuals</h4>
            <p class="text-xs text-muted leading-relaxed">
                Query insulation classes, recommended torques, wiring guidelines or relays. The assistant reads indexed PDF documentation and generates responses with page citations.
            </p>
            <div class="presets-list pt-2">
                <button type="button" class="cite-btn" style="padding: 10px;" onclick="applyEngInput('What is the insulation class for Transformer X?')">
                    "What is the insulation class for Transformer X?"
                </button>
                <button type="button" class="cite-btn" style="padding: 10px;" onclick="applyEngInput('What is the recommended torque for terminal bolts in MCC Panel A?')">
                    "What is the recommended torque for MCC Panel A?"
                </button>
            </div>
        </div>
    `;
    lucide.createIcons();
    document.getElementById('eng-chat-input').disabled = true;
    document.getElementById('btn-send-eng').disabled = true;
}

window.applyEngInput = function(text) {
    if (!activeEngSessionId) {
        createNewEngSession().then(() => {
            document.getElementById('eng-chat-input').value = text;
        });
    } else {
        document.getElementById('eng-chat-input').value = text;
        document.getElementById('eng-chat-input').focus();
    }
};

async function handleEngChatSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('eng-chat-input');
    const msg = input.value.trim();
    if (!msg || !activeEngSessionId) return;
    
    input.value = '';
    const log = document.getElementById('eng-chat-log');
    
    // Add user bubble
    appendChatMessage(log, 'user', msg);
    log.scrollTop = log.scrollHeight;
    
    // Setup Streaming Assistant bubble
    const aiBubbleWrapper = document.createElement('div');
    aiBubbleWrapper.className = 'chat-bubble-wrapper assistant';
    aiBubbleWrapper.innerHTML = `
        <div class="bubble-avatar"><i data-lucide="bot"></i></div>
        <div class="bubble-content">
            <p class="text-msg" style="white-space: pre-wrap;"></p>
            <div class="citation-block hidden">
                <span class="citation-title"><i data-lucide="book-open"></i> Sources Cited</span>
                <div class="citation-chips"></div>
            </div>
        </div>
    `;
    log.appendChild(aiBubbleWrapper);
    lucide.createIcons();
    log.scrollTop = log.scrollHeight;
    
    const textNode = aiBubbleWrapper.querySelector('.text-msg');
    const citationBlock = aiBubbleWrapper.querySelector('.citation-block');
    const citationChips = aiBubbleWrapper.querySelector('.citation-chips');
    
    // Set loading indicator
    textNode.innerHTML = `<span class="chat-thinking"><i data-lucide="loader-2" class="animate-spin"></i> Searching knowledge base and thinking...</span>`;
    lucide.createIcons();
    
    // SSE Stream request
    const formData = new FormData();
    formData.append('session_id', activeEngSessionId);
    formData.append('message', msg);
    if (activeModel) formData.append('model', activeModel);

    let isFirstTextChunk = true;

    try {
        const response = await fetch(`${API_BASE}/chat/message`, {
            method: 'POST',
            body: formData
        });
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let accumulatedText = '';
        
        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            if (value) {
                const chunkStr = decoder.decode(value, { stream: !done });
                const lines = chunkStr.split('\n');
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (line.startsWith('[CITATIONS]')) {
                        const citeJSON = line.replace('[CITATIONS]', '').trim();
                        try {
                            const cites = JSON.parse(citeJSON);
                            if (cites.length > 0) {
                                citationBlock.classList.remove('hidden');
                                citationChips.innerHTML = '';
                                
                                // Only display the main manual (first citation has highest score)
                                const mainManual = cites[0].filename;
                                const mainCites = cites.filter(c => c.filename === mainManual);
                                const pages = [...new Set(mainCites.map(c => c.page))].sort((a, b) => a - b);
                                
                                const chip = document.createElement('button');
                                chip.type = 'button';
                                chip.className = 'cite-btn';
                                chip.innerHTML = `<i data-lucide="file-text"></i> ${mainManual} (Pg ${pages.join(', ')})`;
                                chip.addEventListener('click', () => openCitationModal(mainCites[0]));
                                citationChips.appendChild(chip);
                                
                                lucide.createIcons();
                            }
                        } catch (err) {
                            console.error(err);
                        }
                    } else {
                        const textSegment = line + (i < lines.length - 1 ? '\n' : '');
                        if (textSegment) {
                            if (isFirstTextChunk && textSegment.trim()) {
                                textNode.innerHTML = '';
                                isFirstTextChunk = false;
                            }
                            accumulatedText += textSegment;
                        }
                    }
                }
                if (accumulatedText) {
                    textNode.innerHTML = window.marked ? marked.parse(accumulatedText) : accumulatedText;
                }
                log.scrollTop = log.scrollHeight;
            }
        }
    } catch (err) {
        if (isFirstTextChunk) {
            textNode.innerHTML = '';
        }
        textNode.innerText += `\n\n[Error calling Ollama API stream. Ensure backend is running.]`;
    }
}

function appendChatMessage(container, sender, text, citations = []) {
    const wrap = document.createElement('div');
    wrap.className = `chat-bubble-wrapper ${sender}`;
    wrap.innerHTML = `
        <div class="bubble-avatar"><i data-lucide="${sender === 'user' ? 'user' : 'bot'}"></i></div>
        <div class="bubble-content">
            <div class="markdown-body">${window.marked ? marked.parse(text) : text}</div>
            <div class="citation-block ${citations && citations.length > 0 ? '' : 'hidden'}">
                <span class="citation-title"><i data-lucide="book-open"></i> Sources Cited</span>
                <div class="citation-chips">
                    <!-- Populated -->
                </div>
            </div>
        </div>
    `;
    
    if (citations && citations.length > 0) {
        const chips = wrap.querySelector('.citation-chips');
        
        // Only display the main manual (first citation has highest score)
        const mainManual = citations[0].filename;
        const mainCites = citations.filter(c => c.filename === mainManual);
        const pages = [...new Set(mainCites.map(c => c.page))].sort((a, b) => a - b);
        
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'cite-btn';
        chip.innerHTML = `<i data-lucide="file-text"></i> ${mainManual} (Pg ${pages.join(', ')})`;
        chip.addEventListener('click', () => openCitationModal(mainCites[0]));
        chips.appendChild(chip);
    }

    container.appendChild(wrap);
    lucide.createIcons();
}

function openCitationModal(cite) {
    document.getElementById('modal-cite-file').innerHTML = `Document: <strong>${cite.filename}</strong>`;
    document.getElementById('modal-cite-page').innerHTML = `Page: <strong>${cite.page}</strong>`;
    document.getElementById('modal-cite-text').innerText = cite.text || "Consult physical manual or database logs for complete drawings and specs regarding this item.";
    
    document.getElementById('citation-modal').classList.remove('hidden');
    document.getElementById('btn-modal-close').onclick = () => {
        document.getElementById('citation-modal').classList.add('hidden');
    };
}

/* =================================================================
   USE CASE 2: PREDICTIVE MAINTENANCE ASSISTANT
   ================================================================= */
function setupMaintenanceHandlers() {
    document.getElementById('maint-diag-form').addEventListener('submit', handleMaintDiagnosis);
    document.getElementById('maint-log-form').addEventListener('submit', handleMaintLogSubmit);
    
    // Fetch logs initially
    fetchMaintenanceLogs();
}

async function handleMaintDiagnosis(e) {
    e.preventDefault();
    const eq = document.getElementById('maint-equipment').value;
    const telemetry = document.getElementById('maint-telemetry').value.trim();
    if (!telemetry) return;

    // Show loaders
    document.getElementById('maint-output-idle').classList.add('hidden');
    document.getElementById('maint-output-results').classList.add('hidden');
    
    const outputPanel = document.getElementById('maint-output-panel');
    const loadingCard = document.createElement('div');
    loadingCard.className = 'glass-panel p-6 h-full flex-center text-center text-muted';
    loadingCard.id = 'maint-diag-loading';
    loadingCard.innerHTML = `
        <div class="space-y-3">
            <div class="animate-spin rounded-full h-8 w-8 border-4 border-accentBlue border-t-transparent" style="margin:0 auto;"></div>
            <h4>Running Diagnostics...</h4>
            <p class="text-xs">Searching SQLite logs and mapping vector manuals in Qdrant...</p>
        </div>
    `;
    outputPanel.appendChild(loadingCard);

    const formData = new FormData();
    formData.append('equipment_name', eq);
    formData.append('telemetry', telemetry);
    if (activeModel) formData.append('model', activeModel);

    try {
        const response = await fetch(`${API_BASE}/maintenance/analyze`, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            
            // Remove loader
            document.getElementById('maint-diag-loading').remove();
            
            // Populate results
            document.getElementById('maint-report-asset').innerText = `Asset: ${data.equipment}`;
            document.getElementById('maint-report-body').innerText = data.analysis;
            
            // Check confidence from analysis text
            const lowAnalysis = data.analysis.toLowerCase();
            const confidenceBar = document.getElementById('maint-confidence-bar');
            const confidenceText = document.getElementById('maint-confidence-text');
            
            if (lowAnalysis.includes('low')) {
                confidenceBar.className = 'confidence-bar red';
                confidenceBar.style.width = '35%';
                confidenceText.innerText = 'LOW';
                confidenceText.className = 'confidence-text font-bold text-rose';
            } else if (lowAnalysis.includes('medium')) {
                confidenceBar.className = 'confidence-bar amber';
                confidenceBar.style.width = '65%';
                confidenceText.innerText = 'MEDIUM';
                confidenceText.className = 'confidence-text font-bold text-amber';
            } else {
                confidenceBar.className = 'confidence-bar green';
                confidenceBar.style.width = '100%';
                confidenceText.innerText = 'HIGH';
                confidenceText.className = 'confidence-text font-bold text-green';
            }

            // Update Live Real-Time IoT Telemetry UI dynamically
            document.getElementById('devops-equipment-name').innerText = `Live Real-Time IoT Telemetry: ${data.equipment}`;
            if (data.equipment.includes("Transformer")) {
                document.getElementById('devops-sensor-name').innerText = "SENSOR: TEMP_OIL_TOP_C";
                document.getElementById('devops-param-freq-lbl').innerText = "TEMP (MAX)";
                document.getElementById('devops-param-freq-val').innerHTML = `95.4 <span class="text-xxs">°C</span>`;
                document.getElementById('devops-param-amp-lbl').innerText = "HUM LEVEL";
                document.getElementById('devops-param-amp-val').innerHTML = `55.2 <span class="text-xxs">dB</span>`;
                document.getElementById('devops-threshold-line-lbl').textContent = "WARNING LIMIT (85 °C)";
                document.getElementById('devops-threshold-line').setAttribute("y1", "70");
                document.getElementById('devops-threshold-line').setAttribute("y2", "70");
            } else if (data.equipment.includes("MCC")) {
                document.getElementById('devops-sensor-name').innerText = "SENSOR: INSUL_RES_MEGOHMS";
                document.getElementById('devops-param-freq-lbl').innerText = "RESISTANCE";
                document.getElementById('devops-param-freq-val').innerHTML = `0.5 <span class="text-xxs">MΩ</span>`;
                document.getElementById('devops-param-amp-lbl').innerText = "LEAK CURRENT";
                document.getElementById('devops-param-amp-val').innerHTML = `12.4 <span class="text-xxs">mA</span>`;
                document.getElementById('devops-threshold-line-lbl').textContent = "MIN LIMIT (1.0 MΩ)";
                document.getElementById('devops-threshold-line').setAttribute("y1", "130");
                document.getElementById('devops-threshold-line').setAttribute("y2", "130");
            } else {
                document.getElementById('devops-sensor-name').innerText = "SENSOR: SF6_PRESSURE_MPA";
                document.getElementById('devops-param-freq-lbl').innerText = "PRESSURE";
                document.getElementById('devops-param-freq-val').innerHTML = `0.38 <span class="text-xxs">MPa</span>`;
                document.getElementById('devops-param-amp-lbl').innerText = "TEMPERATURE";
                document.getElementById('devops-param-amp-val').innerHTML = `35.0 <span class="text-xxs">°C</span>`;
                document.getElementById('devops-threshold-line-lbl').textContent = "CRITICAL LOW (0.42 MPa)";
                document.getElementById('devops-threshold-line').setAttribute("y1", "150");
                document.getElementById('devops-threshold-line').setAttribute("y2", "150");
            }

            // References
            const refDiv = document.getElementById('maint-report-references');
            refDiv.innerHTML = '';
            if (data.citations && data.citations.length > 0) {
                refDiv.innerHTML = `<h5 class="text-xxs font-bold text-accentBlue uppercase tracking-wider mb-2">OEM Specifications Referenced</h5>`;
                const list = document.createElement('div');
                list.className = 'grid grid-2 gap-2';
                
                // Only display the main manual (first citation has highest score)
                const mainManual = data.citations[0].filename;
                const mainCites = data.citations.filter(c => c.filename === mainManual);
                const pages = [...new Set(mainCites.map(c => c.page))].sort((a, b) => a - b);
                const highestScore = Math.max(...mainCites.map(c => c.score));
                
                const block = document.createElement('div');
                block.className = 'stat-card text-left';
                block.style.fontSize = '10px';
                block.style.cursor = 'pointer';
                block.innerHTML = `
                    <div style="font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Manual: ${mainManual}</div>
                    <div style="color:var(--text-muted);margin-top:2px;">Relevance Score Match: ${highestScore.toFixed(2)} | Page ${pages.join(', ')}</div>
                `;
                block.addEventListener('click', () => openCitationModal(mainCites[0]));
                list.appendChild(block);
                refDiv.appendChild(list);
            }
            
            document.getElementById('maint-output-results').classList.remove('hidden');

        } else {
            alert("Failed to analyze diagnostics.");
            document.getElementById('maint-diag-loading').remove();
            document.getElementById('maint-output-idle').classList.remove('hidden');
        }
    } catch (err) {
        alert("Error executing diagnostic search.");
        if (document.getElementById('maint-diag-loading')) document.getElementById('maint-diag-loading').remove();
        document.getElementById('maint-output-idle').classList.remove('hidden');
    }
}

async function fetchMaintenanceLogs() {
    try {
        const response = await fetch(`${API_BASE}/maintenance/history`);
        if (response.ok) {
            const data = await response.json();
            const list = document.getElementById('maint-records-list');
            list.innerHTML = '';
            
            if (data.length === 0) {
                list.innerHTML = `<p class="text-center text-xs text-muted py-8">No maintenance records logged.</p>`;
                return;
            }
            
            data.forEach(h => {
                const item = document.createElement('div');
                item.className = 'record-item';
                item.innerHTML = `
                    <div class="record-header">
                        <h5>${h.equipment_name}</h5>
                        <span class="badge-rose">${h.failure_mode}</span>
                    </div>
                    <p class="record-symptoms"><strong>Symptoms:</strong> ${h.symptoms}</p>
                    <p class="record-resolution">
                        <i data-lucide="check-square"></i>
                        <span><strong>Resolution Action:</strong> ${h.resolution}</span>
                    </p>
                `;
                list.appendChild(item);
            });
            lucide.createIcons();
        }
    } catch (err) {
        console.error(err);
    }
}

async function handleMaintLogSubmit(e) {
    e.preventDefault();
    const eq = document.getElementById('log-eq-name').value.trim();
    const fail = document.getElementById('log-fail-mode').value.trim();
    const symptoms = document.getElementById('log-symptoms').value.trim();
    const resolution = document.getElementById('log-resolution').value.trim();

    const formData = new FormData();
    formData.append('equipment_name', eq);
    formData.append('failure_mode', fail);
    formData.append('symptoms', symptoms);
    formData.append('resolution', resolution);

    try {
        const response = await fetch(`${API_BASE}/maintenance/history`, {
            method: 'POST',
            body: formData
        });
        if (response.ok) {
            document.getElementById('log-eq-name').value = '';
            document.getElementById('log-fail-mode').value = '';
            document.getElementById('log-symptoms').value = '';
            document.getElementById('log-resolution').value = '';
            
            fetchMaintenanceLogs();
            alert("Record locked in SQL database successfully!");
        } else {
            alert("Failed to log record.");
        }
    } catch (err) {
        console.error(err);
    }
}

/* =================================================================
   USE CASE 3: CUSTOMER SUPPORT CHATBOT
   ================================================================= */
function setupSupportHandlers() {
    initSupportSession();
    document.getElementById('support-chat-form').addEventListener('submit', handleSupportSubmit);
}

async function initSupportSession() {
    const title = `Support Simulator - ${new Date().toLocaleDateString()}`;
    try {
        const r = await fetch(`${API_BASE}/chat/session?title=${encodeURIComponent(title)}&feature_type=customer_support`, {
            method: 'POST'
        });
        if (r.ok) {
            const data = await r.json();
            activeSupportSessionId = data.id;
            
            // Enable Support inputs
            document.getElementById('support-chat-input').disabled = false;
            document.getElementById('btn-send-support').disabled = false;

            // Load empty simulator greeting
            const log = document.getElementById('support-chat-log');
            log.innerHTML = `
                <div class="text-center space-y-4" style="margin: auto; max-width: 400px; padding: 24px 0;">
                    <i data-lucide="help-circle" style="width:40px;height:40px;margin:0 auto;color:var(--color-purple);"></i>
                    <h4 class="font-bold">Support Portal Sandbox Chat</h4>
                    <p class="text-xs text-muted leading-relaxed">
                        Test search and responses specifically restricted to standard catalog specifications and public FAQs.
                    </p>
                    <div class="presets-list pt-2">
                        <button type="button" class="cite-btn" style="padding: 10px;" onclick="applySupportInput('What is the standard warranty period for controllers?')">
                            "What is the standard warranty period?"
                        </button>
                        <button type="button" class="cite-btn" style="padding: 10px;" onclick="applySupportInput('How do I install the mounting bracket?')">
                            "How do I install the mounting bracket?"
                        </button>
                    </div>
                </div>
            `;
            lucide.createIcons();
        }
    } catch (e) {
        console.error(e);
    }
}

window.applySupportInput = function(text) {
    document.getElementById('support-chat-input').value = text;
    document.getElementById('support-chat-input').focus();
};

async function handleSupportSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('support-chat-input');
    const msg = input.value.trim();
    if (!msg || !activeSupportSessionId) return;

    input.value = '';
    const log = document.getElementById('support-chat-log');
    
    // user bubble
    appendChatMessage(log, 'user', msg);
    log.scrollTop = log.scrollHeight;

    // AI bubble
    const aiBubbleWrapper = document.createElement('div');
    aiBubbleWrapper.className = 'chat-bubble-wrapper assistant';
    aiBubbleWrapper.innerHTML = `
        <div class="bubble-avatar"><i data-lucide="bot"></i></div>
        <div class="bubble-content">
            <p class="text-msg" style="white-space: pre-wrap;"></p>
        </div>
    `;
    log.appendChild(aiBubbleWrapper);
    lucide.createIcons();
    log.scrollTop = log.scrollHeight;

    const textNode = aiBubbleWrapper.querySelector('.text-msg');
    
    // Set loading indicator
    textNode.innerHTML = `<span class="chat-thinking"><i data-lucide="loader-2" class="animate-spin"></i> Finding answers in product catalog...</span>`;
    lucide.createIcons();

    const formData = new FormData();
    formData.append('session_id', activeSupportSessionId);
    formData.append('message', msg);
    if (activeModel) formData.append('model', activeModel);

    let isFirstTextChunk = true;

    try {
        const response = await fetch(`${API_BASE}/chat/message`, {
            method: 'POST',
            body: formData
        });
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let accumulatedText = '';

        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            if (value) {
                const chunkStr = decoder.decode(value, { stream: !done });
                const lines = chunkStr.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (!line.startsWith('[CITATIONS]')) {
                        const textSegment = line + (i < lines.length - 1 ? '\n' : '');
                        if (textSegment) {
                            if (isFirstTextChunk && textSegment.trim()) {
                                textNode.innerHTML = '';
                                isFirstTextChunk = false;
                            }
                            accumulatedText += textSegment;
                        }
                    }
                }
                if (accumulatedText) {
                    textNode.innerHTML = window.marked ? marked.parse(accumulatedText) : accumulatedText;
                }
                log.scrollTop = log.scrollHeight;
            }
        }
    } catch (err) {
        if (isFirstTextChunk) {
            textNode.innerHTML = '';
        }
        textNode.innerText += `\n\n[Error communicating with support channel.]`;
    }
}

/* =================================================================
   USE CASE 4: ENTERPRISE SEARCH
   ================================================================= */
function setupSearchHandlers() {
    document.getElementById('search-form').addEventListener('submit', handleEnterpriseSearch);
}

async function handleEnterpriseSearch(e) {
    e.preventDefault();
    const query = document.getElementById('search-query-input').value.trim();
    if (!query) return;

    // Show loaders
    const list = document.getElementById('search-results-list');
    list.innerHTML = `
        <div class="py-12 text-center space-y-3">
            <div class="animate-spin rounded-full h-8 w-8 border-4 border-accentBlue border-t-transparent mx-auto"></div>
            <p class="text-xs text-muted">Running federated search query...</p>
        </div>
    `;
    document.getElementById('search-results-header').classList.add('hidden');

    try {
        const response = await fetch(`${API_BASE}/search?query=${encodeURIComponent(query)}`);
        if (response.ok) {
            const data = await response.json();
            list.innerHTML = '';
            
            document.getElementById('search-results-count').innerText = `Results (${data.length})`;
            document.getElementById('search-results-header').classList.remove('hidden');

            if (data.length === 0) {
                list.innerHTML = `
                    <div class="glass-panel p-8 text-center text-muted">
                        <i data-lucide="database" class="icon-lg text-muted mb-2" style="margin: 0 auto 8px auto;"></i>
                        <h4>No Results Found</h4>
                        <p class="text-xs mt-1">Try alternate keywords like "wiring", "SF6", "insulation", or "GIS".</p>
                    </div>
                `;
                lucide.createIcons();
                return;
            }

            data.forEach(r => {
                const card = document.createElement('div');
                card.className = 'search-result-card';
                
                // Select icon
                let iconName = 'file-text';
                if (r.type === 'document_metadata') iconName = 'database';
                else if (r.type === 'proposal_record') iconName = 'share-2';
                else if (r.type === 'maintenance_log') iconName = 'wrench';

                card.innerHTML = `
                    <div class="search-card-icon-container">
                        <i data-lucide="${iconName}"></i>
                    </div>
                    <div class="search-card-body">
                        <div class="search-card-header">
                            <h5>${r.title}</h5>
                            <span class="search-card-score">Match: ${r.score.toFixed(2)}</span>
                        </div>
                        <div class="search-card-source">
                            <i data-lucide="corner-down-right" style="width:10px;height:10px;display:inline-block;margin-right:2px;"></i>
                            Source Repository: ${r.source}
                        </div>
                        <p class="search-card-snippet font-sans">${r.snippet}</p>
                    </div>
                `;
                list.appendChild(card);
            });
            lucide.createIcons();
        }
    } catch (err) {
        console.error(err);
    }
}

/* =================================================================
   USE CASE 5: PROPOSAL GENERATOR
   ================================================================= */
function setupProposalHandlers() {
    document.getElementById('prop-form').addEventListener('submit', handleProposalGenerate);
    document.getElementById('prop-review-form').addEventListener('submit', handleProposalReviewSubmit);
    fetchPastProposals();
}

async function fetchPastProposals() {
    try {
        const response = await fetch(`${API_BASE}/proposals`);
        if (response.ok) {
            const data = await response.json();
            const grid = document.getElementById('prop-archive-grid');
            grid.innerHTML = '';
            
            if (data.length === 0) {
                grid.innerHTML = `<p class="text-center text-xs text-muted py-8" style="grid-column: span 3;">No bids archived yet.</p>`;
                return;
            }
            
            data.forEach(p => {
                const card = document.createElement('div');
                card.className = 'prop-archive-card';
                card.innerHTML = `
                    <div class="prop-archive-header">
                        <h5>${p.project_name}</h5>
                        <span class="badge font-mono">ID: #${p.id}</span>
                    </div>
                    <div class="prop-archive-meta">
                        <div>Client: <strong>${p.customer_name}</strong></div>
                        <div>Capacity: <strong>${p.capacity}</strong></div>
                        <div>Region: <strong>${p.location}</strong></div>
                    </div>
                    <div class="prop-archive-footer">
                        <span>${new Date(p.created_at).toLocaleDateString()}</span>
                        ${p.reviewed_by 
                            ? `<span class="badge-emerald">✓ Reviewed (${p.reviewed_by})</span>` 
                            : `<span class="badge-amber font-bold" style="animation: pulse 2s infinite;">Draft Mode</span>`
                        }
                    </div>
                `;
                card.addEventListener('click', () => {
                    activeProposalId = p.id;
                    
                    // Toggle tabs
                    document.querySelectorAll('.prop-tab-btn').forEach(b => b.classList.remove('active'));
                    document.querySelector('[data-prop-tab="creator"]').classList.add('active');
                    
                    document.querySelectorAll('.prop-sub-section').forEach(s => s.classList.remove('active'));
                    document.getElementById('prop-tab-creator').classList.add('active');
                    
                    // Fill text details
                    document.getElementById('prop-draft-idle').classList.add('hidden');
                    document.getElementById('prop-draft-results').classList.remove('hidden');
                    
                    document.getElementById('prop-draft-subtitle').innerText = `Client: ${p.customer_name} | Project: ${p.project_name}`;
                    document.getElementById('prop-draft-id').innerText = `ID: #${p.id}`;
                    document.getElementById('doc-meta-proj').innerText = `Project: ${p.project_name} (${p.capacity})`;
                    document.getElementById('doc-meta-loc').innerText = `Location: ${p.location}`;
                    document.getElementById('prop-editor').value = p.generated_draft;
                    
                    const referencesList = document.getElementById('prop-references-list');
                    referencesList.innerHTML = ''; // Past proposal reference layout
                    
                    // Show approved signature if exists
                    const approvedCard = document.getElementById('prop-review-approved-card');
                    const reviewForm = document.getElementById('prop-review-form');
                    
                    if (p.reviewed_by) {
                        approvedCard.classList.remove('hidden');
                        document.getElementById('prop-review-approved-text').innerText = `Approved & Signed-off in SQLite DB by: ${p.reviewed_by}`;
                        reviewForm.classList.add('hidden');
                    } else {
                        approvedCard.classList.add('hidden');
                        reviewForm.classList.remove('hidden');
                        document.getElementById('prop-reviewer').value = 'Lead Design Engineer';
                    }
                });
                grid.appendChild(card);
            });
        }
    } catch (err) {
        console.error(err);
    }
}

async function handleProposalGenerate(e) {
    e.preventDefault();
    
    const client = document.getElementById('prop-customer').value.trim();
    const proj = document.getElementById('prop-proj-name').value.trim();
    const capacity = document.getElementById('prop-capacity').value.trim();
    const loc = document.getElementById('prop-location').value.trim();
    
    if (generating) return;

    // Show loaders
    document.getElementById('prop-draft-idle').classList.add('hidden');
    document.getElementById('prop-draft-results').classList.add('hidden');
    
    const draftPanel = document.getElementById('proposal-draftboard-panel');
    const loadingCard = document.createElement('div');
    loadingCard.className = 'glass-panel p-12 rounded-2xl h-full flex-center text-center text-muted';
    loadingCard.id = 'prop-generating-loader';
    loadingCard.innerHTML = `
        <div class="space-y-3">
            <div class="animate-spin rounded-full h-8 w-8 border-4 border-accentBlue border-t-transparent mx-auto"></div>
            <h4>Assembling Tender Proposal Draft...</h4>
            <p class="text-xs">Parsing previous bid specifications and compiling contract clauses...</p>
        </div>
    `;
    draftPanel.appendChild(loadingCard);

    const formData = new FormData();
    formData.append('customer_name', client);
    formData.append('project_name', proj);
    formData.append('capacity', capacity);
    formData.append('location', loc);
    if (activeModel) formData.append('model', activeModel);

    try {
        const response = await fetch(`${API_BASE}/proposals/generate`, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            
            // Remove loader
            document.getElementById('prop-generating-loader').remove();
            
            activeProposalId = data.id;
            
            // Populate Editor
            document.getElementById('prop-draft-subtitle').innerText = `Client: ${data.customer_name} | Project: ${data.project_name}`;
            document.getElementById('prop-draft-id').innerText = `ID: #${data.id}`;
            document.getElementById('doc-meta-proj').innerText = `Project: ${data.project_name} (${data.capacity})`;
            document.getElementById('doc-meta-loc').innerText = `Location: ${data.location}`;
            document.getElementById('prop-editor').value = data.draft;
            
            // References
            const refDiv = document.getElementById('prop-references-list');
            refDiv.innerHTML = '';
            if (data.citations && data.citations.length > 0) {
                refDiv.innerHTML = `<span class="text-[10px] font-bold text-accentBlue uppercase tracking-wider flex items-center gap-1"><i data-lucide="layers" style="width:12px;height:12px;"></i> Referenced Bid Clauses</span>`;
                const list = document.createElement('div');
                list.className = 'citation-chips';
                
                // Only display the main manual (first citation has highest score)
                const mainManual = data.citations[0].filename;
                const mainCites = data.citations.filter(c => c.filename === mainManual);
                const pages = [...new Set(mainCites.map(c => c.page))].sort((a, b) => a - b);
                
                const item = document.createElement('span');
                item.className = 'cite-btn';
                item.style.cursor = 'pointer';
                item.innerHTML = `<i data-lucide="file-text"></i> ${mainManual} (Page ${pages.join(', ')})`;
                item.addEventListener('click', () => openCitationModal(mainCites[0]));
                list.appendChild(item);
                
                refDiv.appendChild(list);
                lucide.createIcons();
            }

            // Hide review card & show form
            document.getElementById('prop-review-approved-card').classList.add('hidden');
            document.getElementById('prop-review-form').classList.remove('hidden');
            document.getElementById('prop-reviewer').value = 'Lead Design Engineer';

            document.getElementById('prop-draft-results').classList.remove('hidden');
            
            fetchPastProposals();

        } else {
            alert("Failed to draft proposal.");
            document.getElementById('prop-generating-loader').remove();
            document.getElementById('prop-draft-idle').classList.remove('hidden');
        }
    } catch (err) {
        alert("Error calling generator.");
        if (document.getElementById('prop-generating-loader')) document.getElementById('prop-generating-loader').remove();
        document.getElementById('prop-draft-idle').classList.remove('hidden');
    }
}

async function handleProposalReviewSubmit(e) {
    e.preventDefault();
    const reviewer = document.getElementById('prop-reviewer').value.trim();
    const text = document.getElementById('prop-editor').value;
    
    if (!activeProposalId || !reviewer) return;

    const formData = new FormData();
    formData.append('reviewed_by', reviewer);
    formData.append('edited_draft', text);

    try {
        const response = await fetch(`${API_BASE}/proposals/${activeProposalId}/review`, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            
            // Show approved card, hide form
            document.getElementById('prop-review-approved-card').classList.remove('hidden');
            document.getElementById('prop-review-approved-text').innerText = `Approved & Signed-off in SQLite DB by: ${data.reviewed_by}`;
            document.getElementById('prop-review-form').classList.add('hidden');
            
            fetchPastProposals();
            alert("Tender Draft review signed-off successfully!");
        } else {
            alert("Failed to save review.");
        }
    } catch (err) {
        console.error(err);
    }
}

/* =================================================================
   USE CASE 6: DOCUMENT DATABASE MANAGER
   ================================================================= */
function setupDocumentHandlers() {
    fetchDocuments();

    const dropzone = document.getElementById('file-dropzone');
    const fileInput = document.getElementById('doc-file-input');
    const label = document.getElementById('upload-box-label');
    const uploadBtn = document.getElementById('btn-doc-submit');

    dropzone.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        selectedUploadFile = e.target.files[0];
        if (selectedUploadFile) {
            label.innerText = selectedUploadFile.name;
            uploadBtn.disabled = false;
        } else {
            label.innerText = 'Click to select file...';
            uploadBtn.disabled = true;
        }
    });

    document.getElementById('doc-upload-form').addEventListener('submit', handleDocumentUploadSubmit);
}

async function fetchDocuments() {
    try {
        const response = await fetch(`${API_BASE}/documents`);
        if (response.ok) {
            const data = await response.json();
            const body = document.getElementById('docs-table-body');
            body.innerHTML = '';
            
            if (data.length === 0) {
                body.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-muted" style="padding:24px 0;">
                            No files registered in vector store. Ingest a PDF manual to index.
                        </td>
                    </tr>
                `;
                return;
            }

            data.forEach(doc => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <div class="table-filename" title="${doc.filename}">
                            <i data-lucide="file-text"></i>
                            <span>${doc.filename}</span>
                        </div>
                    </td>
                    <td>
                        <span class="badge" style="text-transform: capitalize;">${doc.doc_category.replace('_', ' ')}</span>
                    </td>
                    <td class="text-muted">${(doc.file_size / 1024).toFixed(1)} KB</td>
                    <td class="font-bold">${doc.chunk_count}</td>
                    <td class="text-right">
                        <button class="table-delete-btn" data-id="${doc.id}">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </td>
                `;

                tr.querySelector('.table-delete-btn').addEventListener('click', () => {
                    deleteDocument(doc.id);
                });

                body.appendChild(tr);
            });
            lucide.createIcons();
        }
    } catch (err) {
        console.error(err);
    }
}

async function handleDocumentUploadSubmit(e) {
    e.preventDefault();
    if (!selectedUploadFile) return;

    const category = document.getElementById('doc-upload-category').value;
    const submitBtn = document.getElementById('btn-doc-submit');
    const successBox = document.getElementById('upload-success-msg');
    const errorBox = document.getElementById('upload-error-msg');

    // Reset feedback
    successBox.classList.add('hidden');
    errorBox.classList.add('hidden');
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<div class="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" style="display:inline-block;margin-right:6px;"></div> Indexing chunks...`;

    const formData = new FormData();
    formData.append('file', selectedUploadFile);
    formData.append('doc_category', category);

    try {
        const response = await fetch(`${API_BASE}/documents/upload`, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            successBox.innerText = `Ingested successfully! Indexed ${data.chunk_count} chunks in collection.`;
            successBox.classList.remove('hidden');
            
            // Reset input
            selectedUploadFile = null;
            document.getElementById('doc-file-input').value = '';
            document.getElementById('upload-box-label').innerText = 'Click to select file...';
            
            fetchDocuments();
            checkServerStatus(); // refresh statistics count

        } else {
            const data = await response.json();
            errorBox.innerText = data.detail || "Failed to index document.";
            errorBox.classList.remove('hidden');
        }
    } catch (err) {
        errorBox.innerText = "Error connecting to server. Is the API online?";
        errorBox.classList.remove('hidden');
    } finally {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i data-lucide="upload"></i> Upload & Vectorize`;
        lucide.createIcons();
    }
}

async function deleteDocument(docId) {
    if (!confirm("Delete this document and all its associated Qdrant vector chunks?")) return;
    try {
        const response = await fetch(`${API_BASE}/documents/${docId}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            fetchDocuments();
            checkServerStatus(); // refresh stats count
        } else {
            alert("Failed to delete document from store.");
        }
    } catch (err) {
        console.error(err);
    }
}

/* =================================================================
   USE CASE 7: UPGRADED INDUSTRIAL FACTORY TELEMETRY DASHBOARD
   ================================================================= */
let factoryChartInstance = null;
let factoryFftChartInstance = null;
let telemetryInterval = null;
let isTelemetryPaused = false;
let showThresholds = true;
let timeWindowLimit = 30; // default 60s (30 samples at 2s interval)
let activeMachine = 'transformer';

const machineProfiles = {
    transformer: {
        name: "Transformer X (25MVA)",
        baseVib: 0.145,
        vibJitter: 0.022,
        baseTemp: 64.5,
        tempJitter: 1.8,
        vibThresholdWarn: 0.28,
        vibThresholdCrit: 0.45,
        tempThresholdWarn: 85,
        tempThresholdCrit: 105,
        tripLimit: 115,
        baseSpeed: 1488,
        speedUnit: "RPM",
        freq: "50.02 Hz",
        thd: "1.4%",
        basePower: 18.6,
        nominalPower: 25.0,
        baseCurrent: 28.4,
        efficiency: "98.6%",
        fftFrequencies: ["25 Hz (1X)", "50 Hz (2X)", "100 Hz (4X)", "150 Hz", "250 Hz", "350 Hz", "450 Hz"],
        fftBaseAmps: [0.142, 0.078, 0.042, 0.021, 0.018, 0.031, 0.015]
    },
    mcc_panel: {
        name: "MCC Panel A",
        baseVib: 0.082,
        vibJitter: 0.012,
        baseTemp: 48.2,
        tempJitter: 1.2,
        vibThresholdWarn: 0.20,
        vibThresholdCrit: 0.35,
        tempThresholdWarn: 75,
        tempThresholdCrit: 90,
        tripLimit: 100,
        baseSpeed: 0,
        speedUnit: "BUS",
        freq: "49.98 Hz",
        thd: "2.1%",
        basePower: 42.1,
        nominalPower: 60.0,
        baseCurrent: 64.2,
        efficiency: "97.8%",
        fftFrequencies: ["25 Hz (1X)", "50 Hz (2X)", "100 Hz (4X)", "150 Hz", "250 Hz", "350 Hz", "450 Hz"],
        fftBaseAmps: [0.051, 0.118, 0.072, 0.035, 0.022, 0.012, 0.018]
    },
    spindle: {
        name: "CNC Spindle #3",
        baseVib: 0.210,
        vibJitter: 0.032,
        baseTemp: 56.4,
        tempJitter: 2.2,
        vibThresholdWarn: 0.32,
        vibThresholdCrit: 0.50,
        tempThresholdWarn: 80,
        tempThresholdCrit: 95,
        tripLimit: 110,
        baseSpeed: 11950,
        speedUnit: "RPM",
        freq: "199.2 Hz",
        thd: "0.9%",
        basePower: 12.8,
        nominalPower: 15.0,
        baseCurrent: 22.1,
        efficiency: "94.2%",
        fftFrequencies: ["25 Hz", "50 Hz", "100 Hz", "150 Hz", "200 Hz (1X)", "350 Hz", "450 Hz"],
        fftBaseAmps: [0.032, 0.048, 0.039, 0.061, 0.218, 0.078, 0.046]
    },
    hydraulic: {
        name: "Hydraulic Press #2",
        baseVib: 0.258,
        vibJitter: 0.042,
        baseTemp: 72.8,
        tempJitter: 2.8,
        vibThresholdWarn: 0.35,
        vibThresholdCrit: 0.55,
        tempThresholdWarn: 88,
        tempThresholdCrit: 105,
        tripLimit: 120,
        baseSpeed: 960,
        speedUnit: "RPM",
        freq: "50.00 Hz",
        thd: "3.2%",
        basePower: 34.5,
        nominalPower: 45.0,
        baseCurrent: 52.8,
        efficiency: "91.5%",
        fftFrequencies: ["16 Hz (1X)", "32 Hz (2X)", "64 Hz (4X)", "128 Hz", "250 Hz", "350 Hz", "450 Hz"],
        fftBaseAmps: [0.178, 0.112, 0.084, 0.149, 0.088, 0.058, 0.038]
    }
};

let peakVibrationRecorded = 0.182;

function initFactoryTelemetry() {
    const waveCtx = document.getElementById('factoryTelemetryChart');
    const fftCtx = document.getElementById('factoryFftChart');
    if (!waveCtx || !fftCtx) return;
    
    if (factoryChartInstance && factoryFftChartInstance) return; // already initialized
    
    // 1. Build Main Waveform Dual-Axis Chart
    const wCtx2d = waveCtx.getContext('2d');
    
    // Linear gradients
    const blueGradient = wCtx2d.createLinearGradient(0, 0, 0, 300);
    blueGradient.addColorStop(0, 'rgba(37, 99, 235, 0.32)');
    blueGradient.addColorStop(1, 'rgba(37, 99, 235, 0.01)');

    const redGradient = wCtx2d.createLinearGradient(0, 0, 0, 300);
    redGradient.addColorStop(0, 'rgba(239, 68, 68, 0.26)');
    redGradient.addColorStop(1, 'rgba(239, 68, 68, 0.01)');

    const initialLabels = [];
    const initialVib = [];
    const initialTemp = [];
    const initialWarnVib = [];
    const initialCritVib = [];

    const prof = machineProfiles[activeMachine];
    const now = new Date();
    for (let i = 15; i >= 0; i--) {
        const t = new Date(now.getTime() - i * 2000);
        initialLabels.push(t.toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" }));
        initialVib.push((prof.baseVib + (Math.random() * prof.vibJitter - prof.vibJitter / 2)).toFixed(3));
        initialTemp.push((prof.baseTemp + (Math.random() * prof.tempJitter - prof.tempJitter / 2)).toFixed(1));
        initialWarnVib.push(prof.vibThresholdWarn);
        initialCritVib.push(prof.vibThresholdCrit);
    }

    factoryChartInstance = new Chart(waveCtx, {
        type: 'line',
        data: {
            labels: initialLabels,
            datasets: [
                {
                    label: 'Vibration (IPS)',
                    borderColor: '#2563EB',
                    backgroundColor: blueGradient,
                    data: initialVib,
                    borderWidth: 2.5,
                    pointRadius: 2,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#2563EB',
                    tension: 0.32,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'Temperature (°C)',
                    borderColor: '#EF4444',
                    backgroundColor: redGradient,
                    data: initialTemp,
                    borderWidth: 2.2,
                    pointRadius: 2,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#EF4444',
                    tension: 0.32,
                    fill: true,
                    yAxisID: 'y1'
                },
                {
                    label: 'Warning Limit (0.28 IPS)',
                    borderColor: 'rgba(217, 119, 6, 0.75)',
                    borderWidth: 1.5,
                    borderDash: [5, 4],
                    pointRadius: 0,
                    fill: false,
                    data: initialWarnVib,
                    yAxisID: 'y',
                    hidden: !showThresholds
                },
                {
                    label: 'Critical Limit (0.45 IPS)',
                    borderColor: 'rgba(220, 38, 38, 0.85)',
                    borderWidth: 1.5,
                    borderDash: [4, 4],
                    pointRadius: 0,
                    fill: false,
                    data: initialCritVib,
                    yAxisID: 'y',
                    hidden: !showThresholds
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                x: {
                    ticks: {
                        color: '#64748B',
                        font: { family: 'Inter', size: 10.5 },
                        maxRotation: 0
                    },
                    grid: { color: 'rgba(226, 232, 240, 0.7)' }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    min: 0,
                    max: 0.60,
                    title: {
                        display: true,
                        text: 'Vibration Velocity (IPS)',
                        color: '#2563EB',
                        font: { family: 'Inter', size: 11, weight: '600' }
                    },
                    ticks: {
                        color: '#2563EB',
                        font: { family: 'JetBrains Mono', size: 10 },
                        callback: val => val.toFixed(2) + ' IPS'
                    },
                    grid: { color: 'rgba(226, 232, 240, 0.7)' }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    min: 30,
                    max: 120,
                    title: {
                        display: true,
                        text: 'Temperature (°C)',
                        color: '#EF4444',
                        font: { family: 'Inter', size: 11, weight: '600' }
                    },
                    ticks: {
                        color: '#EF4444',
                        font: { family: 'JetBrains Mono', size: 10 },
                        callback: val => val + '°C'
                    },
                    grid: { drawOnChartArea: false }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.92)',
                    titleColor: '#ffffff',
                    bodyColor: '#e2e8f0',
                    titleFont: { family: 'Outfit', size: 12, weight: '700' },
                    bodyFont: { family: 'JetBrains Mono', size: 11 },
                    padding: 10,
                    cornerRadius: 8,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            }
        }
    });

    // 2. Build FFT Harmonic Spectrum Chart
    factoryFftChartInstance = new Chart(fftCtx, {
        type: 'bar',
        data: {
            labels: prof.fftFrequencies,
            datasets: [
                {
                    label: 'Spectral Amplitude (IPS pk)',
                    data: [...prof.fftBaseAmps],
                    backgroundColor: [
                        'rgba(37, 99, 235, 0.85)',
                        'rgba(125, 58, 237, 0.85)',
                        'rgba(13, 148, 136, 0.85)',
                        'rgba(5, 150, 105, 0.85)',
                        'rgba(217, 119, 6, 0.85)',
                        'rgba(220, 38, 38, 0.85)',
                        'rgba(100, 116, 139, 0.85)'
                    ],
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.55
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 300 },
            scales: {
                x: {
                    ticks: {
                        color: '#475569',
                        font: { family: 'Inter', size: 10, weight: '600' }
                    },
                    grid: { display: false }
                },
                y: {
                    min: 0,
                    max: 0.30,
                    title: {
                        display: true,
                        text: 'Spectral Peak (IPS)',
                        color: '#64748B',
                        font: { family: 'Inter', size: 10.5, weight: '600' }
                    },
                    ticks: {
                        color: '#64748B',
                        font: { family: 'JetBrains Mono', size: 10 }
                    },
                    grid: { color: 'rgba(226, 232, 240, 0.7)' }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.92)',
                    titleColor: '#ffffff',
                    bodyColor: '#e2e8f0',
                    titleFont: { family: 'Outfit', size: 12, weight: '700' },
                    bodyFont: { family: 'JetBrains Mono', size: 11 },
                    padding: 8,
                    cornerRadius: 8
                }
            }
        }
    });

    // 3. Setup UI Controls
    setupTelemetryControls();

    // 4. Initial KPI & Event Hydration
    updateKpiCards(prof.baseVib, prof.baseTemp);
    appendTelemetryEvent("SYSTEM_INIT", "System initialized. DevOps gateway listening on MQTT topic factory/telemetry/live", "NORMAL");

    // 5. Start Telemetry Loop
    if (!telemetryInterval) {
        telemetryInterval = setInterval(updateTelemetryData, 2000);
        checkFactoryHealth();
        setInterval(checkFactoryHealth, 10000);
    }
}

function setupTelemetryControls() {
    // Machine Selector
    const machineSelect = document.getElementById('telemetry-machine-select');
    if (machineSelect) {
        machineSelect.addEventListener('change', (e) => {
            activeMachine = e.target.value;
            const prof = machineProfiles[activeMachine];
            
            // Update FFT Chart labels and baseline
            if (factoryFftChartInstance) {
                factoryFftChartInstance.data.labels = prof.fftFrequencies;
                factoryFftChartInstance.data.datasets[0].data = [...prof.fftBaseAmps];
                factoryFftChartInstance.update();
            }

            // Update Waveform Threshold Lines
            if (factoryChartInstance) {
                factoryChartInstance.data.datasets[2].label = `Warning Limit (${prof.vibThresholdWarn} IPS)`;
                factoryChartInstance.data.datasets[3].label = `Critical Limit (${prof.vibThresholdCrit} IPS)`;
                for (let i = 0; i < factoryChartInstance.data.datasets[2].data.length; i++) {
                    factoryChartInstance.data.datasets[2].data[i] = prof.vibThresholdWarn;
                    factoryChartInstance.data.datasets[3].data[i] = prof.vibThresholdCrit;
                }
                factoryChartInstance.update();
            }

            // Update KPI cards
            updateKpiCards(prof.baseVib, prof.baseTemp);
            appendTelemetryEvent("ASSET_SWITCH", `Target asset switched to ${prof.name}`, "INFO");
        });
    }

    // Pause / Resume Toggle
    const btnPause = document.getElementById('btn-pause-telemetry');
    if (btnPause) {
        btnPause.addEventListener('click', () => {
            isTelemetryPaused = !isTelemetryPaused;
            const icon = document.getElementById('icon-pause-telemetry');
            const text = document.getElementById('text-pause-telemetry');
            const badge = document.getElementById('telemetry-running-badge');
            
            if (isTelemetryPaused) {
                btnPause.classList.add('active');
                text.innerText = 'Resume Feed';
                icon.setAttribute('data-lucide', 'play');
                badge.innerHTML = '<span class="pulse-dot" style="background:#f59e0b;"></span> PAUSED';
                appendTelemetryEvent("FEED_PAUSED", "Live telemetry streaming paused by operator", "ADVISORY");
            } else {
                btnPause.classList.remove('active');
                text.innerText = 'Pause Feed';
                icon.setAttribute('data-lucide', 'pause');
                badge.innerHTML = '<span class="pulse-dot green"></span> MONITORING LIVE';
                appendTelemetryEvent("FEED_RESUMED", "Live telemetry streaming resumed", "INFO");
            }
            lucide.createIcons();
        });
    }

    // Thresholds Toggle
    const btnThresholds = document.getElementById('btn-toggle-thresholds');
    if (btnThresholds) {
        btnThresholds.classList.add('active');
        btnThresholds.addEventListener('click', () => {
            showThresholds = !showThresholds;
            btnThresholds.classList.toggle('active', showThresholds);
            if (factoryChartInstance) {
                factoryChartInstance.data.datasets[2].hidden = !showThresholds;
                factoryChartInstance.data.datasets[3].hidden = !showThresholds;
                factoryChartInstance.update();
            }
        });
    }

    // Time Window Buttons
    const windowBtns = document.querySelectorAll('.window-btn');
    windowBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            windowBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const sec = parseInt(btn.getAttribute('data-window'), 10) || 60;
            timeWindowLimit = Math.max(10, Math.floor(sec / 2)); // 2s sample rate
        });
    });
}

function updateTelemetryData() {
    if (!factoryChartInstance || isTelemetryPaused) return;
    
    const prof = machineProfiles[activeMachine];
    const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
    
    // Generate realistic jitter around baseline
    const currentVib = Math.max(0.01, prof.baseVib + (Math.random() * prof.vibJitter - prof.vibJitter / 2));
    const currentTemp = Math.max(20, prof.baseTemp + (Math.random() * prof.tempJitter - prof.tempJitter / 2));

    if (currentVib > peakVibrationRecorded) {
        peakVibrationRecorded = currentVib;
    }

    // Manage sliding window
    while (factoryChartInstance.data.labels.length >= timeWindowLimit) {
        factoryChartInstance.data.labels.shift();
        factoryChartInstance.data.datasets[0].data.shift();
        factoryChartInstance.data.datasets[1].data.shift();
        factoryChartInstance.data.datasets[2].data.shift();
        factoryChartInstance.data.datasets[3].data.shift();
    }
    
    factoryChartInstance.data.labels.push(now);
    factoryChartInstance.data.datasets[0].data.push(currentVib.toFixed(3));
    factoryChartInstance.data.datasets[1].data.push(currentTemp.toFixed(1));
    factoryChartInstance.data.datasets[2].data.push(prof.vibThresholdWarn);
    factoryChartInstance.data.datasets[3].data.push(prof.vibThresholdCrit);
    factoryChartInstance.update();

    // Randomize slight variations on FFT harmonics
    if (factoryFftChartInstance) {
        const newAmps = prof.fftBaseAmps.map(amp => Math.max(0.005, amp + (Math.random() * 0.012 - 0.006)));
        factoryFftChartInstance.data.datasets[0].data = newAmps;
        factoryFftChartInstance.update();
    }

    // Update KPI cards
    updateKpiCards(currentVib, currentTemp);

    // Randomly generate telemetry log events on thresholds or periodically
    if (Math.random() < 0.35) {
        const tag = Math.random() > 0.5 ? "VIB_VELOCITY_RMS" : "TEMP_WINDING_CORE";
        const val = tag === "VIB_VELOCITY_RMS" ? `${currentVib.toFixed(3)} IPS` : `${currentTemp.toFixed(1)} °C`;
        let status = "NORMAL";
        let diag = "Nominal operating envelope";
        
        if (currentVib >= prof.vibThresholdWarn) {
            status = "WARNING";
            diag = "Velocity nearing ISO warning band. Inspection advised.";
        } else if (currentTemp >= prof.tempThresholdWarn) {
            status = "ELEVATED";
            diag = "Thermal rise detected. Fan cooling active.";
        }
        
        appendTelemetryEvent(tag, `${val} on ${prof.name}`, status, diag);
    }
}

function updateKpiCards(vib, temp) {
    const prof = machineProfiles[activeMachine];

    // Card 1: Vibration
    const vibVal = document.getElementById('kpi-vib-val');
    const vibPeak = document.getElementById('kpi-vib-peak');
    const vibStatus = document.getElementById('kpi-vib-status');
    const vibBar = document.getElementById('kpi-vib-bar');

    if (vibVal) vibVal.innerText = vib.toFixed(3);
    if (vibPeak) vibPeak.innerText = peakVibrationRecorded.toFixed(3);
    if (vibBar) {
        const pct = Math.min(100, Math.round((vib / prof.vibThresholdCrit) * 100));
        vibBar.style.width = `${pct}%`;
        if (vib >= prof.vibThresholdCrit) {
            vibBar.className = 'kpi-progress-bar bg-rose';
            if (vibStatus) { vibStatus.className = 'kpi-tag tag-crit'; vibStatus.innerText = 'CRITICAL ISO ALARM'; }
        } else if (vib >= prof.vibThresholdWarn) {
            vibBar.className = 'kpi-progress-bar bg-amber';
            if (vibStatus) { vibStatus.className = 'kpi-tag tag-warn'; vibStatus.innerText = 'ADVISORY WARNING'; }
        } else {
            vibBar.className = 'kpi-progress-bar bg-blue';
            if (vibStatus) { vibStatus.className = 'kpi-tag tag-normal'; vibStatus.innerText = 'ISO Class I: Normal'; }
        }
    }

    // Card 2: Temperature
    const tempVal = document.getElementById('kpi-temp-val');
    const tempHeadroom = document.getElementById('kpi-temp-headroom');
    const tempStatus = document.getElementById('kpi-temp-status');
    const tempBar = document.getElementById('kpi-temp-bar');

    if (tempVal) tempVal.innerText = temp.toFixed(1);
    const headroom = Math.max(0, prof.tripLimit - temp).toFixed(1);
    if (tempHeadroom) tempHeadroom.innerText = `+${headroom} °C`;
    if (tempBar) {
        const pct = Math.min(100, Math.round((temp / prof.tripLimit) * 100));
        tempBar.style.width = `${pct}%`;
        if (temp >= prof.tempThresholdCrit) {
            tempBar.className = 'kpi-progress-bar bg-rose';
            if (tempStatus) { tempStatus.className = 'kpi-tag tag-crit'; tempStatus.innerText = 'HIGH THERMAL ALERT'; }
        } else if (temp >= prof.tempThresholdWarn) {
            tempBar.className = 'kpi-progress-bar bg-amber';
            if (tempStatus) { tempStatus.className = 'kpi-tag tag-warn'; tempStatus.innerText = 'ELEVATED TEMP'; }
        } else {
            tempBar.className = 'kpi-progress-bar bg-amber';
            if (tempStatus) { tempStatus.className = 'kpi-tag tag-normal'; tempStatus.innerText = 'Thermal Normal'; }
        }
    }

    // Card 3: Shaft Speed & Frequency
    const speedVal = document.getElementById('kpi-speed-val');
    const speedStatus = document.getElementById('kpi-speed-status');
    const thdVal = document.getElementById('kpi-thd-val');
    if (speedVal) {
        const jitter = Math.floor(Math.random() * 4 - 2);
        speedVal.innerText = (prof.baseSpeed ? (prof.baseSpeed + jitter).toLocaleString() : prof.freq);
    }
    if (speedStatus) speedStatus.innerText = prof.freq;
    if (thdVal) thdVal.innerText = prof.thd;

    // Card 4: Power Draw
    const powerVal = document.getElementById('kpi-power-val');
    const currentVal = document.getElementById('kpi-current-val');
    if (powerVal) {
        const pJitter = (Math.random() * 0.4 - 0.2).toFixed(1);
        powerVal.innerText = (prof.basePower + parseFloat(pJitter)).toFixed(1);
    }
    if (currentVal) {
        const cJitter = (Math.random() * 0.6 - 0.3).toFixed(1);
        currentVal.innerText = `${(prof.baseCurrent + parseFloat(cJitter)).toFixed(1)} A`;
    }

    // Card 5: Ingestion Latency
    const latencyVal = document.getElementById('kpi-latency-val');
    if (latencyVal) {
        latencyVal.innerText = `${Math.floor(10 + Math.random() * 6)} ms`;
    }
}

function appendTelemetryEvent(tag, message, status = "NORMAL", diag = "OK") {
    const tbody = document.getElementById('telemetry-events-body');
    if (!tbody) return;

    const prof = machineProfiles[activeMachine];
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    
    let badgeClass = "tag-normal";
    if (status === "WARNING" || status === "ADVISORY") badgeClass = "tag-warn";
    if (status === "CRITICAL") badgeClass = "tag-crit";
    if (status === "INFO") badgeClass = "tag-cyan";

    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class="font-mono text-muted text-xxs">${timestamp}</td>
        <td><strong>${prof.name.split(' ')[0]}</strong></td>
        <td class="font-mono text-blue">${tag}</td>
        <td>${message}</td>
        <td><span class="kpi-tag ${badgeClass}">${status}</span></td>
        <td class="text-xs text-muted">${diag}</td>
    `;

    tbody.insertBefore(tr, tbody.firstChild);

    // Limit log rows to 15
    while (tbody.children.length > 15) {
        tbody.removeChild(tbody.lastChild);
    }
}

async function checkFactoryHealth() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        const statusDiv = document.getElementById('factory-health-status');
        if (!statusDiv) return;

        if (response.ok) {
            const data = await response.json();
            statusDiv.innerHTML = `
                <div class="flex items-center gap-2 text-emerald">
                    <i data-lucide="check-circle2" style="width:14px;height:14px;"></i>
                    <span>Backend API: ONLINE</span>
                </div>
                <div class="flex items-center gap-2 text-blue">
                    <i data-lucide="database" style="width:14px;height:14px;"></i>
                    <span>Database: ${data.database}</span>
                </div>
            `;
        } else {
            statusDiv.innerHTML = '<div class="text-rose font-bold">Backend API: OFFLINE</div>';
        }
    } catch (e) {
        const statusDiv = document.getElementById('factory-health-status');
        if (statusDiv) {
            statusDiv.innerHTML = '<div class="text-rose font-bold">Backend API: UNREACHABLE</div>';
        }
    }
    lucide.createIcons();
}

// Call init on load
document.addEventListener('DOMContentLoaded', () => {
    // Chart will be initialized when the tab is clicked.
});
