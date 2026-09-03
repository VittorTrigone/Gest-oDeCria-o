/* ==========================================================================
   Creative Sector Manager Hub - GSAP Motion Design & Animations
   ========================================================================== */

class AppAnimations {
    constructor() {
        this.init();
    }

    init() {
        if (typeof gsap === 'undefined') {
            console.warn('GSAP não carregado. Animações desabilitadas.');
            return;
        }
        
        // Configurações globais GSAP
        gsap.config({ nullTargetWarn: false });

        this.animateSidebar();
        this.overrideAppMethods();
        this.overrideKanbanMethods();
        this.overrideProductsMethods();
        this.overrideTasksMethods();
    }

    // 1. ANIMAÇÕES DE INICIALIZAÇÃO
    animateSidebar() {
        gsap.from('.sidebar', {
            x: -50,
            opacity: 0,
            duration: 0.6,
            ease: "power3.out"
        });

        gsap.from('.nav-item', {
            x: -20,
            opacity: 0,
            duration: 0.4,
            stagger: 0.05,
            ease: "power2.out",
            delay: 0.2
        });
        
        gsap.from('.header', {
            y: -20,
            opacity: 0,
            duration: 0.5,
            ease: "power2.out",
            delay: 0.3
        });
    }

    // 2. INTERCEPTAR EVENTOS DO SISTEMA (MODAIS, TABS, TOASTS)
    overrideAppMethods() {
        if (!window.app) return;

        // Sobrescrever openModal
        const originalOpenModal = window.app.openModal.bind(window.app);
        window.app.openModal = (modalId) => {
            originalOpenModal(modalId);
            const modal = document.getElementById(modalId);
            if (modal) {
                const card = modal.querySelector('.modal-card');
                gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.2 });
                if (card) {
                    gsap.fromTo(card, 
                        { scale: 0.9, y: 20, opacity: 0 }, 
                        { scale: 1, y: 0, opacity: 1, duration: 0.4, ease: "back.out(1.5)" }
                    );
                }
            }
        };

        // Sobrescrever closeModal
        const originalCloseModal = window.app.closeModal.bind(window.app);
        window.app.closeModal = (modalId) => {
            if (modalId === 'login-overlay' || modalId === 'modal-first-access') {
                originalCloseModal(modalId);
                return;
            }
            
            const modal = document.getElementById(modalId);
            if (modal) {
                const card = modal.querySelector('.modal-card');
                if (card) {
                    gsap.to(card, { 
                        scale: 0.95, y: -10, opacity: 0, duration: 0.2, ease: "power2.in" 
                    });
                }
                gsap.to(modal, { 
                    opacity: 0, duration: 0.2, delay: 0.1, 
                    onComplete: () => {
                        originalCloseModal(modalId);
                        // Limpar propriedades inline deixadas pelo GSAP
                        gsap.set(modal, { clearProps: "all" });
                        if(card) gsap.set(card, { clearProps: "all" });
                    }
                });
            } else {
                originalCloseModal(modalId);
            }
        };

        // Sobrescrever switchTab para animar o conteúdo
        const originalSwitchTab = window.app.switchTab.bind(window.app);
        window.app.switchTab = (tabId) => {
            const currentActiveTab = document.querySelector('.tab-pane.active');
            if (currentActiveTab && currentActiveTab.id === `tab-${tabId}`) return; // Já está na aba
            
            if (currentActiveTab) {
                gsap.to(currentActiveTab, {
                    opacity: 0,
                    y: 10,
                    duration: 0.2,
                    onComplete: () => {
                        gsap.set(currentActiveTab, { clearProps: "all" });
                        originalSwitchTab(tabId);
                        this.animateTabIn(tabId);
                    }
                });
            } else {
                originalSwitchTab(tabId);
                this.animateTabIn(tabId);
            }
        };

        // Animação rica para Toast
        const originalShowToast = window.app.showToast.bind(window.app);
        window.app.showToast = (message, type = 'info') => {
            const container = document.getElementById('toast-container');
            if (!container) return;

            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            const icons = { success: '✅', info: 'ℹ️', warning: '⚠️', error: '❌' };
            toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><div style="flex: 1;">${message}</div>`;
            
            container.appendChild(toast);

            gsap.fromTo(toast, 
                { x: 100, opacity: 0 }, 
                { x: 0, opacity: 1, duration: 0.4, ease: "back.out(1.2)" }
            );

            setTimeout(() => {
                gsap.to(toast, { 
                    x: 100, opacity: 0, duration: 0.3, ease: "power2.in",
                    onComplete: () => toast.remove() 
                });
            }, 3500);
        };
    }

    animateTabIn(tabId) {
        const newTab = document.getElementById(`tab-${tabId}`);
        if (!newTab) return;
        
        gsap.fromTo(newTab, 
            { opacity: 0, y: 15 }, 
            { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }
        );

        // Coreografias específicas por aba
        if (tabId === 'dashboard') {
            gsap.fromTo('#tab-dashboard .kpi-card', 
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: "power2.out", delay: 0.1 }
            );
        } else if (tabId === 'kanban') {
            gsap.fromTo('#tab-kanban .kanban-column', 
                { opacity: 0, x: -15 },
                { opacity: 1, x: 0, duration: 0.4, stagger: 0.05, ease: "power2.out", delay: 0.1 }
            );
        }
    }

    // 3. ANIMAÇÕES DE LISTAS (Kanban, Produtos, Tarefas)
    overrideKanbanMethods() {
        if (!window.kanbanModule) return;
        const originalRender = window.kanbanModule.render.bind(window.kanbanModule);
        window.kanbanModule.render = () => {
            originalRender();
            // Stagger nos cards após renderizar
            gsap.fromTo('.product-card', 
                { opacity: 0, scale: 0.95 },
                { opacity: 1, scale: 1, duration: 0.3, stagger: 0.02, ease: "power1.out" }
            );
        };
    }

    overrideProductsMethods() {
        if (!window.productsModule) return;
        const originalRender = window.productsModule.render.bind(window.productsModule);
        window.productsModule.render = () => {
            originalRender();
            gsap.fromTo('.product-table-row', 
                { opacity: 0, x: -10 },
                { opacity: 1, x: 0, duration: 0.2, stagger: 0.03, ease: "power1.out" }
            );
        };
    }

    overrideTasksMethods() {
        if (!window.tasksModule) return;
        const originalRender = window.tasksModule.render.bind(window.tasksModule);
        window.tasksModule.render = () => {
            originalRender();
            gsap.fromTo('.task-item', 
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 0.2, stagger: 0.05, ease: "power1.out" }
            );
        };
    }
}

// Inicializar após carregamento completo
document.addEventListener('DOMContentLoaded', () => {
    // Pequeno atraso para garantir que App e Módulos foram instanciados
    setTimeout(() => {
        window.animationsModule = new AppAnimations();
    }, 100);
});
