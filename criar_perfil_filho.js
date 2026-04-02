/* ===== JUPTI CRIAR PERFIL DO FILHO - JAVASCRIPT DEDICADO (VERSÃO COMPLETA E ATUALIZADA) ===== */

// ===== IMPORTAÇÕES ===== //
import { createChildProfile, uploadImageToCloudinary } from './apiService.js';

// ===== VARIÁVEIS GLOBAIS ===== //
let photoFile = null;
let isFormValid = false;

// ===== FUNÇÕES DE INICIALIZAÇÃO ===== //

document.addEventListener("DOMContentLoaded", function() {
  inicializarPagina();
  configurarEventos();
});

function inicializarPagina() {
  console.log("Página Criar Perfil do Filho inicializada");
  configurarRodape();
  configurarUploadFoto();
  configurarValidacao();
}

function configurarEventos() {
  // Configurar tecla ESC para voltar
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
      confirmarSaida();
    }
  });
  
  // Configurar formulário
  const form = document.getElementById("formCriarPerfilFilho");
  if (form) {
    form.addEventListener("submit", handleSubmitForm);
  }
  
  // Configurar validação em tempo real
  const inputs = document.querySelectorAll("input, select");
  inputs.forEach(input => {
    input.addEventListener("blur", validarCampo);
    input.addEventListener("input", limparErro);
  });
}

// ===== FUNÇÕES DE UPLOAD DE FOTO ===== //

function configurarUploadFoto() {
  const photoInput = document.getElementById("photoInput");
  const photoPreview = document.getElementById("photoPreview");
  
  if (photoInput) {
    photoInput.addEventListener("change", handlePhotoUpload);
  }
  
  if (photoPreview) {
    photoPreview.addEventListener("click", function() {
      photoInput.click();
    });
  }
}

function handlePhotoUpload(event) {
  const file = event.target.files[0];
  
  if (!file) return;
  
  // Validar tipo de arquivo
  if (!file.type.startsWith("image/")) {
    mostrarNotificacao("Por favor, selecione apenas arquivos de imagem.", "error");
    return;
  }
  
  // Validar tamanho (máximo 5MB)
  if (file.size > 5 * 1024 * 1024) {
    mostrarNotificacao("A imagem deve ter no máximo 5MB.", "error");
    return;
  }
  
  photoFile = file;
  
  // Mostrar preview
  const reader = new FileReader();
  reader.onload = function(e) {
    const photoPreview = document.getElementById("photoPreview");
    photoPreview.innerHTML = `<img src="${e.target.result}" alt="Preview da foto">`;
    
    // Adicionar botão para remover foto
    const removeBtn = document.createElement("div");
    removeBtn.className = "remove-photo-btn";
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.onclick = removerFoto;
    photoPreview.appendChild(removeBtn);
  };
  
  reader.readAsDataURL(file);
  mostrarNotificacao("Foto carregada com sucesso!", "success");
}

function removerFoto() {
  photoFile = null;
  const photoPreview = document.getElementById("photoPreview");
  photoPreview.innerHTML = `
    <div class="photo-placeholder">
      <i class="fas fa-user-plus"></i>
      <span>Adicionar Foto</span>
    </div>
  `;
  
  const photoInput = document.getElementById("photoInput");
  photoInput.value = "";
  
  mostrarNotificacao("Foto removida.", "info");
}

// ===== FUNÇÕES DE VALIDAÇÃO ===== //

function configurarValidacao() {
  // Configurar máscara para data
  const dataInput = document.getElementById("dataNascimento");
  if (dataInput) {
    // Definir data máxima como hoje
    const hoje = new Date().toISOString().split('T')[0];
    dataInput.max = hoje;
    
    // Definir data mínima como 18 anos atrás
    const dataMinima = new Date();
    dataMinima.setFullYear(dataMinima.getFullYear() - 18);
    dataInput.min = dataMinima.toISOString().split('T')[0];
  }
}

