/**
 * JUPTI - Seleção de Perfis
 * VERSÃO ATUALIZADA - BUSCA DADOS DO BANCO DE DADOS:
 * - ✅ NOVO: Busca os perfis dos filhos do banco de dados via API.
 * - ✅ NOVO: Exibe avatar e nome real dos filhos vindos do banco.
 * - MANTÉM: Lógica de alternância de botões e navegação.
 */

import { getProfileData, getChildrenProfiles } from './apiService.js';

let currentUserStatus = null;

document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('authTokenJUPTI');
    if (!token) {
        alert("Sua sessão não foi encontrada. Por favor, faça o login.");
        window.location.href = 'index.html';
        return;
    }
    init();
});

function init() {
    loadUserProfile();
    carregarPerfisFilhos();
    configurarEventosNavegacao();
}

// Carrega o perfil do usuário (pai/mãe)
async function loadUserProfile() {
    const avatarElement = document.getElementById('userProfileAvatar');
    const nameElement = document.getElementById('userProfileName');
    const typeElement = document.getElementById('userProfileType');
    const userProfileCard = document.querySelector('[data-profile="user"]');

    if (!avatarElement || !nameElement || !typeElement || !userProfileCard) {
        console.error("Erro crítico: Elementos essenciais do perfil do usuário não foram encontrados no HTML.");
        return;
    }

    nameElement.textContent = 'Carregando...';
    typeElement.textContent = '...';

    try {
        const result = await getProfileData();
        if (result.success && result.user) {
            const user = result.user;
            currentUserStatus = user.children_living_status;

            nameElement.textContent = user.username || 'Usuário';
            const profileMap = {
                'pai_separado': 'Pai Separado', 'mae_separada': 'Mãe Separada',
                'pai_junto': 'Pai', 'mae_junta': 'Mãe',
                'advogado': 'Advogado(a)', 'psicologo': 'Psicólogo(a)', 'juiz': 'Juiz(a)'
            };
            typeElement.textContent = profileMap[user.profile_type] || user.profile_type || 'Perfil';

            if (user.profile_picture_url) {
                avatarElement.innerHTML = `<img src="${user.profile_picture_url}" alt="Foto de ${user.username}">`;
            } else {
                const initials = user.username ? user.username.charAt(0).toUpperCase() : 'U';
                avatarElement.innerHTML = `<div class="perf-child-avatar-initials" style="background-color: #0f4c5c; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 24px; color: white;">${initials}</div>`;
            }
            
            userProfileCard.addEventListener('click', () => window.location.href = 'perfil.html');

            const createButton = document.getElementById('createChildProfileButton');
            const searchButton = document.getElementById('searchChildProfileButton');
            
            if (createButton && searchButton) {
                if (currentUserStatus === 'nao') {
                    createButton.style.display = 'none';
                    searchButton.style.display = 'block';
                } else {
                    createButton.style.display = 'block';
                    searchButton.style.display = 'none';
                }
            }
        } else {
            throw new Error(result.message || 'Falha ao obter dados do usuário.');
        }
    } catch (error) {
        console.error("Falha crítica ao carregar perfil do usuário:", error.message);
        nameElement.textContent = 'Falha ao carregar';
        typeElement.textContent = 'Erro de conexão.';
        avatarElement.innerHTML = `<div class="perf-child-avatar-placeholder"><i class="fas fa-exclamation-triangle"></i></div>`;
    }
}

function configurarEventosNavegacao() {
    const createButton = document.getElementById('createChildProfileButton');
    if (createButton) {
        createButton.addEventListener('click', handleCreateChildClick);
    }
    
    const searchButton = document.getElementById('searchChildProfileButton');
    if (searchButton) {
        searchButton.addEventListener('click', () => {
            navegarPara('buscar_filho.html?flow=invite');
        });
    }

    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.addEventListener('click', () => history.back());
    }
}

function handleCreateChildClick() {
    if (currentUserStatus === 'sim') {
        navegarPara('criar_perfil_filho.html');
    } else if (currentUserStatus === 'dividido') {
        navegarPara('buscar_filho.html?flow=shared');
    }
}

// --- Funções de Carregamento dos Perfis de Filhos (ATUALIZADO) ---

/**
 * ✅ FUNÇÃO ATUALIZADA: Carrega os perfis dos filhos do banco de dados.
 */
