/* ==========================================================================
   Creative Sector Manager Hub - Team Chat Module
   ========================================================================== */

class ChatModule {
    constructor() {
        this.currentChannel = 'geral';
        this.init();
    }

    init() {
        window.store.subscribe(() => this.render());
        this.bindEvents();
        this.render();
    }

    bindEvents() {
        // Form send message
        const form = document.getElementById('chat-form-send');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = document.getElementById('chat-input-message');
                if (input && input.value.trim()) {
                    window.store.addChatMessage(this.currentChannel, input.value.trim());
                    input.value = '';
                }
            });
        }
    }

    switchChannel(channelKey, channelLabel) {
        this.currentChannel = channelKey;
        window.store.markChannelAsRead(channelKey, false);
        
        // A parte visual de active e badge agora é tratada inteiramente pelo render()
        // chamando this.render() logo abaixo.

        // Update Channel Title Header
        const titleEl = document.getElementById('chat-active-channel-title');
        if (titleEl) titleEl.textContent = channelLabel || `# ${channelKey}`;

        this.render();
    }

    render() {
        this.renderDMList();

        // Update Nav Badge
        const navBadge = document.getElementById('badge-chat-count');
        const chatTabEl = document.querySelector('li[data-tab="chat"]');
        if (navBadge) {
            const unreadCount = window.store.getUnreadMessagesCount();
            if (unreadCount > 0) {
                navBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                navBadge.style.display = 'inline-block';
            } else {
                navBadge.style.display = 'none';
            }
            if (chatTabEl) chatTabEl.classList.toggle('has-unread', unreadCount > 0);
        }

        // Update Online Presence Counter (Excluindo o usuário atual)
        const onlineCountEl = document.getElementById('chat-online-count');
        if (onlineCountEl && window.store.getOnlineOtherEmployeesCount) {
            const onlineOtherCount = window.store.getOnlineOtherEmployeesCount();
            if (onlineOtherCount === 0) {
                onlineCountEl.textContent = '⚪ Ninguém online';
                onlineCountEl.style.color = 'var(--text-muted)';
            } else if (onlineOtherCount === 1) {
                onlineCountEl.textContent = '🟢 1 online';
                onlineCountEl.style.color = 'var(--accent-emerald)';
            } else {
                onlineCountEl.textContent = `🟢 ${onlineOtherCount} online`;
                onlineCountEl.style.color = 'var(--accent-emerald)';
            }
        }

        // Update active classes and individual channel badges
        document.querySelectorAll('.chat-channel-item').forEach(item => {
            const chan = item.getAttribute('data-channel');
            if (chan === this.currentChannel) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }

            let badge = item.querySelector('.chat-item-badge');
            const unreadForChan = window.store.getUnreadCountForChannel(chan);
            if (unreadForChan > 0 && chan !== this.currentChannel) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'chat-item-badge';
                    badge.style = 'float: right; background: var(--accent-rose); color: white; border-radius: 10px; padding: 2px 5px; font-size: 0.65rem; font-weight: 800; line-height: 1; margin-top: 1px;';
                    item.appendChild(badge);
                }
                badge.textContent = unreadForChan > 99 ? '99+' : unreadForChan;
                badge.style.display = 'inline-block';
            } else if (badge) {
                badge.style.display = 'none';
            }
        });

        const messagesContainer = document.getElementById('chat-messages-body');
        if (!messagesContainer) return;

        const messages = window.store.getChatMessages(this.currentChannel);

        if (messages.length === 0) {
            messagesContainer.innerHTML = `
                <div style="text-align: center; color: var(--text-subdued); padding: 3rem 1rem;">
                    <p style="font-size: 1.2rem; margin-bottom: 0.5rem;">💬</p>
                    <p style="font-size: 0.9rem; font-weight: 600;">Nenhuma mensagem neste canal ainda.</p>
                    <p style="font-size: 0.78rem;">Seja o primeiro a enviar um recado para a equipe!</p>
                </div>
            `;
            return;
        }

        const currentUserId = window.store.state.auth.currentUser ? window.store.state.auth.currentUser.id : 'emp-1';
        
        const employees = window.store.getEmployees();
        
        messagesContainer.innerHTML = messages.map(msg => {
            const senderEmp = employees.find(e => e.id === msg.senderId);
            const senderTitle = senderEmp && senderEmp.role ? `<span style="font-size: 0.75rem; color: var(--accent-cyan); font-weight: 500; margin-left: 6px; letter-spacing: 0.2px;">${senderEmp.role}</span>` : '';
            
            return `
            <div class="chat-message-item ${msg.senderId === currentUserId ? 'is-me' : ''}">
                <div class="chat-msg-avatar" style="background: ${msg.avatarBg || 'var(--primary)'}">
                    ${msg.senderAvatar || '??'}
                </div>
                <div class="chat-msg-content">
                    <div class="chat-msg-header">
                        <span class="chat-sender-name" style="display: flex; align-items: baseline;">${msg.senderName} ${senderTitle}</span>
                        <span class="chat-msg-time">${msg.timestamp}</span>
                    </div>
                    <div class="chat-msg-bubble">
                        ${this.escapeHtml(msg.text)}
                    </div>
                </div>
            </div>
            `;
        }).join('');

        // Auto-scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    escapeHtml(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    renderDMList() {
        const dmList = document.getElementById('chat-dm-list');
        if (!dmList) return;

        const currentUser = window.store.state.auth.currentUser;
        if (!currentUser) return;
        
        const currentUserId = currentUser.id;
        const employees = window.store.getEmployees().filter(emp => emp.id !== currentUserId);

        const currentIds = Array.from(dmList.querySelectorAll('.chat-channel-item')).map(el => el.getAttribute('data-emp-id')).join(',');
        const newIds = employees.map(emp => emp.id).join(',');

        if (currentIds !== newIds) {
            dmList.innerHTML = employees.map(emp => {
                const ids = [currentUserId, emp.id].sort();
                const channelKey = `dm_${ids[0]}_${ids[1]}`;
                const isActive = this.currentChannel === channelKey ? 'active' : '';
                const isOnline = window.store.isEmployeeOnline ? window.store.isEmployeeOnline(emp.id) : false;
                const dotColor = isOnline ? 'var(--accent-emerald)' : 'var(--text-muted)';
                const dotTitle = isOnline ? 'Online' : 'Offline';

                return `
                    <li class="chat-channel-item ${isActive}" data-channel="${channelKey}" data-emp-id="${emp.id}" onclick="window.chatModule.switchChannel('${channelKey}', '💬 ${this.escapeHtml(emp.name)}')">
                        <span class="dm-online-dot" style="display:inline-block; width:8px; height:8px; background:${dotColor}; border-radius:50%; flex-shrink:0; margin-right:6px;" title="${dotTitle}"></span>
                        <div style="display:flex; flex-direction:column; line-height:1.2; overflow:hidden;">
                            <span style="font-weight:600; color:var(--text-main); white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${emp.name}</span>
                            <span style="font-size:0.75rem; color:var(--text-muted); white-space:nowrap; text-overflow:ellipsis; overflow:hidden; font-weight:400;">${emp.role || 'Colaborador'}</span>
                        </div>
                    </li>
                `;
            }).join('');
        } else {
            employees.forEach(emp => {
                const ids = [currentUserId, emp.id].sort();
                const channelKey = `dm_${ids[0]}_${ids[1]}`;
                const li = dmList.querySelector(`.chat-channel-item[data-emp-id="${emp.id}"]`);
                if (li) {
                    if (this.currentChannel === channelKey) {
                        li.classList.add('active');
                    } else {
                        li.classList.remove('active');
                    }
                    const dot = li.querySelector('.dm-online-dot');
                    const isOnline = window.store.isEmployeeOnline ? window.store.isEmployeeOnline(emp.id) : false;
                    if (dot) {
                        dot.style.background = isOnline ? 'var(--accent-emerald)' : 'var(--text-muted)';
                        dot.title = isOnline ? 'Online' : 'Offline';
                    }
                }
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.chatModule = new ChatModule();
});
