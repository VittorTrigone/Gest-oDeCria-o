/* ==========================================================================
   Creative Sector Manager Hub - Main Application Orchestrator
   ========================================================================== */

class App {
    constructor() {
        this.currentTheme = localStorage.getItem('theme_preference') || 'dark';
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.bindEvents();
    }

    bindEvents() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetTab = item.getAttribute('data-tab');
                if (targetTab === 'calculator' || targetTab === 'prompts') {
                    this.showToast('Ferramenta externa (Em Breve).', 'info');
                    return;
                }
                this.switchTab(targetTab);
            });
        });

        const themeBtn = document.getElementById('btn-toggle-theme');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        const resetBtn = document.getElementById('btn-reset-data');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Deseja restaurar os dados demonstrativos do setor?')) {
                    window.store.resetToDefault();
                    this.showToast('Dados demonstrativos restaurados!', 'info');
                }
            });
        }

        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeModal(overlay.id);
                }
            });
        });
    }

    switchTab(tabId) {
        if (!tabId) return;

        if (tabId === 'announcements' && window.store && window.store.markAnnouncementsAsRead) {
            window.store.markAnnouncementsAsRead();
        }
        if (tabId === 'chat' && window.store && window.chatModule) {
            window.store.markChannelAsRead(window.chatModule.currentChannel || 'geral', false);
        }

        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.getAttribute('data-tab') === tabId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        document.querySelectorAll('.tab-pane').forEach(pane => {
            if (pane.id === `tab-${tabId}`) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });

        const titleEl = document.getElementById('header-page-title');
        const descEl = document.getElementById('header-page-desc');

        const tabTitles = {
            dashboard: { title: 'Painel Geral do Setor', desc: 'Visão executiva em tempo real da produtividade, esteira e gargalos da equipe.' },
            tasks: { title: 'Meus Afazeres & Notificações', desc: 'Central individual de tarefas do colaborador, notificações da esteira e lembretes.' },
            products: { title: 'Gestão Completa de Produtos', desc: 'Visão unificada de todos os produtos do setor com porcentagem de progresso.' },
            kanban: { title: 'Esteira de Criação & Cadastros', desc: 'Acompanhamento do produto nas 5 etapas: Olist (ERP), Imagens, Precificação, Verificação e Marketplaces.' },
            team: { title: 'Gerenciamento da Equipe & Carga', desc: 'Controle de colaboradores, distribuição de tarefas e medidores de capacidade.' },
            approvals: { title: 'Central de Solicitações & Pendências', desc: 'Fila de solicitações de permissão e aprovações de produtos.' },
            announcements: { title: 'Mural de Avisos & Comunicados', desc: 'Avisos importantes, metas e recados para o setor.' },
            chat: { title: 'Chat da Equipe & Comunicação', desc: 'Bate-papo interno em tempo real entre o gerente e os colaboradores.' }
        };

        if (tabTitles[tabId]) {
            if (titleEl) titleEl.textContent = tabTitles[tabId].title;
            if (descEl) descEl.textContent = tabTitles[tabId].desc;
        }

        // Trigger hooks for specific tabs
        if (tabId === 'chat' && window.chatModule) {
            window.store.markChannelAsRead(window.chatModule.currentChannel);
            window.chatModule.render();
        }
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    }

    closeModal(modalId) {
        if (modalId === 'login-overlay' || modalId === 'modal-first-access') return; // Bloqueia fechamento da tela de login e primeiro acesso
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme_preference', this.currentTheme);
        this.applyTheme(this.currentTheme);
        this.showToast(`Modo ${this.currentTheme === 'dark' ? 'Escuro' : 'Claro'} ativado.`, 'info');
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const iconContainer = document.getElementById('theme-icon');
        if (iconContainer) {
            iconContainer.innerHTML = theme === 'dark'
                ? `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 20px; height: 20px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`
                : `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 20px; height: 20px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>`;
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = { success: '✅', info: 'ℹ️', warning: '⚠️', error: '❌' };

        toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><div style="flex: 1;">${message}</div>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