async function carregarPerfisFilhos() {
    const container = document.getElementById('perfisFilhosContainer');
    if (!container) return;

    // Mostra indicador de carregamento
    container.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Carregando perfis...</div>';

    try {
        // Busca os perfis do banco de dados
        const result = await getChildrenProfiles();
        
        if (result.success && result.children && result.children.length > 0) {
            container.innerHTML = '';
            result.children.forEach((child) => {
                const perfilElement = criarElementoPerfilFilho(child);
                container.appendChild(perfilElement);
            });
            console.log(`✅ ${result.children.length} perfil(is) de filho(s) carregado(s) do banco de dados.`);
        } else {
            container.innerHTML = '';
            console.log('ℹ️ Nenhum perfil de filho encontrado.');
        }
    } catch (error) {
        console.error("❌ Erro ao carregar perfis dos filhos:", error);
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">Erro ao carregar perfis. Tente novamente.</div>';
    }
}

/**
 * ✅ FUNÇÃO ATUALIZADA: Cria o elemento HTML para um perfil de filho com dados do banco.
 */
function criarElementoPerfilFilho(child) {
    const perfilDiv = document.createElement('div');
    perfilDiv.className = 'perf-profile-card perf-profile-item perf-child-profile';
    perfilDiv.setAttribute('data-child-id', child.id);
    
    const idade = calcularIdade(child.birth_date);
    const idadeTexto = idade === 1 ? '1 ano' : `${idade} anos`;
    
    let avatarContent = '';
    if (child.profile_picture_url) {
        // Se tem foto, mostra a imagem
        avatarContent = `<img src="${child.profile_picture_url}" alt="Foto de ${child.full_name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    } else {
        // Se não tem foto, mostra as iniciais
        const iniciais = obterIniciais(child.full_name);
        avatarContent = `<div class="perf-child-avatar-initials">${iniciais}</div>`;
    }
    
    perfilDiv.innerHTML = `
        <div class="perf-profile-content">
            <div class="perf-profile-avatar perf-child-avatar">${avatarContent}</div>
            <div class="perf-profile-info">
                <div class="perf-profile-name">${child.full_name}</div>
                <div class="perf-profile-type">${idadeTexto}</div>
            </div>
            <div class="perf-profile-arrow"><i class="fas fa-chevron-right"></i></div>
        </div>
    `;
    
    // Adiciona o evento de clique para navegar ao perfil do filho
    perfilDiv.addEventListener('click', function() {
        navegarParaPerfilFilho(child);
    });
    
    return perfilDiv;
}

/**
 * ✅ FUNÇÃO ATUALIZADA: Salva os dados do filho e redireciona para o perfil.
 */
function navegarParaPerfilFilho(child) {
    console.log(`Navegando para o perfil de: ${child.full_name}`);
    
    // Converte os dados do banco para o formato esperado pelo perfil_filho.js
    const perfilFormatado = {
        id: child.id,
        nomeCompleto: child.full_name,
        dataNascimento: child.birth_date,
        cidadeNascimento: child.city_of_birth,
        estadoNascimento: child.state_of_birth,
        foto: child.profile_picture_url,
        cpf: child.cpf,
        certidaoNascimento: child.birth_certificate,
        criadoEm: child.created_at,
        relationshipType: child.relationship_type
    };
    
    // Salva no localStorage para a próxima tela
    localStorage.setItem('perfilFilhoAtivo', JSON.stringify(perfilFormatado));
    
    // Redireciona para a tela do perfil do filho
    window.location.href = 'perfil_filho.html';
}

// --- Funções Auxiliares ---

function calcularIdade(dataNascimento) {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mesAtual = hoje.getMonth();
    const mesNascimento = nascimento.getMonth();
    if (mesAtual < mesNascimento || (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())) {
        idade--;
    }
    return idade;
}

function obterIniciais(nomeCompleto) {
    if (!nomeCompleto) return '';
    const nomes = nomeCompleto.split(' ').filter(Boolean);
    if (nomes.length === 0) return '';
    const primeiraLetra = nomes[0][0];
    const ultimaLetra = nomes.length > 1 ? nomes[nomes.length - 1][0] : '';
    return `${primeiraLetra}${ultimaLetra}`.toUpperCase();
}

function navegarPara(url) { 
    window.location.href = url; 
}
