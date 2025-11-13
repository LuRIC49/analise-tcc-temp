document.addEventListener('DOMContentLoaded', () => {

    const vistoriasListDiv = document.getElementById('vistorias-list');
    const btnIniciarVistoria = document.getElementById('btnIniciarVistoria');
    const vistoriasTitle = document.getElementById('vistorias-title');
    const filtroVistorias = document.getElementById('filtro-vistorias');
    const btnVoltar = document.getElementById('btnVoltar');

    //Modal Start vistoria
    const promptModal = document.getElementById('promptModal');
    const promptInput = document.getElementById('promptInput');
    const promptConfirmBtn = document.getElementById('promptConfirmBtn');
    const promptCancelBtn = promptModal?.querySelector('.btn-cancel');
    const promptCloseBtn = promptModal?.querySelector('.modal-close-btn');

    //Modal Delet Vistoria ---
    const confirmExcluirVistoriaModal = document.getElementById('confirmExcluirVistoriaModal');
    const confirmExcluirVistoriaCancelBtn = document.getElementById('confirmExcluirVistoriaCancelBtn');
    const confirmExcluirVistoriaConfirmBtn = document.getElementById('confirmExcluirVistoriaConfirmBtn');
    const confirmExcluirVistoriaCloseBtn = document.getElementById('confirmExcluirVistoriaCloseBtn');

    const token = localStorage.getItem('authToken');
    const urlParams = new URLSearchParams(window.location.search);
    const filialCnpj = urlParams.get('cnpj');
    let todasAsVistorias = [];
    let vistoriaParaExcluirId = null;

    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    if (!filialCnpj) {
        document.querySelector('main').innerHTML = '<h1>Erro: CNPJ da filial não fornecido na URL.</h1>';
        return;
    }
    if (btnVoltar) {
        btnVoltar.href = `filial-inventario.html?cnpj=${filialCnpj}`;
    }


    // Define o título da página com o nome da filial.
    async function setPageTitle() {
        try {
            const response = await fetch(`/api/filiais/${filialCnpj}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) return;
            const filial = await response.json();
            if (vistoriasTitle) vistoriasTitle.textContent = `Vistorias da Filial: ${filial.nome}`;
            document.title = `Vistorias: ${filial.nome}`;
        } catch (error) {
            console.error(error);
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

    function createVistoriaCard(vistoria) {
        const dataInicio = new Date(vistoria.data_inicio).toLocaleDateString();
        const isAberta = vistoria.data_fim === null;
        const status = isAberta
            ? 'Em andamento'
            : `Finalizada em ${new Date(vistoria.data_fim).toLocaleDateString()}`;

        const deleteButtonHtml = isAberta ? `
            <button type="button" class="btn-access-info btn-danger btn-excluir-vistoria"
                    data-id="${vistoria.codigo}"
                    style="width: 100%; box-sizing: border-box; text-align: center; cursor: pointer;">
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



    function openModal(modalElement) {
        if (modalElement) modalElement.style.display = 'flex';
    }

    function closeModal(modalElement) {
        if (modalElement) modalElement.style.display = 'none';

        if (modalElement === promptModal) {
            if (promptInput) {
                promptInput.value = '';
                clearError(promptInput);
            }
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

    function openConfirmExcluirVistoriaModal(id) {
        vistoriaParaExcluirId = id;
        if (confirmExcluirVistoriaConfirmBtn) {
             confirmExcluirVistoriaConfirmBtn.classList.add('btn-save');
        }
        openModal(confirmExcluirVistoriaModal);
    }


    async function handleIniciarVistoria() {
        if (!promptInput || !promptConfirmBtn) return;


        const isTecnicoValid = validateRequired(promptInput, 'Nome do técnico responsável');
        if (!isTecnicoValid) {
            promptInput.focus();
            return;
        }

        
        const tecnicoResponsavel = promptInput.value.trim();

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
            Notifier.showError(result.message);
            closeModal(promptModal);
        }
    }

    //Requisição delet vistoria.
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
            Notifier.showSuccess(result.message);
            closeModal(confirmExcluirVistoriaModal);
            carregarVistorias();
        } catch (error) {
            Notifier.showError(result.message);
            closeModal(confirmExcluirVistoriaModal);
        }
    }


    function initializeEventListeners() {
        filtroVistorias?.addEventListener('change', aplicarFiltro);

        //Abre Modal
        btnIniciarVistoria?.addEventListener('click', (event) => {
            event.preventDefault();
            openModal(promptModal);
        });

        promptInput?.addEventListener('input', () => {
            if (promptConfirmBtn) promptConfirmBtn.disabled = promptInput.value.trim() === '';
            
            // Valida em tempo real enquanto digita
            if (promptInput.value.trim() === '') {
                validateRequired(promptInput, 'Nome do técnico responsável');
            } else {
                clearError(promptInput);
            }
        });
        promptInput?.addEventListener('blur', () => {
            validateRequired(promptInput, 'Nome do técnico responsável');
        });

        promptConfirmBtn?.addEventListener('click', handleIniciarVistoria);
        promptCancelBtn?.addEventListener('click', () => closeModal(promptModal));
        promptCloseBtn?.addEventListener('click', () => closeModal(promptModal));

        //Modal Excluir Vistoria
        confirmExcluirVistoriaConfirmBtn?.addEventListener('click', handleExcluirVistoria);
        confirmExcluirVistoriaCancelBtn?.addEventListener('click', () => closeModal(confirmExcluirVistoriaModal));
        confirmExcluirVistoriaCloseBtn?.addEventListener('click', () => closeModal(confirmExcluirVistoriaModal));


        vistoriasListDiv?.addEventListener('click', (event) => {
            if (event.target.classList.contains('btn-excluir-vistoria')) {
                event.preventDefault();
                const vistoriaId = event.target.getAttribute('data-id');
                if (vistoriaId) {
                    openConfirmExcluirVistoriaModal(vistoriaId);
                }
            }
        });

        window.addEventListener('click', (event) => {
            if (event.target === promptModal) closeModal(promptModal);
            if (event.target === confirmExcluirVistoriaModal) closeModal(confirmExcluirVistoriaModal);
        });
    }


    setPageTitle();
    carregarVistorias();
    initializeEventListeners();
});






function displayError(inputElement, message) {
    const errorDiv = inputElement.parentElement.querySelector('.field-error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
    inputElement.classList.add('invalid');
}

function clearError(inputElement) {
    const errorDiv = inputElement.parentElement.querySelector('.field-error-message');
    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
    }
    inputElement.classList.remove('invalid');
}

function validateRequired(inputElement, fieldName) {
    if (!inputElement || inputElement.value.trim() === '') {
        displayError(inputElement, `${fieldName} é obrigatório.`);
        return false;
    }
    clearError(inputElement);
    return true;
}