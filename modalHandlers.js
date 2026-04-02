/**
 * =================================================================
 * 🧠 MODALHANDLERS.JS - VERSÃO CORRIGIDA COM MODAL DE DENÚNCIA
 * =================================================================
 * Descrição:
 * - Gerencia as ações disparadas a partir dos modais de opções de post.
 * - Implementa todas as ações: editar, excluir, denunciar, bloquear, etc.
 * - Usa o sistema de modal genérico para denúncias.
 * - O global.js controla o clique para abrir, este arquivo trata as ações.
 * =================================================================
 */

// --- 1. IMPORTAÇÕES ---
import { openModal } from './components/modal/modal.js';
import { reportPost, deletePost, blockUser, addInterest, editPost } from './apiService.js'; 

// --- 2. INICIALIZAÇÃO ---

/**
 * Inicializa a lógica do FAB (Floating Action Button) e do modal de criação de post.
 * @param {string} context - O contexto de onde o FAB está sendo chamado ('perfil' ou 'perfil_filho').
 */
export function initPostCreationModal(context) {
    const fabButton = document.getElementById('fabButton');
    const createPostModal = document.getElementById('glb-createPostModal');
    const tabItems = document.querySelectorAll('.pus-tab-item');
    
    // Elementos do Modal de Criação de Post
    const createTextPost = document.getElementById('createTextPost');
    const createPhotoPost = document.getElementById('createPhotoPost');
    const createVideoPost = document.getElementById('createVideoPost');
    const cancelCreatePost = document.getElementById('cancelCreatePost');

    /**
     * Alterna a visibilidade do FAB com base na aba ativa.
     * O FAB só deve estar visível na aba "Linha do Tempo" (data-tab="timeline").
     */
    function toggleFabVisibility() {
        const timelineTab = document.querySelector('.pus-tab-item[data-tab="timeline"]');
        
        // Verifica se a aba "Linha do Tempo" está ativa
        if (timelineTab && timelineTab.classList.contains('active')) {
            if (fabButton) {
                fabButton.style.display = 'flex';
            }
        } else {
            if (fabButton) {
                fabButton.style.display = 'none';
            }
        }
    }

    // 1. Chama a função no carregamento inicial
    toggleFabVisibility();

    // 2. Adiciona listener de clique em todas as abas para atualizar a visibilidade
    tabItems.forEach(tab => {
        tab.addEventListener('click', () => {
            // Usa setTimeout para garantir que a classe 'active' já foi aplicada
            // pelo script de navegação das abas antes de verificar.
            setTimeout(toggleFabVisibility, 50); 
        });
    });

    // 3. Ação de clique no FAB
    if (fabButton) {
        fabButton.addEventListener('click', () => {
            // **REGRA CRUCIAL DE CONTEXTO:**
            if (context === 'perfil') {
                // Perfil do Usuário Principal: Remove o contexto de filho.
                sessionStorage.removeItem('childContextId');
            } else if (context === 'perfil_filho') {
                // Perfil do Filho: Define o contexto de filho.
                // O ID do filho deve ser obtido do localStorage, que deve ser setado
                // ao entrar na página perfil_filho.html.
                const childId = localStorage.getItem('currentChildId'); 
                if (childId) {
                    sessionStorage.setItem('childContextId', childId);
                } else {
                    console.error('ID do filho não encontrado no localStorage. Não é possível definir o contexto.');
                    return; // Impede a abertura do modal se o ID do filho não for encontrado
                }
            }

            // Abre o modal de criação de post
            if (createPostModal) {
                createPostModal.classList.add('active');
                document.body.classList.add('no-scroll');
            }
        });
    }

    // 4. Lógica de Fechamento do Modal
    if (cancelCreatePost) {
        cancelCreatePost.addEventListener('click', () => {
            if (createPostModal) {
                createPostModal.classList.remove('active');
                document.body.classList.remove('no-scroll');
            }
        });
    }

    // 5. Lógica de Redirecionamento do Modal
    function handlePostCreation(postType) {
        sessionStorage.setItem('postType', postType);
        
        // Redireciona para a tela de edição/câmera
        if (postType === 'photo' || postType === 'video') {
            window.location.href = 'camera.html';
        } else {
            window.location.href = 'editar_post.html';
        }
    }

    if (createTextPost) {
        createTextPost.addEventListener('click', () => handlePostCreation('text'));
    }
    if (createPhotoPost) {
        createPhotoPost.addEventListener('click', () => handlePostCreation('photo'));
    }
    if (createVideoPost) {
        createVideoPost.addEventListener('click', () => handlePostCreation('video'));
    }
}


