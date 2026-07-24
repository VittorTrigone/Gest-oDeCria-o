/* ==========================================================================
   Creative Sector Manager Hub - Store (State & LocalStorage Management)
   ========================================================================== */

const STORAGE_KEY = 'creative_sector_manager_v5';

// Helper to create empty Olist Checklist (matching Imagem 1)
const createDefaultOlistChecklist = () => ({
    dadosGerais: {
        tipoProduto: false,
        titulo: false,
        ean: false,
        origem: false,
        unidadeMedida: false,
        sku: false,
        precoVenda: false,
        pesoLiqBruto: false,
        largura: false,
        altura: false,
        comprimento: false
    },
    dadosComplementares: {
        categoria: false,
        marca: false,
        descricao: false,
        imagens: false
    },
    outros: {
        unidadePorCaixa: false,
        garantia: false,
        fornecedor: false
    }
});

// Helper to create Image Checklist (Etapa 2)
const createDefaultImageChecklist = () => ({
    fotosEstudio: false,
    mockup3D: false,
    fundoNeutro: false,
    tratamento4k: false,
    vinculoOlist: false
});

// Helper to create Marketplaces Pricing Table (Etapa 3)
const createDefaultChannelPrices = () => ({
    shopee1: 0,
    shopee2: 0,
    mercadolivre1_classico: 0,
    mercadolivre1_premium: 0,
    mercadolivre2_classico: 0,
    mercadolivre2_premium: 0,
    magalu1: 0,
    magalu2: 0,
    amazon: 0,
    shein: 0,
    tiktok: 0,
    yampi: 0
});

// Helper to create empty Marketplaces Checklist (Etapa 5, Imagens 2, 3, 4)
const createDefaultMarketplacesChecklist = () => ({
    shopee1: { disabled: false, assignee: 'Nenhum', canaisEnvio: false, preco: false, otimizacao: false, promocao: false, sincronizacaoTiny: false },
    shopee2: { disabled: false, assignee: 'Nenhum', canaisEnvio: false, preco: false, otimizacao: false, promocao: false, sincronizacaoTiny: false },
    mercadolivre1: { 
        disabled: false, 
        assignee: 'Nenhum', 
        clip: false, 
        classico: { preco: false, promocao: false, frete: false, sincronizacaoTiny: false }, 
        premium: { preco: false, promocao: false, frete: false, sincronizacaoTiny: false } 
    },
    mercadolivre2: { 
        disabled: false, 
        assignee: 'Nenhum', 
        clip: false, 
        classico: { preco: false, promocao: false, frete: false, sincronizacaoTiny: false }, 
        premium: { preco: false, promocao: false, frete: false, sincronizacaoTiny: false } 
    },
    magalu1: { disabled: false, assignee: 'Nenhum', preco: false, promocao: false, sincronizacaoTiny: false },
    magalu2: { disabled: false, assignee: 'Nenhum', preco: false, promocao: false, sincronizacaoTiny: false },
    amazon: { disabled: false, assignee: 'Nenhum', preco: false, sincronizacaoTiny: false },
    shein: { disabled: false, assignee: 'Nenhum', preco: false, sincronizacaoTiny: false },
    tiktok: { disabled: false, assignee: 'Nenhum', preco: false, promocao: false, sincronizacaoTiny: false },
    yampi: { disabled: false, assignee: 'Nenhum', preco: false, promocao: false, sincronizacaoTiny: false }
});

const defaultState = {
    auth: {
        currentUser: null
    },
    editRequests: [],
    employees: [
        {
            id: 'emp-1',
            name: 'Vittor',
            role: 'Gerente do Setor de Criação',
            avatar: 'V',
            avatarBg: 'var(--primary)',
            skills: ['Gerenciamento', 'Precificação', 'Marketplaces'],
            maxCapacity: 30,
            currentWorkload: 3,
            performanceRating: 5.0,
            email: 'vittor@emporioctz.com.br',
            sysRole: 'manager',
            password: 'Vittor381*',
            mustChangePassword: false
        }
    ],

    products: [],

    approvals: [],

    announcements: [],

    chatMessages: [],

    personalTasks: [],

    editRequests: [],

    stageAssignees: {},

    auditLogs: []
};

