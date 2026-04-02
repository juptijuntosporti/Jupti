/**
 * ==================================================================
 * JUPTI - PRIVACIDADE.JS - VERSÃO CONECTADA À API
 * ==================================================================
 * Descrição:
 * - Gerencia as configurações de privacidade do usuário
 * - Lista de seguidores com dados reais do banco de dados
 * - Funcionalidades de remover seguidor e seguir/deixar de seguir
 * ==================================================================
 */

// Importa as funções necessárias da API
import { 
    getFollowers, 
    removeFollower, 
    toggleFollow 
} from './apiService.js';

let currentPrivacySettings = {
    follow: 'all' // 'all', 'mutual', 'request'
};

let followersList = [];

document.addEventListener('DOMContentLoaded', () => {
    // --- INICIALIZAÇÃO ---
    loadInitialData();
    setupEventListeners();
});

/**
 * Carrega os dados iniciais da página (configurações e contagem de seguidores).
 */
async function loadInitialData() {
    // Carrega configurações de privacidade (futuro: buscar do backend)
    updateWhoCanFollowUI(currentPrivacySettings.follow);

    // Carrega a lista de seguidores real do banco de dados
    try {
        const result = await getFollowers();
        if (result.success) {
            followersList = result.followers || [];
            document.getElementById('followersCount').textContent = followersList.length;
        }
    } catch (error) {
        console.error('Erro ao carregar seguidores:', error);
        document.getElementById('followersCount').textContent = '0';
    }
}

/**
 * Configura todos os event listeners da página.
 */
function setupEventListeners() {
    // Abrir modais
    document.getElementById('whoCanFollowOption').addEventListener('click', () => openModal('whoCanFollowModal'));
    document.getElementById('followersListOption').addEventListener('click', () => {
        loadFollowersList();
        openModal('followersListModal');
    });

    // Fechar modais
    document.querySelectorAll('.priv-modal-close, .priv-modal-overlay').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.classList.contains('priv-modal-overlay') || e.target.closest('.priv-modal-close')) {
                const modalId = e.target.closest('.priv-modal-overlay').id;
                closeModal(modalId);
            }
        });
    });

    // Salvar configuração de "Quem pode me acompanhar"
    document.querySelectorAll('input[name="follow_privacy"]').forEach(radio => {
        radio.addEventListener('change', async (e) => {
            const newSetting = e.target.value;
            // TODO: Implementar API para salvar configurações de privacidade
            // await updatePrivacySettings({ follow: newSetting });
            currentPrivacySettings.follow = newSetting;
            updateWhoCanFollowUI(newSetting);
            setTimeout(() => closeModal('whoCanFollowModal'), 300);
        });
    });

    // Lidar com cliques no modal de ações do seguidor
    document.getElementById('followerActionsModal').addEventListener('click', handleFollowerAction);
}

/**
 * Abre um modal específico.
 * @param {string} modalId - O ID do modal a ser aberto.
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.classList.add('modal-aberto');
    }
}

/**
 * Fecha um modal específico.
 * @param {string} modalId - O ID do modal a ser fechado.
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-aberto');
    }
}

/**
 * Atualiza o texto da opção "Quem pode me acompanhar" na tela principal.
 * @param {string} setting - A configuração atual ('all', 'mutual', 'request').
 */
function updateWhoCanFollowUI(setting) {
    const valueElement = document.getElementById('currentFollowSetting');
    const textMap = {
        all: 'Todos',
        mutual: 'Somente quem eu acompanho',
        request: 'Somente quem eu aceitar'
    };
    valueElement.textContent = textMap[setting] || 'Todos';
    document.querySelector(`input[name="follow_privacy"][value="${setting}"]`).checked = true;
}

/**
 * Carrega e renderiza a lista de seguidores no modal.
 */
