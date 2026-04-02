
    
    // --- Lógica para os botões de ação ---
    document.getElementById("legalTimelineBtn").addEventListener("click", function() {
      navegarPara("linha_tempo_juridica_view.html");
    });
    
    document.getElementById("generateReportBtn").addEventListener("click", function() {
      navegarPara("relatorios_gerados.html");
    });
    
    document.getElementById("forwardToLegalBtn").addEventListener("click", function() {
      navegarPara("relatorio_em_analise.html");
    });
    
    document.getElementById("readyForActionBtn").addEventListener("click", function() {
      navegarPara("caso_pronto_para_acao.html");
    });
    
    // --- Lógica para justificar compromissos não cumpridos ---
    document.querySelectorAll(".commitment-item").forEach(item => {
      const status = item.querySelector(".commitment-status");
      if (status && status.classList.contains("status-failed")) {
        item.addEventListener("click", function() {
          alert("Aqui o pai poderá justificar o compromisso não cumprido.");
          // Futuramente, aqui será implementada a lógica para justificar o compromisso
        });
        item.style.cursor = "pointer";
      }
    });