document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const filialCnpj = urlParams.get('cnpj');

    if (!filialCnpj) {
        document.querySelector('main').innerHTML = '<h1>Erro: CNPJ da filial não fornecido na URL.</h1>';
        return;
    }

    const vistoriasListDiv = document.getElementById('vistorias-list');
    const btnIniciarVistoria = document.getElementById('btnIniciarVistoria');
    const vistoriasTitle = document.getElementById('vistorias-title');
    const filtroVistorias = document.getElementById('filtro-vistorias');

    const promptModal = document.getElementById('promptModal');
    const promptInput = document.getElementById('promptInput');
    const promptConfirmBtn = document.getElementById('promptConfirmBtn');
    const promptCancelBtn = promptModal.querySelector('.btn-cancel');
    const promptCloseBtn = promptModal.querySelector('.modal-close-btn');

    let todasAsVistorias = [];

    async function setPageTitle() {
         try {
            const response = await fetch(`/api/filiais/${filialCnpj}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) return;
            const filial = await response.json();
            vistoriasTitle.textContent = `Vistorias da Filial: ${filial.nome}`;
            document.title = `Vistorias: ${filial.nome}`;
        } catch (error) {
            console.error("Erro ao buscar nome da filial:", error);
        }
    }

    function renderizarVistorias(vistoriasParaRenderizar) {
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

    async function carregarVistorias() {
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

    function createVistoriaCard(vistoria) {
        const dataInicio = new Date(vistoria.data_inicio).toLocaleDateString();
        const status = vistoria.data_fim 
            ? `Finalizada em ${new Date(vistoria.data_fim).toLocaleDateString()}` 
            : 'Em andamento';
        
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
            <div class="vistoria-card-footer">
                <a href="vistoria-detalhe.html?id=${vistoria.codigo}" class="btn-access-info">Acessar Vistoria</a>
            </div>
        `;
        return card;
    }
    
    function aplicarFiltro() {
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

    function openPromptModal() {
        promptInput.value = ''; 
        promptConfirmBtn.disabled = true; 
        promptModal.style.display = 'flex';
        promptInput.focus(); 
    }

    function closePromptModal() {
        promptModal.style.display = 'none';
    }

    promptInput.addEventListener('input', () => {
        promptConfirmBtn.disabled = promptInput.value.trim() === ''; 
    });

    promptConfirmBtn.addEventListener('click', async () => {
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
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ tecnico_responsavel: tecnicoResponsavel })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Erro desconhecido ao criar vistoria.');

            closePromptModal();
            window.location.href = `vistoria-detalhe.html?id=${result.vistoriaId}`;

        } catch (error) {
            alert(`Erro ao iniciar vistoria: ${error.message}`);
            promptConfirmBtn.disabled = false; 
            promptConfirmBtn.textContent = 'Confirmar';
        }
    });

    promptCancelBtn.addEventListener('click', closePromptModal);
    promptCloseBtn.addEventListener('click', closePromptModal);
    
    window.addEventListener('click', (event) => {
        if (event.target === promptModal) {
            closePromptModal();
        }
    });

    btnIniciarVistoria.addEventListener('click', (event) => {
        event.preventDefault();
        openPromptModal(); 
    });

    filtroVistorias.addEventListener('change', aplicarFiltro);

    setPageTitle();
    carregarVistorias();
});