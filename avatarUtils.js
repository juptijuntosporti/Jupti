/**
 * =================================================================
 * 🖼️ AVATAR UTILS - Utilitários para Exibição de Avatares
 * =================================================================
 * Descrição:
 * - Fornece funções centralizadas para renderização de avatares
 * - Exibe iniciais quando não há foto de perfil disponível
 * - Garante consistência visual em toda a aplicação
 * =================================================================
 */

/**
 * Verifica se uma URL de avatar é válida e não é uma imagem placeholder
 * @param {string} avatarUrl - URL do avatar a ser verificada
 * @returns {boolean} - true se a URL é válida, false caso contrário
 */
function isValidAvatarUrl(avatarUrl) {
    if (!avatarUrl) return false;
    if (avatarUrl === 'icone.png') return false;
    if (avatarUrl.trim() === '') return false;
    return true;
}

/**
 * Extrai a inicial do nome do usuário
 * @param {string} username - Nome do usuário
 * @returns {string} - Primeira letra do nome em maiúscula
 */
function getUserInitial(username) {
    if (!username || username.trim() === '') return '?';
    return username.charAt(0).toUpperCase();
}

/**
 * Gera o HTML para um avatar com suporte a iniciais
 * @param {string} avatarUrl - URL da foto de perfil
 * @param {string} username - Nome do usuário (para extrair inicial)
 * @param {string} altText - Texto alternativo para a imagem (opcional)
 * @returns {string} - HTML do avatar (img ou div com inicial)
 */
export function getAvatarHtml(avatarUrl, username, altText = 'Avatar') {
    if (isValidAvatarUrl(avatarUrl)) {
        return `<img src="${avatarUrl}" alt="${altText}">`;
    } else {
        const initial = getUserInitial(username);
        return `<div class="glb-avatar-initials">${initial}</div>`;
    }
}

/**
 * Atualiza um elemento DOM de avatar com foto ou inicial
 * @param {HTMLElement} containerElement - Elemento container do avatar
 * @param {string} avatarUrl - URL da foto de perfil
 * @param {string} username - Nome do usuário (para extrair inicial)
 * @param {string} altText - Texto alternativo para a imagem (opcional)
 */
export function updateAvatarElement(containerElement, avatarUrl, username, altText = 'Avatar') {
    if (!containerElement) return;
    
    // Limpa o conteúdo anterior
    containerElement.innerHTML = '';
    
    if (isValidAvatarUrl(avatarUrl)) {
        const img = document.createElement('img');
        img.src = avatarUrl;
        img.alt = altText;
        containerElement.appendChild(img);
    } else {
        const initialsDiv = document.createElement('div');
        initialsDiv.className = 'glb-avatar-initials';
        initialsDiv.textContent = getUserInitial(username);
        containerElement.appendChild(initialsDiv);
    }
}

/**
 * Cria um elemento de avatar completo (com container)
 * @param {string} avatarUrl - URL da foto de perfil
 * @param {string} username - Nome do usuário
 * @param {string} containerClass - Classe CSS do container
 * @param {string} altText - Texto alternativo para a imagem (opcional)
 * @returns {HTMLElement} - Elemento DOM do avatar
 */
export function createAvatarElement(avatarUrl, username, containerClass = 'glb-avatar', altText = 'Avatar') {
    const container = document.createElement('div');
    container.className = containerClass;
    updateAvatarElement(container, avatarUrl, username, altText);
    return container;
}
