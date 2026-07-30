class AuditModule {
    constructor() {
        this.globalAuditLimit = 50;
        this.renderGlobalAudit(true);
        
        // Listener para renderizar globalmente sempre que a aba audit for aberta
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.currentTarget.dataset.tab === 'audit') {
                    this.renderGlobalAudit(true);
                }
            });
        });
    }

    getActionDetails(action) {
        const details = {
            'CRIAR_PRODUTO': { icon: '📦', color: 'var(--accent-emerald)', label: 'Criação' },
            'EDITAR_PRODUTO': { icon: '✏️', color: 'var(--accent-purple)', label: 'Edição' },
            'ALTERAR_ETAPA': { icon: '🔄', color: 'var(--accent-amber)', label: 'Mudança de Etapa' },
            'AVANCAR_ETAPA': { icon: '➡️', color: 'var(--accent-amber)', label: 'Avanço de Etapa' },
            'ALTERAR_CHECKLIST': { icon: '☑️', color: 'var(--accent-amber)', label: 'Checklist / Form' },
            'SOLICITAR_EDICAO': { icon: '✋', color: 'var(--primary)', label: 'Solicitação' },
            'APROVAR_EDICAO': { icon: '✅', color: 'var(--accent-emerald)', label: 'Aprovação' },
            'REJEITAR_EDICAO': { icon: '❌', color: 'var(--accent-rose)', label: 'Rejeição' },
            'APROVAR_SOLICITACAO': { icon: '✅', color: 'var(--accent-emerald)', label: 'Aprovação Geral' },
            'REJEITAR_SOLICITACAO': { icon: '❌', color: 'var(--accent-rose)', label: 'Rejeição Geral' },
            'CRIAR_AVISO': { icon: '📢', color: 'var(--primary)', label: 'Novo Aviso' },
            'EXCLUIR_AVISO': { icon: '🗑️', color: 'var(--accent-rose)', label: 'Exclusão de Aviso' },
            'CRIAR_TAREFA': { icon: '📋', color: 'var(--accent-purple)', label: 'Nova Tarefa' },
            'CONCLUIR_TAREFA': { icon: '☑️', color: 'var(--accent-emerald)', label: 'Status da Tarefa' },
            'EXCLUIR_TAREFA': { icon: '🗑️', color: 'var(--accent-rose)', label: 'Exclusão de Tarefa' }
        };
        return details[action] || { icon: '📝', color: 'var(--text-muted)', label: 'Registro' };
    }

    formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    renderLogCard(log, showProduct = true) {
        const actionMeta = this.getActionDetails(log.action);
        return `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; display: flex; gap: 1rem; align-items: flex-start;">
                <div style="font-size: 1.5rem; background: ${actionMeta.color}20; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">
                    ${actionMeta.icon}
                </div>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
                        <span style="font-weight: 700; color: ${actionMeta.color}; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px;">${actionMeta.label}</span>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">${this.formatDate(log.timestamp)}</span>
                    </div>
                    ${showProduct && log.productName ? `<div style="font-weight: 700; margin-bottom: 0.2rem; font-size: 0.95rem;">Produto: ${log.productName}</div>` : ''}
                    <div style="font-size: 0.85rem; color: var(--text-main); margin-bottom: 0.4rem;">
                        ${log.details}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-subdued);">
                        Responsável: <strong>${log.userName}</strong>
                    </div>
                </div>
            </div>
        `;
    }

    formatDateHeader(isoString) {
        const date = new Date(isoString);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const isToday = date.toDateString() === today.toDateString();
        const isYesterday = date.toDateString() === yesterday.toDateString();

        const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
        if (isToday) return `📅 Hoje — ${dateStr}`;
        if (isYesterday) return `📅 Ontem — ${dateStr}`;
        return `📅 ${dateStr}`;
    }

    renderDateSeparator(dateLabel) {
        return `
            <div style="display: flex; align-items: center; gap: 0.75rem; margin: 1.5rem 0 0.85rem 0; padding-top: 0.5rem;">
                <span style="font-size: 0.82rem; font-weight: 800; padding: 0.35rem 0.85rem; border-radius: var(--radius-full); background: rgba(238, 158, 0, 0.15); color: var(--primary); border: 1px solid rgba(238, 158, 0, 0.35); display: inline-flex; align-items: center; gap: 6px; letter-spacing: 0.3px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
                    ${dateLabel}
                </span>
                <div style="flex: 1; height: 1px; background: var(--border-color); opacity: 0.6;"></div>
            </div>
        `;
    }

    groupLogsByDate(logsList) {
        const grouped = {};
        logsList.forEach(log => {
            const dateKey = this.formatDateHeader(log.timestamp);
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(log);
        });
        return grouped;
    }

    renderGlobalAudit(resetLimit = false) {
        const container = document.getElementById('audit-global-list');
        if (!container) return;

        if (resetLimit) {
            this.globalAuditLimit = 50;
        }

        if (!window.store.isManager()) {
            container.innerHTML = '<p style="color: var(--accent-rose); text-align: center; padding: 2rem;">Acesso restrito a gerentes.</p>';
            return;
        }

        const logs = window.store.state.auditLogs || [];
        
        if (logs.length === 0) {
            container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">Nenhum registro de auditoria encontrado.</div>`;
            return;
        }

        const displayedLogs = logs.slice(0, this.globalAuditLimit);
        const grouped = this.groupLogsByDate(displayedLogs);

        let html = '';
        Object.keys(grouped).forEach(dateKey => {
            html += this.renderDateSeparator(dateKey);
            html += grouped[dateKey].map(log => this.renderLogCard(log, true)).join('');
        });

        if (logs.length > this.globalAuditLimit) {
            html += `
                <div style="text-align: center; margin: 2.2rem 0 1rem 0; padding-top: 1.2rem; border-top: 1px dashed var(--border-color);">
                    <button class="btn btn-secondary" style="padding: 0.65rem 1.6rem; font-size: 0.85rem; font-weight: 700; border-color: var(--primary); color: var(--primary);" onclick="window.auditModule.loadMoreGlobalAudit()">
                        ➕ Carregar mais registros (exibindo ${this.globalAuditLimit} de ${logs.length})
                    </button>
                </div>
            `;
        } else if (logs.length > 5) {
            html += `
                <div style="text-align: center; margin: 2.2rem 0 1rem 0; font-size: 0.78rem; color: var(--text-muted);">
                    ✅ Todos os ${logs.length} registros foram exibidos.
                </div>
            `;
        }

        container.innerHTML = html;
    }

    loadMoreGlobalAudit() {
        this.globalAuditLimit += 50;
        this.renderGlobalAudit(false);
    }

    openProductHistory(productId) {
        const product = window.store.getProductById(productId);
        if (!product) return;
        
        const container = document.getElementById('product-history-container');
        if (!container) return;

        const logs = (window.store.state.auditLogs || []).filter(l => l.productId === productId);

        if (logs.length === 0) {
            container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">Nenhum registro encontrado para este produto.</div>`;
        } else {
            const grouped = this.groupLogsByDate(logs);
            let html = '';
            Object.keys(grouped).forEach(dateKey => {
                html += this.renderDateSeparator(dateKey);
                html += grouped[dateKey].map(log => this.renderLogCard(log, false)).join('');
            });
            container.innerHTML = html;
        }

        if (window.app) window.app.openModal('modal-product-history');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.auditModule = new AuditModule();
});