export function initModalActionHandlers() {
    const postOptionsModal = document.getElementById('glb-postOptionsModal');
    if (postOptionsModal) {
        postOptionsModal.addEventListener('click', (e) => handleModalAction(e, postOptionsModal));
    }
    const profileOptionsModal = document.getElementById('glb-profileOptionsModal');
    if (profileOptionsModal) {
        profileOptionsModal.addEventListener('click', (e) => handleModalAction(e, profileOptionsModal));
    }
}

// --- 3. FUNÇÃO PRINCIPAL DE AÇÕES ---
async function handleModalAction(event, modal) {
    const actionItem = event.target.closest('.glb-option-item');
    
    // Se o clique não foi em um item de ação, verifica se foi no fundo do modal ou no botão de cancelar
    if (!actionItem) {
        if (event.target === modal || event.target.closest('.cancel')) {
            closeModal(modal);
        }
        return;
    }

    const action = actionItem.dataset.action;
    const postId = modal.dataset.currentPostId;
    
    // Não fecha o modal ainda para algumas ações que precisam de confirmação
    const actionsNeedingConfirmation = ['report', 'delete-post', 'edit-post'];
    if (!actionsNeedingConfirmation.includes(action)) {
        closeModal(modal);
    }

    switch (action) {
        case 'hide':
            if (postId) {
                hidePost(postId, true);
                alert('Post ocultado com sucesso!');
            }
            break;

        case 'report':
            closeModal(modal); // Fecha o modal de opções antes de abrir o de denúncia
            if (postId) {
                openReportModal(postId);
            }
            break;

        case 'block':
            if (postId) {
                const postElement = document.querySelector(`.glb-post[data-id='${postId}']`);
                const userId = postElement?.dataset.userId;
                if (userId && confirm('Tem certeza que deseja bloquear este usuário? Você não verá mais nenhum conteúdo dele.')) {
                    try {
                        await blockUser(userId);
                        alert('✅ Usuário bloqueado com sucesso.');
                        // Esconde todos os posts deste usuário
                        document.querySelectorAll(`.glb-post[data-user-id='${userId}']`).forEach(post => {
                            post.style.display = 'none';
                        });
                    } catch (error) {
                        alert('❌ Erro ao bloquear usuário.');
                    }
                }
            }
            break;

        case 'interest':
            if (postId) {
                try {
                    await addInterest(postId);
                    alert('✅ Interesse registrado! Entraremos em contato em breve.');
                } catch (error) {
                    alert('❌ Erro ao registrar interesse.');
                }
            }
            break;
        
        case 'edit-post':
            if (postId) {
                closeModal(modal); // Fecha o modal de opções
                const postElement = document.querySelector(`.glb-post[data-id='${postId}']`);
                if (!postElement) {
                    console.error(`Elemento do post com ID ${postId} não encontrado na página.`);
                    return;
                }

                const captionElement = postElement.querySelector('.glb-post-text');
                const currentCaption = captionElement ? captionElement.textContent.trim() : '';

                // Abre a caixa de diálogo nativa do navegador
                const newCaption = prompt("Edite a legenda do seu registro:", currentCaption);

                // Se o usuário clicou "OK" (newCaption não é null) e o texto mudou
                if (newCaption !== null && newCaption.trim() !== currentCaption) {
                    try {
                        const result = await editPost(postId, newCaption.trim());
                        if (result.success) {
                            // Atualiza a legenda diretamente na página, sem recarregar
                            if (captionElement) {
                                captionElement.textContent = result.post.caption;
                            }
                            alert('✅ Legenda atualizada com sucesso!');
                        }
                    } catch (error) {
                        alert(`❌ Erro ao atualizar a legenda: ${error.message}`);
                    }
                }
            }
            break;

        case 'delete-post':
            closeModal(modal); // Fecha o modal de opções
            if (postId && confirm('Tem certeza que deseja excluir este post? Esta ação não pode ser desfeita.')) {
                try {
                    const result = await deletePost(postId);
                    const postElement = document.querySelector(`.glb-post[data-id='${postId}']`);
                    
                    if (result.success && postElement) {
                        // Animação de remoção
                        postElement.style.transition = 'opacity 0.3s, transform 0.3s';
                        postElement.style.opacity = '0';
                        postElement.style.transform = 'scale(0.9)';
                        setTimeout(() => {
                            postElement.remove();
                            alert('✅ Post excluído com sucesso!');
                            // Recarrega a página para atualizar a lista
                            window.location.reload();
                        }, 300);
                    } else {
                        alert('❌ Erro ao excluir o post.');
                    }
                } catch (error) {
                    console.error('Erro ao excluir post:', error);
                    alert('❌ Erro ao excluir o post.');
                }
            }
            break;
        
        case 'privacy-settings':
            alert('⚙️ Configurações de privacidade em desenvolvimento.');
            break;
            
        case 'cancel':
            // O modal já foi fechado acima
            break;
    }
}

