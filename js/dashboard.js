/* ==========================================================================
   Creative Sector Manager Hub - Dashboard & Metrics Module
   ========================================================================== */

class DashboardModule {
    constructor() {
        this.init();
    }

    init() {
        window.store.subscribe(() => this.render());
        this.render();
    }

    render() {
        const products = window.store.getProducts();
        const employees = window.store.getEmployees();
        const approvals = window.store.getApprovals();

        this.renderKPIs(products, employees, approvals);
        this.renderPipelineChart(products);
        this.renderBottleneckAlerts(products, employees);
        this.renderRecentActivities(products, approvals);
    }

    renderKPIs(products, employees, approvals) {
        const activeProducts = products.filter(p => p.stage !== 'marketplaces').length;
        const totalProductsEl = document.getElementById('kpi-total-products');
        if (totalProductsEl) totalProductsEl.textContent = activeProducts;

        const launchedCount = products.filter(p => p.stage === 'marketplaces').length;
        const launchedEl = document.getElementById('kpi-launched-products');
        if (launchedEl) launchedEl.textContent = launchedCount;

        const pendingApprovals = approvals.filter(a => a.status === 'pending').length;
        const pendingEl = document.getElementById('kpi-pending-approvals');
        if (pendingEl) pendingEl.textContent = pendingApprovals;

        const sidebarBadge = document.getElementById('badge-approvals-count');
        if (sidebarBadge) {
            sidebarBadge.textContent = pendingApprovals;
            sidebarBadge.style.display = pendingApprovals > 0 ? 'inline-block' : 'none';
        }

        let totalMax = 0;
        let totalCurrent = 0;
        employees.forEach(emp => {
            totalMax += emp.maxCapacity;
            totalCurrent += emp.currentWorkload;
        });
        const avgWorkload = totalMax > 0 ? Math.round((totalCurrent / totalMax) * 100) : 0;
        const workloadEl = document.getElementById('kpi-team-workload');
        if (workloadEl) workloadEl.textContent = `${avgWorkload}%`;
    }

    renderPipelineChart(products) {
        const chartContainer = document.getElementById('pipeline-chart-container');
        if (!chartContainer) return;

        const stages = [
            { key: 'olist_setup', label: '1. Olist (ERP)', color: 'var(--accent-cyan)' },
            { key: 'images', label: '2. Imagens', color: 'var(--secondary)' },
            { key: 'pricing', label: '3. Precificação', color: 'var(--accent-emerald)' },
            { key: 'verification', label: '4. Verificação Geral', color: 'var(--accent-amber)' },
            { key: 'marketplaces', label: '5. Marketplaces', color: 'var(--accent-rose)' }
        ];

        const counts = stages.map(s => {
            return {
                ...s,
                count: products.filter(p => p.stage === s.key).length
            };
        });

        const maxCount = Math.max(...counts.map(c => c.count), 1);

        chartContainer.innerHTML = counts.map(item => {
            const heightPercent = Math.max(12, Math.round((item.count / maxCount) * 100));
            return `
                <div class="chart-bar-group">
                    <div class="chart-bar-wrapper">
                        <div class="chart-bar" 
                             style="height: ${heightPercent}%; background: ${item.color};" 
                             data-value="${item.count} produto(s)">
                        </div>
                    </div>
                    <span class="chart-label">${item.label}</span>
                </div>
            `;
        }).join('');
    }

    renderBottleneckAlerts(products, employees) {
        const container = document.getElementById('bottleneck-alerts-container');
        if (!container) return;

        const alerts = [];

        employees.forEach(emp => {
            const loadPercent = Math.round((emp.currentWorkload / emp.maxCapacity) * 100);
            if (loadPercent > 85) {
                alerts.push({
                    type: 'warning',
                    icon: '⚠️',
                    title: `Colaborador Sobrecarregado: ${emp.name}`,
                    msg: `${emp.name} está com ${loadPercent}% de capacidade ocupada (${emp.currentWorkload} tarefas ativas). Considere redistribuir produtos.`
                });
            }
        });

        const stageCounts = {};
        products.forEach(p => {
            if (p.stage !== 'marketplaces') {
                stageCounts[p.stage] = (stageCounts[p.stage] || 0) + 1;
            }
        });

        const stageNames = {
            olist_setup: 'Cadastro na Olist (ERP)',
            images: 'Criação de Imagens',
            pricing: 'Precificação por Canal',
            verification: 'Verificação Geral & Aprovação'
        };

        Object.keys(stageCounts).forEach(stageKey => {
            if (stageCounts[stageKey] >= 2) {
                alerts.push({
                    type: 'info',
                    icon: '📊',
                    title: `Gargalo em ${stageNames[stageKey]}`,
                    msg: `Existem ${stageCounts[stageKey]} produtos retidos na etapa de ${stageNames[stageKey]}. Acelere as validações.`
                });
            }
        });

        if (alerts.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 1.5rem; color: var(--accent-emerald);">
                    <svg style="width: 32px; height: 32px; margin-bottom: 0.5rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <p style="font-weight: 700; font-size: 0.95rem;">Fluxo Operando em Perfeição!</p>
                    <p style="font-size: 0.8rem; color: var(--text-muted);">Sem gargalos ou sobrecargas detectadas no setor.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = alerts.map(alt => `
            <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 0.75rem; display: flex; gap: 0.85rem; align-items: flex-start;">
                <span style="font-size: 1.25rem;">${alt.icon}</span>
                <div>
                    <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.2rem;">${alt.title}</h4>
                    <p style="font-size: 0.8rem; color: var(--text-muted);">${alt.msg}</p>
                </div>
            </div>
        `).join('');
    }

    renderRecentActivities(products, approvals) {
        const feedContainer = document.getElementById('activity-feed-container');
        if (!feedContainer) return;

        const activities = [];

        products.slice(0, 4).forEach(p => {
            activities.push({
                title: `Produto movimentado: ${p.title}`,
                time: `Hoje`,
                detail: `SKU: ${p.sku} | Responsável: ${p.assigneeName}`,
                icon: '📦'
            });
        });

        approvals.slice(0, 3).forEach(a => {
            activities.push({
                title: `Solicitação: ${a.type}`,
                time: a.date,
                detail: `Solicitado por ${a.requesterName} (${a.productTitle})`,
                icon: a.status === 'approved' ? '✅' : '⏳'
            });
        });

        feedContainer.innerHTML = activities.map(act => `
            <div style="display: flex; gap: 0.85rem; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color); align-items: center;">
                <div style="width: 32px; height: 32px; border-radius: 8px; background: var(--bg-input); display: flex; align-items: center; justify-content: center; font-size: 0.95rem;">
                    ${act.icon}
                </div>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 700;">
                        <span>${act.title}</span>
                        <span style="color: var(--text-subdued); font-size: 0.72rem;">${act.time}</span>
                    </div>
                    <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${act.detail}</p>
                </div>
            </div>
        `).join('');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.dashboardModule = new DashboardModule();
});
