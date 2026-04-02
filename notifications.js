/**
 * =================================================================
 * 🧠 NOTIFICATIONS.JS - VERSÃO ATUALIZADA COM PROPOSTA DE CONVIVÊNCIA
 * =================================================================
 * Descrição:
 * - Contém TODAS as funções originais para buscar, renderizar e gerenciar notificações.
 * - ✅ NOVO: Adicionado tratamento para o tipo de notificação 'PROPOSAL_RECEIVED'.
 * - ✅ NOVO: O texto da notificação agora é "enviou um Compromisso de Convivência...".
 * - ✅ NOVO: O clique na notificação de proposta agora redireciona para a tela de resposta
 *   (responder_proposta.html), passando o ID do compromisso.
 * - Nenhuma funcionalidade existente foi removida ou alterada.
 * =================================================================
 */

// --- 1. IMPORTAÇÕES (sem alterações) ---
import { getNotifications, markNotificationsAsRead } from './apiService.js';
import { openCommentsModal } from './Comments.js';
import { getAvatarHtml } from './avatarUtils.js';

// --- 2. SELETORES E VARIÁVEIS (sem alterações) ---
const notificationsOverlay = document.getElementById('glb-notificationsOverlay');
const openNotificationsBtn = document.getElementById('notificationsBtn');
const closeNotificationsBtn = document.getElementById('notificationsBackBtn');
const notificationsList = document.getElementById('notificationsList');
const notificationBadge = document.querySelector('.glb-notification-badge');
const interactionsModal = document.getElementById('interactionsModal');
const closeInteractionsModalBtn = document.getElementById('closeInteractionsModal');
const interactionsListContainer = document.getElementById('interactionsList');
let notificationDataStore = {};

// --- 3. FUNÇÃO DE INICIALIZAÇÃO (sem alterações) ---
export function initNotifications() {
    openNotificationsBtn?.addEventListener('click', handleOpenNotificationsPanel);
    closeNotificationsBtn?.addEventListener('click', closeNotificationsPanel);
    notificationsOverlay?.addEventListener('click', (e) => {
        if (e.target === notificationsOverlay) closeNotificationsPanel();
    });
    closeInteractionsModalBtn?.addEventListener('click', closeInteractionsModal);
    interactionsModal?.addEventListener('click', (e) => {
        if (e.target === interactionsModal) closeInteractionsModal();
    });
    notificationsList?.addEventListener('click', handleNotificationClick);

    fetchAndRenderNotifications();
    setInterval(fetchAndRenderNotifications, 30000);
}

// --- 4. LÓGICA DE CONTROLE DOS PAINÉIS (sem alterações) ---
async function handleOpenNotificationsPanel() {
    notificationsOverlay.classList.add('active');
    document.body.classList.add('no-scroll');
    if (notificationBadge.style.display !== 'none') {
        try {
            await markNotificationsAsRead();
            notificationBadge.style.display = 'none';
            document.querySelectorAll('.glb-notification-item.unread').forEach(item => {
                item.classList.remove('unread');
            });
        } catch (error) {
            console.error("Falha ao marcar notificações como lidas:", error);
        }
    }
}

function closeNotificationsPanel() {
    notificationsOverlay.classList.remove('active');
    document.body.classList.remove('no-scroll');
}

function openInteractionsModal(actors, title) {
    interactionsListContainer.innerHTML = '';
    document.querySelector('#interactionsModal .interactions-modal-title').textContent = title;
    if (!actors || actors.length === 0) {
        interactionsListContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Nenhum usuário para exibir.</div>';
    } else {
        actors.forEach(actor => {
            const actorAvatarHtml = getAvatarHtml(actor.avatarUrl, actor.username, 'Avatar');
            const userHtml = `
                <div class="interaction-user-item" data-user-id="${actor.userId}">
                    <div class="interaction-user-avatar">${actorAvatarHtml}</div>
                    <div class="interaction-user-info">
                        <div class="interaction-user-name">${actor.username}</div>
                        <div class="interaction-user-role">${actor.role || 'Membro'}</div>
                    </div>
                </div>`;
            interactionsListContainer.insertAdjacentHTML('beforeend', userHtml);
        });
    }
    interactionsModal.classList.add('active');
    document.body.classList.add('no-scroll');
}

function closeInteractionsModal() {
    interactionsModal.classList.remove('active');
    if (!notificationsOverlay.classList.contains('active')) {
        document.body.classList.remove('no-scroll');
    }
}

// --- 5. LÓGICA DE DADOS E RENDERIZAÇÃO (sem alterações) ---
async function fetchAndRenderNotifications() {
    try {
        const result = await getNotifications();
        if (result.success) {
            notificationDataStore.notifications = result.groupedNotifications;
            renderNotificationsList(result.groupedNotifications);
            updateNotificationBadge(result.totalUnreadCount);
        }
    } catch (error) {
        console.error("Erro ao buscar notificações:", error);
        notificationsList.innerHTML = '<li style="padding: 20px; color: red;">Erro ao carregar notificações.</li>';
    }
}

