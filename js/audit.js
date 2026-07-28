class AuditModule {
    constructor() {
        this.renderGlobalAudit();
        
        // Listener para renderizar globalmente sempre que a aba audit for aberta
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.currentTarget.dataset.tab === 'audit') {
                    this.renderGlobalAudit();
                }
            });
        });
    }

    getActionDetails(action) {
        const details = {
            'CRIAR_PRODUTO': { icon: '📦', color: 'var(--accent-emerald)', label: 'Criação' },
            'EDITAR_PRODUTO': { icon: '✏️', color: 'var(--secondary)', label: 'Edição' },
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
            'CRIAR_TAREFA': { icon: '📋', color: 'var(--secondary)', label: 'Nova Tarefa' },
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

    renderGlobalAudit() {
        const container = document.getElementById('audit-global-list');
        if (!container) return;

        if (!window.store.isManager()) {
            container.innerHTML = '<p style="color: var(--accent-rose); text-align: center; padding: 2rem;">Acesso restrito a gerentes.</p>';
            return;
        }

        const logs = window.store.state.auditLogs || [];
        
        if (logs.length === 0) {
            container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">Nenhum registro de auditoria encontrado.</div>`;
            return;
        }

        container.innerHTML = logs.map(log => this.renderLogCard(log, true)).join('');
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
            container.innerHTML = logs.map(log => this.renderLogCard(log, false)).join('');
        }

        if (window.app) window.app.openModal('modal-product-history');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.auditModule = new AuditModule();
});