function validarCampo(event) {
  const campo = event.target;
  const grupo = campo.closest(".form-group");
  
  if (!grupo) return;
  
  let isValid = true;
  let mensagem = "";
  
  // Validações específicas por campo
  switch (campo.id) {
    case "nomeCompleto":
      isValid = validarNomeCompleto(campo.value);
      mensagem = "Nome deve ter pelo menos 2 palavras";
      break;
      
    case "dataNascimento":
      isValid = validarDataNascimento(campo.value);
      mensagem = "Data de nascimento inválida";
      break;
      
    case "cidadeNascimento":
      isValid = validarCidade(campo.value);
      mensagem = "Cidade deve ter pelo menos 2 caracteres";
      break;
      
    case "estadoNascimento":
      isValid = campo.value !== "";
      mensagem = "Selecione um estado";
      break;
      
    default:
      // Campos opcionais como CPF e Certidão não precisam de validação no 'blur'
      // a menos que queiramos validar o formato se algo for digitado.
      // Por enquanto, vamos manter simples.
      if (campo.required) {
          isValid = campo.value.trim() !== "";
          mensagem = "Campo obrigatório";
      }
  }
  
  // Aplicar classes visuais
  grupo.classList.remove("valid", "invalid");
  
  if (campo.value.trim() === "" && campo.required) {
    // Campo obrigatório vazio - remover validação visual
    return;
  }
  
  if (campo.required) {
      if (isValid) {
        grupo.classList.add("valid");
      } else {
        grupo.classList.add("invalid");
        mostrarErroTemporario(mensagem);
      }
  }
  
  verificarFormularioCompleto();
}

function validarNomeCompleto(nome) {
  const palavras = nome.trim().split(/\s+/);
  return palavras.length >= 2 && palavras.every(palavra => palavra.length >= 2);
}

function validarDataNascimento(data) {
  if (!data) return false;
  
  const dataNascimento = new Date(data);
  const hoje = new Date();
  const idade = hoje.getFullYear() - dataNascimento.getFullYear();
  
  // Verificar se a data não é futura e se a criança tem menos de 18 anos
  return dataNascimento <= hoje && idade <= 18;
}

function validarCidade(cidade) {
  return cidade.trim().length >= 2;
}

function limparErro(event) {
  const campo = event.target;
  const grupo = campo.closest(".form-group");
  
  if (grupo && campo.value.trim() === "") {
    grupo.classList.remove("valid", "invalid");
  }
}

function verificarFormularioCompleto() {
  const camposObrigatorios = [
    document.getElementById("nomeCompleto"),
    document.getElementById("dataNascimento"),
    document.getElementById("cidadeNascimento"),
    document.getElementById("estadoNascimento")
  ];
  
  const todosPreenchidos = camposObrigatorios.every(campo => campo.value.trim() !== "");
  const todosValidos = camposObrigatorios.every(campo => {
    const grupo = campo.closest(".form-group");
    return !grupo.classList.contains("invalid");
  });
  
  isFormValid = todosPreenchidos && todosValidos;
  
  // Atualizar botão de submit
  const submitBtn = document.querySelector(".btn-primary");
  if (submitBtn) {
    submitBtn.disabled = !isFormValid;
    submitBtn.style.opacity = isFormValid ? "1" : "0.6";
  }
}

// ===== FUNÇÕES DE SUBMISSÃO ===== //

function handleSubmitForm(event) {
  event.preventDefault();
  
  if (!isFormValid) {
    mostrarNotificacao("Por favor, preencha todos os campos obrigatórios corretamente.", "error");
    return;
  }
  
  // Coletar dados do formulário
  const dadosPerfil = coletarDadosFormulario();
  
  // Mostrar loading
  mostrarLoading(true);
  
  // Simular salvamento (substituir por chamada real à API)
  setTimeout(() => {
    salvarPerfilFilho(dadosPerfil);
  }, 2000);
}