function updateNotificationBadge(unreadCount) {
    if (unreadCount > 0) {
        notificationBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        notificationBadge.style.display = 'flex';
    } else {
        notificationBadge.style.display = 'none';
    }
}

function renderNotificationsList(notifications) {
    notificationsList.innerHTML = '';
    if (!notifications || notifications.length === 0) {
        notificationsList.innerHTML = `<div style="text-align: center; padding: 60px 20px; color: #666;"><i class="fas fa-bell-slash" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i><p>Nenhuma notificação por aqui.</p></div>`;
        return;
    }
    notifications.forEach((notification) => {
        const actorsKey = `actors-${notification.id || Math.random()}`;
        notificationDataStore[actorsKey] = {
            actors: notification.otherActors,
            title: getInteractionModalTitle(notification.type),
            notification: notification
        };
        const notificationHtml = createNotificationHtml(notification, actorsKey);
        notificationsList.insertAdjacentHTML('beforeend', notificationHtml);
    });
}

// --- 6. FUNÇÃO DE TRATAMENTO DE CLIQUE (COM A ADIÇÃO) ---
function handleNotificationClick(event) {
    const notificationItem = event.target.closest('.glb-notification-item');
    if (!notificationItem) return;

    // ✅ NOVO: Lógica para o clique na notificação de proposta de convivência
    const proposalLink = event.target.closest('.proposal-link');
    if (proposalLink) {
        const commitmentId = proposalLink.dataset.commitmentId;
        const notificationType = notificationItem.dataset.type;
        if (commitmentId) {
            console.log(`Redirecionando para a tela de análise da proposta ID: ${commitmentId}`);
            // Redireciona para a tela correta baseado no tipo de notificação
            if (notificationType === 'PROPOSAL_ACCEPTED') {
                // Proposta aceita: vai para a tela de acordo fechado
                window.location.href = `acordo_fechado.html?id=${commitmentId}`;
            } else if (notificationType === 'COUNTER_PROPOSAL_RECEIVED') {
                // Contraproposta: vai para a tela de contraproposta
                window.location.href = `contraproposta.html?id=${commitmentId}`;
            } else {
                // Proposta original: vai para a tela de negociação
                window.location.href = `negociacao_proposta.html?id=${commitmentId}`;
            }
        }
        return; // Para a execução para não acionar outros cliques
    }

    // Lógica original para o clique na notificação de pedido de conexão
    if (event.target.closest('.connection-request-link')) {
        const connectionLink = event.target.closest('.connection-request-link');
        const actorsKey = connectionLink.dataset.actorsKey;
        const notification = notificationDataStore[actorsKey]?.notification;
        
        if (notification) {
            const params = new URLSearchParams({
                notificationId: notification.id,
                senderName: notification.mainActor.username,
                senderAvatar: notification.mainActor.avatarUrl || '',
                childName: notification.childName,
                childAvatar: notification.childAvatarUrl || '' 
            });
            window.location.href = `connection_request.html?${params.toString()}`;
        }
        return;
    }

    // Lógica original para os outros tipos de notificação
    const type = notificationItem.dataset.type;
    if (type === 'CONNECTION_ACCEPTED') {
        window.location.href = 'selecao_perfis.html';
        return;
    }
    
    if (event.target.closest('.main-actor-link, .others-link')) {
        const mainActorLink = event.target.closest('.main-actor-link');
        const othersLink = event.target.closest('.others-link');
        if (mainActorLink) {
            window.location.href = `perfil.html?id=${mainActorLink.dataset.userId}`;
        } else if (othersLink) {
            const actorsKey = othersLink.dataset.actorsKey;
            const { actors, title } = notificationDataStore[actorsKey];
            openInteractionsModal(actors, title);
        }
    } else {
        const postId = notificationItem.dataset.postId;
        if (type === 'comment' && postId) {
            closeNotificationsPanel();
            openCommentsModal(postId);
        } else if (type === 'like' && postId) {
            closeNotificationsPanel();
            scrollToPost(postId);
        } else if (type === 'follow' && notificationItem.dataset.mainActorId) {
            window.location.href = `perfil.html?id=${notificationItem.dataset.mainActorId}`;
        } else if (postId) {
            window.location.href = `post_view.html?id=${postId}`;
        }
    }
}

