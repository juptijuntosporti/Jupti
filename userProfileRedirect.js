/**
 * =================================================================
 * 👤 JUPTI - Redirecionamento de Perfil (userProfileRedirect.js) - VERSÃO FINAL
 * =================================================================
 * Descrição:
 * - Usa delegação de eventos para ouvir cliques em todo o documento.
 * - Redireciona para o perfil do usuário clicado, diferenciando
 *   entre o perfil próprio e o de um visitante.
 * - É inicializado apenas uma vez e funciona em qualquer lugar (feed, comentários, etc.).
 * =================================================================
 */

import { getLoggedInUserId } from './Global.js';

/**
 * Inicializa o listener de clique global para redirecionamento de perfil.
 * Deve ser chamado apenas uma vez, no script principal (ex: Global.js).
 */
export function initGlobalUserProfileRedirects() {
    // Adiciona um único listener ao corpo do documento
    document.body.addEventListener('click', function(event) {
        // Encontra o elemento de perfil clicado mais próximo
        const profileElement = event.target.closest('.glb-post-profile, .glb-post-author, .glb-comment-avatar, .glb-comment-author, .interaction-user-item, .interaction-user-avatar, .interaction-user-name');

        if (!profileElement) {
            return; // O clique não foi em um elemento de perfil, então ignora.
        }

        // Verifica se o clique foi no modal de interações
        const interactionItem = profileElement.closest('.interaction-user-item');
        if (interactionItem && interactionItem.dataset.userId) {
            const clickedUserId = interactionItem.dataset.userId;
            const loggedInUserId = getLoggedInUserId();

            console.log(`Clique no perfil (modal de interações) ID: ${clickedUserId}. Usuário logado ID: ${loggedInUserId}`);

            // Compara os IDs como strings
            if (loggedInUserId && clickedUserId === loggedInUserId) {
                // É o seu próprio perfil
                console.log("Redirecionando para o próprio perfil.");
                window.location.href = 'perfil.html';
            } else {
                // É o perfil de um visitante
                console.log("Redirecionando para o perfil de visitante.");
                window.location.href = `perfil.html?id=${clickedUserId}`;
            }
            return;
        }

        // Lógica original para posts e comentários
        const parentItem = profileElement.closest('.glb-post, .glb-comment-item');
        if (!parentItem || !parentItem.dataset.userId) {
            return; // Não encontrou o container pai com o ID do usuário.
        }

        const clickedUserId = parentItem.dataset.userId;
        const loggedInUserId = getLoggedInUserId();

        console.log(`Clique no perfil ID: ${clickedUserId}. Usuário logado ID: ${loggedInUserId}`);

        // Compara os IDs como strings
        if (loggedInUserId && clickedUserId === loggedInUserId) {
            // É o seu próprio perfil
            console.log("Redirecionando para o próprio perfil.");
            window.location.href = 'perfil.html';
        } else {
            // É o perfil de um visitante
            console.log("Redirecionando para o perfil de visitante.");
            window.location.href = `perfil.html?id=${clickedUserId}`;
        }
    });
}
