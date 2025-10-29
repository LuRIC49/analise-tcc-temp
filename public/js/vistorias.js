document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores DOM Principais ---
    const vistoriasListDiv = document.getElementById('vistorias-list');
    const btnIniciarVistoria = document.getElementById('btnIniciarVistoria');
    const vistoriasTitle = document.getElementById('vistorias-title');
    const filtroVistorias = document.getElementById('filtro-vistorias');

    // --- Seletores DOM - Modal Iniciar Vistoria ---
    const promptModal = document.getElementById('promptModal');
    const promptInput = document.getElementById('promptInput');
    const promptConfirmBtn = document.getElementById('promptConfirmBtn');
    const promptCancelBtn = promptModal?.querySelector('.btn-cancel');
    const promptCloseBtn = promptModal?.querySelector('.modal-close-btn');

    // --- Seletores DOM - Modal Excluir Vistoria ---
    const confirmExcluirVistoriaModal = document.getElementById('confirmExcluirVistoriaModal');
    const confirmExcluirVistoriaCancelBtn = document.getElementById('confirmExcluirVistoriaCancelBtn');
    const confirmExcluirVistoriaConfirmBtn = document.getElementById('confirmExcluirVistoriaConfirmBtn');
    const confirmExcluirVistoriaCloseBtn = document.getElementById('confirmExcluirVistoriaCloseBtn');

    // --- Variáveis de Estado ---
    const token = localStorage.getItem('authToken');
    const urlParams = new URLSearchParams(window.location.search);
    const filialCnpj = urlParams.get('cnpj');
    let todasAsVistorias = [];
    let vistoriaParaExcluirId = null;

    // --- Verificações Iniciais ---
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    if (!filialCnpj) {
        document.querySelector('main').innerHTML = '<h1>Erro: CNPJ da filial não fornecido na URL.</h1>';
        return;
    }

    // --- Funções Principais (Dados e Renderização) ---

    // Define o título da página com o nome da filial.
    async function setPageTitle() {
        try {
            const response = await fetch(`/api/filiais/${filialCnpj}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) return;
            const filial = await response.json();
            if (vistoriasTitle) vistoriasTitle.textContent = `Vistorias da Filial: ${filial.nome}`;
            document.title = `Vistorias: ${filial.nome}`;
        } catch (error) {
            console.error("Erro ao buscar nome da filial:", error);
        }
    }

    // Busca as vistorias da API.
    async function carregarVistorias() {
        if (!vistoriasListDiv) return;
        vistoriasListDiv.innerHTML = '<p>Carregando vistorias...</p>';
        try {
            const response = await fetch(`/api/vistorias/filial/${filialCnpj}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Falha ao carregar vistorias.');
            todasAsVistorias = await response.json();
            aplicarFiltro();
        } catch (error) {
            vistoriasListDiv.innerHTML = `<p>${error.message}</p>`;
        }
    }

    // Filtra e ordena as vistorias conforme seleção.
    function aplicarFiltro() {
        if (!filtroVistorias) return;
        const filtroSelecionado = filtroVistorias.value;
        let vistoriasFiltradas = [...todasAsVistorias];

        switch (filtroSelecionado) {
            case 'recentes': vistoriasFiltradas.sort((a, b) => new Date(b.data_inicio) - new Date(a.data_inicio)); break;
            case 'antigas': vistoriasFiltradas.sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio)); break;
            case 'finalizadas': vistoriasFiltradas = vistoriasFiltradas.filter(v => v.data_fim !== null); break;
            case 'andamento': vistoriasFiltradas = vistoriasFiltradas.filter(v => v.data_fim === null); break;
        }
        renderizarVistorias(vistoriasFiltradas);
    }

    // Exibe a lista de vistorias na tela.
    function renderizarVistorias(vistoriasParaRenderizar) {
        if (!vistoriasListDiv) return;
        vistoriasListDiv.innerHTML = '';
        if (vistoriasParaRenderizar.length === 0) {
            vistoriasListDiv.innerHTML = '<p>Nenhuma vistoria encontrada para este filtro.</p>';
        } else {
            vistoriasParaRenderizar.forEach(vistoria => {
                const vistoriaCard = createVistoriaCard(vistoria);
                vistoriasListDiv.appendChild(vistoriaCard);
            });
        }
    }

    // Cria o HTML para um card de vistoria.
    function createVistoriaCard(vistoria) {
        const dataInicio = new Date(vistoria.data_inicio).toLocaleDateString();
        const isAberta = vistoria.data_fim === null;
        const status = isAberta
            ? 'Em andamento'
            : `Finalizada em ${new Date(vistoria.data_fim).toLocaleDateString()}`;

        const deleteButtonHtml = isAberta ? `
            <button type="button" class="btn-danger btn-excluir-vistoria"
                    data-id="${vistoria.codigo}"
                    style="width: 100%; box-sizing: border-box; text-align: center;">
                Excluir Vistoria
            </button>
        ` : '';

        const card = document.createElement('div');
        card.className = 'vistoria-card';
        card.innerHTML = `
            <div class="vistoria-card-header">
                <h4>Vistoria #${vistoria.codigo}</h4>
            </div>
            <div class="vistoria-card-body">
                <p><strong>Data de Início:</strong> ${dataInicio}</p>
                <p><strong>Status:</strong> ${status}</p>
                <p><strong>Técnico:</strong> ${vistoria.tecnico_responsavel}</p>
            </div>
            <div class="vistoria-card-footer"
                 style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                <a href="vistoria-detalhe.html?id=${vistoria.codigo}"
                   class="btn-access-info"
                   style="width: 100%; box-sizing: border-box; text-align: center;">
                   Acessar Vistoria
                </a>
                ${deleteButtonHtml}
            </div>
        `;
        return card;
    }

    // --- Funções de Manipulação de Modais ---

    // Abre um modal genérico.
    function openModal(modalElement) {
        if (modalElement) modalElement.style.display = 'flex';
    }

    // Fecha um modal genérico e reseta estados específicos.
    function closeModal(modalElement) {
        if (modalElement) modalElement.style.display = 'none';

        if (modalElement === promptModal) {
            if (promptInput) promptInput.value = '';
            if (promptConfirmBtn) {
                promptConfirmBtn.disabled = true;
                promptConfirmBtn.textContent = 'Confirmar';
            }
        }

        if (modalElement === confirmExcluirVistoriaModal) {
            vistoriaParaExcluirId = null;
            if (confirmExcluirVistoriaConfirmBtn) {
                confirmExcluirVistoriaConfirmBtn.disabled = false;
                confirmExcluirVistoriaConfirmBtn.textContent = 'Confirmar Exclusão';
                confirmExcluirVistoriaConfirmBtn.classList.add('btn-save');
            }
        }
    }

    // Abre modal específico para excluir vistoria.
    function openConfirmExcluirVistoriaModal(id) {
        vistoriaParaExcluirId = id;
        if (confirmExcluirVistoriaConfirmBtn) {
             confirmExcluirVistoriaConfirmBtn.classList.add('btn-save');
        }
        openModal(confirmExcluirVistoriaModal);
    }

    // --- Lógica das Ações ---

    // Envia requisição para iniciar nova vistoria.
    async function handleIniciarVistoria() {
        if (!promptInput || !promptConfirmBtn) return;
        const tecnicoResponsavel = promptInput.value.trim();
        if (!tecnicoResponsavel) {
            alert('O nome do técnico é obrigatório.');
            promptInput.focus();
            return;
        }

        promptConfirmBtn.disabled = true;
        promptConfirmBtn.textContent = 'Criando...';

        try {
            const response = await fetch(`/api/vistorias/filial/${filialCnpj}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ tecnico_responsavel: tecnicoResponsavel })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Erro desconhecido.');

            closeModal(promptModal);
            window.location.href = `vistoria-detalhe.html?id=${result.vistoriaId}`;
        } catch (error) {
            alert(`Erro ao iniciar vistoria: ${error.message}`);
            closeModal(promptModal);
        }
    }

    // Envia requisição para excluir vistoria.
    async function handleExcluirVistoria() {
        if (!vistoriaParaExcluirId || !confirmExcluirVistoriaConfirmBtn) return;

        confirmExcluirVistoriaConfirmBtn.disabled = true;
        confirmExcluirVistoriaConfirmBtn.textContent = 'Excluindo...';

        try {
            const response = await fetch(`/api/vistorias/${vistoriaParaExcluirId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || `Erro ${response.status}`);
            }
            closeModal(confirmExcluirVistoriaModal);
            carregarVistorias();
        } catch (error) {
            alert(`Erro ao excluir vistoria: ${error.message}`);
            closeModal(confirmExcluirVistoriaModal);
        }
    }

    // --- Anexação de Event Listeners ---
    function initializeEventListeners() {
        // Filtro
        filtroVistorias?.addEventListener('change', aplicarFiltro);

        // Botão Iniciar Vistoria (Abre Modal)
        btnIniciarVistoria?.addEventListener('click', (event) => {
            event.preventDefault();
            openModal(promptModal);
        });

        // Modal Iniciar Vistoria
        promptInput?.addEventListener('input', () => {
            if (promptConfirmBtn) promptConfirmBtn.disabled = promptInput.value.trim() === '';
        });
        promptConfirmBtn?.addEventListener('click', handleIniciarVistoria);
        promptCancelBtn?.addEventListener('click', () => closeModal(promptModal));
        promptCloseBtn?.addEventListener('click', () => closeModal(promptModal));

        // Modal Excluir Vistoria
        confirmExcluirVistoriaConfirmBtn?.addEventListener('click', handleExcluirVistoria);
        confirmExcluirVistoriaCancelBtn?.addEventListener('click', () => closeModal(confirmExcluirVistoriaModal));
        confirmExcluirVistoriaCloseBtn?.addEventListener('click', () => closeModal(confirmExcluirVistoriaModal));

        // Delegação para Botões Excluir nos Cards
        vistoriasListDiv?.addEventListener('click', (event) => {
            if (event.target.classList.contains('btn-excluir-vistoria')) {
                event.preventDefault();
                const vistoriaId = event.target.getAttribute('data-id');
                if (vistoriaId) {
                    openConfirmExcluirVistoriaModal(vistoriaId);
                }
            }
        });

        // Fechar Modais ao Clicar Fora
        window.addEventListener('click', (event) => {
            if (event.target === promptModal) closeModal(promptModal);
            if (event.target === confirmExcluirVistoriaModal) closeModal(confirmExcluirVistoriaModal);
        });
    }

    // --- Inicialização da Página ---
    setPageTitle();
    carregarVistorias();
    initializeEventListeners();
});