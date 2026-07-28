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
        const totalPendingCount = pendingPersonalCount;

        // Update Nav Badge
        const navBadge = document.getElementById('badge-tasks-count');
        const tasksTabEl = document.querySelector('li[data-tab="tasks"]');
        if (navBadge) {
            if (totalPendingCount > 0) {
                navBadge.textContent = totalPendingCount;
                navBadge.style.display = 'inline-block';
            } else {
                navBadge.style.display = 'none';
            }
            if (tasksTabEl) tasksTabEl.classList.toggle('has-unread', totalPendingCount > 0);
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
                        <p style="font-size: 0.85rem; color: var(--text-muted);">${emp.role} • <span style="color: var(--accent-cyan); font-weight: 600;">${emp.email || ''}</span></p>
                    </div>
                </div>
            `;
        }

        // Render Pipeline Assigned Products
        const assignedContainer = document.getElementById('task-assigned-products-container');
        if (assignedContainer) {
            const assignedCountEl = document.getElementById('task-assigned-count');
            if (assignedCountEl) assignedCountEl.textContent = assignedProducts.length;

            if (assignedProducts.length === 0) {
                assignedContainer.innerHTML = `
                    <div style="text-align: center; padding: 3rem 1.5rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
                        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎉</div>
                        <h4 style="font-weight: 700; margin-bottom: 0.25rem;">Nenhum produto pendente na esteira!</h4>
                        <p style="font-size: 0.85rem; color: var(--text-muted);">Todas as suas obrigações foram concluídas.</p>
                    </div>
                `;
            } else {
                assignedContainer.innerHTML = assignedProducts.map(prod => {
                    const progress = window.store.calculateProductProgress(prod);
                    const stageNames = {
                        olist_setup: '1. Cadastro Olist (ERP)',
                        images: '2. Criação de Imagens',
                        pricing: '3. Precificação por Canal',
                        verification: '4. Verificação Geral',
                        marketplaces: '5. Cadastro nos Marketplaces',
                        completed: '🎉 Finalizado / Marketplaces'
                    };
                    return `
                        <div class="task-card-item">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                                <div>
                                    <h4 style="font-size: 1rem; font-weight: 800; margin-bottom: 0.2rem;">${prod.title}</h4>
                                    <span style="font-size: 0.75rem; color: var(--text-muted);">SKU: <strong>${prod.sku}</strong> | Categoria: ${prod.category}</span>
                                </div>
                                <span class="badge-priority priority-${prod.priority}" style="font-size: 0.7rem;">${prod.priority ? prod.priority.toUpperCase() : 'NORMAL'}</span>
                            </div>
                            
                            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.75rem; margin-bottom: 0.85rem;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                                    <span style="font-size: 0.8rem; font-weight: 700; color: var(--accent-cyan);">📍 Etapa Atual: ${stageNames[prod.stage] || prod.stage}</span>
                                    <span style="font-size: 0.78rem; font-weight: 700;">${progress}% concluído</span>
                                </div>
                                <p style="font-size: 0.78rem; color: var(--text-subdued); margin: 0;">Ação necessária para avanço na esteira.</p>
                            </div>

                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 0.8rem; font-weight: 700; color: var(--accent-emerald);">Preço Base: R$ ${Number(prod.suggestedPrice || 0).toFixed(2)}</span>
                                <button class="btn btn-primary" style="padding: 0.4rem 0.85rem; font-size: 0.8rem;" onclick="window.kanbanModule.openProductDetailModal('${prod.id}')">
                                    ⚡ Abrir & Concluir Ação &rarr;
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        // Render Personal Todo Tasks
        const personalTasksContainer = document.getElementById('task-personal-todos-container');
        if (personalTasksContainer) {
            const personalCountEl = document.getElementById('task-personal-count');
            if (personalCountEl) personalCountEl.textContent = pendingPersonalCount;

            if (personalTasks.length === 0) {
                personalTasksContainer.innerHTML = `
                    <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted); font-size: 0.85rem;">
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
        const currentUser = window.store.state.auth.currentUser;
        if (selectWrapper) {
            if (currentUser && currentUser.role === 'employee') {
                selectWrapper.style.display = 'none';
            } else {
                selectWrapper.style.display = 'flex';
            }
        }

        const employees = window.store.getEmployees();
        const currentVal = this.activeEmployeeId;

        select.innerHTML = '';
        employees.forEach(emp => {
            const opt = document.createElement('option');
            opt.value = emp.id;
            opt.textContent = `${emp.name} (${emp.title || emp.role || ''})`;
            if (emp.id === currentVal) opt.selected = true;
            select.appendChild(opt);
        });
        select.value = currentVal;
        if (currentUser && currentUser.role !== 'employee') {
            select.disabled = false;
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
