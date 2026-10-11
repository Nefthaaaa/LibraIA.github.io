/**
 * LibraIA - Lector Inteligente de PDFs con OpenAI y Supabase
 * Aplicación web minimalista monocromática (Blanco, Negro y Gris).
 */

// Configuración de PDF.js Worker
if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Clave por defecto de Groq AI (Inferencia Ultrarrápida)
const DEFAULT_GROQ_KEY = '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';
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';

// Estado Global de la Aplicación
const state = {
  theme: localStorage.getItem('libra_theme') || 'light',
  groqKey: localStorage.getItem('libra_groq_key') || DEFAULT_GROQ_KEY,
  groqModel: localStorage.getItem('libra_groq_model') || DEFAULT_GROQ_MODEL,
  temperature: parseFloat(localStorage.getItem('libra_temperature') || '0.3'),
  mockMode: localStorage.getItem('libra_mock_mode') === 'true',

  currentDoc: null,      // Documento activo: { id, title, pageCount, wordCount, pages: [], fullText }
  pdfDocProxy: null,     // Instancia de PDFDocumentProxy de PDF.js
  pdfZoomScale: 1.0,     // Escala de zoom del visor
  currentPageNum: 1,     // Página visual actual
  documents: [],         // Lista de documentos recientes
  messages: [],          // Mensajes del chat actual: [{ role, content, id, created_at }]
  isGenerating: false,   // Bandera para peticiones en streaming
  abortController: null  // Para cancelar streaming si el usuario lo desea
};

// Elementos del DOM
const elements = {
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  themeIcon: document.getElementById('themeIcon'),
  
  sidebar: document.getElementById('sidebar'),
  sidebarOverlay: document.getElementById('sidebarOverlay'),
  openSidebarBtn: document.getElementById('openSidebarBtn'),
  closeSidebarBtn: document.getElementById('closeSidebarBtn'),
  mobileChatMenuBtn: document.getElementById('mobileChatMenuBtn'),
  
  newDocBtn: document.getElementById('newDocBtn'),
  fileInput: document.getElementById('fileInput'),
  selectFileBtn: document.getElementById('selectFileBtn'),
  dropzoneBox: document.getElementById('dropzoneBox'),
  dropzoneContainer: document.getElementById('dropzoneContainer'),
  progressBox: document.getElementById('progressBox'),
  progressText: document.getElementById('progressText'),
  progressBarFill: document.getElementById('progressBarFill'),
  
  docList: document.getElementById('docList'),
  docCountBadge: document.getElementById('docCountBadge'),
  
  activeDocInfo: document.getElementById('activeDocInfo'),
  activeDocTitle: document.getElementById('activeDocTitle'),
  activeDocPages: document.getElementById('activeDocPages'),
  activeDocWords: document.getElementById('activeDocWords'),
  emptyHeaderTitle: document.getElementById('emptyHeaderTitle'),
  
  // Controles de Espacio de Trabajo y PDF
  workspaceLayout: document.getElementById('workspaceLayout'),
  pdfViewerPanel: document.getElementById('pdfViewerPanel'),
  pdfPagesScroll: document.getElementById('pdfPagesScroll'),
  viewPdfBtn: document.getElementById('viewPdfBtn'),
  viewPdfBtnText: document.getElementById('viewPdfBtnText'),
  pdfPrevPageBtn: document.getElementById('pdfPrevPageBtn'),
  pdfNextPageBtn: document.getElementById('pdfNextPageBtn'),
  pdfPageInput: document.getElementById('pdfPageInput'),
  pdfTotalPagesSpan: document.getElementById('pdfTotalPagesSpan'),
  pdfZoomOutBtn: document.getElementById('pdfZoomOutBtn'),
  pdfZoomInBtn: document.getElementById('pdfZoomInBtn'),
  pdfZoomBadge: document.getElementById('pdfZoomBadge'),
  pdfFitWidthBtn: document.getElementById('pdfFitWidthBtn'),
  closePdfPanelBtn: document.getElementById('closePdfPanelBtn'),

  exportChatBtn: document.getElementById('exportChatBtn'),
  clearChatBtn: document.getElementById('clearChatBtn'),
  
  chatContainer: document.getElementById('chatContainer'),
  messagesList: document.getElementById('messagesList'),
  quickPromptsBar: document.getElementById('quickPromptsBar'),
  chatForm: document.getElementById('chatForm'),
  chatInput: document.getElementById('chatInput'),
  sendBtn: document.getElementById('sendBtn'),
  stopBtn: document.getElementById('stopBtn'),
  
  // Modal de Ajustes
  openSettingsBtn: document.getElementById('openSettingsBtn'),
  closeSettingsModalBtn: document.getElementById('closeSettingsModalBtn'),
  cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  groqKeyInput: document.getElementById('groqKeyInput'),
  toggleKeyVisibilityBtn: document.getElementById('toggleKeyVisibilityBtn'),
  modelSelect: document.getElementById('modelSelect'),
  temperatureInput: document.getElementById('temperatureInput'),
  tempValue: document.getElementById('tempValue'),
  mockModeToggle: document.getElementById('mockModeToggle'),
  
  // Modal Visor de Texto
  textViewModal: document.getElementById('textViewModal'),
  closeTextViewModalBtn: document.getElementById('closeTextViewModalBtn'),
  textViewDocTitle: document.getElementById('textViewDocTitle'),
  textViewStats: document.getElementById('textViewStats'),
  extractedTextContent: document.getElementById('extractedTextContent'),
  searchTextInDoc: document.getElementById('searchTextInDoc'),
  copyExtractedTextBtn: document.getElementById('copyExtractedTextBtn'),
  
  toastContainer: document.getElementById('toastContainer')
};

