/* ==========================================================================
   Creative Sector Manager Hub - Kanban Product Pipeline Module (Stage-Aware)
   ========================================================================== */

class KanbanModule {
    constructor() {
        this.currentFilterSearch = '';
        this.currentFilterAssignee = 'all';
        this.currentFilterPriority = 'all';
        this.draggedProductId = null;
        this.activeModalProductId = null;
        this.init();
    }

    init() {
        window.store.subscribe(() => this.render());
        this.bindEvents();
        this.render();
    }

    bindEvents() {
        const searchInput = document.getElementById('kanban-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilterSearch = e.target.value.toLowerCase().trim();
                this.render();
            });
        }

        const assigneeSelect = document.getElementById('kanban-filter-assignee');
        if (assigneeSelect) {
            assigneeSelect.addEventListener('change', (e) => {
                this.currentFilterAssignee = e.target.value;
                this.render();
            });
        }

        const prioritySelect = document.getElementById('kanban-filter-priority');
        if (prioritySelect) {
            prioritySelect.addEventListener('change', (e) => {
                this.currentFilterPriority = e.target.value;
                this.render();
            });
        }

        const addProductForm = document.getElementById('form-add-product');
        if (addProductForm) {
            addProductForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateProduct(e.target);
            });
        }

        // --- Drag to Scroll na Kanban Board ---
        const board = document.querySelector('.kanban-board');
        if (board) {
            let isDown = false;
            let startX;
            let scrollLeft;

            board.addEventListener('mousedown', (e) => {
                // Ignore drags on actual cards to not interfere with standard clicks
                if (e.target.closest('.kanban-card')) return; 
                isDown = true;
                board.style.cursor = 'grabbing';
                startX = e.pageX - board.offsetLeft;
                scrollLeft = board.scrollLeft;
            });
            board.addEventListener('mouseleave', () => {
                isDown = false;
                board.style.cursor = '';
            });
            board.addEventListener('mouseup', () => {
                isDown = false;
                board.style.cursor = '';
            });
            board.addEventListener('mousemove', (e) => {
                if (!isDown) return;
                e.preventDefault();
                const x = e.pageX - board.offsetLeft;
                const walk = (x - startX) * 1.5; // Multiplicador de velocidade
                board.scrollLeft = scrollLeft - walk;
            });
            
            // Mouse wheel horizontal scroll
            board.addEventListener('wheel', (e) => {
                // Se estiver dentro de uma coluna de cards e ela tiver scroll vertical, deixa rolar
                const container = e.target.closest('.kanban-cards-container');
                if (container && (container.scrollHeight > container.clientHeight)) {
                    // Se o scroll está no limite superior e quer subir, ou limite inferior e quer descer,
                    // talvez deixemos propagar, mas o mais seguro é simplesmente não interceptar
                    // se estivermos focados numa coluna com scroll.
                    return;
                }

                if (e.deltaY !== 0 && !e.shiftKey) {
                    board.scrollLeft += e.deltaY;
                    e.preventDefault();
                }
            }, { passive: false });
        }
    }

    render() {
        this.updateAssigneeFilterOptions();
        const products = window.store.getProducts();

        const stages = ['olist_setup', 'images', 'pricing', 'verification', 'marketplaces'];

        stages.forEach(stage => {
            const container = document.getElementById(`kanban-col-${stage}`);
            const countBadge = document.getElementById(`kanban-count-${stage}`);
            if (!container) return;

            const filtered = products.filter(p => {
                if (p.stage !== stage) return false;
                
                if (this.currentFilterSearch) {
                    const matchTitle = p.title.toLowerCase().includes(this.currentFilterSearch);
                    const matchSku = p.sku.toLowerCase().includes(this.currentFilterSearch);
                    if (!matchTitle && !matchSku) return false;
                }

                if (this.currentFilterAssignee !== 'all' && p.assigneeId !== this.currentFilterAssignee) {
                    return false;
                }

                if (this.currentFilterPriority !== 'all' && p.priority !== this.currentFilterPriority) {
                    return false;
                }

                return true;
            });

            if (countBadge) countBadge.textContent = filtered.length;

            if (filtered.length === 0) {
                container.innerHTML = `<div style="padding: 2rem 1rem; text-align: center; color: var(--text-subdued); font-size: 0.8rem; border: 1px dashed var(--border-color); border-radius: var(--radius-sm);">Nenhum produto aqui</div>`;
            } else {
                container.innerHTML = filtered.map(product => this.createProductCardHTML(product)).join('');
            }

            this.setupDragAndDropEvents(container, stage);
        });
    }

    updateAssigneeFilterOptions() {
        const select = document.getElementById('kanban-filter-assignee');
        const formSelect = document.getElementById('new-product-assignee');
        const employees = window.store.getEmployees();

        if (select && select.options.length <= 1) {
            employees.forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp.id;
                opt.textContent = emp.name;
                select.appendChild(opt);
            });
        }

        if (formSelect && formSelect.options.length === 0) {
            employees.forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp.id;
                opt.textContent = `${emp.name} (${emp.role})`;
                formSelect.appendChild(opt);
            });
        }
    }

    createProductCardHTML(product) {
        const priorityLabels = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
        const emp = window.store.getEmployeeById(product.assigneeId);
        const avatarStr = emp ? emp.avatar : '??';
        const isManager = window.store.isManager();

        return `
            <div class="product-card" ${isManager ? 'draggable="true"' : 'draggable="false"'} data-product-id="${product.id}" onclick="window.kanbanModule.openProductDetailModal('${product.id}')" ${!isManager ? 'style="cursor: pointer;"' : ''}>
                <div class="product-card-header">
                    <h4 class="product-title">${product.title}</h4>
                    <span class="badge-priority priority-${product.priority}">${priorityLabels[product.priority] || product.priority}</span>
                </div>
                <div class="product-meta">
                    <span class="sku-tag">SKU: ${product.sku}</span>
                    <span>• ${product.category}</span>
                </div>
                <div class="product-card-footer">
                    <div class="assignee-pill" style="padding-left: 0.6rem;">
                        <span>${(() => {
                            let label = product.assigneeName || 'Não atribuído';
                            if (product.allowedEditors && product.allowedEditors.length > 0) {
                                const extraNames = product.allowedEditors
                                    .map(id => window.store.getEmployeeById(id)?.name)
                                    .filter(name => name && !label.includes(name));
                                if (extraNames.length > 0) {
                                    label += ', ' + extraNames.join(', ');
                                }
                            }
                            return label;
                        })()}</span>
                    </div>
                    <span style="font-size: 0.72rem; color: var(--accent-emerald); font-weight: 700;">
                        R$ ${Number(product.suggestedPrice || 0).toFixed(2)}
                    </span>
                </div>
            </div>
        `;
    }

    setupDragAndDropEvents(container, stage) {
        if (!window.store.isManager()) return;

        container.querySelectorAll('.product-card').forEach(card => {
            card.ondragstart = (e) => {
                this.draggedProductId = card.getAttribute('data-product-id');
                e.dataTransfer.setData('text/plain', this.draggedProductId);
                card.style.opacity = '0.5';
            };

            card.ondragend = () => {
                card.style.opacity = '1';
                this.draggedProductId = null;
            };
        });

        container.ondragover = (e) => {
            e.preventDefault();
            container.style.background = 'rgba(99, 102, 241, 0.05)';
        };

        container.ondragleave = () => {
            container.style.background = 'transparent';
        };

        container.ondrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            container.style.background = 'transparent';

            if (this.isDropping) return;
            this.isDropping = true;
            setTimeout(() => { this.isDropping = false; }, 500);

            const prodId = (e.dataTransfer ? e.dataTransfer.getData('text/plain') : null) || this.draggedProductId;
            if (prodId) {
                const product = window.store.getProductById(prodId);
                if (product && product.stage !== stage) {
                    this.draggedProductId = null;
                    window.store.updateProductStage(prodId, stage);
                    if (window.app) window.app.showToast('Produto movido de etapa!', 'success');
                }
            }
        };
    }

    handleCreateProduct(form) {
        const formData = new FormData(form);
        const title = formData.get('title');
        const sku = formData.get('sku');
        const category = formData.get('category');
        const assigneeId = formData.get('assigneeId');
        const priority = formData.get('priority');
        const cost = parseFloat(formData.get('cost')) || 0;
        const suggestedPrice = parseFloat(formData.get('suggestedPrice')) || 0;
        const description = formData.get('description');

        if (!title || !sku) {
            if (window.app) window.app.showToast('Preencha pelo menos Título e SKU!', 'error');
            return;
        }

        window.store.addProduct({ title, sku, category, assigneeId, priority, cost, suggestedPrice, description });

        if (window.app) {
            window.app.closeModal('modal-add-product');
            window.app.showToast('Produto cadastrado na etapa Olist ERP!', 'success');
        }
        form.reset();
    }

    openProductDetailModal(productId) {
        this.activeModalProductId = productId;
        const product = window.store.getProductById(productId);
        if (!product) return;

        const modal = document.getElementById('modal-product-detail');
        const body = document.getElementById('product-detail-body');
        if (!modal || !body) return;

        const stageOrder = ['olist_setup', 'images', 'pricing', 'verification', 'marketplaces'];
        const stageNames = {
            olist_setup: '1. Cadastro Olist (ERP)',
            images: '2. Criação de Imagens',
            pricing: '3. Precificação por Canal',
            verification: '4. Verificação Geral',
            marketplaces: '5. Cadastro nos Marketplaces',
            completed: '🎉 Finalizado / Marketplaces'
        };

        const emp = window.store.getEmployeeById(product.assigneeId);
        const currentStageIdx = stageOrder.indexOf(product.stage);
        const isCompleted = product.stage === 'completed';
        const isLastStage = currentStageIdx === stageOrder.length - 1;
        const nextStageName = (!isLastStage && !isCompleted) ? stageNames[stageOrder[currentStageIdx + 1]] : null;

        const currentUser = window.store.state.auth.currentUser;
        const canEdit = !currentUser || window.store.isManager(currentUser) || currentUser.id === product.assigneeId || (product.allowedEditors && product.allowedEditors.includes(currentUser.id));
        const hasRequested = window.store.state.editRequests && window.store.state.editRequests.some(r => r.productId === product.id && r.requesterId === currentUser?.id && r.status === 'pending');

        // Stage Progress Bar Header
        const progressStepsHTML = stageOrder.map((sKey, idx) => {
            const isStepDone = isCompleted || idx < currentStageIdx;
            const isCurrent = !isCompleted && idx === currentStageIdx;
            let stepBg = 'rgba(255,255,255,0.08)';
            let stepColor = 'var(--text-subdued)';
            if (isStepDone) { stepBg = 'rgba(16, 185, 129, 0.2)'; stepColor = 'var(--accent-emerald)'; }
            else if (isCurrent) { stepBg = 'var(--primary)'; stepColor = '#fff'; }

            return `
                <div style="flex: 1; padding: 0.4rem 0.2rem; text-align: center; background: ${stepBg}; color: ${stepColor}; border-radius: 6px; font-size: 0.72rem; font-weight: 700;">
                    ${stageNames[sKey].split('.')[0]}. ${sKey === 'olist_setup' ? 'Olist' : sKey === 'images' ? 'Imagens' : sKey === 'pricing' ? 'Preço' : sKey === 'verification' ? 'Verificação' : 'Marketplaces'}
                </div>
            `;
        }).join('');

        body.innerHTML = `
            <div style="margin-bottom: 1.25rem;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.3rem;">
                    <h2 style="font-size: 1.3rem; font-weight: 800;">${product.title}</h2>
                    <span class="badge-priority priority-${product.priority}">${product.priority.toUpperCase()}</span>
                </div>
                <p style="color: var(--text-muted); font-size: 0.85rem;">SKU: <strong style="color: var(--text-main);">${product.sku}</strong> | Categoria: <strong>${product.category}</strong></p>
            </div>

            <!-- Stage Steps Header Bar -->
            <div style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem;">
                ${progressStepsHTML}
            </div>

            <div style="background: var(--bg-input); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 1.25rem; display: flex; gap: 1rem; align-items: center; justify-content: space-between;">
                <div>
                    <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-subdued); font-weight: 700;">Etapa Atual:</span>
                    <p style="font-size: 1.05rem; color: var(--text-main); font-weight: 800; margin-top: 4px;">${stageNames[product.stage]}</p>
                </div>
                <div>
                    <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-subdued); font-weight: 700;">Responsável:</span>
                    <p style="font-size: 0.88rem; color: var(--accent-cyan); font-weight: 700; margin-top: 4px;">👤 ${(() => {
                        let label = emp ? emp.name : 'Ninguém';
                        if (product.allowedEditors && product.allowedEditors.length > 0) {
                            const extraNames = product.allowedEditors
                                .map(id => window.store.getEmployeeById(id)?.name)
                                .filter(name => name && !label.includes(name));
                            if (extraNames.length > 0) {
                                label += ', ' + extraNames.join(', ');
                            }
                        }
                        return label;
                    })()}</p>
                </div>
            </div>

            <!-- DYNAMIC STAGE-SPECIFIC CONTENT -->
            <div style="background: var(--bg-card); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 1.5rem; ${!canEdit ? 'pointer-events: none; opacity: 0.6;' : ''}">
                ${this.renderStageSpecificView(product)}
            </div>

            <!-- ACTION FOOTER -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
                ${!canEdit ? `
                    <div style="color: var(--text-muted); font-size: 0.85rem;">🔒 Apenas o responsável e gerentes podem editar.</div>
                    <button type="button" class="btn btn-primary" onclick="window.kanbanModule.requestEditPermission('${product.id}')" ${hasRequested ? 'disabled' : ''}>
                        ${hasRequested ? '⏳ Permissão Solicitada' : 'Solicitar Permissão de Edição'}
                    </button>
                ` : `
                    ${window.store.isManager() ? `
                    <button type="button" class="btn btn-secondary" style="color: var(--accent-rose); border-color: rgba(244, 63, 94, 0.3);" onclick="window.kanbanModule.handleDeleteProductFromModal('${product.id}')">
                        🗑️ Excluir
                    </button>
                    ` : '<div></div>'}

                    <div style="display: flex; gap: 0.75rem;">
                        ${isCompleted ? `
                            <button type="button" class="btn btn-secondary" style="background: rgba(16, 185, 129, 0.2); color: var(--accent-emerald); border-color: var(--accent-emerald);" disabled>
                                🎉 Produto Finalizado (100%)
                            </button>
                        ` : !isLastStage ? `
                            <button type="button" class="btn btn-primary" onclick="${window.store.isStageComplete(product) ? `window.kanbanModule.handleAdvanceStage('${product.id}')` : `window.app.showToast('Por favor, conclua todos os itens desta etapa antes de avançar.', 'warning')`}" style="${!window.store.isStageComplete(product) ? 'opacity: 0.6;' : ''}">
                                ✅ Concluir Etapa e Avançar (${nextStageName ? nextStageName.split('.')[1] : ''}) →
                            </button>
                        ` : `
                            <button type="button" class="btn btn-primary" style="${!window.store.isStageComplete(product) ? 'opacity: 0.6;' : 'background: var(--accent-emerald);'}" onclick="${window.store.isStageComplete(product) ? `window.kanbanModule.handleFinishProduct('${product.id}')` : `window.app.showToast('Por favor, conclua todos os itens desta etapa final.', 'warning')`}">
                                🎉 Finalizar Produto & Concluir Esteira
                            </button>
                        `}
                    </div>
                `}
            </div>
        `;

        window.app.openModal('modal-product-detail');
    }

    requestEditPermission(productId) {
        const currentUser = window.store.state.auth.currentUser;
        if (!currentUser) return;
        
        const product = window.store.getProductById(productId);
        const title = product ? product.title : 'Produto Desconhecido';
        
        window.store.state.editRequests.push({
            id: 'req-' + Date.now(),
            productId: productId,
            productTitle: title,
            requesterId: currentUser.id,
            requesterName: currentUser.name,
            targetAssigneeId: product ? product.assigneeId : null,
            targetAssigneeName: product ? product.assigneeName : null,
            status: 'pending',
            date: new Date().toISOString()
        });
        window.store.saveState();
        
        window.store.addAuditLog('SOLICITAR_EDICAO', productId, title, `Solicitou permissão extra de edição.`);
        
        if (window.app) window.app.showToast('Solicitação de edição enviada ao gerente.', 'success');
        
        // Re-render modal to show "Permissão Solicitada"
        this.openProductDetailModal(productId);
    }

    // Renders custom stage view depending on product.stage
    renderStageSpecificView(product) {
        if (product.stage === 'olist_setup') {
            return `
                <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--accent-cyan);">
                    📋 Etapa 1: Checklist de Cadastro no ERP Olist (Imagem 1)
                </h3>
                <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem;">Marque os itens à medida que forem preenchidos no sistema Olist.</p>
                ${this.renderOlistChecklistHTML(product)}
            `;
        }

        if (product.stage === 'images') {
            const imgCheck = product.checklistImages || {};
            const imgKeys = [];
            for (let i = 1; i <= 13; i++) {
                imgKeys.push({ k: `img_${i}`, label: `Imagem ${i}` });
            }

            return `
                <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--accent-purple);">
                    🖼️ Etapa 2: Criação & Tratamento de Imagens
                </h3>
                <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem;">Confira a produção visual das 13 imagens do produto antes da precificação.</p>

                <div class="checklist-card">
                    ${imgKeys.map(item => `
                        <div class="checklist-item ${imgCheck[item.k] ? 'checked' : ''}" onclick="window.kanbanModule.handleToggleImgCheck('${product.id}', '${item.k}')">
                            <div class="checklist-checkbox">${imgCheck[item.k] ? '✓' : ''}</div>
                            <span>${item.label}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        if (product.stage === 'pricing') {
            const prices = product.channelPrices || {};
            const channels = [
                { k: 'shopee1', label: 'Shopee 1', hasPromo: true },
                { k: 'shopee2', label: 'Shopee 2', hasPromo: true },
                { k: 'mercadolivre1_classico', label: 'Mercado Livre 1 (Clássico)', hasPromo: true },
                { k: 'mercadolivre1_premium', label: 'Mercado Livre 1 (Premium)', hasPromo: true },
                { k: 'mercadolivre2_classico', label: 'Mercado Livre 2 (Clássico)', hasPromo: true },
                { k: 'mercadolivre2_premium', label: 'Mercado Livre 2 (Premium)', hasPromo: true },
                { k: 'magalu1', label: 'Magalu 1', hasPromo: false },
                { k: 'magalu2', label: 'Magalu 2', hasPromo: false },
                { k: 'amazon', label: 'Amazon', hasPromo: false },
                { k: 'shein', label: 'Shein', hasPromo: false },
                { k: 'tiktok', label: 'TikTok', hasPromo: false },
                { k: 'yampi', label: 'Yampi', hasPromo: false }
            ];

            return `
                <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--accent-emerald);">
                    💰 Etapa 3: Precificação Analítica por Marketplace
                </h3>
                <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem;">Insira os preços de venda calculados especificamente para cada canal de venda.</p>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 0.85rem;">
                    ${channels.map(ch => `
                        <div style="background: var(--bg-card-solid); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                            <label style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700; display: block; margin-bottom: 6px;">${ch.label}</label>
                            ${ch.hasPromo ? `
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                                    <div>
                                        <span style="font-size: 0.68rem; color: var(--text-subdued); display: block; margin-bottom: 2px;">Normal</span>
                                        <input type="number" step="0.01" class="form-control channel-price-input" data-channel="${ch.k}" value="${Number(prices[ch.k] || 0).toFixed(2)}" style="padding: 0.4rem 0.5rem; font-size: 0.85rem; font-weight: 700; color: var(--accent-emerald);" onchange="window.kanbanModule.handlePriceInputChange('${product.id}', '${ch.k}', this.value)">
                                    </div>
                                    <div>
                                        <span style="font-size: 0.68rem; color: var(--accent-rose); display: block; margin-bottom: 2px;">Promoção</span>
                                        <input type="number" step="0.01" class="form-control channel-price-input" data-channel="${ch.k}_promo" value="${Number(prices[ch.k + '_promo'] || 0).toFixed(2)}" style="padding: 0.4rem 0.5rem; font-size: 0.85rem; font-weight: 700; color: var(--accent-rose);" onchange="window.kanbanModule.handlePriceInputChange('${product.id}', '${ch.k}_promo', this.value)">
                                    </div>
                                </div>
                            ` : `
                                <div>
                                    <span style="font-size: 0.68rem; color: var(--text-subdued); display: block; margin-bottom: 2px;">Normal</span>
                                    <input type="number" step="0.01" class="form-control channel-price-input" data-channel="${ch.k}" value="${Number(prices[ch.k] || 0).toFixed(2)}" style="padding: 0.4rem 0.6rem; font-size: 0.9rem; font-weight: 700; color: var(--accent-emerald);" onchange="window.kanbanModule.handlePriceInputChange('${product.id}', '${ch.k}', this.value)">
                                </div>
                            `}
                        </div>
                    `).join('')}
                </div>
            `;
        }

        if (product.stage === 'verification') {
            return this.renderVerificationHTML(product);
        }

        if (product.stage === 'marketplaces') {
            return `
                <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--accent-rose);">
                    🛒 Etapa 5: Cadastro e Vínculo nos 10 Marketplaces (Imagens 2, 3, 4)
                </h3>
                <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem;">Marque a sincronização e finalização de cada marketplace.</p>
                ${this.renderMarketplacesChecklistHTML(product)}
            `;
        }

        if (product.stage === 'completed') {
            return `
                <div style="text-align: center; padding: 1.5rem; background: rgba(16, 185, 129, 0.08); border-radius: var(--radius-md); border: 1px solid rgba(16, 185, 129, 0.3);">
                    <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎉</div>
                    <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--accent-emerald); margin-bottom: 0.3rem;">Produto Concluído com Sucesso!</h3>
                    <p style="font-size: 0.85rem; color: var(--text-muted); max-width: 500px; margin: 0 auto 1rem auto;">
                        Este produto passou por todas as 5 etapas da esteira de criação e foi finalizado nos marketplaces. Ele não aparece mais na esteira ativa e está gravado na aba <strong>Todos os Produtos</strong> com 100% de progresso.
                    </p>
                </div>
            `;
        }

        return '';
    }

    renderOlistChecklistHTML(product) {
        const olist = product.checklistOlist || {};

        const labelsGerais = {
            tipoProduto: 'Tipo do Produto', titulo: 'Título', ean: 'EAN', origem: 'Origem',
            unidadeMedida: 'Unidade de Medida', sku: 'SKU', precoVenda: 'Preço de Venda',
            pesoLiqBruto: 'Peso Liq e Bruto', largura: 'Largura', altura: 'Altura', comprimento: 'Comprimento'
        };
        const labelsComplementares = { categoria: 'Categoria', marca: 'Marca', descricao: 'Descrição' };
        const labelsOutros = { unidadePorCaixa: 'Unidade por Caixa', garantia: 'Garantia', fornecedor: 'Fornecedor' };

        const buildCheckGroup = (groupKey, titleIcon, titleLabel, labelMap) => {
            const groupData = olist[groupKey] || {};
            const itemsHTML = Object.keys(labelMap).map(itemKey => {
                const checked = !!groupData[itemKey];
                return `
                    <div class="checklist-item ${checked ? 'checked' : ''}" onclick="window.kanbanModule.handleToggleOlist('${product.id}', '${groupKey}', '${itemKey}')">
                        <div class="checklist-checkbox">${checked ? '✓' : ''}</div>
                        <span>${labelMap[itemKey]}</span>
                    </div>
                `;
            }).join('');

            return `
                <div class="checklist-card">
                    <div class="checklist-card-title"><span>${titleIcon}</span><span>${titleLabel}</span></div>
                    ${itemsHTML}
                </div>
            `;
        };

        return `
            <div class="checklist-container-grid">
                ${buildCheckGroup('dadosGerais', 'ℹ️', 'Dados Gerais', labelsGerais)}
                ${buildCheckGroup('dadosComplementares', '≡+', 'Dados Complementares', labelsComplementares)}
                ${buildCheckGroup('outros', '⋯', 'Outros', labelsOutros)}
            </div>
        `;
    }

    renderVerificationHTML(product) {
        const olist = product.checklistOlist || {};
        let totalOlist = 0, checkedOlist = 0;
        ['dadosGerais', 'dadosComplementares', 'outros'].forEach(g => {
            if (olist[g]) {
                Object.keys(olist[g]).forEach(k => {
                    if (k === 'imagens' && g === 'dadosComplementares') return;
                    totalOlist++;
                    if (olist[g][k]) checkedOlist++;
                });
            }
        });

        const imgCheck = product.checklistImages || {};
        let totalImg = 13, checkedImg = 0;
        const imgBadges = [];
        for (let i = 1; i <= 13; i++) {
            const checked = !!imgCheck[`img_${i}`];
            if (checked) checkedImg++;
            imgBadges.push(`<span class="badge-stage ${checked ? 'badge-emerald' : 'badge-slate'}" style="font-size: 0.72rem; margin: 2px;">Img ${i}: ${checked ? '✓' : '✗'}</span>`);
        }

        const prices = product.channelPrices || {};
        const channels = [
            { k: 'shopee1', label: 'Shopee 1', hasPromo: true },
            { k: 'shopee2', label: 'Shopee 2', hasPromo: true },
            { k: 'mercadolivre1_classico', label: 'Mercado Livre 1 (Clássico)', hasPromo: true },
            { k: 'mercadolivre1_premium', label: 'Mercado Livre 1 (Premium)', hasPromo: true },
            { k: 'mercadolivre2_classico', label: 'Mercado Livre 2 (Clássico)', hasPromo: true },
            { k: 'mercadolivre2_premium', label: 'Mercado Livre 2 (Premium)', hasPromo: true },
            { k: 'magalu1', label: 'Magalu 1', hasPromo: false },
            { k: 'magalu2', label: 'Magalu 2', hasPromo: false },
            { k: 'amazon', label: 'Amazon', hasPromo: false },
            { k: 'shein', label: 'Shein', hasPromo: false },
            { k: 'tiktok', label: 'TikTok', hasPromo: false },
            { k: 'yampi', label: 'Yampi', hasPromo: false }
        ];

        return `
            <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--accent-amber);">
                🔍 Etapa 4: Verificação Geral & Aprovação do Gerente
            </h3>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem;">Confira todos os dados cadastrados nas etapas anteriores e marque a verificação de aprovação ao final.</p>

            <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem;">
                <div style="background: var(--bg-card-solid); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <h4 style="font-size: 0.88rem; font-weight: 700; color: var(--text-main);">📋 Resumo Etapa 1: Cadastro Olist (ERP)</h4>
                        <span class="badge-stage ${checkedOlist === totalOlist && totalOlist > 0 ? 'badge-emerald' : 'badge-amber'}">${checkedOlist}/${totalOlist} itens preenchidos</span>
                    </div>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0;">Ficha técnica, EAN, pesos, dimensões e dados complementares conferidos no cadastro Olist.</p>
                </div>

                <div style="background: var(--bg-card-solid); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <h4 style="font-size: 0.88rem; font-weight: 700; color: var(--text-main);">🖼️ Resumo Etapa 2: Criação de Imagens (Imagem 1 a 13)</h4>
                        <span class="badge-stage ${checkedImg === totalImg ? 'badge-emerald' : 'badge-amber'}">${checkedImg}/${totalImg} imagens prontas</span>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 0.5rem;">
                        ${imgBadges.join('')}
                    </div>
                </div>

                <div style="background: var(--bg-card-solid); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                    <h4 style="font-size: 0.88rem; font-weight: 700; margin-bottom: 0.75rem; color: var(--text-main);">💰 Resumo Etapa 3: Precificação por Canal</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.6rem;">
                        ${channels.map(ch => {
                            const normalVal = Number(prices[ch.k] || 0).toFixed(2);
                            const promoVal = Number(prices[ch.k + '_promo'] || 0).toFixed(2);
                            return `
                                <div style="background: var(--bg-card); padding: 0.5rem 0.75rem; border-radius: 4px; border: 1px solid var(--border-color); font-size: 0.78rem;">
                                    <strong style="color: var(--text-main); display: block; margin-bottom: 2px;">${ch.label}</strong>
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <span style="color: var(--accent-emerald); font-weight: 700;">Normal: R$ ${normalVal}</span>
                                        ${ch.hasPromo ? `<span style="color: var(--accent-rose); font-weight: 700;">Promo: R$ ${promoVal}</span>` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>

            <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: var(--radius-sm); padding: 1rem;">
                <div class="checklist-item ${product.verificationChecked ? 'checked' : ''}" style="margin: 0;" onclick="window.kanbanModule.handleToggleVerificationCheck('${product.id}')">
                    <div class="checklist-checkbox">${product.verificationChecked ? '✓' : ''}</div>
                    <span style="font-weight: 800; font-size: 0.95rem; color: var(--accent-amber);">Marcar produto como Conferido & Validado para publicação</span>
                </div>
            </div>
        `;
    }

    renderMarketplacesChecklistHTML(product) {
        const mkts = product.marketplaces || {};

        const channelsDef = [
            { key: 'shopee1', title: 'Shopee 1', icon: '🛍️' },
            { key: 'shopee2', title: 'Shopee 2', icon: '🛍️' },
            { key: 'mercadolivre1', title: 'Mercado Livre 1', icon: '📦', isML: true },
            { key: 'mercadolivre2', title: 'Mercado Livre 2', icon: '📦', isML: true },
            { key: 'magalu1', title: 'Magalu 1', icon: '🛍️' },
            { key: 'magalu2', title: 'Magalu 2', icon: '🛍️' },
            { key: 'amazon', title: 'Amazon', icon: '♞' },
            { key: 'shein', title: 'Shein', icon: '👗' },
            { key: 'tiktok', title: 'TikTok', icon: '🎵' },
            { key: 'yampi', title: 'Yampi', icon: '🛒' }
        ];

        const cardsHTML = channelsDef.map(ch => {
            const data = mkts[ch.key] || {};
            const isDisabled = !!data.disabled;

            if (ch.isML) {
                return `
                    <div class="checklist-card" style="${isDisabled ? 'opacity: 0.4;' : ''}">
                        <div class="checklist-card-title"><span>${ch.icon}</span><span>${ch.title}</span></div>
                        <div class="mkt-disabled-box" onclick="window.kanbanModule.handleToggleMktDisabled('${product.id}', '${ch.key}')">
                            <input type="checkbox" ${isDisabled ? 'checked' : ''}>
                            <span>Não é Possível Cadastrar no Marketplace</span>
                        </div>
                        <div class="checklist-item ${data.clip ? 'checked' : ''}" onclick="window.kanbanModule.handleToggleMktCheck('${product.id}', '${ch.key}', 'clip')">
                            <div class="checklist-checkbox">${data.clip ? '✓' : ''}</div>
                            <span>Clip</span>
                        </div>
                        <div class="mkt-subgroup-title">CLÁSSICO</div>
                        ${['preco', 'promocao', 'frete', 'sincronizacaoTiny'].map(k => {
                            const labels = { preco: 'Preço', promocao: 'Promoção', frete: 'Frete', sincronizacaoTiny: 'Sincronização Tiny' };
                            const isChecked = data.classico && data.classico[k];
                            return `
                                <div class="checklist-item ${isChecked ? 'checked' : ''}" onclick="window.kanbanModule.handleToggleMktCheck('${product.id}', '${ch.key}', 'classico.${k}')">
                                    <div class="checklist-checkbox">${isChecked ? '✓' : ''}</div>
                                    <span>${labels[k]}</span>
                                </div>
                            `;
                        }).join('')}
                        <div class="mkt-subgroup-title">PREMIUM</div>
                        ${['preco', 'promocao', 'frete', 'sincronizacaoTiny'].map(k => {
                            const labels = { preco: 'Preço', promocao: 'Promoção', frete: 'Frete', sincronizacaoTiny: 'Sincronização Tiny' };
                            const isChecked = data.premium && data.premium[k];
                            return `
                                <div class="checklist-item ${isChecked ? 'checked' : ''}" onclick="window.kanbanModule.handleToggleMktCheck('${product.id}', '${ch.key}', 'premium.${k}')">
                                    <div class="checklist-checkbox">${isChecked ? '✓' : ''}</div>
                                    <span>${labels[k]}</span>
                                </div>
                            `;
                        }).join('')}
                        <div class="mkt-card-footer"><span>Responsável: <strong style="color: var(--primary);">${data.assignee || 'Nenhum'}</strong></span></div>
                    </div>
                `;
            }

            const checkKeys = [];
            if (ch.key.startsWith('shopee')) {
                checkKeys.push({ k: 'canaisEnvio', l: 'Canais de Envio' }, { k: 'preco', l: 'Preço' }, { k: 'otimizacao', l: 'Otimização para Produto Qualificado' }, { k: 'promocao', l: 'Promoção' }, { k: 'sincronizacaoTiny', l: 'Sincronização Tiny' });
            } else if (ch.key.startsWith('magalu') || ch.key === 'tiktok') {
                checkKeys.push({ k: 'preco', l: 'Preço' }, { k: 'promocao', l: 'Promoção' }, { k: 'sincronizacaoTiny', l: 'Sincronização Tiny' });
            } else {
                checkKeys.push({ k: 'preco', l: 'Preço' }, { k: 'sincronizacaoTiny', l: 'Sincronização Tiny' });
            }

            const itemsHTML = checkKeys.map(item => {
                const isChecked = !!data[item.k];
                return `
                    <div class="checklist-item ${isChecked ? 'checked' : ''}" onclick="window.kanbanModule.handleToggleMktCheck('${product.id}', '${ch.key}', '${item.k}')">
                        <div class="checklist-checkbox">${isChecked ? '✓' : ''}</div>
                        <span>${item.l}</span>
                    </div>
                `;
            }).join('');

            return `
                <div class="checklist-card" style="${isDisabled ? 'opacity: 0.4;' : ''}">
                    <div class="checklist-card-title"><span>${ch.icon}</span><span>${ch.title}</span></div>
                    <div class="mkt-disabled-box" onclick="window.kanbanModule.handleToggleMktDisabled('${product.id}', '${ch.key}')">
                        <input type="checkbox" ${isDisabled ? 'checked' : ''}>
                        <span>Não é Possível Cadastrar no Marketplace</span>
                    </div>
                    ${itemsHTML}
                    <div class="mkt-card-footer"><span>Responsável: <strong style="color: var(--primary);">${data.assignee || 'Nenhum'}</strong></span></div>
                </div>
            `;
        }).join('');

        return `<div class="checklist-container-grid">${cardsHTML}</div>`;
    }

    handleToggleOlist(productId, groupKey, itemKey) {
        window.store.toggleOlistCheckitem(productId, groupKey, itemKey);
        if (document.getElementById('modal-product-overview')?.classList.contains('active')) {
            if (window.productsModule && typeof window.productsModule.openProductOverviewModal === 'function') {
                window.productsModule.openProductOverviewModal(productId);
                return;
            }
        }
        this.openProductDetailModal(productId);
    }

    handleToggleImgCheck(productId, itemKey) {
        window.store.toggleImageCheckitem(productId, itemKey);
        if (document.getElementById('modal-product-overview')?.classList.contains('active')) {
            if (window.productsModule && typeof window.productsModule.openProductOverviewModal === 'function') {
                window.productsModule.openProductOverviewModal(productId);
                return;
            }
        }
        this.openProductDetailModal(productId);
    }

    handleToggleVerificationCheck(productId) {
        window.store.toggleVerificationCheck(productId);
        if (document.getElementById('modal-product-overview')?.classList.contains('active')) {
            if (window.productsModule && typeof window.productsModule.openProductOverviewModal === 'function') {
                window.productsModule.openProductOverviewModal(productId);
                return;
            }
        }
        this.openProductDetailModal(productId);
    }

    handleToggleMktDisabled(productId, mktKey) {
        window.store.toggleMarketplaceDisabled(productId, mktKey);
        if (document.getElementById('modal-product-overview')?.classList.contains('active')) {
            if (window.productsModule && typeof window.productsModule.openProductOverviewModal === 'function') {
                window.productsModule.openProductOverviewModal(productId);
                return;
            }
        }
        this.openProductDetailModal(productId);
    }

    handleToggleMktCheck(productId, mktKey, subPath) {
        window.store.toggleMarketplaceCheckitem(productId, mktKey, subPath);
        if (document.getElementById('modal-product-overview')?.classList.contains('active')) {
            if (window.productsModule && typeof window.productsModule.openProductOverviewModal === 'function') {
                window.productsModule.openProductOverviewModal(productId);
                return;
            }
        }
        this.openProductDetailModal(productId);
    }

    // SAVE DRAFT ACTION
    handleSaveDraft(productId) {
        this.saveStageInputs(productId);
        if (window.app) window.app.showToast('💾 Rascunho salvo com sucesso!', 'info');
    }

    // ADVANCE STAGE ACTION
    handleAdvanceStage(productId) {
        this.saveStageInputs(productId);
        window.store.advanceProductStage(productId);
        const product = window.store.getProductById(productId);
        if (window.app) window.app.showToast('✅ Etapa concluída! Produto avançou no fluxo.', 'success');
        
        if (product) {
            this.openProductDetailModal(productId);
        } else {
            window.app.closeModal('modal-product-detail');
        }
    }

    handleFinishProduct(productId) {
        this.saveStageInputs(productId);
        window.store.finishProduct(productId);
        if (window.app) {
            window.app.showToast('🎉 Produto finalizado! Agora ele está salvo na aba Todos os Produtos.', 'success');
            window.app.closeModal('modal-product-detail');
        }
    }

    handlePriceInputChange(productId, channelKey, val) {
        const numVal = parseFloat(val) || 0;
        window.store.updateChannelPrices(productId, { [channelKey]: numVal });
    }

    saveStageInputs(productId) {
        // Collect channel prices if in Stage 3 (pricing)
        const priceInputs = document.querySelectorAll('.channel-price-input');
        if (priceInputs.length > 0) {
            const newPrices = {};
            priceInputs.forEach(input => {
                const channel = input.getAttribute('data-channel');
                newPrices[channel] = parseFloat(input.value) || 0;
            });
            window.store.updateChannelPrices(productId, newPrices);
        }
    }

    handleStageChangeFromModal(productId, newStage) {
        window.store.updateProductStage(productId, newStage);
        if (window.app) window.app.showToast('Etapa alterada manualmente!', 'info');
        this.openProductDetailModal(productId);
    }

    handleDeleteProductFromModal(productId) {
        if (confirm('Tem certeza que deseja remover este produto da esteira?')) {
            const success = window.store.deleteProduct(productId);
            if (success) {
                window.app.closeModal('modal-product-detail');
                if (window.app) window.app.showToast('Produto excluído da esteira.', 'warning');
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.kanbanModule = new KanbanModule();
});