function loadFollowersList() {
    const container = document.getElementById('followersListContainer');
    container.innerHTML = ''; // Limpa a lista

    if (followersList.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #666;">
                <i class="fas fa-users" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                <p>Você ainda não tem seguidores.</p>
            </div>
        `;
        return;
    }

    followersList.forEach(follower => {
        // Gera avatar padrão se não houver imagem
        const avatarHtml = follower.profile_picture_url 
            ? `<img src="${follower.profile_picture_url}" alt="Avatar de ${follower.username}">` 
            : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #4A90E2; color: white; font-weight: bold; font-size: 20px;">${follower.username.charAt(0).toUpperCase()}</div>`;

        const followerHtml = `
            <div class="priv-follower-item" data-user-id="${follower.id}">
                <div class="priv-follower-avatar">${avatarHtml}</div>
                <div class="priv-follower-info">
                    <div class="priv-follower-name">${follower.username}</div>
                    <div class="priv-follower-username">@${follower.username.toLowerCase().replace(/\s+/g, '')}</div>
                </div>
                <div class="priv-follower-options-icon"><i class="fas fa-ellipsis-v"></i></div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', followerHtml);
    });

    // Adiciona evento de clique para abrir o menu de ações
    document.querySelectorAll('.priv-follower-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const userId = e.currentTarget.dataset.userId;
            openFollowerActions(userId);
        });
    });
}

/**
 * Abre o modal de ações para um seguidor específico.
 * @param {string} userId - O ID do usuário seguidor.
 */
function openFollowerActions(userId) {
    const follower = followersList.find(f => f.id == userId);
    if (!follower) return;

    const modal = document.getElementById('followerActionsModal');
    modal.dataset.currentUserId = userId; // Armazena o ID do usuário no modal

    // Atualiza o texto do botão "Acompanhar/Deixar de acompanhar"
    const toggleFollowText = document.getElementById('toggleFollowText');
    toggleFollowText.textContent = follower.is_following ? 'Deixar de acompanhar' : 'Acompanhar';

    openModal('followerActionsModal');
}

/**
 * Lida com o clique em uma ação no modal de seguidor.
 * @param {Event} event - O evento de clique.
 */
async function handleFollowerAction(event) {
    const actionItem = event.target.closest('.glb-option-item');
    if (!actionItem) return;

    const action = actionItem.dataset.action;
    const modal = document.getElementById('followerActionsModal');
    const userId = modal.dataset.currentUserId;

    closeModal('followerActionsModal'); // Fecha o modal de ações

    switch (action) {
        case 'view-profile':
            // Redireciona para o perfil do usuário
            window.location.href = `perfil.html?id=${userId}`;
            break;
            
        case 'remove-follower':
            if (confirm('Tem certeza que deseja remover este seguidor?')) {
                try {
                    const result = await removeFollower(userId);
                    if (result.success) {
                        // Remove da lista local
                        followersList = followersList.filter(f => f.id != userId);
                        // Atualiza a contagem
                        document.getElementById('followersCount').textContent = followersList.length;
                        // Recarrega a lista visual
                        loadFollowersList();
                        alert('Seguidor removido com sucesso!');
                    } else {
                        throw new Error(result.message);
                    }
                } catch (error) {
                    console.error('Erro ao remover seguidor:', error);
                    alert('Erro ao remover seguidor. Tente novamente.');
                }
            }
            break;
            
        case 'toggle-follow':
            try {
                const result = await toggleFollow(userId);
                if (result.success) {
                    // Atualiza o status local
                    const follower = followersList.find(f => f.id == userId);
                    if (follower) {
                        follower.is_following = result.isFollowing;
                    }
                    const message = result.isFollowing 
                        ? 'Agora você está acompanhando este usuário!' 
                        : 'Você deixou de acompanhar este usuário.';
                    alert(message);
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                console.error('Erro ao alternar follow:', error);
                alert('Erro ao processar sua solicitação. Tente novamente.');
            }
            break;
            
        case 'cancel':
            // Apenas fecha o modal, o que já foi feito.
            break;
    }
}

