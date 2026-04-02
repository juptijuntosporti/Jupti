/**
 * JUPTI - Navegação entre telas
 * Arquivo centralizado para funções de navegação entre as páginas do aplicativo
 */

/**
 * Navega para a página especificada
 * @param {string} pagina - Nome do arquivo HTML para navegação
 */
function navegarPara(pagina) {
  window.location.href = pagina;
}

/**
 * Inicializa os eventos de navegação do menu inferior
 * Deve ser chamada quando o DOM estiver carregado
 */
function inicializarNavegacao() {
  console.log("Inicializando navegação JUPTI...");

  // Obtém todos os itens de navegação - CORRIGIDO PARA .glb-nav-item
  const navItems = document.querySelectorAll('.glb-nav-item');
  console.log("Itens de navegação encontrados:", navItems.length);

  // Adiciona evento de clique para cada item
  navItems.forEach(item => {
    const pagina = item.getAttribute('data-page');
    console.log("Configurando item:", pagina);

    // Remove qualquer evento de clique existente para evitar duplicação
    item.removeEventListener('click', navegarParaPagina);

    // Adiciona o novo evento de clique
    item.addEventListener('click', navegarParaPagina);
  });

  // Marca o item ativo com base na URL atual
  marcarItemAtivo();
}

/**
 * Função de navegação para os itens do menu
 * Separada para facilitar a remoção de listeners duplicados
 */
function navegarParaPagina(event) {
  const pagina = this.getAttribute('data-page');
  console.log("Clique em:", pagina);

  switch(pagina) {
    case 'home':
      navegarPara('feed.html');
      break;
    case 'family':
      navegarPara('selecao_perfis.html');
      break;
    case 'legal':
      navegarPara('linha_juridica.html');
      break;
    case 'messages':
      navegarPara('mensagens.html');
      break;
    case 'support':
      navegarPara('rede_apoio.html');
      break;
    default:
      console.log('Página não definida');
  }
}

/**
 * Marca o item de navegação ativo com base na URL atual
 */
function marcarItemAtivo() {
  const currentPage = window.location.pathname.split('/').pop();
  console.log("Página atual:", currentPage);

  // Remove a classe ativa de todos os itens - CORRIGIDO PARA .glb-nav-item
  document.querySelectorAll('.glb-nav-item').forEach(item => {
    item.classList.remove('active');
  });

  // Adiciona a classe ativa ao item correspondente à página atual - CORRIGIDO PARA .glb-nav-item
  let activeItem = null;

  if (currentPage === 'feed.html') {
    activeItem = document.querySelector('.glb-nav-item[data-page="home"]');
  } else if (currentPage === 'selecao_perfis.html') {
    activeItem = document.querySelector('.glb-nav-item[data-page="family"]');
  } else if (currentPage.includes('linha_juridica') || currentPage.includes('caso_pronto') || currentPage.includes('relatorio')) {
    activeItem = document.querySelector('.glb-nav-item[data-page="legal"]');
  } else if (currentPage === 'mensagens.html' || currentPage.includes('chat')) {
    activeItem = document.querySelector('.glb-nav-item[data-page="messages"]');
  } else if (currentPage === 'rede_apoio.html') {
    activeItem = document.querySelector('.glb-nav-item[data-page="support"]');
  }

  if (activeItem) {
    activeItem.classList.add('active');
    console.log("Item ativo:", activeItem.getAttribute('data-page'));
  }
}

// Inicializa a navegação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM carregado, inicializando navegação...");
  inicializarNavegacao();
});

// Inicializa também quando a janela terminar de carregar (fallback)
window.addEventListener('load', function() {
  console.log("Janela carregada, verificando navegação...");
  inicializarNavegacao();
});

// Expõe funções globalmente para uso direto no HTML
window.navegarPara = navegarPara;
