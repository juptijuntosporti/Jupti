/**
 * ============================================================
 * 🧠 JUPTI - Lógica da Tela de Verificação (VERSÃO CORRIGIDA)
 * ============================================================
 * ✅ CORREÇÃO CRÍTICA: A função 'handleConnectionRequest' agora chama
 *    a API correta ('/functions/request-child-connection') via POST,
 *    enviando o token de autenticação para registrar o pedido na
 *    nova tabela 'connection_requests'.
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Seleciona os elementos da página
    const loadingState = document.getElementById('loadingState');
    const profileContent = document.getElementById('profileContent');
    const backButton = document.getElementById('backButton');
    const goBackButton = document.getElementById('goBackButton');
    const connectButton = document.getElementById('connectButton');

    // 2. Pega o ID da criança da URL
    const urlParams = new URLSearchParams(window.location.search);
    const childId = urlParams.get('id');

    if (!childId) {
        showError('ID da criança não encontrado na URL.');
        return;
    }

    // 3. Configura os botões de navegação
    backButton.addEventListener('click', () => history.back());
    goBackButton.addEventListener('click', () => history.back());

    // 4. Inicia o carregamento dos dados do perfil
    loadChildProfile(childId);

    // 5. CONFIGURA O BOTÃO DE CONECTAR PARA CHAMAR A NOVA FUNÇÃO
    connectButton.addEventListener('click', () => {
        handleConnectionRequest(childId);
    });
});

/**
 * Busca os dados do perfil da criança na API e preenche a tela.
 */
async function loadChildProfile(childId) {
    try {
        // Esta API busca os dados públicos do perfil do filho
        const response = await fetch(`/api/get-child-public-profile?id=${childId}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Não foi possível carregar o perfil.');
        }

        populateProfileData(data.child);

        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('profileContent').style.display = 'block';

    } catch (error) {
        console.error("Erro ao carregar perfil da criança:", error);
        showError(error.message);
    }
}

/**
 * ✅ 6. FUNÇÃO ATUALIZADA: Lida com o clique no botão "Conectar".
 * Chama a API correta para enviar o pedido de conexão.
 */
async function handleConnectionRequest(childId) {
    const connectButton = document.getElementById('connectButton');

    // Feedback visual de carregamento
    connectButton.disabled = true;
    connectButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando pedido...';

    try {
        // Pega o token de autenticação do localStorage
        const token = localStorage.getItem('authTokenJUPTI');
        if (!token) {
            throw new Error('Você precisa estar logado para enviar um pedido. Faça o login novamente.');
        }

        // Chama a API correta que criamos
        const response = await fetch('/api/request-child-connection', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Envia o token para autenticação
            },
            body: JSON.stringify({ childId: childId })
        });

        const result = await response.json();

        if (!response.ok) {
            // Se a API retornar um erro (ex: pedido já existe), lança para o 'catch'
            throw new Error(result.message || 'Falha ao enviar o pedido.');
        }

        // Sucesso!
        alert(result.message); // Exibe a mensagem de sucesso da API ("Seu pedido foi enviado...")
        
        // Redireciona o usuário de volta para a tela de seleção de perfis
        window.location.href = 'selecao_perfis.html';

    } catch (error) {
        console.error('Erro ao solicitar conexão:', error);
        alert(`Erro: ${error.message}`);
        
        // Restaura o botão em caso de erro
        connectButton.disabled = false;
        connectButton.innerHTML = '<i class="fas fa-check-circle"></i> Sim, este é meu filho. Conectar.';
    }
}


// --- FUNÇÕES AUXILIARES (sem alterações) ---

function populateProfileData(child) {
    const avatarContainer = document.getElementById('childAvatar');
    if (child.profile_picture_url) {
        avatarContainer.innerHTML = `<img src="${child.profile_picture_url}" alt="Foto de ${child.full_name}">`;
    } else {
        avatarContainer.textContent = obterIniciais(child.full_name);
    }
    document.getElementById('childName').textContent = child.full_name;
    const age = child.birth_date ? calcularIdade(child.birth_date) : '?';
    const birthDateFormatted = child.birth_date ? new Date(child.birth_date).toLocaleDateString('pt-BR') : 'Data não informada';
    document.getElementById('childDetails').textContent = `${age} anos • Nasc. em ${birthDateFormatted}`;
    document.querySelector('#childGuardian span').textContent = child.primary_guardian_name || 'Não informado';
}

function showError(message) {
    const loadingState = document.getElementById('loadingState');
    loadingState.innerHTML = `
        <i class="fas fa-exclamation-triangle" style="color: #D8000C;"></i>
        <p style="color: #D8000C; font-weight: bold;">Erro ao Carregar</p>
        <p style="font-size: 0.9rem;">${message}</p>
    `;
}

function calcularIdade(dataNascimento) {
    if (!dataNascimento) return 0;
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) { idade--; }
    return idade;
}

function obterIniciais(nomeCompleto) {
    if (!nomeCompleto) return '?';
    const palavras = nomeCompleto.trim().split(/\s+/);
    if (palavras.length === 1) return palavras[0].charAt(0).toUpperCase();
    return (palavras[0].charAt(0) + (palavras[palavras.length - 1] || [''])[0]).toUpperCase();
}
