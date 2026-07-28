/* ==========================================================================
   Creative Sector Manager Hub - Team & Workload Management Module
   ========================================================================== */

class TeamModule {
    constructor() {
        this.init();
    }

    init() {
        window.store.subscribe(() => this.render());
        this.bindEvents();
        this.render();
    }

    bindEvents() {
        const form = document.getElementById('form-add-employee');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateEmployee(e.target);
            });
        }

        const editForm = document.getElementById('form-edit-employee');
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleUpdateEmployee(e.target);
            });
        }
    }

    render() {
        this.renderStageConfig();
        const container = document.getElementById('team-grid-container');
        if (!container) return;

        const employees = window.store.getEmployees();
        const products = window.store.getProducts();

        container.innerHTML = employees.map(emp => {
            // Get active products assigned to this employee
            const empProducts = products.filter(p => p.assigneeId === emp.id && p.stage !== 'launch');
            const loadPercent = Math.min(100, Math.round((empProducts.length / emp.maxCapacity) * 100));

            let statusClass = 'fill-normal';
            let statusLabel = '🟢 Disponível';
            if (loadPercent >= 85) {
                statusClass = 'fill-overloaded';
                statusLabel = '🔴 Sobrecarregado';
            } else if (loadPercent >= 60) {
                statusClass = 'fill-ideal';
                statusLabel = '🔵 Capacidade Ideal';
            }

            const skillsHTML = (emp.skills || []).map(s => `
                <span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 12px; background: rgba(99,102,241,0.15); color: var(--primary); font-weight: 600;">${s}</span>
            `).join('');

            const tasksHTML = empProducts.length > 0
                ? empProducts.map(p => `
                    <div class="member-task-item">
                        <span style="font-weight: 600; color: var(--text-main); font-size: 0.82rem;">${p.title}</span>
                        <span style="font-size: 0.72rem; color: var(--accent-cyan); font-weight: 700;">${p.sku}</span>
                    </div>
                `).join('')
                : `<p style="font-size: 0.8rem; color: var(--text-subdued); text-align: center; padding: 0.5rem;">Nenhuma tarefa pendente</p>`;

            return `
                <div class="member-card">
                    <div class="member-header">
                        <div class="member-avatar-lg" style="background: ${emp.avatarBg || 'var(--primary)'}">
                            ${emp.avatar}
                        </div>
                        <div class="member-info">
                            <h3>${emp.name}</h3>
                            <p class="member-role">${emp.role}</p>
                            <p style="font-size: 0.75rem; color: var(--text-subdued); margin-top: 2px;">${emp.email || ''}</p>
                        </div>
                    </div>

                    <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                        ${skillsHTML}
                    </div>

                    <!-- Workload Gauge -->
                    <div class="workload-section">
                        <div class="workload-header">
                            <span>Carga de Trabalho: ${empProducts.length} / ${emp.maxCapacity} tarefas</span>
                            <span>${statusLabel}</span>
                        </div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill ${statusClass}" style="width: ${loadPercent}%;"></div>
                        </div>
                    </div>

                    <div>
                        <h4 style="font-size: 0.82rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.6rem; letter-spacing: 0.5px;">
                            Tarefas / Produtos em Andamento:
                        </h4>
                        <div class="member-tasks-list">
                            ${tasksHTML}
                        </div>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.85rem; margin-top: auto;">
                        <span style="font-size: 0.78rem; color: var(--text-muted);">
                            Avaliação: <strong style="color: var(--accent-amber);">⭐ ${emp.performanceRating || '5.0'}</strong>
                        </span>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn btn-secondary" style="padding: 0.4rem 0.6rem; font-size: 0.78rem; border-color: var(--primary); color: var(--primary);" onclick="window.teamModule.openEditEmployee('${emp.id}')" title="Editar informações do funcionário">
                                ✏️ Editar
                            </button>
                            <button class="btn btn-secondary" style="padding: 0.4rem 0.6rem; font-size: 0.78rem; border-color: rgba(245, 158, 11, 0.4); color: var(--accent-amber);" onclick="window.teamModule.resetEmployeePassword('${emp.id}')" title="Voltar a senha para 12345">
                                🔄 Senha
                            </button>
                            <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.78rem; color: var(--accent-amber); border-color: rgba(245, 158, 11, 0.4);" onclick="window.teamModule.evaluateEmployee('${emp.id}')">
                                ⭐ Avaliar
                            </button>
                            ${emp.id !== 'emp-1' ? `
                                <button class="btn btn-secondary" style="padding: 0.4rem 0.6rem; font-size: 0.78rem; border-color: rgba(244, 63, 94, 0.4); color: var(--accent-rose);" onclick="window.teamModule.deleteEmployee('${emp.id}', '${emp.name}')" title="Excluir Colaborador">
                                    🗑️ Excluir
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    handleCreateEmployee(form) {
        const formData = new FormData(form);
        const name = formData.get('name');
        const role = formData.get('role');
        const email = formData.get('email');
        const skillsStr = formData.get('skills');
        const maxCapacity = parseInt(formData.get('maxCapacity')) || 10;

        if (!name || !role) {
            if (window.app) window.app.showToast('Preencha pelo menos Nome e Cargo!', 'error');
            return;
        }

        const skills = skillsStr ? skillsStr.split(',').map(s => s.trim()) : ['Criação'];

        const newEmp = {
            id: Date.now().toString(),
            name,
            role,
            email,
            skills,
            maxCapacity,
            password: '12345',
            sysRole: 'employee',
            mustChangePassword: true,
            avatar: name.charAt(0).toUpperCase(),
            createdAt: Date.now()
        };

        window.store.addEmployee(newEmp);

        if (window.app) {
            window.app.closeModal('modal-add-employee');
            form.reset();
            window.app.showToast(`Colaborador ${newEmp.name} cadastrado com sucesso!`, 'success');
        }
    }

    deleteEmployee(id, name) {
        if (confirm(`Tem certeza absoluta que deseja EXCLUIR o colaborador ${name}?\nIsso removerá ele da equipe permanentemente.`)) {
            window.store.deleteEmployee(id);
            if (window.app) window.app.showToast(`Colaborador ${name} foi excluído da equipe.`, 'success');
        }
    }

    handleDeleteEmployee(id) {
        if (!confirm('Tem certeza que deseja remover este colaborador?')) return;

        window.store.deleteEmployee(id);
        if (window.app) window.app.showToast('Colaborador removido.', 'success');
    }

    openEditEmployee(id) {
        const emp = window.store.getEmployeeById(id);
        if (!emp) return;

        document.getElementById('edit-emp-id').value = emp.id;
        document.getElementById('edit-emp-name').value = emp.name;
        document.getElementById('edit-emp-role').value = emp.role || '';
        document.getElementById('edit-emp-email').value = emp.email || '';
        document.getElementById('edit-emp-skills').value = (emp.skills || []).join(', ');
        document.getElementById('edit-emp-maxCapacity').value = emp.maxCapacity || 8;

        window.app.openModal('modal-edit-employee');
    }

    handleUpdateEmployee(form) {
        const formData = new FormData(form);
        const id = formData.get('id');
        const name = formData.get('name');
        const role = formData.get('role');
        const email = formData.get('email');
        const skillsStr = formData.get('skills');
        const maxCapacity = parseInt(formData.get('maxCapacity'), 10) || 8;

        const skills = skillsStr ? skillsStr.split(',').map(s => s.trim()).filter(s => s) : [];

        // Atualizar store (vai precisar de um método updateEmployee no store.js)
        window.store.updateEmployee(id, { name, role, email, skills, maxCapacity });
        
        window.app.closeModal('modal-edit-employee');
        if (window.app) window.app.showToast('Colaborador atualizado com sucesso!', 'success');
    }

    renderStageConfig() {
        const container = document.getElementById('stage-config-container');
        if (!container) return;

        const stages = [
            { id: 'olist_setup', name: 'Cadastro Olist', color: 'var(--accent-cyan)' },
            { id: 'images', name: 'Imagens e Artes', color: 'var(--secondary)' },
            { id: 'pricing', name: 'Precificação', color: 'var(--accent-emerald)' },
            { id: 'verification', name: 'Verificação', color: 'var(--accent-amber)' },
            { id: 'marketplaces', name: 'Marketplaces', color: 'var(--accent-rose)' }
        ];

        const employees = window.store.getEmployees();
        const assignees = window.store.state.stageAssignees || {};

        container.innerHTML = stages.map(stage => {
            const currentAssignee = assignees[stage.id] || '';
            const options = employees.map(emp => 
                `<option value="${emp.id}" ${currentAssignee === emp.id ? 'selected' : ''}>${emp.name}</option>`
            ).join('');

            return `
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.75rem;">
                    <div style="font-size: 0.75rem; font-weight: 700; color: ${stage.color}; margin-bottom: 0.4rem; text-transform: uppercase;">
                        ${stage.name}
                    </div>
                    <select class="form-control" style="font-size: 0.8rem; padding: 0.3rem;" onchange="window.teamModule.changeStageAssignee('${stage.id}', this.value)">
                        <option value="">-- Não atribuir --</option>
                        ${options}
                    </select>
                </div>
            `;
        }).join('');
    }

    changeStageAssignee(stageId, employeeId) {
        window.store.updateStageAssignee(stageId, employeeId);
        if (window.app) window.app.showToast('Configuração de etapa atualizada!', 'success');
    }

    resetEmployeePassword(empId) {
        if (!confirm('Tem certeza que deseja resetar a senha deste funcionário para 12345?')) return;
        
        const empIndex = window.store.state.employees.findIndex(e => e.id === empId);
        if (empIndex !== -1) {
            window.store.state.employees[empIndex].password = '12345';
            window.store.state.employees[empIndex].mustChangePassword = true;
            window.store.saveState();
            if (window.app) window.app.showToast('Senha resetada para 12345 com sucesso!', 'success');
        }
    }

    quickFeedback(id, name) {
        if (window.app) {
            window.app.showToast(`Redirecionando para conversa com ${name}...`, 'info');
            setTimeout(() => {
                const chatTab = document.querySelector('li[data-tab="chat"]');
                if (chatTab) chatTab.click();
            }, 500);
        }
    }

    evaluateEmployee(id) {
        const emp = window.store.getEmployeeById(id);
        if (!emp) return;

        const val = prompt(`Avalie o desempenho de ${emp.name} (nota de 1 a 5):`, emp.performanceRating || '5.0');
        if (val === null) return;
        
        const num = parseFloat(val);
        if (isNaN(num) || num < 1 || num > 5) {
            if (window.app) window.app.showToast('Por favor, insira uma nota válida de 1 a 5.', 'error');
            return;
        }

        window.store.updateEmployee(id, { performanceRating: num.toFixed(1) });
        if (window.app) window.app.showToast('Avaliação salva com sucesso!', 'success');
        this.render();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.teamModule = new TeamModule();
});
