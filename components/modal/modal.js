/**
 * =================================================================
 * 🧠 MODAL.JS - Motor do Sistema de Modais Genéricos
 * =================================================================
 */

// Armazena o HTML do modal para não ter que buscá-lo toda vez
let modalTemplate = null;

/**
 * Carrega o template HTML do modal se ainda não foi carregado.
 */
async function loadModalTemplate() {
    if (modalTemplate) return;
    try {
        const response = await fetch('components/modal/modal.html');
        if (!response.ok) throw new Error('Falha ao carregar o template do modal.');
        modalTemplate = await response.text();
    } catch (error) {
        console.error(error);
        modalTemplate = '<div class="gen-modal-overlay">Erro ao carregar modal.</div>';
    }
}

/**
 * A função principal que abre e configura o modal.
 * @param {object} config - Objeto de configuração do modal.
 * @param {string} config.title - O título do modal.
 * @param {string} config.content - O HTML do conteúdo interno do modal.
 * @param {Array<object>} [config.buttons] - Um array de objetos para os botões do rodapé.
 */
export async function openModal(config) {
    await loadModalTemplate();

    // Remove qualquer modal antigo antes de adicionar um novo
    document.getElementById('genericModalOverlay')?.remove();

    // Insere o esqueleto do modal no corpo da página
    document.body.insertAdjacentHTML('beforeend', modalTemplate);
    document.body.classList.add('modal-aberto'); // Trava o scroll

    const overlay = document.getElementById('genericModalOverlay');
    const titleEl = document.getElementById('genericModalTitle');
    const contentEl = document.getElementById('genericModalContent');
    const footerEl = document.getElementById('genericModalFooter');
    const closeBtn = document.getElementById('genericModalClose');

    // Preenche o modal com o conteúdo fornecido
    titleEl.textContent = config.title;
    contentEl.innerHTML = config.content;

    // Cria os botões dinamicamente
    footerEl.innerHTML = '';
    if (config.buttons && config.buttons.length > 0) {
        config.buttons.forEach(btnConfig => {
            const button = document.createElement('button');
            button.className = `gen-modal-btn ${btnConfig.type || 'secondary'}`;
            button.textContent = btnConfig.text;
            button.onclick = (e) => {
                // Passa o formulário (se houver) para a função de clique
                const form = overlay.querySelector('form');
                btnConfig.onClick(e, form);
            };
            footerEl.appendChild(button);
        });
    } else {
        footerEl.style.display = 'none'; // Esconde o rodapé se não houver botões
    }

    // Adiciona eventos de fechamento
    const closeModal = () => {
        overlay.classList.remove('active');
        document.body.classList.remove('modal-aberto');
        setTimeout(() => overlay.remove(), 300); // Remove da DOM após a animação
    };
    
    closeBtn.onclick = closeModal;
    overlay.onclick = (e) => {
        if (e.target === overlay) closeModal();
    };

    // Exibe o modal com a animação
    requestAnimationFrame(() => {
        overlay.classList.add('active');
    });
}
