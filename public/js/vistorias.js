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

    // --- ELEMENTOS DO DOM ---
    const vistoriasListDiv = document.getElementById('vistorias-list');
    const btnIniciarVistoria = document.getElementById('btnIniciarVistoria');
    const vistoriasTitle = document.getElementById('vistorias-title');
    const filtroVistorias = document.getElementById('filtro-vistorias');

    // --- ESTADO DA APLICAÇÃO ---
    let todasAsVistorias = []; // Armazena a lista completa de vistorias

    // --- FUNÇÕES ---
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
            const response = await fetch(`/api/filiais/${filialCnpj}/vistorias`, { headers: { 'Authorization': `Bearer ${token}` } });
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
            case 'recentes':
                vistoriasFiltradas.sort((a, b) => new Date(b.data_inicio) - new Date(a.data_inicio));
                break;
            case 'antigas':
                vistoriasFiltradas.sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio));
                break;
            case 'finalizadas':
                vistoriasFiltradas = vistoriasFiltradas.filter(v => v.data_fim !== null);
                break;
            case 'andamento':
                vistoriasFiltradas = vistoriasFiltradas.filter(v => v.data_fim === null);
                break;
        }
        renderizarVistorias(vistoriasFiltradas);
    }

    // --- EVENT LISTENERS ---
    btnIniciarVistoria.addEventListener('click', async (event) => {
        event.preventDefault();
        
        const tecnicoResponsavel = prompt("Por favor, digite o nome do técnico responsável pela vistoria:");
        if (!tecnicoResponsavel || tecnicoResponsavel.trim() === '') {
            alert('O nome do técnico é obrigatório para iniciar a vistoria.');
            return;
        }

        try {
            const response = await fetch(`/api/filiais/${filialCnpj}/vistorias`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ tecnico_responsavel: tecnicoResponsavel })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            alert(result.message);
            window.location.href = `vistoria-detalhe.html?id=${result.vistoriaId}`;

        } catch (error) {
            alert(`Erro ao iniciar vistoria: ${error.message}`);
        }
    });

    filtroVistorias.addEventListener('change', aplicarFiltro);

    // --- INICIALIZAÇÃO ---
    setPageTitle();
    carregarVistorias();
});