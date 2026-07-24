/* ==========================================================================
   Creative Sector Manager Hub - Individual Tasks & Pipeline Notifications Module
   ========================================================================== */

class TasksModule {
    constructor() {
        const defaultUser = window.store.state.auth.currentUser ? window.store.state.auth.currentUser.id : 'emp-1';
        this.activeEmployeeId = localStorage.getItem('active_task_employee') || defaultUser;
        
        // Se for funcionario normal, forçar ele mesmo sempre
        if (window.store.state.auth.currentUser && window.store.state.auth.currentUser.role === 'employee') {
            this.activeEmployeeId = window.store.state.auth.currentUser.id;
        }
        
        this.init();
    }

    init() {
        window.store.subscribe(() => this.render());
        this.bindEvents();
        this.render();
    }

    setActiveEmployee(empId) {
        if (!empId) return;
        this.activeEmployeeId = empId;
        localStorage.setItem('active_task_employee', empId);
        this.render();
        if (window.app) {
            const emp = window.store.getEmployeeById(empId);
            if (emp) window.app.showToast(`Visualizando afazeres de: ${emp.name}`, 'info');
        }
    }

    bindEvents() {
        const empSelect = document.getElementById('task-active-employee-select');
        if (empSelect) {
            empSelect.addEventListener('change', (e) => {
                this.setActiveEmployee(e.target.value);
            });
        }

        const addForm = document.getElementById('form-add-personal-task');
        if (addForm) {
            addForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = document.getElementById('input-personal-task');
                if (input && input.value.trim()) {
                    window.store.addPersonalTask(this.activeEmployeeId, input.value.trim());
                    input.value = '';
                    if (window.app) window.app.showToast('Lembrete pessoal adicionado!', 'success');
                }
            });
        }
    }

    render() {
        // Se for funcionário, forçar a visualização das próprias tarefas
        const currentUser = window.store.state.auth.currentUser;
        if (currentUser && currentUser.role === 'employee') {
            this.activeEmployeeId = currentUser.id;
        }

        this.updateEmployeeSelectorOptions();
        const emp = window.store.getEmployeeById(this.activeEmployeeId) || window.store.getEmployees()[0];
        if (!emp) return;

        // Fetch assigned pipeline products & personal tasks
        const assignedProducts = window.store.getEmployeeAssignedProducts(emp.id);
        const personalTasks = window.store.getPersonalTasks(emp.id);

        const pendingPersonalCount = personalTasks.filter(t => !t.completed).length;
        const totalPendingCount = assignedProducts.length + pendingPersonalCount;

        // Update Nav Badge
        const navBadge = document.getElementById('badge-tasks-count');
        if (navBadge) {
            if (totalPendingCount > 0) {
                navBadge.textContent = totalPendingCount;
                navBadge.style.display = 'inline-block';
            } else {
                navBadge.style.display = 'none';
            }
        }

        // Render Current Employee Profile Header
        const profileContainer = document.getElementById('task-employee-profile-header');
        if (profileContainer) {
            profileContainer.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="width: 50px; height: 50px; border-radius: 14px; background: ${emp.avatarBg || 'var(--primary)'}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 1.25rem; box-shadow: var(--shadow-glow);">
                        ${emp.avatar}
                    </div>
                    <div>
                        <h3 style="font-size: 1.15rem; font-weight: 800;">${emp.name}</h3>
                        <p style="font-size: 0.82rem; color: var(--accent-cyan); font-weight: 600;">${emp.role} • <span style="color: var(--text-muted);">${emp.email || ''}</span></p>
                    </div>
                </div>
            `;
        }

        const statsContainer = document.getElementById('task-stats-container');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div style="text-align: right;">
                    <span style="font-size: 0.72rem; text-transform: uppercase; color: var(--text-subdued); font-weight: 700;">Atribuídos na Esteira</span>
                    <div style="font-size: 1.2rem; font-weight: 800; color: var(--accent-amber);">${assignedProducts.length} produtos</div>
                </div>
                <div style="text-align: right; padding-left: 1rem; border-left: 1px solid var(--border-color);">
                    <span style="font-size: 0.72rem; text-transform: uppercase; color: var(--text-subdued); font-weight: 700;">Lembretes Pendentes</span>
                    <div style="font-size: 1.2rem; font-weight: 800; color: var(--primary);">${pendingPersonalCount} tarefas</div>
                </div>
            `;
        }

        // Render Assigned Pipeline Products List
        const productsContainer = document.getElementById('task-assigned-products-container');
        if (productsContainer) {
            if (assignedProducts.length === 0) {
                productsContainer.innerHTML = `
                    <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
                        <div style="font-size: 1.8rem; margin-bottom: 0.4rem;">🎉</div>
                        <p style="font-size: 0.9rem; font-weight: 700; color: var(--accent-emerald);">Sem tarefas pendentes na esteira!</p>
                        <p style="font-size: 0.78rem; color: var(--text-subdued);">Todos os produtos atribuídos a ${emp.name.split(' ')[0]} estão em dia.</p>
                    </div>
                `;
            } else {
                const stageLabels = {
                    olist_setup: { name: '1. Cadastro Olist (ERP)', desc: 'Preencher dados gerais, EAN, ficha técnica e dimensões no sistema Olist.', color: 'var(--accent-cyan)' },
                    images: { name: '2. Criação de Imagens', desc: 'Produzir renders 3D, tratamento 4K e fotos de estúdio com fundo neutro.', color: 'var(--secondary)' },
                    pricing: { name: '3. Precificação', desc: 'Preencher tabela de preços analíticos para os 12 canais de venda.', color: 'var(--accent-emerald)' },
                    verification: { name: '4. Verificação Geral', desc: 'Revisar integridade da ficha Olist e preços antes da publicação.', color: 'var(--accent-amber)' },
                    marketplaces: { name: '5. Marketplaces', desc: 'Realizar o cadastro e vinculo dos anúncios nos 10 marketplaces.', color: 'var(--accent-rose)' }
                };

                productsContainer.innerHTML = assignedProducts.map(prod => {
                    const stageInfo = stageLabels[prod.stage] || { name: prod.stage, desc: 'Ação requerida na esteira.', color: 'var(--primary)' };
                    const progress = window.store.calculateProductProgress(prod);

                    return `
                        <div class="task-assigned-card" onclick="window.kanbanModule.openProductDetailModal('${prod.id}')">
                            <div class="task-assigned-header">
                                <div>
                                    <h4 style="font-size: 1rem; font-weight: 800; margin-bottom: 0.2rem;">${prod.title}</h4>
                                    <span style="font-size: 0.78rem; color: var(--text-muted);">SKU: <strong>${prod.sku}</strong> | Categoria: <strong>${prod.category}</strong></span>
                                </div>
                                <span class="badge-priority priority-${prod.priority}">${prod.priority.toUpperCase()}</span>
                            </div>

                            <div style="background: rgba(0, 0, 0, 0.2); padding: 0.75rem 1rem; border-radius: var(--radius-sm); border-left: 3px solid ${stageInfo.color}; margin: 0.85rem 0;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem;">
                                    <span style="font-size: 0.82rem; font-weight: 700; color: ${stageInfo.color};">📍 Etapa Atual: ${stageInfo.name}</span>
                                    <span style="font-size: 0.75rem; font-weight: 800; color: var(--text-main);">${progress}% concluído</span>
                                </div>
                                <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0;">${stageInfo.desc}</p>
                            </div>

                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
                                <span style="font-size: 0.75rem; color: var(--accent-emerald); font-weight: 700;">Preço Base: R$ ${Number(prod.suggestedPrice || 0).toFixed(2)}</span>
                                <button class="btn btn-primary" style="padding: 0.4rem 0.85rem; font-size: 0.78rem;" onclick="event.stopPropagation(); window.kanbanModule.openProductDetailModal('${prod.id}')">
                                    ⚡ Abrir & Concluir Ação →
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        // Render Personal Tasks / Reminders List
        const personalTasksContainer = document.getElementById('task-personal-list-container');
        if (personalTasksContainer) {
            if (personalTasks.length === 0) {
                personalTasksContainer.innerHTML = `
                    <div style="text-align: center; padding: 1.5rem; color: var(--text-subdued); font-size: 0.82rem;">
                        Nenhum lembrete pessoal cadastrado. Adicione um acima!
                    </div>
                `;
            } else {
                personalTasksContainer.innerHTML = personalTasks.map(t => `
                    <div class="personal-task-item ${t.completed ? 'completed' : ''}">
                        <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1;">
                            <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="window.tasksModule.handleTogglePersonalTask('${t.id}')" style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary);">
                            <span style="font-size: 0.88rem; ${t.completed ? 'text-decoration: line-through; color: var(--text-subdued);' : 'color: var(--text-main); font-weight: 500;'}">${t.text}</span>
                        </div>
                        <button class="btn-icon" style="padding: 4px; color: var(--text-subdued);" title="Excluir Lembrete" onclick="window.tasksModule.handleDeletePersonalTask('${t.id}')">
                            🗑️
                        </button>
                    </div>
                `).join('');
            }
        }
    }

    updateEmployeeSelectorOptions() {
        const select = document.getElementById('task-active-employee-select');
        if (!select) return;
        
        // Esconder a div completa do seletor se o usuário logado for funcionário
        const selectWrapper = document.getElementById('task-selector-wrapper');
        if (selectWrapper) {
            if (window.store.state.auth.currentUser && window.store.state.auth.currentUser.role === 'employee') {
                selectWrapper.style.display = 'none';
            } else {
                selectWrapper.style.display = 'flex';
            }
        }

        const employees = window.store.getEmployees();

        if (select.options.length === 0) {
            employees.forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp.id;
                opt.textContent = `${emp.name} (${emp.role})`;
                if (emp.id === this.activeEmployeeId) opt.selected = true;
                select.appendChild(opt);
            });
        } else {
            select.value = this.activeEmployeeId;
        }
    }

    handleTogglePersonalTask(taskId) {
        window.store.togglePersonalTask(taskId);
    }

    handleDeletePersonalTask(taskId) {
        window.store.deletePersonalTask(taskId);
        if (window.app) window.app.showToast('Lembrete removido.', 'info');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.tasksModule = new TasksModule();
});
