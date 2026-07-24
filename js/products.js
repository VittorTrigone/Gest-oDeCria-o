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
                <tr class="product-table-row ${isCompleted ? 'completed-row' : ''}" onclick="window.kanbanModule.openProductDetailModal('${product.id}')">
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
                        <div class="assignee-pill">
                            <div class="mini-avatar" style="background: ${avatarBg}">${avatarStr}</div>
                            <span>${(() => {
                                let label = product.assigneeName || 'Não atribuído';
                                if (product.allowedEditors && product.allowedEditors.length > 0) {
                                    const extraNames = product.allowedEditors.map(id => window.store.getEmployeeById(id)?.name).filter(Boolean);
                                    if (extraNames.length > 0) {
                                        label += ' + ' + extraNames.join(', ');
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
                            ${window.store.state.auth.currentUser && window.store.state.auth.currentUser.role === 'manager' ? `
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
}

document.addEventListener('DOMContentLoaded', () => {
    window.productsModule = new ProductsModule();
});