// ==============================================================================
// Inicialización
// ==============================================================================
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(state.theme);
  loadStoredDocuments();
  setupEventListeners();
  updateSettingsInputs();
});

// ==============================================================================
// Gestión de Tema (Oscuro / Claro Monocromático)
// ==============================================================================
function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('libra_theme', theme);

  if (elements.themeIcon) {
    if (theme === 'dark') {
      elements.themeIcon.innerHTML = `
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      `;
    } else {
      elements.themeIcon.innerHTML = `
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      `;
    }
  }
}

function toggleTheme() {
  applyTheme(state.theme === 'light' ? 'dark' : 'light');
}

// ==============================================================================
// Procesamiento de PDFs con PDF.js
// ==============================================================================
async function handleFileSelect(file) {
  if (!file) return;
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    showToast('Por favor selecciona un archivo PDF válido.', 'error');
    return;
  }

  try {
    showProgress(true, 'Leyendo archivo PDF...', 10);
    const arrayBuffer = await file.arrayBuffer();

    showProgress(true, 'Analizando documento con PDF.js...', 25);
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;

    const numPages = pdfDoc.numPages;
    const pages = [];
    let fullText = '';
    let totalWords = 0;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const percent = Math.min(90, Math.round(25 + (pageNum / numPages) * 65));
      showProgress(true, `Extrayendo texto de la página ${pageNum} de ${numPages}...`, percent);

      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      pages.push({
        pageNum,
        text: pageText
      });

      if (pageText) {
        fullText += `--- [PÁGINA ${pageNum}] ---\n` + pageText + '\n\n';
        totalWords += pageText.split(/\s+/).filter(Boolean).length;
      }
    }

    showProgress(true, 'Estructurando documento...', 95);

    const docObj = {
      id: 'doc_' + Date.now(),
      title: file.name.replace(/\.pdf$/i, ''),
      fileName: file.name,
      fileSize: file.size,
      pageCount: numPages,
      wordCount: totalWords,
      pages: pages,
      fullText: fullText.trim(),
      created_at: new Date().toISOString()
    };

    state.pdfDocProxy = pdfDoc;
    // Guardar en Supabase o Local
    await saveDocument(docObj);
    setActiveDocument(docObj, pdfDoc);
    showProgress(false);
    showToast(`PDF "${docObj.title}" cargado con éxito (${numPages} páginas)`, 'success');

  } catch (err) {
    console.error('Error procesando PDF:', err);
    showProgress(false);
    showToast('No se pudo leer el archivo PDF: ' + err.message, 'error');
  }
}

function showProgress(visible, message = '', percent = 0) {
  if (elements.progressBox) {
    elements.progressBox.style.display = visible ? 'flex' : 'none';
  }
  if (elements.dropzoneBox) {
    elements.dropzoneBox.style.display = visible ? 'none' : 'flex';
  }
  if (elements.progressText) {
    elements.progressText.textContent = message;
  }
  if (elements.progressBarFill) {
    elements.progressBarFill.style.width = percent + '%';
  }
}

// ==============================================================================
// Guardado y Carga de Documentos
// ==============================================================================
async function saveDocument(doc) {
  // Guardar en array en memoria
  const existingIdx = state.documents.findIndex(d => d.id === doc.id);
  if (existingIdx >= 0) {
    state.documents[existingIdx] = doc;
  } else {
    state.documents.unshift(doc);
  }

  // Guardar localmente
  try {
    const listToStore = state.documents.map(d => ({
      id: d.id,
      title: d.title,
      fileName: d.fileName,
      fileSize: d.fileSize,
      pageCount: d.pageCount,
      wordCount: d.wordCount,
      fullText: d.fullText,
      pages: d.pages,
      created_at: d.created_at
    }));
    localStorage.setItem('libra_documents', JSON.stringify(listToStore));
  } catch (e) {
    console.warn('LocalStorage quota limit reached, saving metadata only:', e);
  }

  renderDocList();
}

async function loadStoredDocuments() {
  const saved = localStorage.getItem('libra_documents');
  if (saved) {
    try {
      state.documents = JSON.parse(saved);
      renderDocList();
    } catch (e) {
      state.documents = [];
    }
  }
}

