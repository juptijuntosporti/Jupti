/**
 * =================================================================
 * 📋 JUPTI - Scripts para Compromissos (Versão Avatar Personalizado)
 * =================================================================
 */

document.addEventListener('DOMContentLoaded', async function() {
    console.log("🚀 Iniciando carregamento de compromissos com avatares...");
    await carregarCompromissos();
});

async function carregarCompromissos() {
    const listaContainer = document.getElementById('lista-compromissos');
    if (!listaContainer) return;

    try {
        const token = localStorage.getItem('authTokenJUPTI');
        if (!token) {
            console.warn("⚠️ Token 'authTokenJUPTI' não encontrado.");
            listaContainer.innerHTML = `
                <div style="text-align: center; padding: 40px 20px;">
                    <i class="fas fa-lock" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
                    <p style="color: #666; margin-bottom: 20px;">Sua sessão expirou ou você não está logado.</p>
                    <button onclick="window.location.href='index.html'" style="background: #004d40; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer;">
                        Fazer Login Agora
                    </button>
                </div>
            `;
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const childId = urlParams.get('child_id') || localStorage.getItem('selected_child_id');
        
        let url = '/api/get-pending-commitments';
        if (childId) url += `?child_id=${childId}`;

        console.log(`📡 Buscando dados em: ${url}`);
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            throw new Error("Sessão inválida. Por favor, faça login novamente.");
        }

        const data = await response.json();

        if (data.success && data.commitments && data.commitments.length > 0) {
            renderizarLista(data.commitments);
            atualizarEstatisticas(data.commitments);
        } else {
            listaContainer.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #888;">
                    <i class="fas fa-calendar-check" style="font-size: 48px; color: #eee; margin-bottom: 20px;"></i>
                    <p>Você não possui compromissos pendentes ou não cumpridos no momento.</p>
                </div>
            `;
            atualizarEstatisticas([]);
        }
    } catch (error) {
        console.error('❌ Erro na requisição:', error);
        listaContainer.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #c62828;">
                <i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 20px;"></i>
                <p>${error.message || 'Erro ao carregar seus compromissos.'}</p>
                <button onclick="location.reload()" style="background: none; border: 1px solid #c62828; color: #c62828; padding: 8px 16px; border-radius: 4px; margin-top: 10px; cursor: pointer;">
                    Tentar Novamente
                </button>
            </div>
        `;
    }
}

function renderizarLista(commitments) {
    const listaContainer = document.getElementById('lista-compromissos');
    listaContainer.innerHTML = ''; 

    const agora = new Date();

    const naoCumpridos = commitments.filter(c => {
        const dataVencimento = new Date(c.due_date);
        const isExpired = dataVencimento < agora;
        return c.status === 'nao-cumprido' || (isExpired && c.status === 'pendente');
    });

    const pendentes = commitments.filter(c => {
        const dataVencimento = new Date(c.due_date);
        const isExpired = dataVencimento < agora;
        return c.status === 'pendente' && !isExpired;
    });

    if (naoCumpridos.length > 0) {
        const title = document.createElement('div');
        title.className = 'section-title';
        title.innerHTML = '<i class="fas fa-exclamation-circle" style="margin-right: 8px; color: #c62828;"></i> Compromissos Não Cumpridos';
        listaContainer.appendChild(title);
        naoCumpridos.forEach(c => listaContainer.appendChild(criarCard(c, true)));
    }

    const pendingTitle = document.createElement('div');
    pendingTitle.className = 'section-title';
    pendingTitle.style.marginTop = '30px';
    pendingTitle.innerHTML = '<i class="fas fa-clock" style="margin-right: 8px; color: #616161;"></i> Compromissos Pendentes';
    listaContainer.appendChild(pendingTitle);

    if (pendentes.length > 0) {
        pendentes.forEach(c => listaContainer.appendChild(criarCard(c, false)));
    } else {
        const msg = document.createElement('p');
        msg.style.cssText = 'text-align: center; color: #888; padding: 20px;';
        msg.textContent = 'Nenhum outro compromisso pendente.';
        listaContainer.appendChild(msg);
    }
}

/**
 * ✅ FUNÇÃO: Criar Elemento de Avatar (Imagem ou Inicial)
 */
function criarAvatarFilho(childAvatar, childName) {
    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'child-avatar-container';
    
    if (childAvatar) {
        // Se tem foto, mostra a imagem
        avatarContainer.innerHTML = `<img src="${childAvatar}" alt="${childName}" class="child-avatar-img">`;
    } else {
        // Se não tem foto, mostra a inicial (Preferência do Usuário)
        const inicial = childName ? childName.charAt(0).toUpperCase() : '?';
        avatarContainer.innerHTML = `<div class="child-avatar-initial">${inicial}</div>`;
    }
    
    return avatarContainer.outerHTML;
}

function criarCard(c, isExpired) {
    const item = document.createElement('div');
    item.className = 'commitment-item fade-in';
    
    const dataVencimento = new Date(c.due_date);
    const dataFormatada = dataVencimento.toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    let horaFormatada = "";
    if (c.type === 'calls') {
        horaFormatada = " às " + dataVencimento.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    // ✅ ATUALIZAÇÃO: Substituído o ícone pelo Avatar do Filho
    const avatarHtml = criarAvatarFilho(c.child_avatar, c.child_name);

    item.innerHTML = `
        <div class="commitment-left">
            <div class="commitment-avatar-box">
                ${avatarHtml}
            </div>
            <div class="commitment-info">
                <div class="commitment-title">
                    ${c.title}
                </div>
                <div class="commitment-date">${isExpired ? 'Venceu em' : 'Vence em'} ${dataFormatada}${horaFormatada}</div>
            </div>
        </div>
        <div class="commitment-status ${isExpired ? 'status-failed' : 'status-pending'}">
            ${isExpired ? 'NÃO CUMPRIDO' : 'PENDENTE'}
        </div>
        ${isExpired ? `
            <button class="justify-button" onclick="abrirModalJustificativa('${c.id}')">
                <i class="fas fa-edit" style="margin-right: 5px;"></i> Justificar
            </button>
        ` : ''}
    `;
    return item;
}

function atualizarEstatisticas(commitments) {
    const total = commitments.length;
    const agora = new Date();

    const naoCumpridos = commitments.filter(c => {
        const dataVencimento = new Date(c.due_date);
        return dataVencimento < agora;
    }).length;

    const pendentes = total - naoCumpridos;

    const statsNC = document.getElementById('stats-nao-cumpridos');
    if (statsNC) statsNC.textContent = naoCumpridos;

    const statsP = document.getElementById('stats-pendentes');
    if (statsP) statsP.textContent = pendentes;

    const countTodos = document.getElementById('count-todos');
    if (countTodos) countTodos.textContent = total;

    const countNC = document.getElementById('count-nao-cumprido');
    if (countNC) countNC.textContent = naoCumpridos;

    const countP = document.getElementById('count-pendente');
    if (countP) countP.textContent = pendentes;

    const alertVencidos = document.getElementById('alert-vencidos');
    if (alertVencidos) {
        alertVencidos.style.display = naoCumpridos > 0 ? 'block' : 'none';
        const msg = document.getElementById('alert-message');
        if (msg) msg.textContent = `Você possui ${naoCumpridos} compromisso(s) vencido(s) que precisa(m) de justificativa urgente.`;
    }

    const presencaValue = total > 0 ? Math.round(((total - naoCumpridos) / total) * 100) : 100;
    const presencaText = document.getElementById('presenca-parental');
    if (presencaText) presencaText.textContent = `${presencaValue}%`;
    
    const progressFill = document.getElementById('progress-bar-fill');
    if (progressFill) progressFill.style.width = `${presencaValue}%`;
}
