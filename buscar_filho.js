/**
 * ============================================================
 * 🧠 JUPTI - Lógica da Tela de Busca de Filho (buscar_filho.js)
 * VERSÃO ATUALIZADA: Redireciona para a tela de verificação.
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. SELETORES E CONFIGURAÇÃO INICIAL (sem alterações)
    const searchButton = document.getElementById('searchButton');
    const backButton = document.getElementById('backButton');
    const createAnywayButton = document.getElementById('createAnywayButton');
    const inviteParentButton = document.getElementById('inviteParentButton');
    const resultsContainer = document.getElementById('searchResults');
    const childNameInput = document.getElementById('childName');
    const otherParentPhoneInput = document.getElementById('otherParentPhone');

    if (!searchButton || !resultsContainer || !childNameInput || !otherParentPhoneInput) {
        console.error("ERRO CRÍTICO: Elementos essenciais não encontrados. Verifique os IDs no HTML.");
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const flow = urlParams.get('flow') || 'shared';

    backButton.addEventListener('click', () => history.back());
    searchButton.addEventListener('click', () => {
        const nameTerm = childNameInput.value.trim();
        const phoneTerm = otherParentPhoneInput.value.trim();
        const searchTerm = phoneTerm || nameTerm;
        if (!searchTerm) {
            alert('Por favor, preencha o nome do filho ou o telefone do outro genitor.');
            return;
        }
        performRealSearch(searchTerm, flow);
    });

    createAnywayButton.addEventListener('click', () => { window.location.href = 'criar_perfil_filho.html'; });
    inviteParentButton.addEventListener('click', () => { alert('Funcionalidade de convite será implementada em breve!'); });
});


// FUNÇÃO DE BUSCA (sem alterações na lógica da API)
async function performRealSearch(searchTerm, flow) {
    const searchButton = document.getElementById('searchButton');
    const resultsContainer = document.getElementById('searchResults');
    const createAnywayButton = document.getElementById('createAnywayButton');
    const inviteParentButton = document.getElementById('inviteParentButton');

    searchButton.disabled = true;
    searchButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...';
    resultsContainer.innerHTML = '';
    createAnywayButton.style.display = 'none';
    inviteParentButton.style.display = 'none';

    try {
        const isPhoneSearch = /^\d{10,15}$/.test(searchTerm.replace(/\D/g, ''));
        const searchParam = isPhoneSearch ? `phone=${searchTerm}` : `name=${searchTerm}`;
        const response = await fetch(`/api/search-child-profiles?${searchParam}`);
        if (!response.ok) throw new Error(`Erro na rede: ${response.statusText}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'A API retornou um erro.');

        if (data.children.length > 0) {
            data.children.forEach(child => {
                const card = createChildCard(child); // A mágica agora está aqui
                resultsContainer.appendChild(card);
            });
        } else {
            resultsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px 0;">Nenhum perfil encontrado.</p>';
            if (flow === 'shared') {
                createAnywayButton.style.display = 'block';
            } else if (flow === 'invite') {
                inviteParentButton.style.display = 'block';
            }
        }
    } catch (error) {
        console.error("Erro na busca:", error);
        resultsContainer.innerHTML = `<p style="text-align: center; color: red; padding: 20px 0;">Falha na busca. Tente novamente.</p>`;
    } finally {
        searchButton.disabled = false;
        searchButton.innerHTML = '<i class="fas fa-search"></i> Buscar';
    }
}


/**
 * ✅ FUNÇÃO ATUALIZADA: Cria o card de resultado e adiciona o evento de clique para redirecionar.
 * @param {object} child - O objeto do filho retornado pela API.
 * @returns {HTMLElement} - O elemento do card pronto.
 */
function createChildCard(child) {
    const card = document.createElement('div');
    card.className = 'perf-profile-card perf-profile-item perf-child-profile';
    
    // ✅ 1. O cursor agora indica que o card inteiro é clicável.
    card.style.cursor = 'pointer'; 
    card.style.marginTop = '15px';

    const age = child.birth_date ? calcularIdade(child.birth_date) : '?';
    const ageText = age === 1 ? '1 ano' : `${age} anos`;

    const avatar = child.profile_picture_url
        ? `<img src="${child.profile_picture_url}" alt="Foto de ${child.full_name}">`
        : `<div class="perf-child-avatar-initials">${obterIniciais(child.full_name)}</div>`;

    // ✅ 2. O botão "Conectar" foi removido e substituído por um ícone de seta.
    card.innerHTML = `
        <div class="perf-profile-content">
            <div class="perf-profile-avatar perf-child-avatar">
                ${avatar}
            </div>
            <div class="perf-profile-info">
                <div class="perf-profile-name">${child.full_name}</div>
                <div class="perf-profile-type">${ageText}</div>
            </div>
            <div class="perf-profile-arrow">
                <i class="fas fa-chevron-right"></i>
            </div>
        </div>
    `;

    // ✅ 3. Adiciona o evento de clique ao card inteiro para redirecionar.
    card.addEventListener('click', () => {
        // Redireciona para a nova tela, passando o ID do filho na URL.
        window.location.href = `verificar_filho.html?id=${child.id}`;
    });

    return card;
}


// --- FUNÇÕES AUXILIARES (sem alterações) ---

function calcularIdade(dataNascimento) {
    if (!dataNascimento) return '?';
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) { idade--; }
    return idade;
}

function obterIniciais(nomeCompleto) {
    if (!nomeCompleto || typeof nomeCompleto !== 'string') return '?';
    const palavras = nomeCompleto.trim().split(/\s+/);
    if (palavras.length === 0) return '?';
    if (palavras.length === 1) return palavras[0].charAt(0).toUpperCase();
    return (palavras[0].charAt(0) + palavras[palavras.length - 1].charAt(0)).toUpperCase();
}