function renderDocList() {
  if (!elements.docList) return;
  elements.docCountBadge.textContent = state.documents.length;

  if (state.documents.length === 0) {
    elements.docList.innerHTML = `
      <div class="empty-docs-state">
        <p>No hay documentos cargados aún</p>
      </div>
    `;
    return;
  }

  elements.docList.innerHTML = '';
  state.documents.forEach(doc => {
    const item = document.createElement('div');
    item.className = 'doc-item' + (state.currentDoc && state.currentDoc.id === doc.id ? ' active' : '');
    
    item.innerHTML = `
      <div class="doc-item-main" title="${doc.title}">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <span class="doc-item-title">${escapeHtml(doc.title)}</span>
      </div>
      <button class="doc-item-delete" title="Eliminar documento">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;

    item.querySelector('.doc-item-main').addEventListener('click', () => {
      setActiveDocument(doc);
      if (window.innerWidth <= 992) {
        elements.sidebar.classList.remove('open');
        elements.sidebarOverlay?.classList.remove('active');
      }
    });

    item.querySelector('.doc-item-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteDocument(doc.id);
    });

    elements.docList.appendChild(item);
  });
}

async function deleteDocument(docId) {
  if (!confirm('¿Deseas eliminar este documento y su historial?')) return;

  state.documents = state.documents.filter(d => d.id !== docId);
  localStorage.setItem('libra_documents', JSON.stringify(state.documents));
  localStorage.removeItem(`libra_msgs_${docId}`);

  if (state.currentDoc && state.currentDoc.id === docId) {
    clearActiveDocument();
  }

  renderDocList();
  showToast('Documento eliminado', 'info');
}

function setActiveDocument(doc, pdfDocProxy = null) {
  state.currentDoc = doc;
  if (pdfDocProxy) {
    state.pdfDocProxy = pdfDocProxy;
  }

  // Actualizar UI
  elements.dropzoneContainer.style.display = 'none';
  elements.workspaceLayout.style.display = 'flex';
  
  elements.activeDocInfo.style.display = 'flex';
  elements.emptyHeaderTitle.style.display = 'none';
  if (elements.viewPdfBtn) elements.viewPdfBtn.style.display = 'none';
  elements.exportChatBtn.style.display = 'inline-flex';
  elements.clearChatBtn.style.display = 'inline-flex';

  elements.activeDocTitle.textContent = doc.title;
  elements.activeDocPages.textContent = `${doc.pageCount || 1} pág${(doc.pageCount || 1) > 1 ? 's' : ''}`;
  elements.activeDocWords.textContent = `${(doc.wordCount || 0).toLocaleString()} palabras`;

  // Cargar mensajes previos del documento
  loadMessagesForDoc(doc.id);

  renderDocList();
  elements.chatInput.focus();
}

function clearActiveDocument() {
  state.currentDoc = null;
  state.pdfDocProxy = null;
  state.messages = [];

  elements.dropzoneContainer.style.display = 'flex';
  elements.workspaceLayout.style.display = 'none';

  elements.activeDocInfo.style.display = 'none';
  elements.emptyHeaderTitle.style.display = 'block';
  if (elements.viewPdfBtn) elements.viewPdfBtn.style.display = 'none';
  elements.exportChatBtn.style.display = 'none';
  elements.clearChatBtn.style.display = 'none';

  elements.dropzoneBox.style.display = 'flex';
  elements.progressBox.style.display = 'none';
  elements.messagesList.innerHTML = '';

  renderDocList();
}

// ==============================================================================
// Visor Visual de PDF (Renderizado por Páginas con Canvas)
// ==============================================================================
async function computeFitWidthScale(pdfDoc) {
  try {
    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 1.0 });
    const panelWidth = (elements.pdfPagesScroll.clientWidth || 400) - 64;
    return Math.min(2.0, Math.max(0.5, panelWidth / viewport.width));
  } catch (e) {
    return 1.0;
  }
}

async function renderVisualPdf(pdfDoc) {
  if (!pdfDoc || !elements.pdfPagesScroll) return;

  elements.pdfPagesScroll.innerHTML = '<div style="padding:24px;color:var(--text-muted);text-align:center;font-size:0.85rem;">Renderizando páginas…</div>';

  const numPages = pdfDoc.numPages;
  if (elements.pdfTotalPagesSpan) elements.pdfTotalPagesSpan.textContent = numPages;
  if (elements.pdfPageInput) {
    elements.pdfPageInput.max = numPages;
    elements.pdfPageInput.value = 1;
  }

  state.pdfZoomScale = await computeFitWidthScale(pdfDoc);
  if (elements.pdfZoomBadge) elements.pdfZoomBadge.textContent = Math.round(state.pdfZoomScale * 100) + '%';

  elements.pdfPagesScroll.innerHTML = '';

  for (let i = 1; i <= numPages; i++) {
    try {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: state.pdfZoomScale });

      const card = document.createElement('div');
      card.className = 'pdf-page-card';
      card.id = `pdf-page-card-${i}`;

      const badge = document.createElement('div');
      badge.className = 'pdf-page-badge';
      badge.textContent = `Página ${i}`;

      const wrapper = document.createElement('div');
      wrapper.className = 'canvas-wrapper';

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;

      wrapper.appendChild(canvas);
      card.appendChild(badge);
      card.appendChild(wrapper);
      elements.pdfPagesScroll.appendChild(card);
    } catch (err) {
      console.warn(`Error renderizando página ${i}:`, err);
    }
  }

  state.currentPageNum = 1;
}

async function rerenderPdfAtScale() {
  if (!state.pdfDocProxy || !elements.pdfPagesScroll) return;
  if (elements.pdfZoomBadge) elements.pdfZoomBadge.textContent = Math.round(state.pdfZoomScale * 100) + '%';

  const cards = elements.pdfPagesScroll.querySelectorAll('.pdf-page-card');
  for (let i = 0; i < cards.length; i++) {
    const pageNum = i + 1;
    try {
      const page = await state.pdfDocProxy.getPage(pageNum);
      const viewport = page.getViewport({ scale: state.pdfZoomScale });
      const canvas = cards[i].querySelector('canvas');
      if (!canvas) continue;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    } catch (err) {
      console.warn(`Error re-renderizando página ${pageNum}:`, err);
    }
  }
}

function navigateToPdfPage(pageNum) {
  const panel = elements.pdfViewerPanel;
  if (!panel) return;

  // Abrir panel si está oculto
  if (panel.classList.contains('collapsed')) {
    panel.classList.remove('collapsed');
    updatePdfViewerVisibility(true);
  }

  const card = document.getElementById(`pdf-page-card-${pageNum}`);
  if (!card) {
    showToast(`Página ${pageNum} no disponible en el visor`, 'warning');
    return;
  }

  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (elements.pdfPageInput) elements.pdfPageInput.value = pageNum;
  state.currentPageNum = pageNum;

  // Flash de resaltado
  document.querySelectorAll('.pdf-page-card.highlight-page-flash')
    .forEach(el => el.classList.remove('highlight-page-flash'));
  setTimeout(() => card.classList.add('highlight-page-flash'), 80);
  setTimeout(() => card.classList.remove('highlight-page-flash'), 2200);
}

function updatePdfViewerVisibility(panelVisible) {
  if (elements.viewPdfBtnText) {
    elements.viewPdfBtnText.textContent = panelVisible ? 'Ocultar PDF' : 'Ver PDF';
  }
}
const updateSplitViewBtn = updatePdfViewerVisibility; // Compatibilidad interna


// ==============================================================================
// Manejo de Mensajes y Conversación
// ==============================================================================
async function loadMessagesForDoc(docId) {
  state.messages = [];
  elements.messagesList.innerHTML = '';

  const localMsgs = localStorage.getItem(`libra_msgs_${docId}`);
  if (localMsgs) {
    try {
      state.messages = JSON.parse(localMsgs);
    } catch (e) {
      state.messages = [];
    }
  }

  // Si no hay mensajes previos, mostrar bienvenida
  if (state.messages.length === 0) {
    const welcomeContent = `¡Hola! He procesado el documento **${escapeHtml(state.currentDoc.title)}** (${state.currentDoc.pageCount} páginas, ~${state.currentDoc.wordCount.toLocaleString()} palabras).

Puedes hacerme preguntas específicas sobre su contenido, o usar los botones de acceso rápido aquí abajo para generar un resumen ejecutivo, puntos clave o un cuestionario.`;

    appendMessageUI('assistant', welcomeContent, false);
  } else {
    state.messages.forEach(msg => {
      appendMessageUI(msg.role, msg.content, false);
    });
  }

  scrollToBottom();
}

async function saveMessage(role, content) {
  const msgObj = {
    id: 'msg_' + Date.now(),
    document_id: state.currentDoc ? state.currentDoc.id : null,
    role,
    content,
    created_at: new Date().toISOString()
  };

  state.messages.push(msgObj);

  // Guardar Local
  if (state.currentDoc) {
    try {
      localStorage.setItem(`libra_msgs_${state.currentDoc.id}`, JSON.stringify(state.messages));
    } catch (e) {
      console.warn('LocalStorage limit for messages:', e);
    }
  }
}

function appendMessageUI(role, content, isStreaming = false) {
  const wrapper = document.createElement('div');
  wrapper.className = `message-wrapper ${role}`;

  const avatar = document.createElement('div');
  avatar.className = `message-avatar ${role}`;
  avatar.textContent = role === 'user' ? 'Tú' : 'IA';

  const body = document.createElement('div');
  body.className = 'message-body';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  if (isStreaming) {
    bubble.innerHTML = '<span class="typing-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></span>';
  } else {
    bubble.innerHTML = formatMarkdown(content);
  }

  body.appendChild(bubble);

  // Botón de Copiar para respuestas de IA
  if (role === 'assistant' && !isStreaming) {
    const actions = document.createElement('div');
    actions.className = 'message-actions';
    const copyBtn = document.createElement('button');
    copyBtn.className = 'message-action-btn';
    copyBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      Copiar
    `;
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(content).then(() => {
        copyBtn.textContent = '¡Copiado!';
        setTimeout(() => {
          copyBtn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copiar
          `;
        }, 1500);
      });
    });
    actions.appendChild(copyBtn);
    body.appendChild(actions);
  }

  if (role === 'assistant') {
    wrapper.appendChild(avatar);
    wrapper.appendChild(body);
  } else {
    wrapper.appendChild(body);
    wrapper.appendChild(avatar);
  }

  elements.messagesList.appendChild(wrapper);
  scrollToBottom();
  return { wrapper, bubble, body };
}

// ==============================================================================
// Llamada a OpenAI / Procesamiento Inteligente
// ==============================================================================
async function handleUserMessage(promptText) {
  if (!promptText || !promptText.trim()) return;
  if (!state.currentDoc) {
    showToast('Por favor carga primero un documento PDF.', 'warning');
    return;
  }
  if (state.isGenerating) return;

  const text = promptText.trim();
  elements.chatInput.value = '';
  autoResizeTextarea(elements.chatInput);

  // 1. Mostrar mensaje del usuario
  appendMessageUI('user', text, false);
  await saveMessage('user', text);

  // 2. Preparar UI para la respuesta
  setGeneratingState(true);
  const { bubble, body } = appendMessageUI('assistant', '', true);

  // 3. Verificar si está activo el modo Mock / Simulación
  if (state.mockMode) {
    await simulateAIResponse(text, bubble, body);
    setGeneratingState(false);
    return;
  }

  // 4. Preparar Contexto y Prompt del Sistema
  const docText = prepareDocumentContext(state.currentDoc.fullText || '', 80000);
  
  const systemPrompt = `Eres LibraIA, un asistente analítico especializado en lectura, análisis y comprensión exhaustiva de documentos PDF.
Tu tarea es responder preguntas de manera clara, precisa y profesional basándote en el documento proporcionado.
Si la información no se encuentra en el documento, indícalo cortésmente.
Responde con excelente redacción en formato Markdown (usa títulos concisos, listas estructuradas con viñetas y negritas para resaltar puntos clave).

INFORMACIÓN DEL DOCUMENTO:
- Título: ${state.currentDoc.title}
- Páginas: ${state.currentDoc.pageCount}
- Palabras estimadas: ${state.currentDoc.wordCount}

CONTENIDO DEL DOCUMENTO:
"""
${docText}
"""`;

  // Historial de conversación en formato OpenAI / Groq
  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  const recentHistory = state.messages.slice(-6, -1);
  recentHistory.forEach(m => {
    messages.push({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    });
  });

  // Mensaje actual del usuario
  messages.push({
    role: 'user',
    content: text
  });

  // 5. Llamar a la API de Groq AI (Streaming ultrarrápido compatible con OpenAI)
  state.abortController = new AbortController();

  try {
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.groqKey}`
      },
      body: JSON.stringify({
        model: state.groqModel,
        messages: messages,
        temperature: state.temperature,
        stream: true
      }),
      signal: state.abortController.signal
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const errMsg = errJson.error ? errJson.error.message : response.statusText;
      throw new Error(`Error de Groq (${response.status}): ${errMsg}`);
    }

    // 6. Leer el Stream SSE de Groq en tiempo real
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let assistantReply = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Mantener último fragmento incompleto

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const dataStr = trimmed.replace(/^data:\s*/, '').trim();
        if (dataStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(dataStr);
          const delta = parsed.choices?.[0]?.delta?.content || '';
          if (delta) {
            assistantReply += delta;
            bubble.innerHTML = formatMarkdown(assistantReply);
            scrollToBottom();
          }
        } catch (e) {
          // Ignorar chunks intermedios no válidos
        }
      }
    }

    if (!assistantReply.trim()) {
      assistantReply = 'No se obtuvo respuesta del modelo. Por favor verifica tu consulta.';
      bubble.innerHTML = formatMarkdown(assistantReply);
    }

    // Guardar respuesta final
    await saveMessage('assistant', assistantReply);
    addCopyButtonToBody(body, assistantReply);

  } catch (err) {
    if (err.name === 'AbortError') {
      bubble.innerHTML += '<p><em>[Generación cancelada por el usuario]</em></p>';
      await saveMessage('assistant', bubble.innerText);
    } else {
      console.error('Error generando respuesta con Groq:', err);
      bubble.innerHTML = `
        <div style="color: #ef4444; font-size: 0.85rem;">
          <strong>Error al consultar Groq AI:</strong> ${escapeHtml(err.message)}
          <br><br>
          <small>Puedes verificar tu API Key en los <strong>Ajustes</strong> o activar el <strong>Modo Demostración Inteligente</strong> para probar la app sin conexión.</small>
        </div>
      `;
    }
  } finally {
    setGeneratingState(false);
  }
}

// Preparación y recorte inteligente de texto para no exceder tokens
function prepareDocumentContext(fullText, maxChars = 24000) {
  if (!fullText) return '';
  if (fullText.length <= maxChars) return fullText;

  // Extraer el inicio (primeros 50%), un muestreo intermedio y el final
  const half = Math.floor(maxChars * 0.7);
  const tail = Math.floor(maxChars * 0.3);
  return fullText.slice(0, half) + 
    `\n\n[... CONTENIDO INTERMEDIO RESUMIDO ...] \n\n` + 
    fullText.slice(fullText.length - tail);
}

// Manejador cuando la clave de OpenAI no tiene saldo
async function handleQuotaExhausted(bubble, body, userQuestion) {
  bubble.innerHTML = `
    <div style="background-color: var(--bg-tertiary); border: 1px solid var(--border-medium); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
      <p style="font-weight: 600; margin-bottom: 4px;">⚠️ Saldo de OpenAI agotado (429 Insufficient Quota)</p>
      <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 8px;">
        La clave de OpenAI proporcionada no cuenta con créditos activos actualmente. Puedes recargar saldo en OpenAI o cambiarla en <strong>Ajustes</strong>.
      </p>
      <p style="font-size: 0.82rem; font-weight: 500;">
        💡 <em>Generando análisis con el <strong>Extractor Contextual de LibraIA</strong> para no detenerte...</em>
      </p>
    </div>
  `;

  // Ejecutar respuesta contextual automática basada en el contenido real del PDF
  await simulateAIResponse(userQuestion, bubble, body, true);
}

// Simulación y análisis contextual del PDF sin consumir créditos API
async function simulateAIResponse(promptText, bubble, body, appendNotice = false) {
  const query = promptText.toLowerCase();
  const text = state.currentDoc ? state.currentDoc.fullText : '';
  const pages = state.currentDoc ? (state.currentDoc.pages || []) : [];
  
  // Pequeño delay natural de escritura
  await new Promise(r => setTimeout(r, 600));

  let reply = '';

  if (query.includes('resumen') || query.includes('resumir') || query.includes('ejecutivo')) {
    // Generar resumen estructurado a partir del texto real del PDF
    const firstLines = text.split('\n').filter(l => l.trim().length > 30).slice(0, 8);
    const keySentences = firstLines.join(' ');

    reply = `### 📋 Resumen Ejecutivo de "${escapeHtml(state.currentDoc.title)}"

**Ficha Técnica:**
- **Documento:** ${escapeHtml(state.currentDoc.title)}
- **Extensión:** ${state.currentDoc.pageCount} páginas (${(state.currentDoc.wordCount || 0).toLocaleString()} palabras).

**Objetivo Central:**
El documento presenta un análisis y desglose temático enfocado en los aspectos clave expuestos a lo largo de sus ${state.currentDoc.pageCount} páginas.

**Puntos Principales Identificados:**
1. **Introducción y Contexto:** Establece los fundamentos y antecedentes principales del tema tratado.
2. **Desarrollo Temático:** Expone los datos, argumentos o directrices operativas documentadas.
3. **Métricas y Resultados:** Se hace énfasis en las conclusiones, especificaciones y recomendaciones prácticas.

**Extracto del Inicio del Documento:**
> ${escapeHtml(keySentences.slice(0, 350))}...

*¿Deseas que profundice en alguna página o concepto específico?*`;

  } else if (query.includes('puntos clave') || query.includes('5 puntos') || query.includes('hallazgos')) {
    reply = `### 🔍 5 Puntos Clave del Documento

1. **Estructura General:** El archivo consta de ${state.currentDoc.pageCount} páginas de contenido técnico/documental organizado.
2. **Vocabulario Central:** Se detecta un volumen de ${(state.currentDoc.wordCount || 0).toLocaleString()} palabras con terminología especializada.
3. **Puntos Críticos:** Identifica lineamientos y criterios esenciales para la toma de decisiones o aprendizaje del lector.
4. **Validación de Datos:** Contiene información estructurada apta para revisión o consulta rápida.
5. **Conclusión General:** Proporciona un marco de referencia aplicable directamente a las necesidades del proyecto.`;

  } else if (query.includes('preguntas') || query.includes('respuestas') || query.includes('cuestionario')) {
    reply = `### ❓ Preguntas y Respuestas Clave sobre el PDF

**1. ¿De qué trata principalmente el documento?**
> Aborda de manera directa el tema de *${escapeHtml(state.currentDoc.title)}*, detallando los principios y procedimientos a lo largo de ${state.currentDoc.pageCount} páginas.

**2. ¿A quién está dirigido este material?**
> Diseñado para profesionales, estudiantes o lectores que requieren consultar información precisa y validada.

**3. ¿Qué datos sobresalientes contiene?**
> Aporta especificaciones detalladas organizadas en secciones temáticas con un total de ~${(state.currentDoc.wordCount || 0).toLocaleString()} palabras.

**4. ¿Cómo aprovechar al máximo su contenido?**
> Te sugiero consultar secciones específicas o realizar búsquedas puntuales de términos utilizando la herramienta "Ver Texto".`;

  } else if (query.includes('principiante') || query.includes('sencilla') || query.includes('fácil')) {
    reply = `### 💡 Explicación Sencilla para Principiantes

Imagina que **${escapeHtml(state.currentDoc.title)}** es como una guía paso a paso:
- En lugar de tecnicismos complejos, el documento busca guiar al lector para entender los conceptos básicos desde la primera página hasta la página ${state.currentDoc.pageCount}.
- Resume las mejores prácticas y te explica qué hacer y por qué es importante.
- En palabras simples: es una fuente de referencia ordenada para resolver problemas de manera rápida y eficiente.`;

  } else {
    // Búsqueda contextual directa en el texto del PDF
    const words = query.split(/\s+/).filter(w => w.length > 3);
    let matchedSnippet = '';
    
    for (const page of pages) {
      for (const word of words) {
        if (page.text.toLowerCase().includes(word)) {
          const idx = page.text.toLowerCase().indexOf(word);
          const start = Math.max(0, idx - 100);
          const end = Math.min(page.text.length, idx + 200);
          matchedSnippet += `> (Pág. ${page.pageNum}) "...${page.text.slice(start, end)}..."\n\n`;
          if (matchedSnippet.length > 500) break;
        }
      }
      if (matchedSnippet.length > 500) break;
    }

    if (matchedSnippet) {
      reply = `Encontré las siguientes referencias en el documento vinculadas a tu consulta **"${escapeHtml(promptText)}"**:\n\n${matchedSnippet}\n*Basado en el texto extraído del PDF.*`;
    } else {
      reply = `He analizado las ${state.currentDoc.pageCount} páginas de **${escapeHtml(state.currentDoc.title)}** respecto a tu pregunta: *"**${escapeHtml(promptText)}**"*.

El documento aborda este contexto dentro de sus temas generales. Para una respuesta aún más precisa con OpenAI GPT, puedes recargar saldo en tu cuenta de OpenAI o actualizar la API Key en los **Ajustes** de LibraIA.`;
    }
  }

  // Simular tipeo progresivo
  const initialHtml = appendNotice ? bubble.innerHTML : '';
  const chunks = reply.split(' ');
  let currentText = '';
  
  for (let i = 0; i < chunks.length; i++) {
    currentText += (i === 0 ? '' : ' ') + chunks[i];
    bubble.innerHTML = initialHtml + formatMarkdown(currentText);
    scrollToBottom();
    if (i % 6 === 0) {
      await new Promise(r => setTimeout(r, 40));
    }
  }

  await saveMessage('assistant', reply);
  addCopyButtonToBody(body, reply);
}

function addCopyButtonToBody(body, text) {
  let actions = body.querySelector('.message-actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'message-actions';
    body.appendChild(actions);
  }
  actions.innerHTML = `
    <button class="message-action-btn">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      Copiar
    </button>
  `;
  const btn = actions.querySelector('.message-action-btn');
  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = '¡Copiado!';
      setTimeout(() => {
        btn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          Copiar
        `;
      }, 1500);
    });
  });
}

function setGeneratingState(isGenerating) {
  state.isGenerating = isGenerating;
  elements.sendBtn.style.display = isGenerating ? 'none' : 'flex';
  elements.stopBtn.style.display = isGenerating ? 'flex' : 'none';
  elements.chatInput.disabled = isGenerating;
}

// ==============================================================================
// Utilidades de Texto y Markdown
// ==============================================================================
function formatMarkdown(text) {
  if (!text) return '';
  if (window.marked && typeof window.marked.parse === 'function') {
    return window.marked.parse(text);
  }
  return escapeHtml(text).replace(/\n/g, '<br>');
}


function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function scrollToBottom() {
  if (elements.messagesList) {
    elements.messagesList.scrollTop = elements.messagesList.scrollHeight;
  }
}

function autoResizeTextarea(textarea) {
  if (!textarea) return;
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
}

// ==============================================================================
// Exportación de Conversación
// ==============================================================================
function exportChat() {
  if (!state.currentDoc || state.messages.length === 0) {
    showToast('No hay conversación para exportar.', 'warning');
    return;
  }

  let markdown = `# Conversación con LibraIA - ${state.currentDoc.title}\n`;
  markdown += `*Fecha: ${new Date().toLocaleString()}*\n`;
  markdown += `*Páginas: ${state.currentDoc.pageCount} | Palabras: ${state.currentDoc.wordCount}*\n\n---\n\n`;

  state.messages.forEach(msg => {
    const author = msg.role === 'user' ? '👤 Usuario' : '🤖 LibraIA';
    markdown += `### ${author}\n\n${msg.content}\n\n---\n\n`;
  });

  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `LibraIA_${state.currentDoc.title.replace(/\s+/g, '_')}_chat.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Conversación exportada en formato Markdown', 'success');
}

// ==============================================================================
// Modal de Visor de Texto
// ==============================================================================
function openTextViewModal() {
  if (!state.currentDoc) return;
  elements.textViewDocTitle.textContent = state.currentDoc.title;
  elements.textViewStats.textContent = `${state.currentDoc.pageCount} páginas • ${state.currentDoc.wordCount.toLocaleString()} palabras`;
  
  renderExtractedText(state.currentDoc.fullText);
  elements.textViewModal.style.display = 'flex';
}

function renderExtractedText(textToRender, searchKeyword = '') {
  if (!elements.extractedTextContent) return;

  if (!textToRender || !textToRender.trim()) {
    elements.extractedTextContent.textContent = 'No se encontró texto en este documento.';
    return;
  }

  if (searchKeyword.trim()) {
    const regex = new RegExp(`(${escapeRegExp(searchKeyword)})`, 'gi');
    const highlighted = escapeHtml(textToRender).replace(regex, '<mark style="background:#fef08a;color:#000;">$1</mark>');
    elements.extractedTextContent.innerHTML = highlighted;
  } else {
    elements.extractedTextContent.textContent = textToRender;
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ==============================================================================
// Modal de Ajustes
// ==============================================================================
function updateSettingsInputs() {
  if (elements.groqKeyInput) elements.groqKeyInput.value = state.groqKey;
  if (elements.modelSelect) elements.modelSelect.value = state.groqModel;
  if (elements.temperatureInput) elements.temperatureInput.value = state.temperature;
  if (elements.tempValue) elements.tempValue.textContent = state.temperature;
  if (elements.mockModeToggle) elements.mockModeToggle.checked = state.mockMode;
}

function saveSettings() {
  state.groqKey = elements.groqKeyInput.value.trim() || DEFAULT_GROQ_KEY;
  state.groqModel = elements.modelSelect.value;
  state.temperature = parseFloat(elements.temperatureInput.value);
  state.mockMode = elements.mockModeToggle.checked;

  localStorage.setItem('libra_groq_key', state.groqKey);
  localStorage.setItem('libra_groq_model', state.groqModel);
  localStorage.setItem('libra_temperature', state.temperature.toString());
  localStorage.setItem('libra_mock_mode', state.mockMode.toString());

  elements.settingsModal.style.display = 'none';
  showToast('Configuraciones guardadas correctamente', 'success');
}

// ==============================================================================
// Notificaciones Toast
// ==============================================================================
function showToast(message, type = 'info') {
  if (!elements.toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✓';
  if (type === 'error') icon = '✕';
  if (type === 'warning') icon = '⚠';

  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

// ==============================================================================
// Event Listeners
// ==============================================================================
function setupEventListeners() {
  // Tema
  elements.themeToggleBtn.addEventListener('click', toggleTheme);

  // Sidebar en Móvil
  function toggleMobileSidebar(open) {
    if (open) {
      elements.sidebar.classList.add('open');
      elements.sidebarOverlay?.classList.add('active');
    } else {
      elements.sidebar.classList.remove('open');
      elements.sidebarOverlay?.classList.remove('active');
    }
  }

  elements.openSidebarBtn?.addEventListener('click', () => toggleMobileSidebar(true));
  elements.mobileChatMenuBtn?.addEventListener('click', () => toggleMobileSidebar(true));
  elements.closeSidebarBtn?.addEventListener('click', () => toggleMobileSidebar(false));
  elements.sidebarOverlay?.addEventListener('click', () => toggleMobileSidebar(false));

  // Carga de Archivos
  elements.newDocBtn.addEventListener('click', () => elements.fileInput.click());
  elements.selectFileBtn.addEventListener('click', () => elements.fileInput.click());
  elements.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
      e.target.value = '';
    }
  });

  // Drag & Drop
  const dropBox = elements.dropzoneBox;
  ['dragenter', 'dragover'].forEach(eventName => {
    dropBox.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropBox.classList.add('drag-over');
    });
  });
  ['dragleave', 'drop'].forEach(eventName => {
    dropBox.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropBox.classList.remove('drag-over');
    });
  });
  dropBox.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt.files && dt.files.length > 0) {
      handleFileSelect(dt.files[0]);
    }
  });

  // Formulario de Chat
  elements.chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleUserMessage(elements.chatInput.value);
  });

  elements.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleUserMessage(elements.chatInput.value);
    }
  });

  elements.chatInput.addEventListener('input', () => {
    autoResizeTextarea(elements.chatInput);
  });

  // Botón Detener Generación
  elements.stopBtn.addEventListener('click', () => {
    if (state.abortController) {
      state.abortController.abort();
    }
  });

  // Chips de Preguntas Rápidas
  elements.quickPromptsBar.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) {
      const prompt = chip.getAttribute('data-prompt');
      handleUserMessage(prompt);
    }
  });

  // Acciones de Cabecera y Visor de PDF (Botón único para Abrir / Ocultar PDF)
  if (elements.viewPdfBtn) {
    elements.viewPdfBtn.addEventListener('click', () => {
      if (!elements.pdfViewerPanel) return;
      const isCurrentlyCollapsed = elements.pdfViewerPanel.classList.contains('collapsed');
      if (isCurrentlyCollapsed) {
        elements.pdfViewerPanel.classList.remove('collapsed');
        updatePdfViewerVisibility(true);
      } else {
        elements.pdfViewerPanel.classList.add('collapsed');
        updatePdfViewerVisibility(false);
      }
    });
  }

  if (elements.closePdfPanelBtn) {
    elements.closePdfPanelBtn.addEventListener('click', () => {
      if (elements.pdfViewerPanel) {
        elements.pdfViewerPanel.classList.add('collapsed');
        updatePdfViewerVisibility(false);
      }
    });
  }

  // Navegación de páginas en el visor de PDF
  if (elements.pdfPrevPageBtn) {
    elements.pdfPrevPageBtn.addEventListener('click', () => {
      navigateToPdfPage(Math.max(1, state.currentPageNum - 1));
    });
  }

  if (elements.pdfNextPageBtn) {
    elements.pdfNextPageBtn.addEventListener('click', () => {
      const maxPage = state.currentDoc?.pageCount || state.pdfDocProxy?.numPages || 1;
      navigateToPdfPage(Math.min(maxPage, state.currentPageNum + 1));
    });
  }

  if (elements.pdfPageInput) {
    elements.pdfPageInput.addEventListener('change', (e) => {
      const n = parseInt(e.target.value, 10);
      if (!isNaN(n) && n >= 1) navigateToPdfPage(n);
    });
  }

  // Controles de Zoom del Visor de PDF
  if (elements.pdfZoomInBtn) {
    elements.pdfZoomInBtn.addEventListener('click', () => {
      state.pdfZoomScale = Math.min(3.0, state.pdfZoomScale + 0.2);
      rerenderPdfAtScale();
    });
  }

  if (elements.pdfZoomOutBtn) {
    elements.pdfZoomOutBtn.addEventListener('click', () => {
      state.pdfZoomScale = Math.max(0.4, state.pdfZoomScale - 0.2);
      rerenderPdfAtScale();
    });
  }

  if (elements.pdfFitWidthBtn) {
    elements.pdfFitWidthBtn.addEventListener('click', async () => {
      if (state.pdfDocProxy) {
        await renderVisualPdf(state.pdfDocProxy);
      }
    });
  }

  elements.exportChatBtn.addEventListener('click', exportChat);
  elements.clearChatBtn.addEventListener('click', () => {
    if (confirm('¿Deseas reiniciar la conversación de este documento?')) {
      if (state.currentDoc) {
        localStorage.removeItem(`libra_msgs_${state.currentDoc.id}`);
        loadMessagesForDoc(state.currentDoc.id);
        showToast('Conversación reiniciada', 'info');
      }
    }
  });

  // Modales - Ajustes
  elements.openSettingsBtn.addEventListener('click', () => {
    updateSettingsInputs();
    elements.settingsModal.style.display = 'flex';
  });
  elements.closeSettingsModalBtn.addEventListener('click', () => {
    elements.settingsModal.style.display = 'none';
  });
  elements.cancelSettingsBtn.addEventListener('click', () => {
    elements.settingsModal.style.display = 'none';
  });
  elements.saveSettingsBtn.addEventListener('click', saveSettings);

  elements.toggleKeyVisibilityBtn.addEventListener('click', () => {
    const input = elements.groqKeyInput;
    if (input.type === 'password') {
      input.type = 'text';
      elements.toggleKeyVisibilityBtn.textContent = 'Ocultar';
    } else {
      input.type = 'password';
      elements.toggleKeyVisibilityBtn.textContent = 'Mostrar';
    }
  });

  elements.temperatureInput.addEventListener('input', (e) => {
    elements.tempValue.textContent = e.target.value;
  });

  // Modal - Visor de Texto
  elements.closeTextViewModalBtn.addEventListener('click', () => {
    elements.textViewModal.style.display = 'none';
  });
  elements.copyExtractedTextBtn.addEventListener('click', () => {
    if (state.currentDoc && state.currentDoc.fullText) {
      navigator.clipboard.writeText(state.currentDoc.fullText).then(() => {
        showToast('Texto completo copiado al portapapeles', 'success');
      });
    }
  });
  elements.searchTextInDoc.addEventListener('input', (e) => {
    if (state.currentDoc) {
      renderExtractedText(state.currentDoc.fullText, e.target.value);
    }
  });

  // Cerrar modales con clic en fondo
  [elements.settingsModal, elements.textViewModal].forEach(modal => {
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  });

  // Cerrar con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (elements.settingsModal) elements.settingsModal.style.display = 'none';
      if (elements.textViewModal) elements.textViewModal.style.display = 'none';
    }
  });
}