function coletarDadosFormulario() {
  return {
    nomeCompleto: document.getElementById("nomeCompleto").value.trim(),
    dataNascimento: document.getElementById("dataNascimento").value,
    cpf: document.getElementById("cpf").value.trim(), // ✅ CAMPO NOVO ADICIONADO
    certidaoNascimento: document.getElementById("certidaoNascimento").value.trim(), // ✅ CAMPO NOVO ADICIONADO
    cidadeNascimento: document.getElementById("cidadeNascimento").value.trim(),
    estadoNascimento: document.getElementById("estadoNascimento").value,
    foto: photoFile,
    criadoEm: new Date().toISOString()
  };
}

async function salvarPerfilFilho(dados) {
  try {
    let profilePictureUrl = null;
    
    // 1. Upload da foto para o Cloudinary (se houver)
    if (dados.foto) {
      try {
        mostrarNotificacao("Fazendo upload da foto...", "info");
        profilePictureUrl = await uploadImageToCloudinary(dados.foto, 'jupti/children');
        console.log("✅ Foto enviada com sucesso:", profilePictureUrl);
      } catch (uploadError) {
        console.error("❌ Erro ao fazer upload da foto:", uploadError);
        mostrarLoading(false);
        mostrarNotificacao("Erro ao fazer upload da foto. Tente novamente.", "error");
        return;
      }
    }
    
    // 2. Preparar dados para enviar à API
    const childData = {
      nomeCompleto: dados.nomeCompleto,
      dataNascimento: dados.dataNascimento,
      cidadeNascimento: dados.cidadeNascimento,
      estadoNascimento: dados.estadoNascimento,
      profilePictureUrl: profilePictureUrl,
      cpf: dados.cpf || null,
      certidaoNascimento: dados.certidaoNascimento || null
    };
    
    console.log("📤 Enviando dados para API:", childData);
    
    // 3. Enviar para a API
    const response = await createChildProfile(childData);
    
    if (response.success) {
      console.log("✅ Perfil criado com sucesso:", response.child);
      mostrarLoading(false);
      mostrarNotificacao(`Perfil de ${response.child.full_name} criado com sucesso!`, "success");
      
      // Redirecionar após sucesso para a tela de seleção de perfis
      setTimeout(() => {
        window.location.href = "selecao_perfis.html";
      }, 1500);
    } else {
      throw new Error(response.message || "Erro desconhecido ao criar perfil");
    }
    
  } catch (error) {
    console.error("❌ Erro ao salvar perfil:", error);
    mostrarLoading(false);
    
    // Tratamento de erros específicos
    if (error.message.includes('CPF') || error.message.includes('Certidão')) {
      mostrarNotificacao("CPF ou Certidão de Nascimento já cadastrados.", "error");
    } else if (error.message.includes('Token') || error.message.includes('autenticação')) {
      mostrarNotificacao("Sessão expirada. Faça login novamente.", "error");
      setTimeout(() => {
        window.location.href = "index.html";
      }, 2000);
    } else {
      mostrarNotificacao(error.message || "Erro ao criar perfil. Tente novamente.", "error");
    }
  }
}

// ===== FUNÇÕES DE UI ===== //

function mostrarLoading(mostrar) {
  const submitBtn = document.querySelector(".btn-primary");
  const form = document.getElementById("formCriarPerfilFilho");
  
  if (mostrar) {
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando Perfil...';
    submitBtn.disabled = true;
    form.style.opacity = "0.7";
  } else {
    submitBtn.innerHTML = '<i class="fas fa-check"></i> Criar Perfil';
    submitBtn.disabled = !isFormValid;
    form.style.opacity = "1";
  }
}

function mostrarErroTemporario(mensagem) {
  const errorDiv = document.getElementById("errorMessage");
  const errorText = document.getElementById("errorText");
  
  if (errorDiv && errorText) {
    errorText.textContent = mensagem;
    errorDiv.style.display = "flex";
    
    setTimeout(() => {
      errorDiv.style.display = "none";
    }, 3000);
  }
}