// --- 4. FUNÇÕES AUXILIARES ---

/**
 * Fecha um modal e remove a classe de bloqueio do body
 */
function closeModal(modal) {
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-aberto');
    }
}

/**
 * Esconde um post da visualização e opcionalmente salva no localStorage
 */
function hidePost(postId, permanent = false) {
    const postElement = document.querySelector(`.glb-post[data-id='${postId}']`);
    if (postElement) {
        postElement.style.display = 'none';
    }
    
    if (permanent) {
        // Salva no localStorage para persistir entre sessões
        const hiddenPosts = JSON.parse(localStorage.getItem('hiddenPostsJUPTI')) || [];
        if (!hiddenPosts.includes(postId)) {
            hiddenPosts.push(postId);
            localStorage.setItem('hiddenPostsJUPTI', JSON.stringify(hiddenPosts));
        }
    }
}

/**
 * Abre o modal de denúncia usando o sistema de modal genérico
 */
function openReportModal(postId) {
    const reportReasons = [
        { value: 'spam', label: 'Spam ou conteúdo enganoso' },
        { value: 'inappropriate', label: 'Conteúdo inadequado' },
        { value: 'harassment', label: 'Assédio ou bullying' },
        { value: 'violence', label: 'Violência ou ameaças' },
        { value: 'hate_speech', label: 'Discurso de ódio' },
        { value: 'false_info', label: 'Informação falsa' },
        { value: 'other', label: 'Outro motivo' }
    ];

    const formContent = `
        <form id="reportForm" class="gen-modal-form">
            <div class="gen-form-group">
                <label for="reportReason" class="gen-form-label">Motivo da denúncia:</label>
                <select id="reportReason" name="reason" class="gen-form-select" required>
                    <option value="">Selecione um motivo</option>
                    ${reportReasons.map(r => `<option value="${r.value}">${r.label}</option>`).join('')}
                </select>
            </div>
            <div class="gen-form-group">
                <label for="reportDetails" class="gen-form-label">Detalhes adicionais (opcional):</label>
                <textarea 
                    id="reportDetails" 
                    name="details" 
                    class="gen-form-textarea" 
                    rows="4" 
                    placeholder="Descreva o problema com mais detalhes..."
                ></textarea>
            </div>
            <div class="gen-form-info">
                <i class="fas fa-info-circle"></i>
                <span>Sua denúncia será analisada pela nossa equipe de moderação.</span>
            </div>
        </form>
    `;

    openModal({
        title: 'Denunciar publicação',
        content: formContent,
        buttons: [
            {
                text: 'Cancelar',
                type: 'secondary',
                onClick: () => {
                    // O modal será fechado automaticamente
                }
            },
            {
                text: 'Enviar denúncia',
                type: 'primary',
                onClick: async (e, form) => {
                    e.preventDefault();
                    
                    const formData = new FormData(form);
                    const reason = formData.get('reason');
                    const details = formData.get('details');

                    if (!reason) {
                        alert('⚠️ Por favor, selecione um motivo para a denúncia.');
                        return;
                    }

                    try {
                        const result = await reportPost(postId, reason, details);
                        if (result.success) {
                            alert('✅ Denúncia enviada com sucesso! Obrigado por nos ajudar a manter a comunidade segura.');
                            // Remove o modal
                            document.getElementById('genericModalOverlay')?.remove();
                            document.body.classList.remove('modal-aberto');
                        } else {
                            alert('❌ Erro ao enviar denúncia. Tente novamente.');
                        }
                    } catch (error) {
                        console.error('Erro ao enviar denúncia:', error);
                        alert('❌ Erro ao enviar denúncia. Tente novamente.');
                    }
                }
            }
        ]
    });
}

/**
 * Abre o menu de opções de post (função exportada para uso externo)
 */
export function openPostOptionsMenu(postId, isOwner) {
    const modalId = isOwner ? 'glb-profileOptionsModal' : 'glb-postOptionsModal';
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        modal.dataset.currentPostId = postId;
        document.body.classList.add('modal-aberto');
    }
}

