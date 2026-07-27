/* ==========================================================================
   Creative Sector Manager Hub - Authentication Module
   ========================================================================== */

const Auth = {
    init() {
        this.checkSession();
    },

    checkSession() {
        const currentUser = window.store?.state?.auth?.currentUser;
        if (!currentUser) {
            // Se não tem ninguem logado, garante que o overlay está ativo (ele já vem ativo no HTML)
            document.getElementById('login-overlay').classList.add('active');
        } else {
            // Se tem alguém logado, remove a tela preta e aplica o profile
            document.getElementById('login-overlay').classList.remove('active');
            this.applyUserProfile(currentUser);
        }
    },

    handleLogin(e) {
        // Impede que o formulário recarregue a página
        if (e) {
            e.preventDefault();
        }

        const email = document.getElementById('login-email').value.trim();
        const pwd = document.getElementById('login-password').value.trim();
        const errorEl = document.getElementById('login-error');
        
        errorEl.style.display = 'none';

        if (!email || !pwd) {
            errorEl.textContent = 'Preencha e-mail e senha.';
            errorEl.style.display = 'block';
            return;
        }

        // Procura funcionário (usuário)
        const user = window.store.state.employees.find(e => e.email === email);
        if (!user || user.password !== pwd) {
            errorEl.textContent = 'E-mail ou senha incorretos.';
            errorEl.style.display = 'block';
            return;
        }

        // Tenta salvar credencial no Gerenciador de Senhas do Navegador (Google Chrome / Edge)
        if (window.PasswordCredential && navigator.credentials && navigator.credentials.store) {
            try {
                const cred = new window.PasswordCredential({
                    id: email,
                    password: pwd,
                    name: user.name
                });
                navigator.credentials.store(cred);
            } catch (err) {
                console.warn('Gerenciador de senhas API:', err);
            }
        }

        // Login bem-sucedido
        window.store.state.auth.currentUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.sysRole,
            avatar: user.avatar,
            avatarBg: user.avatarBg,
            mustChangePassword: user.mustChangePassword,
            chatReadTimestamps: user.chatReadTimestamps || {},
            announcementsReadTimestamp: user.announcementsReadTimestamp || 0
        };
        window.store.saveState();

        if (user.mustChangePassword) {
            document.getElementById('modal-first-access').classList.add('active');
        } else {
            document.getElementById('login-overlay').classList.remove('active');
            this.applyUserProfile(window.store.state.auth.currentUser);
        }
    },

    saveNewPassword() {
        const newPwd = document.getElementById('first-access-pwd').value.trim();
        if (newPwd.length < 5) {
            alert('A senha deve ter no mínimo 5 caracteres.');
            return;
        }

        const currentUserId = window.store.state.auth.currentUser.id;
        const user = window.store.state.employees.find(e => e.id === currentUserId);
        
        user.password = newPwd;
        user.mustChangePassword = false;
        
        window.store.state.auth.currentUser.mustChangePassword = false;
        window.store.saveState();

        document.getElementById('modal-first-access').classList.remove('active');
        document.getElementById('login-overlay').classList.remove('active');
        
        this.applyUserProfile(window.store.state.auth.currentUser);
    },

    logout() {
        // Fallback seguro: força a limpeza do usuário logado diretamente no localStorage
        try {
            const raw = localStorage.getItem('sc_manager_state');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.auth) parsed.auth.currentUser = null;
                localStorage.setItem('sc_manager_state', JSON.stringify(parsed));
            }
        } catch(e) {}

        if (window.store && window.store.state && window.store.state.auth) {
            if (typeof window.store.clearMyPresence === 'function') {
                window.store.clearMyPresence();
            }
            window.store.state.auth.currentUser = null;
            window.store.saveState();
        }
        
        // Em vez de recarregar a página, força o login instantaneamente na tela
        const overlay = document.getElementById('login-overlay');
        if (overlay) {
            overlay.classList.add('active');
            overlay.style.backgroundColor = '#0f172a'; // Força opacidade
        }
        
        // Limpar inputs de senha
        const emailEl = document.getElementById('login-email');
        if (emailEl) emailEl.value = '';
        const pwdEl = document.getElementById('login-password');
        if (pwdEl) pwdEl.value = '';
        
        // Restaura as abas
        document.querySelectorAll('.nav-item').forEach(el => {
            el.style.display = 'flex';
        });

        // Limpa avatar
        const avatarEl = document.querySelector('.manager-avatar');
        if (avatarEl) { avatarEl.textContent = '??'; avatarEl.style.background = 'var(--primary)'; }
        const nameEl = document.querySelector('.manager-info h4');
        if (nameEl) nameEl.textContent = 'Deslogado';
    },

    applyUserProfile(user) {
        // Atualiza o perfil na sidebar
        const avatarEl = document.querySelector('.manager-avatar');
        const nameEl = document.querySelector('.manager-info h4');
        const roleEl = document.querySelector('.manager-info p');

        if (avatarEl && nameEl && roleEl) {
            avatarEl.textContent = user.avatar;
            avatarEl.style.background = user.avatarBg;
            nameEl.textContent = user.name;
            roleEl.textContent = user.role === 'manager' ? 'Gerente' : 'Funcionário';
        }

        // Esconde abas de Gerente caso seja funcionário
        if (user.role === 'employee') {
            const dashboardNav = document.querySelector('li[data-tab="dashboard"]');
            const teamNav = document.querySelector('li[data-tab="team"]');
            const auditNav = document.querySelector('li[data-tab="audit"]');
            
            if (dashboardNav) dashboardNav.style.display = 'none';
            if (teamNav) teamNav.style.display = 'none';
            if (auditNav) auditNav.style.display = 'none';

            // Oculta botões exclusivos de gerente (Novo Produto)
            document.querySelectorAll('button[onclick="window.app.openModal(\\\'modal-add-product\\\')"]').forEach(btn => {
                btn.style.display = 'none';
            });

            // Trava a aba "Meus Afazeres" apenas para o próprio funcionário
            const taskAssigneeSelect = document.getElementById('task-active-employee-select');
            if (taskAssigneeSelect) {
                taskAssigneeSelect.value = user.id;
                taskAssigneeSelect.disabled = true;
            }

            // Redireciona para Produtos caso esteja em uma aba restrita
            setTimeout(() => {
                const activeTab = document.querySelector('.nav-item.active');
                if (activeTab && (activeTab.dataset.tab === 'dashboard' || activeTab.dataset.tab === 'team')) {
                    const productsTab = document.querySelector('li[data-tab="products"]');
                    if (productsTab) productsTab.click();
                }
            }, 100);
        } else {
            // Garante que se deslogar e logar como gerente, tudo volte ao normal
            const dashboardNav = document.querySelector('li[data-tab="dashboard"]');
            const approvalsNav = document.querySelector('li[data-tab="approvals"]');
            const teamNav = document.querySelector('li[data-tab="team"]');
            const auditNav = document.querySelector('li[data-tab="audit"]');
            
            if (dashboardNav) dashboardNav.style.display = 'flex';
            if (approvalsNav) approvalsNav.style.display = 'flex';
            if (teamNav) teamNav.style.display = 'flex';
            if (auditNav) auditNav.style.display = 'flex';

            document.querySelectorAll('button[onclick="window.app.openModal(\\\'modal-add-product\\\')"]').forEach(btn => {
                btn.style.display = 'inline-flex';
            });

            const taskAssigneeSelect = document.getElementById('task-active-employee-select');
            if (taskAssigneeSelect) {
                taskAssigneeSelect.disabled = false;
            }
        }
        
        // Garante que, ao logar, a pessoa sempre veja a si mesma primeiro em Meus Afazeres
        if (window.tasksModule) {
            window.tasksModule.setActiveEmployee(user.id);
        }

        // Recarrega todos os modulos para atualizar as views com base no usuário logado
        if (window.kanbanModule) window.kanbanModule.init();
        if (window.productsModule) window.productsModule.init();
        if (window.todoModule) window.todoModule.init();
    },
    
    getCurrentUser() {
        return window.store.state.auth.currentUser;
    }
};

window.authModule = Auth;

// Inicialização: auth depende do store que já é instanciado de forma síncrona.
document.addEventListener('DOMContentLoaded', () => {
    window.authModule.init();
});