function confirmarSaida() {
  const temDados = document.querySelector("input[value!=''], select[value!='']");
  
  if (temDados) {
    if (confirm("Você tem alterações não salvas. Deseja realmente sair?")) {
      history.back();
    }
  } else {
    history.back();
  }
}

// ===== FUNÇÕES DE NAVEGAÇÃO ===== //

function configurarRodape() {
  // Configurar navegação do rodapé
  const navItems = document.querySelectorAll(".glb-nav-item");
  
  navItems.forEach(item => {
    item.addEventListener("click", function() {
      const page = this.getAttribute("data-page");
      
      // Verificar se há dados não salvos
      const temDados = document.querySelector("input[value!=''], select[value!='']");
      
      if (temDados && page !== "family") {
        if (!confirm("Você tem alterações não salvas. Deseja realmente sair?")) {
          return;
        }
      }
      
      // Navegar para a página correspondente
      switch(page) {
        case "home":
          window.location.href = "feed.html";
          break;
        case "family":
          window.location.href = "selecao_perfis.html";
          break;
        case "legal":
          window.location.href = "linha_juridica.html";
          break;
        case "messages":
          window.location.href = "mensagens.html";
          break;
        case "support":
          window.location.href = "rede_apoio.html";
          break;
      }
    });
  });
}

// ===== FUNÇÕES DE NOTIFICAÇÃO ===== //

function mostrarNotificacao(mensagem, tipo = "info") {
  // Remover notificação existente
  const notificacaoExistente = document.querySelector(".notificacao-toast");
  if (notificacaoExistente) {
    notificacaoExistente.remove();
  }
  
  // Criar nova notificação
  const toast = document.createElement("div");
  toast.className = `notificacao-toast ${tipo}`;
  toast.innerHTML = `
    <div class="toast-content">
      <i class="fas ${getNotificationIcon(tipo)}"></i>
      <span>${mensagem}</span>
    </div>
  `;
  
  // Adicionar estilos
  toast.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: ${getNotificationColor(tipo)};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 3000;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    font-weight: 500;
    max-width: 300px;
    animation: slideInRight 0.3s ease-out;
  `;
  
  // Adicionar ao DOM
  document.body.appendChild(toast);
  
  // Remover após 3 segundos
  setTimeout(() => {
    toast.style.animation = "slideOutRight 0.3s ease-out";
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }, 3000);
}

function getNotificationIcon(tipo) {
  const icons = {
    "success": "fa-check-circle",
    "error": "fa-exclamation-circle",
    "warning": "fa-exclamation-triangle",
    "info": "fa-info-circle"
  };
  return icons[tipo] || icons.info;
}

function getNotificationColor(tipo) {
  const colors = {
    "success": "#28a745",
    "error": "#dc3545",
    "warning": "#ffc107",
    "info": "#0f4c5c"
  };
  return colors[tipo] || colors.info;
}

// ===== ANIMAÇÕES CSS ADICIONAIS (para o toast) ===== //

// Adicionar estilos de animação ao head
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideOutRight {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100%);
    }
  }
  
  .toast-content {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .remove-photo-btn {
    position: absolute;
    top: -5px;
    right: -5px;
    width: 25px;
    height: 25px;
    background: #dc3545;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
  }
  
  .remove-photo-btn:hover {
    background: #c82333;
    transform: scale(1.1);
  }
`;

document.head.appendChild(styleSheet);

// ===== TRATAMENTO DE ERROS ===== //

window.addEventListener("error", function(e) {
  console.error("Erro na página criar perfil do filho:", e.error);
  mostrarNotificacao("Ocorreu um erro inesperado", "error");
});

// ===== LOG DE INICIALIZAÇÃO ===== //

console.log("Script Criar Perfil do Filho carregado com sucesso");
