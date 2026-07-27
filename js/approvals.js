/* ==========================================================================
   Creative Sector Manager Hub - Approvals & Announcements Module
   ========================================================================== */

class ApprovalsModule {
    constructor() {
        this.selectedApprovalId = null;
        this.init();
    }

    init() {
        window.store.subscribe(() => this.render());
        this.bindEvents();
        this.render();
    }

    bindEvents() {
        const announcementForm = document.getElementById('form-add-announcement');
        if (announcementForm) {
            announcementForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateAnnouncement(e.target);
            });
        }

        const rejectForm = document.getElementById('form-reject-approval');
        if (rejectForm) {
            rejectForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.confirmRejectApproval(e.target);
            });
        }
    }

    render() {
        this.renderApprovalsList();
        this.renderAnnouncementsGrid();
    }

    renderApprovalsList() {
        const container = document.getElementById('approvals-list-container');
        if (!container) return;

        const currentUser = window.store.state.auth?.currentUser;
        const approvals = window.store.getApprovals();
        const editReqs = (window.store.state.editRequests || []).map(r => {
            const prod = window.store.getProductById(r.productId);
            const targetAssigneeId = r.targetAssigneeId || (prod ? prod.assigneeId : null);
            const targetAssigneeName = r.targetAssigneeName || (prod ? prod.assigneeName : 'Ninguém');
            return {
                id: r.id,
                productId: r.productId,
                productTitle: prod ? prod.title : (r.productTitle || 'Produto Desconhecido'),
                requesterId: r.requesterId,
                requesterName: r.requesterName,
                targetAssigneeId: targetAssigneeId,
                targetAssigneeName: targetAssigneeName,
                type: 'Permissão de Edição',
                details: `Solicita permissão para editar campos e etapas do produto sob responsabilidade de ${targetAssigneeName || 'responsável'}.`,
                status: r.status,
                date: new Date(r.date).toLocaleString(),
                isEditReq: true
            };
        });
        
        const allItems = [...approvals, ...editReqs].sort((a, b) => new Date(b.date) - new Date(a.date));

        // Filtra solicitações visíveis apenas para os envolvidos (solicitante e dono) e gerência
        const visibleItems = allItems.filter(item => {
            if (!currentUser) return false;
            if (currentUser.role === 'manager') return true;
            if (item.requesterId === currentUser.id) return true;
            if (item.targetAssigneeId && item.targetAssigneeId === currentUser.id) return true;
            return false;
        });

        if (visibleItems.length === 0) {
            container.innerHTML = `<p style="color: var(--text-subdued); text-align: center; padding: 2.5rem;">Nenhuma solicitação ou pendência para você.</p>`;
            return;
        }

        container.innerHTML = visibleItems.map(item => {
            const isPending = item.status === 'pending';
            const isTargetOrManager = !currentUser ? false : (currentUser.role === 'manager' || (item.targetAssigneeId && item.targetAssigneeId === currentUser.id));
            const canApprove = isPending && isTargetOrManager;

            const statusBadge = isPending
                ? `<span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 12px; background: rgba(245, 158, 11, 0.2); color: var(--accent-amber); font-weight: 700;">PENDENTE</span>`
                : item.status === 'approved'
                ? `<span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 12px; background: rgba(16, 185, 129, 0.2); color: var(--accent-emerald); font-weight: 700;">APROVADO</span>`
                : `<span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 12px; background: rgba(244, 63, 94, 0.2); color: var(--accent-rose); font-weight: 700;">AJUSTE SOLICITADO</span>`;

            return `
                <div class="approval-item">
                    <div class="approval-info" style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.3rem;">
                            <h4>${item.type}</h4>
                            ${statusBadge}
                        </div>
                        <div class="approval-meta">
                            <span>📦 <strong>${item.productTitle}</strong></span>
                            <span>👤 Solicitante: <strong>${item.requesterName}</strong></span>
                            <span>🕒 ${item.date}</span>
                        </div>
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem; background: var(--bg-input); padding: 0.6rem; border-radius: var(--radius-sm);">
                            "${item.details}"
                        </p>
                        ${item.rejectReason ? `
                            <p style="font-size: 0.8rem; color: var(--accent-rose); font-weight: 600; margin-top: 0.4rem; background: rgba(244, 63, 94, 0.1); padding: 0.5rem; border-radius: 6px;">
                                ⚠️ Motivo do Ajuste: "${item.rejectReason}"
                            </p>
                        ` : ''}
                    </div>

                    ${canApprove ? `
                        <div class="approval-actions">
                            <button class="btn btn-approve" onclick="window.approvalsModule.${item.isEditReq ? 'handleApproveEdit' : 'handleApprove'}('${item.id}')">
                                ✅ Aprovar
                            </button>
                            <button class="btn btn-reject" onclick="window.approvalsModule.${item.isEditReq ? 'handleRejectEdit' : 'openRejectModal'}('${item.id}')">
                                ❌ Rejeitar
                            </button>
                        </div>
                    ` : (isPending ? `
                        <div style="font-size: 0.8rem; color: var(--accent-amber); font-weight: 600; padding: 0.5rem 0.9rem; background: rgba(245, 158, 11, 0.1); border-radius: 6px; align-self: center;">
                            ⏳ Aguardando aprovação de ${item.targetAssigneeName || 'Responsável'}
                        </div>
                    ` : '')}
                </div>
            `;
        }).join('');
    }

    renderAnnouncementsGrid() {
        const container = document.getElementById('announcements-grid-container');
        if (!container) return;

        const currentUser = window.store.state.auth?.currentUser;
        const isManager = currentUser && currentUser.role === 'manager';

        // Exibe ou oculta o botão '+ Novo Aviso' com base na permissão de gerente
        const btnAdd = document.getElementById('btn-add-announcement');
        if (btnAdd) {
            btnAdd.style.display = isManager ? 'inline-block' : 'none';
        }

        // Se a aba do mural de avisos está ativa, marca avisos como lidos
        const tabAnn = document.getElementById('tab-announcements');
        if (tabAnn && tabAnn.classList.contains('active')) {
            setTimeout(() => window.store.markAnnouncementsAsRead(), 10);
        }

        const announcements = window.store.getAnnouncements();

        if (announcements.length === 0) {
            container.innerHTML = `<p style="color: var(--text-subdued); text-align: center; grid-column: 1 / -1; padding: 2rem;">Nenhum comunicado publicado.</p>`;
            return;
        }

        container.innerHTML = announcements.map(ann => `
            <div class="announcement-card">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                        <h3 class="announcement-title">${ann.title}</h3>
                        ${ann.priority === 'alta' ? `<span style="font-size: 0.68rem; background: rgba(244, 63, 94, 0.2); color: var(--accent-rose); padding: 2px 6px; border-radius: 4px; font-weight: 700;">URGENTE</span>` : ''}
                    </div>
                    <p class="announcement-body">${ann.content}</p>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.75rem; font-size: 0.75rem; color: var(--text-muted);">
                    <span>Por: <strong>${ann.author}</strong> (${ann.date})</span>
                    ${isManager ? `
                        <button style="background: none; border: none; color: var(--accent-rose); cursor: pointer;" onclick="window.approvalsModule.deleteAnnouncement('${ann.id}')">
                            Excluir
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    handleApprove(id) {
        window.store.updateApprovalStatus(id, 'approved');
        window.store.addAuditLog('APROVAR_SOLICITACAO', null, null, `Solicitação genérica aprovada.`);
        if (window.app) window.app.showToast('Solicitação APROVADA com sucesso!', 'success');
    }

    handleApproveEdit(id) {
        const reqIndex = window.store.state.editRequests.findIndex(r => r.id === id);
        if (reqIndex !== -1) {
            const req = window.store.state.editRequests[reqIndex];
            req.status = 'approved';
            // Add requester to product's allowedEditors
            const product = window.store.state.products.find(p => p.id === req.productId);
            if (product) {
                if (!product.allowedEditors) product.allowedEditors = [];
                if (!product.allowedEditors.includes(req.requesterId)) {
                    product.allowedEditors.push(req.requesterId);
                }
            }
            window.store.saveState();
            window.store.addAuditLog('APROVAR_EDICAO', req.productId, req.productTitle, `Permissão de edição concedida para ${req.requesterName}.`);
            if (window.app) window.app.showToast('Permissão de edição concedida!', 'success');
        }
    }

    handleRejectEdit(id) {
        const reqIndex = window.store.state.editRequests.findIndex(r => r.id === id);
        if (reqIndex !== -1) {
            const req = window.store.state.editRequests[reqIndex];
            req.status = 'rejected';
            window.store.saveState();
            window.store.addAuditLog('REJEITAR_EDICAO', req.productId, req.productTitle, `Permissão de edição negada para ${req.requesterName}.`);
            if (window.app) window.app.showToast('Permissão de edição negada.', 'info');
        }
    }

    openRejectModal(id) {
        this.selectedApprovalId = id;
        if (window.app) window.app.openModal('modal-reject-approval');
    }

    confirmRejectApproval(form) {
        const formData = new FormData(form);
        const reason = formData.get('rejectReason');

        if (!reason || !this.selectedApprovalId) {
            if (window.app) window.app.showToast('Por favor, informe o motivo.', 'error');
            return;
        }

        window.store.updateApprovalStatus(this.selectedApprovalId, 'rejected', reason);
        window.store.addAuditLog('REJEITAR_SOLICITACAO', null, null, `Solicitação genérica rejeitada. Motivo: ${reason}`);
        if (window.app) {
            window.app.closeModal('modal-reject-approval');
            window.app.showToast('Solicitação REJEITADA!', 'info');
        }
        form.reset();
        this.selectedApprovalId = null;
    }

    handleCreateAnnouncement(form) {
        const currentUser = window.store.state.auth?.currentUser;
        if (!currentUser || currentUser.role !== 'manager') {
            if (window.app) window.app.showToast('Apenas o gerente pode publicar avisos!', 'error');
            return;
        }

        const formData = new FormData(form);
        const title = formData.get('title');
        const content = formData.get('content');
        const priority = formData.get('priority');

        if (!title || !content) {
            if (window.app) window.app.showToast('Preencha o título e o conteúdo do comunicado!', 'error');
            return;
        }

        window.store.addAnnouncement({ title, content, priority });

        if (window.app) {
            window.app.closeModal('modal-add-announcement');
            window.app.showToast('Comunicado publicado no mural da equipe!', 'success');
        }
        form.reset();
    }

    deleteAnnouncement(id) {
        const currentUser = window.store.state.auth?.currentUser;
        if (!currentUser || currentUser.role !== 'manager') {
            if (window.app) window.app.showToast('Apenas o gerente pode excluir avisos!', 'error');
            return;
        }

        if (confirm('Excluir este comunicado?')) {
            window.store.deleteAnnouncement(id);
            if (window.app) window.app.showToast('Comunicado removido.', 'info');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.approvalsModule = new ApprovalsModule();
});
