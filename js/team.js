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

        const cu = window.store.state.auth?.currentUser;
        const isManager = cu && (cu.sysRole === 'manager' || cu.role === 'manager' || cu.id === 'emp-1');
        const isOwner = cu && (cu.id === 'emp-1' || cu.email === 'vittor@emporioctz.com.br');

        const addBtn = document.querySelector('#tab-team button[onclick*="modal-add-employee"]');
        if (addBtn) addBtn.style.display = isManager ? 'inline-flex' : 'none';

        const stageSection = document.getElementById('stage-config-section');
        if (stageSection) stageSection.style.display = isManager ? 'block' : 'none';

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
                            <h3>${emp.name} ${emp.sysRole === 'manager' ? '<span style="font-size: 0.68rem; padding: 2px 7px; border-radius: 6px; background: rgba(238, 158, 0, 0.2); color: var(--primary); vertical-align: middle; margin-left: 6px; font-weight: 700; border: 1px solid rgba(238, 158, 0, 0.4);">ADM</span>' : ''}</h3>
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

                    ${isManager ? `
                    <div style="border-top: 1px solid var(--border-color); padding-top: 0.9rem; margin-top: auto; display: flex; flex-direction: column; gap: 0.75rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
                                Avaliação Geral:
                                <strong style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 6px; background: rgba(245, 158, 11, 0.15); color: var(--accent-amber); font-weight: 700; font-size: 0.78rem; border: 1px solid rgba(245, 158, 11, 0.3);">
                                    ⭐ ${emp.performanceRating || '5.0'}
                                </strong>
                            </span>
                        </div>

                        <!-- Risquinho separando a avaliação geral dos botões -->
                        <div style="height: 1px; background: var(--border-color); opacity: 0.65; margin: 0.05rem 0;"></div>

                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.45rem;">
                            <button class="btn btn-secondary" style="padding: 0.45rem 0.2rem; font-size: 0.76rem; border-color: rgba(238, 158, 0, 0.35); color: var(--primary); justify-content: center; font-weight: 600;" onclick="window.teamModule.openEditEmployee('${emp.id}')" title="Editar informações do funcionário">
                                ✏️ Editar
                            </button>
                            <button class="btn btn-secondary" style="padding: 0.45rem 0.2rem; font-size: 0.76rem; border-color: rgba(56, 189, 248, 0.35); color: var(--accent-cyan, #38bdf8); justify-content: center; font-weight: 600;" onclick="window.teamModule.resetEmployeePassword('${emp.id}')" title="Voltar a senha para 12345">
                                🔄 Senha
                            </button>
                            <button class="btn btn-secondary" style="padding: 0.45rem 0.2rem; font-size: 0.76rem; border-color: rgba(245, 158, 11, 0.35); color: var(--accent-amber, #f59e0b); justify-content: center; font-weight: 600;" onclick="window.teamModule.evaluateEmployee('${emp.id}')">
                                ⭐ Avaliar
                            </button>
                        </div>

                        ${((isOwner && emp.id !== 'emp-1' && emp.email !== 'vittor@emporioctz.com.br') || (emp.id !== 'emp-1' && emp.email !== 'vittor@emporioctz.com.br' && (!emp.sysRole || emp.sysRole !== 'manager' || isOwner))) ? `
                        <div style="display: flex; gap: 0.45rem;">
                            ${isOwner && emp.id !== 'emp-1' && emp.email !== 'vittor@emporioctz.com.br' ? `
                                <button class="btn btn-secondary" style="flex: 1; padding: 0.45rem 0.5rem; font-size: 0.76rem; border-color: ${emp.sysRole === 'manager' ? 'rgba(192, 132, 216, 0.45)' : 'rgba(92, 191, 98, 0.45)'}; color: ${emp.sysRole === 'manager' ? 'var(--grafico-3, #c084d8)' : 'var(--sucesso, #5cbf62)'}; justify-content: center; font-weight: 700;" onclick="window.teamModule.toggleAdminRole('${emp.id}', '${emp.name}', ${emp.sysRole === 'manager'})" title="${emp.sysRole === 'manager' ? 'Remover permissão de Administrador' : 'Tornar Administrador do Sistema'}">
                                    👑 ${emp.sysRole === 'manager' ? 'Remover ADM' : 'Tornar ADM'}
                                </button>
                            ` : ''}
                            ${emp.id !== 'emp-1' && emp.email !== 'vittor@emporioctz.com.br' && (!emp.sysRole || emp.sysRole !== 'manager' || isOwner) ? `
                                <button class="btn btn-secondary" style="flex: 1; padding: 0.45rem 0.5rem; font-size: 0.76rem; border-color: rgba(244, 63, 94, 0.45); color: var(--accent-rose, #f43f5e); justify-content: center; font-weight: 700;" onclick="window.teamModule.deleteEmployee('${emp.id}', '${emp.name}')" title="Excluir Colaborador">
                                    🗑️ Excluir
                                </button>
                            ` : ''}
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    checkIsManager() {
        const cu = window.store.state.auth?.currentUser;
        const isMgr = cu && (cu.sysRole === 'manager' || cu.role === 'manager' || cu.id === 'emp-1');
        if (!isMgr) {
            if (window.app) window.app.showToast('Apenas gerentes podem realizar esta ação.', 'error');
            return false;
        }
        return true;
    }

    handleCreateEmployee(form) {
        if (!this.checkIsManager()) return;
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
        if (!this.checkIsManager()) return;
        if (confirm(`Tem certeza absoluta que deseja EXCLUIR o colaborador ${name}?\nIsso removerá ele da equipe permanentemente.`)) {
            window.store.deleteEmployee(id);
            if (window.app) window.app.showToast(`Colaborador ${name} foi excluído da equipe.`, 'success');
        }
    }

    toggleAdminRole(id, name, isCurrentlyAdmin) {
        const cu = window.store.state.auth?.currentUser;
        const isOwner = cu && (cu.id === 'emp-1' || cu.email === 'vittor@emporioctz.com.br');
        if (!isOwner) {
            if (window.app) window.app.showToast('Apenas o Gerente Geral (Vittor) pode alterar permissões de ADM.', 'error');
            return;
        }

        const msg = isCurrentlyAdmin
            ? `Deseja REMOVER as permissões de Administrador de ${name}?\nEle voltará a ser Colaborador comum.`
            : `Deseja TRANSFORMAR ${name} em Administrador (ADM)?\nEle poderá gerenciar a equipe, produtos e configurações como você.`;

        if (!confirm(msg)) return;

        const updatedEmp = window.store.toggleAdminRole(id);
        if (updatedEmp) {
            this.renderMembers();
            if (window.app) {
                window.app.showToast(
                    updatedEmp.sysRole === 'manager'
                        ? `${name} agora é um Administrador (ADM)! 👑`
                        : `${name} teve as permissões de ADM removidas.`,
                    'success'
                );
            }
        }
    }

    handleDeleteEmployee(id) {
        if (!this.checkIsManager()) return;
        if (!confirm('Tem certeza que deseja remover este colaborador?')) return;

        window.store.deleteEmployee(id);
        if (window.app) window.app.showToast('Colaborador removido.', 'success');
    }

    openEditEmployee(id) {
        if (!this.checkIsManager()) return;
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
        if (!this.checkIsManager()) return;
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
            { id: 'images', name: 'Imagens e Artes', color: 'var(--accent-purple)' },
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
        if (!this.checkIsManager()) return;
        window.store.updateStageAssignee(stageId, employeeId);
        if (window.app) window.app.showToast('Configuração de etapa atualizada!', 'success');
    }

    resetEmployeePassword(empId) {
        if (!this.checkIsManager()) return;
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
        if (!this.checkIsManager()) return;
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
