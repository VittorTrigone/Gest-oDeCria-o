/* ==========================================================================
   Creative Sector Manager Hub - Products List & Progress Module
   ========================================================================== */

class ProductsModule {
    constructor() {
        this.currentFilterSearch = '';
        this.currentFilterAssignee = 'all';
        this.currentFilterStatus = 'all'; // 'all', 'active', 'completed'
        this.init();
    }

    init() {
        window.store.subscribe(() => this.render());
        this.bindEvents();
        this.render();
    }

    bindEvents() {
        const searchInput = document.getElementById('products-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilterSearch = e.target.value.toLowerCase().trim();
                this.render();
            });
        }

        const assigneeSelect = document.getElementById('products-filter-assignee');
        if (assigneeSelect) {
            assigneeSelect.addEventListener('change', (e) => {
                this.currentFilterAssignee = e.target.value;
                this.render();
            });
        }

        const statusSelect = document.getElementById('products-filter-status');
        if (statusSelect) {
            statusSelect.addEventListener('change', (e) => {
                this.currentFilterStatus = e.target.value;
                this.render();
            });
        }
    }

    render() {
        this.updateAssigneeFilterOptions();
        const products = window.store.getProducts();

        // Calculate summary KPI stats
        const totalCount = products.length;
        const activeCount = products.filter(p => p.stage !== 'completed').length;
        const completedCount = products.filter(p => p.stage === 'completed').length;
        
        let avgProgress = 0;
        if (totalCount > 0) {
            const sumProgress = products.reduce((sum, p) => sum + window.store.calculateProductProgress(p), 0);
            avgProgress = Math.round(sumProgress / totalCount);
        }

        // Update KPI Elements if present
        const elTotal = document.getElementById('prod-kpi-total');
        const elActive = document.getElementById('prod-kpi-active');
        const elCompleted = document.getElementById('prod-kpi-completed');
        const elProgress = document.getElementById('prod-kpi-avg-progress');

        if (elTotal) elTotal.textContent = totalCount;
        if (elActive) elActive.textContent = activeCount;
        if (elCompleted) elCompleted.textContent = completedCount;
        if (elProgress) elProgress.textContent = `${avgProgress}%`;

        // Filter products list
        const filtered = products.filter(p => {
            if (this.currentFilterSearch) {
                const matchTitle = p.title.toLowerCase().includes(this.currentFilterSearch);
                const matchSku = p.sku.toLowerCase().includes(this.currentFilterSearch);
                if (!matchTitle && !matchSku) return false;
            }

            if (this.currentFilterAssignee !== 'all' && p.assigneeId !== this.currentFilterAssignee) {
                return false;
            }

            if (this.currentFilterStatus === 'active' && p.stage === 'completed') {
                return false;
            }

            if (this.currentFilterStatus === 'completed' && p.stage !== 'completed') {
                return false;
            }

            return true;
        });

        const listContainer = document.getElementById('products-list-container');
        if (!listContainer) return;

        if (filtered.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">📦</div>
                    <p style="font-size: 0.95rem; font-weight: 600;">Nenhum produto encontrado</p>
                    <p style="font-size: 0.8rem; color: var(--text-subdued);">Tente alterar os filtros de busca acima.</p>
                </div>
            `;
            return;
        }

        const stageNames = {
            olist_setup: '1. Olist (ERP)',
            images: '2. Imagens',
            pricing: '3. Precificação',
            verification: '4. Verificação',
            marketplaces: '5. Marketplaces',
            completed: '🎉 Concluído'
        };

        const stageBadges = {
            olist_setup: 'badge-cyan',
            images: 'badge-violet',
            pricing: 'badge-emerald',
            verification: 'badge-amber',
            marketplaces: 'badge-rose',
            completed: 'badge-success-glow'
        };

        const rowsHTML = filtered.map(product => {
            const progress = window.store.calculateProductProgress(product);
            const isCompleted = product.stage === 'completed';
            const emp = window.store.getEmployeeById(product.assigneeId);
            const avatarStr = emp ? emp.avatar : '??';
            const avatarBg = emp ? emp.avatarBg : 'var(--primary)';

            let progressColor = 'var(--primary)';
            if (isCompleted) progressColor = 'var(--accent-emerald)';
            else if (progress >= 80) progressColor = 'var(--accent-rose)';
            else if (progress >= 50) progressColor = 'var(--accent-amber)';
            else if (progress >= 25) progressColor = 'var(--secondary)';

            return `
                <tr class="product-table-row ${isCompleted ? 'completed-row' : ''}" onclick="window.productsModule.openProductOverviewModal('${product.id}')">
                    <td>
                        <div class="prod-title-cell">
                            <div class="prod-title-text">${product.title}</div>
                            <div class="prod-sub-meta">SKU: <strong>${product.sku}</strong> • ${product.category}</div>
                        </div>
                    </td>
                    <td>
                        <span class="badge-stage ${stageBadges[product.stage] || 'badge-cyan'}">
                            ${stageNames[product.stage] || product.stage}
                        </span>
                    </td>
                    <td>
                        <div class="progress-cell-wrapper">
                            <div class="progress-bar-bg">
                                <div class="progress-bar-fill" style="width: ${progress}%; background: ${progressColor};"></div>
                            </div>
                            <span class="progress-percent-label" style="color: ${progressColor};">${progress}%</span>
                        </div>
                    </td>
                    <td>
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
                    </td>
                    <td style="font-weight: 700; color: var(--accent-emerald);">
                        R$ ${Number(product.suggestedPrice || 0).toFixed(2)}
                    </td>
                    <td onclick="event.stopPropagation();">
                        <div style="display: flex; gap: 0.5rem;">
                            ${window.store.isManager() ? `
                            <button class="btn btn-secondary" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;" onclick="window.auditModule.openProductHistory('${product.id}')">
                                📜 Histórico
                            </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        listContainer.innerHTML = `
            <div class="table-responsive">
                <table class="products-table">
                    <thead>
                        <tr>
                            <th>Produto & SKU</th>
                            <th>Etapa Atual</th>
                            <th style="width: 220px;">Progresso</th>
                            <th>Responsável</th>
                            <th>Preço Base</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHTML}
                    </tbody>
                </table>
            </div>
        `;
    }

    updateAssigneeFilterOptions() {
        const select = document.getElementById('products-filter-assignee');
        if (!select) return;
        const employees = window.store.getEmployees();

        if (select.options.length <= 1) {
            employees.forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp.id;
                opt.textContent = emp.name;
                select.appendChild(opt);
            });
        }
    }

    openProductOverviewModal(productId) {
        try {
            const product = window.store.getProductById(productId);
            if (!product) return;

            const modal = document.getElementById('modal-product-overview');
            const body = document.getElementById('product-overview-body');
            if (!modal || !body) return;

        const isMgr = window.store.isManager();
        const progress = window.store.calculateProductProgress(product);
        const stageNames = {
            olist_setup: '1. Cadastro Olist (ERP)',
            images: '2. Criação de Imagens',
            pricing: '3. Precificação por Canal',
            verification: '4. Verificação Geral',
            marketplaces: '5. Cadastro nos Marketplaces',
            completed: '🎉 Finalizado / Marketplaces'
        };
        const stageBadges = {
            olist_setup: 'badge-cyan',
            images: 'badge-indigo',
            pricing: 'badge-emerald',
            verification: 'badge-amber',
            marketplaces: 'badge-rose',
            completed: 'badge-success-glow'
        };

        const emp = window.store.getEmployeeById(product.assigneeId);
        let assigneeLabel = emp ? emp.name : 'Ninguém';
        if (product.allowedEditors && product.allowedEditors.length > 0) {
            const extraNames = product.allowedEditors
                .map(id => window.store.getEmployeeById(id)?.name)
                .filter(name => name && !assigneeLabel.includes(name));
            if (extraNames.length > 0) {
                assigneeLabel += ', ' + extraNames.join(', ');
            }
        }

        const employees = window.store.getEmployees();

        // 1) HEADER BANNER
        const bannerHTML = `
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.5rem; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem;">
                <div>
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                        <span class="sku-tag" style="font-size: 0.85rem; padding: 0.3rem 0.6rem;">SKU: ${product.sku}</span>
                        <span class="badge-stage ${stageBadges[product.stage] || 'badge-cyan'}">${stageNames[product.stage] || product.stage}</span>
                        <span class="badge-priority priority-${product.priority}" style="text-transform: capitalize;">Prioridade ${product.priority}</span>
                    </div>
                    <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.25rem;">${product.title}</h2>
                    <p style="font-size: 0.85rem; color: var(--text-muted);">
                        Categoria: <strong style="color: var(--text-main);">${product.category || 'Geral'}</strong> • 
                        Responsáveis: <strong style="color: var(--accent-cyan);">${assigneeLabel}</strong> • 
                        Cadastrado em: <strong>${product.createdAt ? new Date(product.createdAt).toLocaleDateString('pt-BR') : 'Data não registrada'}</strong>
                    </p>
                </div>
                <div style="min-width: 200px;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 700; margin-bottom: 0.3rem;">
                        <span style="color: var(--text-muted);">PROGRESSO GERAL</span>
                        <span style="color: var(--accent-emerald);">${progress}%</span>
                    </div>
                    <div class="progress-bar-bg" style="height: 10px;">
                        <div class="progress-bar-fill" style="width: ${progress}%; background: var(--accent-emerald);"></div>
                    </div>
                </div>
            </div>
            ${!isMgr ? `
            <div style="background: rgba(59, 130, 246, 0.12); border: 1px solid rgba(59, 130, 246, 0.35); border-radius: var(--radius-md); padding: 0.75rem 1rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem; color: var(--accent-cyan); font-size: 0.88rem; font-weight: 600;">
                <span>🔒</span>
                <span><strong>Modo de Apenas Visualização:</strong> Como membro da equipe, você pode visualizar todos os dados e o histórico das etapas. Somente o Gerente pode editar as informações e etapas nesta tela.</span>
            </div>
            ` : ''}
        `;

        // 2) SEÇÃO: DADOS INICIAIS DO CADASTRO (ERP OLIST)
        const initInfoHTML = `
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.5rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; margin-bottom: 1.25rem;">
                    <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--text-main);">
                        📦 Informações Iniciais do Produto (Cadastro ERP Olist)
                    </h3>
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">Dados Gerais</span>
                </div>
                <form id="form-overview-general" onsubmit="event.preventDefault(); window.productsModule.saveOverviewGeneralInfo('${product.id}');">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">Título / Nome do Produto</label>
                            <input type="text" class="form-control" name="title" value="${product.title || ''}" ${!isMgr ? 'disabled' : ''} required>
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">Código SKU</label>
                            <input type="text" class="form-control" name="sku" value="${product.sku || ''}" ${!isMgr ? 'disabled' : ''} required>
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">Categoria Olist</label>
                            <input type="text" class="form-control" name="category" value="${product.category || ''}" ${!isMgr ? 'disabled' : ''}>
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">Prioridade</label>
                            <select class="form-control" name="priority" ${!isMgr ? 'disabled' : ''}>
                                <option value="alta" ${product.priority === 'alta' ? 'selected' : ''}>Alta</option>
                                <option value="media" ${product.priority === 'media' ? 'selected' : ''}>Média</option>
                                <option value="baixa" ${product.priority === 'baixa' ? 'selected' : ''}>Baixa</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">Responsável Principal</label>
                            <select class="form-control" name="assigneeId" ${!isMgr ? 'disabled' : ''}>
                                ${employees.map(e => `<option value="${e.id}" ${product.assigneeId === e.id ? 'selected' : ''}>${e.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">Custo Unitário (R$)</label>
                            <input type="number" step="0.01" class="form-control" name="cost" value="${Number(product.cost || 0).toFixed(2)}" ${!isMgr ? 'disabled' : ''}>
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">Preço Base Sugerido (R$)</label>
                            <input type="number" step="0.01" class="form-control" name="suggestedPrice" value="${Number(product.suggestedPrice || 0).toFixed(2)}" ${!isMgr ? 'disabled' : ''}>
                        </div>
                    </div>
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">Observações Iniciais do Cadastro</label>
                        <textarea class="form-control" name="description" rows="2" ${!isMgr ? 'disabled' : ''} placeholder="Nenhuma observação inicial registrada.">${product.description || ''}</textarea>
                    </div>
                    ${isMgr ? `
                    <div style="display: flex; justify-content: flex-end;">
                        <button type="submit" class="btn btn-primary" style="padding: 0.5rem 1.2rem; font-size: 0.85rem;">
                            💾 Salvar Informações Gerais
                        </button>
                    </div>
                    ` : ''}
                </form>
            </div>
        `;

        // 3) ETAPA 1: CADASTRO NO OLIST ERP
        const olistChecklist = window.kanbanModule ? window.kanbanModule.renderOlistChecklistHTML(product) : '';
        const stage1HTML = `
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.5rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; margin-bottom: 1rem;">
                    <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--accent-cyan);">
                        1️⃣ Etapa 1: Cadastro no Olist ERP (Imagem 1)
                    </h3>
                    <span class="badge-stage badge-cyan">Checklist ERP</span>
                </div>
                <div style="${!isMgr ? 'pointer-events: none; opacity: 0.82;' : ''}">
                    ${olistChecklist}
                </div>
            </div>
        `;

        // 4) ETAPA 2: CRIAÇÃO DE IMAGENS
        const imgCheck = product.checklistImages || {};
        const imgLabels = {
            fotosEstudio: 'Fotos de Estúdio Produzidas',
            mockup3D: 'Renders / Mockups 3D Gerados',
            fundoNeutro: 'Fundo Branco / Neutro Configurado',
            tratamento4k: 'Tratamento de Imagem 4K Concluído',
            vinculoOlist: 'Imagens Vinculadas no Cadastro Olist'
        };
        const stage2HTML = `
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.5rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; margin-bottom: 1rem;">
                    <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--secondary);">
                        2️⃣ Etapa 2: Criação & Tratamento de Imagens
                    </h3>
                    <span class="badge-stage badge-indigo">Produção Visual</span>
                </div>
                <div class="checklist-card" style="${!isMgr ? 'pointer-events: none; opacity: 0.82;' : ''}">
                    ${Object.keys(imgLabels).map(k => `
                        <div class="checklist-item ${imgCheck[k] ? 'checked' : ''}" onclick="window.kanbanModule.handleToggleImgCheck('${product.id}', '${k}')">
                            <div class="checklist-checkbox">${imgCheck[k] ? '✓' : ''}</div>
                            <span>${imgLabels[k]}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // 5) ETAPA 3: PRECIFICAÇÃO ANALÍTICA POR CANAL
        const prices = product.channelPrices || {};
        const channels = [
            { k: 'shopee1', label: 'Shopee 1' },
            { k: 'shopee2', label: 'Shopee 2' },
            { k: 'mercadolivre1_classico', label: 'Mercado Livre 1 (Clássico)' },
            { k: 'mercadolivre1_premium', label: 'Mercado Livre 1 (Premium)' },
            { k: 'mercadolivre2_classico', label: 'Mercado Livre 2 (Clássico)' },
            { k: 'mercadolivre2_premium', label: 'Mercado Livre 2 (Premium)' },
            { k: 'magalu1', label: 'Magalu 1' },
            { k: 'magalu2', label: 'Magalu 2' },
            { k: 'amazon', label: 'Amazon' },
            { k: 'shein', label: 'Shein' },
            { k: 'tiktok', label: 'TikTok' },
            { k: 'yampi', label: 'Yampi' }
        ];
        const stage3HTML = `
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.5rem;" id="overview-pricing-container">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; margin-bottom: 1rem;">
                    <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--accent-emerald);">
                        3️⃣ Etapa 3: Precificação Analítica por Canal
                    </h3>
                    <span class="badge-stage badge-emerald">Tabela de Preços</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.85rem; margin-bottom: 1rem;">
                    ${channels.map(ch => `
                        <div style="background: var(--bg-card-solid); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                            <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; display: block; margin-bottom: 4px;">${ch.label}</label>
                            <input type="number" step="0.01" class="form-control channel-price-input" data-channel="${ch.k}" value="${Number(prices[ch.k] || 0).toFixed(2)}" style="padding: 0.4rem 0.6rem; font-size: 0.9rem; font-weight: 700; color: var(--accent-emerald);" ${!isMgr ? 'disabled' : ''}>
                        </div>
                    `).join('')}
                </div>
                ${isMgr ? `
                <div style="display: flex; justify-content: flex-end;">
                    <button type="button" class="btn btn-primary" style="padding: 0.5rem 1.2rem; font-size: 0.85rem;" onclick="window.productsModule.saveOverviewChannelPrices('${product.id}')">
                        💾 Salvar Preços dos Canais
                    </button>
                </div>
                ` : ''}
            </div>
        `;

        // 6) ETAPA 4: VERIFICAÇÃO GERAL & APROVAÇÃO
        const stage4HTML = `
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.5rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; margin-bottom: 1rem;">
                    <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--accent-amber);">
                        4️⃣ Etapa 4: Verificação Geral & Validação
                    </h3>
                    <span class="badge-stage badge-amber">Controle de Qualidade</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
                    <div style="background: var(--bg-card-solid); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                        <h4 style="font-size: 0.88rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-main);">Ficha Técnica & ERP Olist:</h4>
                        <p style="font-size: 0.82rem; color: var(--accent-cyan); font-weight: 600; margin: 0;">✔️ Ficha Técnica, Medidas, Pesos e EAN verificados no Olist.</p>
                    </div>
                    <div style="background: var(--bg-card-solid); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                        <h4 style="font-size: 0.88rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-main);">Tabela de Preços & Margem:</h4>
                        <p style="font-size: 0.82rem; color: var(--accent-emerald); font-weight: 600; margin: 0;">✔️ Preço base R$ ${Number(product.suggestedPrice || 0).toFixed(2)} | Canais conferidos com concorrência.</p>
                    </div>
                </div>
            </div>
        `;

        // 7) ETAPA 5: MARKETPLACES
        const mktsChecklist = window.kanbanModule ? window.kanbanModule.renderMarketplacesChecklistHTML(product) : '';
        const stage5HTML = `
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; margin-bottom: 1rem;">
                    <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--accent-rose);">
                        5️⃣ Etapa 5: Cadastro e Vínculo nos 10 Marketplaces
                    </h3>
                    <span class="badge-stage badge-rose">Publicação e Sincronização</span>
                </div>
                <div style="${!isMgr ? 'pointer-events: none; opacity: 0.82;' : ''}">
                    ${mktsChecklist}
                </div>
            </div>
        `;

        // RENDER COMPLETE DOSSIER
        body.innerHTML = `
            <div class="product-overview-dossier">
                ${bannerHTML}
                ${initInfoHTML}
                ${stage1HTML}
                ${stage2HTML}
                ${stage3HTML}
                ${stage4HTML}
                ${stage5HTML}
            </div>
        `;

        window.app.openModal('modal-product-overview');
        } catch (err) {
            console.error('Erro ao abrir visão geral do produto:', err);
            if (window.app) window.app.showToast('Erro ao abrir visualização do produto.', 'error');
        }
    }

    saveOverviewGeneralInfo(productId) {
        if (!window.store.isManager()) {
            if (window.app) window.app.showToast('Apenas o Gerente pode editar os dados do produto!', 'error');
            return;
        }
        const product = window.store.getProductById(productId);
        if (!product) return;

        const form = document.getElementById('form-overview-general');
        if (!form) return;

        const formData = new FormData(form);
        const title = formData.get('title');
        const sku = formData.get('sku');
        const category = formData.get('category');
        const priority = formData.get('priority');
        const assigneeId = formData.get('assigneeId');
        const cost = parseFloat(formData.get('cost')) || 0;
        const suggestedPrice = parseFloat(formData.get('suggestedPrice')) || 0;
        const description = formData.get('description');

        if (!title || !sku) {
            if (window.app) window.app.showToast('Título e SKU são obrigatórios!', 'error');
            return;
        }

        const emp = window.store.getEmployeeById(assigneeId);
        const assigneeName = emp ? emp.name : 'Não atribuído';

        product.title = title;
        product.sku = sku;
        product.category = category;
        product.priority = priority;
        product.assigneeId = assigneeId;
        product.assigneeName = assigneeName;
        product.cost = cost;
        product.suggestedPrice = suggestedPrice;
        product.description = description;

        window.store.saveState();
        if (window.app) window.app.showToast('✅ Informações gerais do produto atualizadas!', 'success');
        this.openProductOverviewModal(productId);
        this.renderProductListTable();
    }

    saveOverviewChannelPrices(productId) {
        if (!window.store.isManager()) {
            if (window.app) window.app.showToast('Apenas o Gerente pode editar os preços dos canais!', 'error');
            return;
        }
        const priceInputs = document.querySelectorAll('#overview-pricing-container .channel-price-input');
        if (priceInputs.length > 0) {
            const newPrices = {};
            priceInputs.forEach(input => {
                const channel = input.getAttribute('data-channel');
                newPrices[channel] = parseFloat(input.value) || 0;
            });
            window.store.updateChannelPrices(productId, newPrices);
            if (window.app) window.app.showToast('💰 Preços por canal atualizados!', 'success');
            this.openProductOverviewModal(productId);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.productsModule = new ProductsModule();
});
