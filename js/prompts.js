/* ==========================================================================
   Creative Sector Manager Hub - AI Prompts & Creative Vault Module
   ========================================================================== */

class PromptsModule {
    constructor() {
        this.currentCategory = 'all';
        this.init();
    }

    init() {
        window.store.subscribe(() => this.render());
        this.bindEvents();
        this.render();
    }

    bindEvents() {
        const form = document.getElementById('form-add-prompt');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreatePrompt(e.target);
            });
        }
    }

    render() {
        const container = document.getElementById('prompts-grid-container');
        if (!container) return;

        const prompts = window.store.getPrompts();

        const filtered = prompts.filter(p => {
            if (this.currentCategory !== 'all' && p.category !== this.currentCategory) return false;
            return true;
        });

        if (filtered.length === 0) {
            container.innerHTML = `<p style="color: var(--text-subdued); text-align: center; grid-column: 1 / -1; padding: 2rem;">Nenhum prompt cadastrado nesta categoria.</p>`;
            return;
        }

        container.innerHTML = filtered.map(prm => `
            <div class="prompt-card">
                <div>
                    <div class="prompt-header">
                        <h3 class="prompt-title">${prm.title}</h3>
                        <span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 12px; background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan); font-weight: 700;">
                            ${prm.category}
                        </span>
                    </div>

                    <div class="prompt-text" id="prompt-text-${prm.id}">${this.escapeHtml(prm.promptText)}</div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.85rem;">
                    <span style="font-size: 0.75rem; color: var(--text-muted);">Criado por: <strong>${prm.author}</strong></span>
                    <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.78rem;" onclick="window.promptsModule.copyPrompt('${prm.id}')">
                        📋 Copiar Prompt
                    </button>
                </div>
            </div>
        `).join('');
    }

    copyPrompt(id) {
        const el = document.getElementById(`prompt-text-${id}`);
        if (el) {
            navigator.clipboard.writeText(el.innerText).then(() => {
                if (window.app) window.app.showToast('Prompt copiado para a área de transferência!', 'success');
            }).catch(err => {
                console.error('Erro ao copiar:', err);
            });
        }
    }

    handleCreatePrompt(form) {
        const formData = new FormData(form);
        const title = formData.get('title');
        const category = formData.get('category');
        const promptText = formData.get('promptText');

        if (!title || !promptText) {
            if (window.app) window.app.showToast('Preencha o título e o texto do prompt!', 'error');
            return;
        }

        window.store.addPrompt({ title, category, promptText });

        if (window.app) {
            window.app.closeModal('modal-add-prompt');
            window.app.showToast('Novo prompt adicionado ao Vault de IA!', 'success');
        }
        form.reset();
    }

    escapeHtml(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.promptsModule = new PromptsModule();
});