class SectorStore {
    constructor() {
        this.listeners = [];
        this.isSyncing = false;
        
        // 1. Carrega o auth localmente para não perder a sessão
        let localAuth = { currentUser: null };
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.auth) localAuth = parsed.auth;
            }
        } catch(e) {}
        
        // 2. Estado inicial básico
        this.state = JSON.parse(JSON.stringify(defaultState));
        this.state.auth = localAuth;

        // 3. Tenta conectar ao Firebase se disponível
        if (window.firebaseDB) {
            this.showLoadingOverlay();
            this.dbRef = window.firebaseDB.collection('kanban').doc('mainState');
            this.setupFirebaseSync();
        } else {
            // Fallback para caso o Firebase não carregue
            this.state = this.loadStateLocal();
        }
    }

    showLoadingOverlay() {
        let loader = document.getElementById('firebase-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'firebase-loader';
            loader.innerHTML = '<div class="modal-card" style="text-align:center;"><h3><div class="logo-badge" style="display:inline-flex; vertical-align:middle; margin-right: 10px; animation: spin 2s linear infinite;">SC</div> Conectando...</h3><p style="margin-top:10px; color:var(--text-muted);">Sincronizando com a nuvem</p></div>';
            loader.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.95);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px);';
            document.body.appendChild(loader);
        }
    }

    hideLoadingOverlay() {
        const loader = document.getElementById('firebase-loader');
        if (loader) loader.remove();
    }

    setupFirebaseSync() {
        this.dbRef.onSnapshot((docSnap) => {
            if (docSnap.exists) {
                const remoteState = docSnap.data();
                // Preserva a autenticação local e funde com dados remotos
                const currentUser = this.state.auth.currentUser;
                this.state = { ...defaultState, ...remoteState, auth: { currentUser } };
                
                // Força atualização das credenciais do gerente principal
                const manager = this.state.employees.find(e => e.id === 'emp-1');
                if (manager) {
                    manager.name = 'Vittor';
                    manager.password = 'Vittor381*';
                    manager.email = 'vittor@emporioctz.com.br';
                }
            } else {
                // Documento não existe, usar o default
                this.saveToFirebase();
            }
            
            // Cache local do estado recebido
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)); } catch(e) {}
            
            this.hideLoadingOverlay();
            this.notify();
        }, (error) => {
            console.error("Erro no Firebase Sync:", error);
            if (window.app) window.app.showToast('Erro ao sincronizar. Usando modo offline.', 'error');
            this.state = this.loadStateLocal();
            this.hideLoadingOverlay();
            this.notify();
        });
    }

    loadStateLocal() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                return { ...defaultState, ...parsed, auth: parsed.auth || defaultState.auth };
            }
        } catch (e) {}
        return JSON.parse(JSON.stringify(defaultState));
    }

    saveState(newState = this.state) {
        this.state = newState;
        
        // Salva cache local
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        } catch (e) {}

        if (this.dbRef) {
            this.saveToFirebase();
        }
        
        this.notify();
    }
    
    saveToFirebase() {
        if (this.isSyncing) return;
        this.isSyncing = true;
        
        // Não envia a sessão local para a nuvem
        const dataToSave = { ...this.state };
        delete dataToSave.auth;

        this.dbRef.set(dataToSave).finally(() => {
            this.isSyncing = false;
        });
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => { this.listeners = this.listeners.filter(l => l !== listener); };
    }

    notify() { this.listeners.forEach(listener => listener(this.state)); }

    resetToDefault() {
        this.state = JSON.parse(JSON.stringify(defaultState));
        this.saveState();
    }

    // --- EMPLOYEES CRUD ---
    getEmployees() { return this.state.employees; }
    getEmployeeById(id) {
        return this.state.employees.find(e => e.id === id);
    }

    // --- PIPELINE STAGE ASSIGNMENTS ---
    updateStageAssignee(stage, employeeId) {
        this.state.stageAssignees[stage] = employeeId;
        this.saveState();
    }

    addEmployee(empData) {
        const newEmp = {
            id: 'emp-' + Date.now(),
            name: empData.name,
            role: empData.role,
            avatar: empData.name.charAt(0).toUpperCase(),
            avatarBg: `hsl(${Math.random() * 360}, 70%, 50%)`,
            skills: empData.skills || [],
            maxCapacity: empData.maxCapacity || 5,
            currentWorkload: 0,
            performanceRating: 5.0,
            email: empData.email || '',
            sysRole: 'employee',
            password: '123'
        };
        this.state.employees.push(newEmp);
        this.saveState();
        return newEmp;
    }

    updateEmployee(id, updatedFields) {
        const emp = this.getEmployeeById(id);
        if (emp) {
            Object.assign(emp, updatedFields);
            this.saveState();
        }
    }

    deleteEmployee(id) {
        if (id === 'emp-1') return; // Prevenir exclusão do gerente root
        
        // Trava de backend: Apenas gerentes podem excluir colaboradores
        if (this.state.auth.currentUser && this.state.auth.currentUser.role !== 'manager') {
            if (window.app) window.app.showToast('Sem permissão para excluir colaboradores.', 'error');
            return;
        }

        this.state.employees = this.state.employees.filter(e => e.id !== id);
        this.saveState();
    }

    // --- PRODUCTS CRUD ---
    getProducts() { return this.state.products; }
    getProductById(id) { return this.state.products.find(p => p.id === id); }

    addProduct(prodData) {
        const newProduct = {
            id: 'prod-' + Date.now(),
            createdAt: new Date().toISOString().split('T')[0],
            stage: 'olist_setup',
            tags: ['Olist'],
            checklistOlist: createDefaultOlistChecklist(),
            checklistImages: createDefaultImageChecklist(),
            channelPrices: createDefaultChannelPrices(),
            marketplaces: createDefaultMarketplacesChecklist(),
            ...prodData
        };

        if (newProduct.assigneeId) {
            const emp = this.getEmployeeById(newProduct.assigneeId);
            if (emp) {
                emp.currentWorkload += 1;
                newProduct.assigneeName = emp.name;
            }
        }

        this.state.products.push(newProduct);
        this.saveState();
        
        this.addAuditLog('CRIAR_PRODUTO', newProduct.id, newProduct.title, `Produto adicionado à esteira na etapa inicial.`);
        
        return newProduct;
    }

    // ==========================================
    // AUDIT LOG SYSTEM
    // ==========================================
    addAuditLog(action, productId = null, productName = null, details = '') {
        const user = this.state.auth.currentUser || { name: 'Sistema', role: 'system' };
        
        const newLog = {
            id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            timestamp: new Date().toISOString(),
            action: action,
            userId: user.id,
            userName: user.name,
            productId: productId,
            productName: productName,
            details: details
        };
        
        this.state.auditLogs.unshift(newLog);
        this.saveState();
    }

    _applyStageAssignee(product) {
        if (!product || !product.stage) return;
        
        // Zera permissões temporárias sempre que muda de etapa
        product.allowedEditors = [];
        
        // Aplica o assignee se houver configuração
        const autoAssigneeId = this.state.stageAssignees[product.stage];
        if (autoAssigneeId) {
            const emp = this.getEmployeeById(autoAssigneeId);
            if (emp) {
                // Remove the task from current assignee's workload if changed
                if (product.assigneeId && product.assigneeId !== autoAssigneeId) {
                    const oldEmp = this.getEmployeeById(product.assigneeId);
                    if (oldEmp) oldEmp.currentWorkload = Math.max(0, oldEmp.currentWorkload - 1);
                }
                
                product.assigneeId = emp.id;
                product.assigneeName = emp.name;
            }
        }
    }

    updateProductStage(productId, newStage) {
        const product = this.getProductById(productId);
        if (product) {
            const oldStage = product.stage;
            product.stage = newStage;
            this._applyStageAssignee(product);
            this.saveState();
            
            this.addAuditLog('ALTERAR_ETAPA', product.id, product.title, `Etapa alterada manualmente de ${oldStage} para ${newStage}.`);
        }
    }

    advanceProductStage(productId) {
        const product = this.getProductById(productId);
        if (!product) return;

        const stageOrder = ['olist_setup', 'images', 'pricing', 'verification', 'marketplaces'];
        const currentIdx = stageOrder.indexOf(product.stage);

        if (currentIdx >= 0 && currentIdx < stageOrder.length - 1) {
            const oldStage = product.stage;
            const newStage = stageOrder[currentIdx + 1];
            product.stage = newStage;
            this._applyStageAssignee(product);
            this.saveState();
            
            this.addAuditLog('AVANCAR_ETAPA', product.id, product.title, `Produto avançado de ${oldStage} para ${newStage}.`);
        } else if (currentIdx === stageOrder.length - 1) {
            product.stage = 'completed';
            this.saveState();
            this.addAuditLog('AVANCAR_ETAPA', product.id, product.title, `Produto marcado como concluído.`);
        }
    }

    finishProduct(productId) {
        const product = this.getProductById(productId);
        if (product) {
            product.stage = 'completed';
            this.saveState();
        }
    }

    isStageComplete(product) {
        if (!product || !product.stage) return false;
        
        if (product.stage === 'olist_setup') {
            if (!product.checklistOlist) return false;
            let total = 18, checked = 0;
            Object.values(product.checklistOlist).forEach(group => {
                if (group) Object.values(group).forEach(v => { if (v) checked++; });
            });
            return checked === total;
        } 
        else if (product.stage === 'images') {
            if (!product.checklistImages) return false;
            let total = 5, checked = 0;
            Object.values(product.checklistImages).forEach(v => { if (v) checked++; });
            return checked === total;
        } 
        else if (product.stage === 'pricing') {
            if (!product.channelPrices) return false;
            let total = 12, filled = 0;
            Object.values(product.channelPrices).forEach(v => { if (v > 0) filled++; });
            return filled === total;
        } 
        else if (product.stage === 'verification') {
            return true; // No checklist for verification
        } 
        else if (product.stage === 'marketplaces') {
            if (!product.marketplaces) return false;
            let total = 10, count = 0;
            Object.values(product.marketplaces).forEach(m => {
                if (m.disabled || m.sincronizacaoTiny || (m.classico && m.classico.sincronizacaoTiny)) count++;
            });
            return count === total;
        }
        
        return true;
    }

    calculateProductProgress(product) {
        if (!product) return 0;
        if (product.stage === 'completed') return 100;

        const stageBase = {
            olist_setup: 0,
            images: 20,
            pricing: 40,
            verification: 60,
            marketplaces: 80
        };

        let base = stageBase[product.stage] !== undefined ? stageBase[product.stage] : 0;
        let bonus = 0;

        if (product.stage === 'olist_setup' && product.checklistOlist) {
            let total = 0, checked = 0;
            ['dadosGerais', 'dadosComplementares', 'outros'].forEach(g => {
                if (product.checklistOlist[g]) {
                    Object.values(product.checklistOlist[g]).forEach(v => {
                        total++;
                        if (v) checked++;
                    });
                }
            });
            bonus = total > 0 ? (checked / total) * 20 : 0;
        } else if (product.stage === 'images' && product.checklistImages) {
            let total = 5, checked = 0;
            Object.values(product.checklistImages).forEach(v => { if (v) checked++; });
            bonus = (checked / total) * 20;
        } else if (product.stage === 'pricing' && product.channelPrices) {
            let total = 12, filled = 0;
            Object.values(product.channelPrices).forEach(v => { if (v > 0) filled++; });
            bonus = (filled / total) * 20;
        } else if (product.stage === 'verification') {
            bonus = 15;
        } else if (product.stage === 'marketplaces' && product.marketplaces) {
            let total = 10, count = 0;
            Object.values(product.marketplaces).forEach(m => {
                if (m.disabled || m.sincronizacaoTiny || (m.classico && m.classico.sincronizacaoTiny)) count++;
            });
            bonus = (count / total) * 19;
        }

        return Math.min(99, Math.round(base + bonus));
    }

    updateProduct(productId, updatedFields) {
        const product = this.getProductById(productId);
        if (product) {
            const oldStage = product.stage;
            Object.assign(product, updatedFields);
            
            if (updatedFields.stage && updatedFields.stage !== oldStage) {
                this._applyStageAssignee(product);
                this.addAuditLog('ALTERAR_ETAPA', product.id, product.title, `Etapa alterada via edição de formulário para ${updatedFields.stage}.`);
            } else {
                this.addAuditLog('EDITAR_PRODUTO', product.id, product.title, `Informações do produto atualizadas.`);
            }
            
            this.saveState();
        }
    }

    toggleOlistCheckitem(productId, categoryGroup, itemKey) {
        const product = this.getProductById(productId);
        if (product && product.checklistOlist && product.checklistOlist[categoryGroup]) {
            product.checklistOlist[categoryGroup][itemKey] = !product.checklistOlist[categoryGroup][itemKey];
            this.saveState();
            const checkedStr = product.checklistOlist[categoryGroup][itemKey] ? 'marcado' : 'desmarcado';
            this.addAuditLog('ALTERAR_CHECKLIST', product.id, product.title, `Item do Olist (${categoryGroup}.${itemKey}) foi ${checkedStr}.`);
        }
    }

    toggleImageCheckitem(productId, itemKey) {
        const product = this.getProductById(productId);
        if (product && product.checklistImages) {
            product.checklistImages[itemKey] = !product.checklistImages[itemKey];
            this.saveState();
            const checkedStr = product.checklistImages[itemKey] ? 'marcada' : 'desmarcada';
            this.addAuditLog('ALTERAR_CHECKLIST', product.id, product.title, `Foto/Mídia (${itemKey}) foi ${checkedStr}.`);
        }
    }

    updateChannelPrices(productId, newPrices) {
        const product = this.getProductById(productId);
        if (product) {
            product.channelPrices = { ...product.channelPrices, ...newPrices };
            this.saveState();
            this.addAuditLog('ALTERAR_CHECKLIST', product.id, product.title, `Preços de Marketplaces foram atualizados.`);
        }
    }

    toggleMarketplaceDisabled(productId, mktKey) {
        const product = this.getProductById(productId);
        if (product && product.marketplaces && product.marketplaces[mktKey]) {
            product.marketplaces[mktKey].disabled = !product.marketplaces[mktKey].disabled;
            this.saveState();
            const disabledStr = product.marketplaces[mktKey].disabled ? 'Desativado' : 'Reativado';
            this.addAuditLog('ALTERAR_CHECKLIST', product.id, product.title, `Marketplace (${mktKey}) foi ${disabledStr}.`);
        }
    }

    toggleMarketplaceCheckitem(productId, mktKey, subPath) {
        const product = this.getProductById(productId);
        if (!product || !product.marketplaces || !product.marketplaces[mktKey]) return;

        const mktObj = product.marketplaces[mktKey];
        let newValue = false;
        if (subPath.includes('.')) {
            const [group, key] = subPath.split('.');
            if (mktObj[group] && typeof mktObj[group][key] === 'boolean') {
                mktObj[group][key] = !mktObj[group][key];
                newValue = mktObj[group][key];
            }
        } else if (typeof mktObj[subPath] === 'boolean') {
            mktObj[subPath] = !mktObj[subPath];
            newValue = mktObj[subPath];
        }
        this.saveState();
        const checkedStr = newValue ? 'marcado' : 'desmarcado';
        this.addAuditLog('ALTERAR_CHECKLIST', product.id, product.title, `Checklist Marketplaces (${mktKey} -> ${subPath}) foi ${checkedStr}.`);
    }

    deleteProduct(productId) {
        if (this.state.auth.currentUser && this.state.auth.currentUser.role !== 'manager') {
            if (window.app) window.app.showToast('Sem permissão para excluir produtos.', 'error');
            return;
        }

        const product = this.getProductById(productId);
        if (product) {
            if (product.assigneeId) {
                const emp = this.getEmployeeById(product.assigneeId);
                if (emp) emp.currentWorkload = Math.max(0, emp.currentWorkload - 1);
            }
            this.state.products = this.state.products.filter(p => p.id !== productId);
            this.saveState();
            this.addAuditLog('EXCLUIR_PRODUTO', productId, product.title, `Produto excluído permanentemente.`);
        }
    }

    // --- APPROVALS CRUD ---
    getApprovals() { return this.state.approvals; }
    updateApprovalStatus(id, status, rejectReason = '') {
        const app = this.state.approvals.find(a => a.id === id);
        if (app) {
            app.status = status;
            if (rejectReason) app.rejectReason = rejectReason;
            this.saveState();
        }
    }

    // --- ANNOUNCEMENTS CRUD ---
    getAnnouncements() { return this.state.announcements; }
    addAnnouncement(annData) {
        const newAnn = {
            id: 'ann-' + Date.now(),
            date: new Date().toISOString().split('T')[0],
            author: 'Vittor (Gerente)',
            priority: 'normal',
            ...annData
        };
        this.state.announcements.unshift(newAnn);
        this.saveState();
        this.addAuditLog('CRIAR_AVISO', null, null, `Aviso adicionado ao mural: "${newAnn.title}"`);
        return newAnn;
    }
    deleteAnnouncement(id) {
        const ann = this.state.announcements.find(a => a.id === id);
        if (ann) {
            this.state.announcements = this.state.announcements.filter(a => a.id !== id);
            this.saveState();
            this.addAuditLog('EXCLUIR_AVISO', null, null, `Aviso excluído do mural: "${ann.title}"`);
        }
    }

    // --- TEAM CHAT ---
    getChatMessages(channel = 'geral') {
        return (this.state.chatMessages || []).filter(m => m.channel === channel);
    }
    addChatMessage(channel, text) {
        if (!this.state.chatMessages) this.state.chatMessages = [];
        
        const currentUser = this.state.auth.currentUser || this.state.employees[0];
        const now = Date.now();

        const newMsg = {
            id: 'msg-' + now,
            channel,
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderAvatar: currentUser.avatar,
            avatarBg: currentUser.avatarBg || '#6366f1',
            text,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            timestampMs: now
        };
        this.state.chatMessages.push(newMsg);
        this.saveState();
        return newMsg;
    }

    markChannelAsRead(channelKey) {
        const currentUser = this.state.auth.currentUser;
        if (!currentUser) return;
        
        const emp = this.state.employees.find(e => e.id === currentUser.id);
        if (emp) {
            if (!emp.chatReadTimestamps) emp.chatReadTimestamps = {};
            emp.chatReadTimestamps[channelKey] = Date.now();
            
            // Atualiza o currentUser atual também
            currentUser.chatReadTimestamps = emp.chatReadTimestamps;
            
            this.saveState();
        }
    }

    getUnreadMessagesCount() {
        const currentUser = this.state.auth.currentUser;
        if (!currentUser) return 0;

        const readTimestamps = currentUser.chatReadTimestamps || {};
        let unreadCount = 0;

        (this.state.chatMessages || []).forEach(msg => {
            // Se a msg for do próprio usuário, ignora
            if (msg.senderId === currentUser.id) return;
            
            // Se for canal geral ou uma DM envolvendo o usuário
            if (msg.channel.startsWith('dm_') && !msg.channel.includes(currentUser.id)) return;

            const msgTime = msg.timestampMs || parseInt(msg.id.split('-')[1]) || 0;
            const lastRead = readTimestamps[msg.channel] || 0;

            if (msgTime > lastRead) {
                unreadCount++;
            }
        });

        return unreadCount;
    }

    getUnreadCountForChannel(channelKey) {
        const currentUser = this.state.auth.currentUser;
        if (!currentUser) return 0;

        const readTimestamps = currentUser.chatReadTimestamps || {};
        let unreadCount = 0;

        (this.state.chatMessages || []).forEach(msg => {
            if (msg.channel !== channelKey) return;
            if (msg.senderId === currentUser.id) return;

            const msgTime = msg.timestampMs || parseInt(msg.id.split('-')[1]) || 0;
            const lastRead = readTimestamps[channelKey] || 0;

            if (msgTime > lastRead) {
                unreadCount++;
            }
        });

        return unreadCount;
    }

    // --- INDIVIDUAL TASKS & ASSIGNMENTS ---
    getEmployeeAssignedProducts(employeeId) {
        if (!employeeId) return [];
        return (this.state.products || []).filter(p => p.assigneeId === employeeId && p.stage !== 'completed');
    }

    getPersonalTasks(employeeId) {
        if (!this.state.personalTasks) this.state.personalTasks = [];
        if (!employeeId) return this.state.personalTasks;
        return this.state.personalTasks.filter(t => t.employeeId === employeeId);
    }

    addPersonalTask(employeeId, text) {
        if (!this.state.personalTasks) this.state.personalTasks = [];
        const newTask = {
            id: 'pt-' + Date.now(),
            employeeId,
            text,
            completed: false,
            createdAt: new Date().toISOString().split('T')[0]
        };
        this.state.personalTasks.unshift(newTask);
        this.saveState();
        
        this.addAuditLog('CRIAR_TAREFA', null, null, `Nova tarefa pessoal adicionada: "${text}"`);
        
        return newTask;
    }

    togglePersonalTask(taskId) {
        if (!this.state.personalTasks) return;
        const task = this.state.personalTasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            this.saveState();
            this.addAuditLog('CONCLUIR_TAREFA', null, null, `Tarefa pessoal "${task.text}" marcada como ${task.completed ? 'Concluída' : 'Pendente'}.`);
        }
    }

    deletePersonalTask(taskId) {
        if (!this.state.personalTasks) return;
        const task = this.state.personalTasks.find(t => t.id === taskId);
        if (task) {
            this.state.personalTasks = this.state.personalTasks.filter(t => t.id !== taskId);
            this.saveState();
            this.addAuditLog('EXCLUIR_TAREFA', null, null, `Tarefa pessoal excluída: "${task.text}"`);
        }
    }
}

window.store = new SectorStore();