// --- 7. FUNÇÕES AUXILIARES (COM A ADIÇÃO) ---
function createNotificationHtml(notification, actorsKey) {
    const { id, mainActor, type, postId, isUnread, time, postPreviewUrl, childAvatarUrl, childName, related_entity_id } = notification;
    
    let avatarUrl, displayName;
    if (type === 'CONNECTION_ACCEPTED' || type === 'PROPOSAL_RECEIVED') { // Adicionado PROPOSAL_RECEIVED aqui
        avatarUrl = childAvatarUrl;
        displayName = childName || 'Filho(a)';
    } else {
        avatarUrl = mainActor.avatarUrl;
        displayName = mainActor.username;
    }
    
    const avatarHtml = getAvatarHtml(avatarUrl, displayName, 'Avatar');
    const text = getInteractionText(notification, actorsKey);
    
    // Adicionado data-related-id para o caso da proposta
    return `
        <li class="glb-notification-item ${isUnread ? 'unread' : ''}" 
            data-notification-id="${id}" 
            data-post-id="${postId || ''}" 
            data-main-actor-id="${mainActor.userId}" 
            data-type="${type}"
            data-related-id="${related_entity_id || ''}">
            <div class="glb-notification-avatar" data-user-id="${mainActor.userId}">
                ${avatarHtml}
            </div>
            <div class="glb-notification-content">
                <div class="glb-notification-text">${text}</div>
                <div class="glb-notification-time">${time}</div>
            </div>
            ${postPreviewUrl ? `<div class="glb-notification-media-preview"><img src="${postPreviewUrl}" alt="Preview"></div>` : ''}
        </li>
    `;
}

function getInteractionText(notification, actorsKey) {
    const { type, mainActor, otherActorsCount, childName, related_entity_id } = notification;
    const mainActorHtml = `<strong class="main-actor-link" data-user-id="${mainActor.userId}">${mainActor.username}</strong>`;
    const othersHtml = `<strong class="others-link" data-actors-key="${actorsKey}">outras ${otherActorsCount} pessoas</strong>`;

    switch (type) {
      
              // ✅ NOVO CASE ADICIONADO AQUI
        case 'COUNTER_PROPOSAL_RECEIVED':
            return `${mainActorHtml} respondeu à sua proposta para <strong>${childName || 'seu filho(a)'}</strong>. <strong class="proposal-link" data-commitment-id="${related_entity_id}" style="color: #0f4c5c; cursor: pointer; text-decoration: underline;">Veja as sugestões e finalize o acordo.</strong>`;

        // ✅ NOVO CASE: Lógica para renderizar o texto da proposta de convivência
        case 'PROPOSAL_RECEIVED':
            return `${mainActorHtml} enviou um Compromisso de Convivência para a jornada de <strong>${childName || 'seu filho(a)'}</strong>. <strong class="proposal-link" data-commitment-id="${related_entity_id}" style="color: #0f4c5c; cursor: pointer; text-decoration: underline;">Veja os detalhes e responda.</strong>`;

        // ✅ NOVO CASE: Notificação quando a proposta é totalmente aceita
        case 'PROPOSAL_ACCEPTED':
            return `<strong class="proposal-link" data-commitment-id="${related_entity_id}" style="color: #0f4c5c; cursor: pointer; text-decoration: underline;">A rotina de convivência de <strong>${childName || 'seu filho(a)'}</strong> agora está definida com ${mainActor.username}.</strong>`;

        // Lógica original (sem alterações)
        case 'CONNECTION_ACCEPTED':
            return `${mainActorHtml} aceitou sua conexão com <strong>${childName || 'seu filho(a)'}</strong>.`;
        case 'CONNECTION_REQUEST':
            return `${mainActorHtml} solicitou conexão com <strong>${childName || 'seu filho(a)'}</strong>. <strong class="connection-request-link" data-actors-key="${actorsKey}" style="color: #0f4c5c; cursor: pointer; text-decoration: underline;">Clique aqui</strong> para responder.`;
        case 'like':
            return otherActorsCount > 0 ? `${mainActorHtml} e ${othersHtml} se conectaram com seu registro.` : `${mainActorHtml} se conectou com seu registro.`;
        case 'comment':
            return otherActorsCount > 0 ? `${mainActorHtml} e ${othersHtml} comentaram no seu registro.` : `${mainActorHtml} comentou no seu registro.`;
        case 'follow':
            return otherActorsCount > 0 ? `${mainActorHtml} e ${othersHtml} começaram a acompanhar sua jornada.` : `${mainActorHtml} começou a acompanhar sua jornada.`;
        default:
            return `${mainActorHtml} interagiu com você.`;
    }
}

function getInteractionModalTitle(type) {
    switch (type) {
        case 'like': return 'Pessoas que se conectaram';
        case 'comment': return 'Pessoas que comentaram';
        case 'follow': return 'Novos na sua caminhada';
        default: return 'Pessoas que interagiram';
    }
}

function scrollToPost(postId) {
    if (window.location.pathname.includes('feed.html')) {
        const postElement = document.querySelector(`.glb-post[data-id="${postId}"]`);
        if (postElement) {
            postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            postElement.style.transition = 'background-color 0.5s ease-in-out';
            postElement.style.backgroundColor = 'rgba(255, 235, 59, 0.3)';
            setTimeout(() => {
                postElement.style.backgroundColor = '';
            }, 2500);
        } else {
            window.location.href = `post_view.html?id=${postId}`;
        }
    } else {
        window.location.href = `post_view.html?id=${postId}`;
    }
}
