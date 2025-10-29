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
    const filialNameInfo = document.getElementById('filial-name-info');
    const filialCnpjInfo = document.getElementById('filial-cnpj-info');
    const filialAddressInfo = document.getElementById('filial-address-info');
    const filialEmailInfo = document.getElementById('filial-email-info');
    const insumosGridDiv = document.getElementById('insumos-gerais-grid');
    const btnVerVistorias = document.getElementById('btnVerVistorias');
    const btnAdicionarInsumoDireto = document.getElementById('btnAdicionarInsumoDireto');

    const btnGerarRelatorio = document.getElementById('btnGerarRelatorio');
    // Elementos dos Modais
    const selectionModal = document.getElementById('selectionModal');
    const detailsModal = document.getElementById('detailsModal');
    const detailsForm = document.getElementById('detailsModalForm');
    const selectionGrid = selectionModal ? selectionModal.querySelector('.selection-grid') : null;
    const detailsFormContainer = detailsModal ? detailsModal.querySelector('#formInputsContainer') : null;
    
    // --- NAVEGAÇÃO ---
    if (btnVerVistorias) {
        btnVerVistorias.addEventListener('click', (event) => {
            event.preventDefault();
            window.location.href = `vistorias.html?cnpj=${filialCnpj}`;
        });
    }





    if (btnGerarRelatorio) {
        btnGerarRelatorio.addEventListener('click', async () => {
            if (!filialCnpj) {
                alert('CNPJ da filial não encontrado. Não é possível gerar o relatório.');
                return;
            }

            const originalButtonText = btnGerarRelatorio.textContent;
            btnGerarRelatorio.disabled = true;
            btnGerarRelatorio.textContent = 'Gerando...';

            try {
                const response = await fetch(`/api/filiais/${filialCnpj}/report`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    // Tenta ler a mensagem de erro do backend se for JSON
                    let errorMsg = `Erro ${response.status}: ${response.statusText}`;
                    try {
                         const errorResult = await response.json();
                         errorMsg = errorResult.message || errorMsg;
                    } catch(e) { /* Ignora se não for JSON */ }
                    throw new Error(errorMsg);
                }

                // Recebe o PDF como Blob
                const blob = await response.blob();

                // Cria URL temporária para o Blob
                const url = window.URL.createObjectURL(blob);

                // Cria link temporário para iniciar download
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                // Define o nome do arquivo (pode ser pego do header Content-Disposition se o backend enviar)
                a.download = `Relatorio_Inventario_${filialCnpj}.pdf`; 
                document.body.appendChild(a);
                a.click();

                // Limpeza
                window.URL.revokeObjectURL(url);
                a.remove();

            } catch (error) {
                console.error('Erro ao gerar ou baixar relatório:', error);
                alert(`Não foi possível gerar o relatório: ${error.message}`);
            } finally {
                btnGerarRelatorio.disabled = false;
                btnGerarRelatorio.textContent = originalButtonText;
            }
        });
    }
    // --- FUNÇÕES PARA CARREGAR DADOS ---
    async function carregarDetalhesFilial() {
        if (!filialNameInfo || !filialCnpjInfo || !filialAddressInfo || !filialEmailInfo) {
             console.error("Elementos DOM para detalhes da filial não encontrados.");
             return;
        }
        try {
            const response = await fetch(`/api/filiais/${filialCnpj}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Filial não encontrada.');
            const filial = await response.json();
            
            document.title = `Inventário: ${filial.nome}`;
            filialNameInfo.innerHTML = `<strong>EMPRESA:</strong> ${filial.nome}`;
            filialCnpjInfo.innerHTML = `<strong>CNPJ:</strong> ${filial.cnpj}`;
            filialAddressInfo.innerHTML = `<strong>ENDEREÇO:</strong> ${filial.endereco}`;
            filialEmailInfo.innerHTML = `<strong>EMAIL:</strong> ${filial.email_responsavel}`;
        } catch (error) {
            document.querySelector('main').innerHTML = `<h1>${error.message}</h1>`;
        }
    }

    async function carregarInsumosGerais() {
        if (!insumosGridDiv) {
            console.error("Elemento DOM para grid de insumos não encontrado.");
            return;
        }
        insumosGridDiv.innerHTML = '<p>Carregando insumos...</p>';
        try {
            const response = await fetch(`/api/insumos/filial/${filialCnpj}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Falha ao carregar os insumos.');

            const inventario = await response.json();
            insumosGridDiv.innerHTML = '';
            
            if (inventario.length === 0) {
                insumosGridDiv.innerHTML = '<p>Nenhum insumo geral cadastrado para esta filial.</p>';
            } else {
                inventario.forEach(item => {
                    const card = createInsumoCard(item);
                    insumosGridDiv.appendChild(card);
                });
            }
        } catch (error) {
            insumosGridDiv.innerHTML = `<p>${error.message}</p>`;
        }
    }

    /**
     * [ALTERADO] Adiciona o N° de Serial se o item for um extintor.
     */
    function createInsumoCard(item) {
        const card = document.createElement('div');
        card.className = 'product-card';
    
        if (item.status) {
            card.classList.add(item.status);
        }
    
        // Lógica condicional para N° Serial
        let serialHtml = '';
        if (item.descricao && item.descricao.toLowerCase().includes('extintor') && item.numero_serial) {
            serialHtml = `<p><strong>Nº Serial:</strong> ${item.numero_serial}</p>`;
        } else if (item.descricao && item.descricao.toLowerCase().includes('extintor')) {
            serialHtml = `<p><strong>Nº Serial:</strong> N/A</p>`;
        }
    
        card.innerHTML = `
            <img src="${item.imagem || 'images/logotipo.png'}" alt="${item.descricao}">
            <h3>${item.descricao}</h3>
            ${serialHtml} <p><strong>Local:</strong> ${item.local || 'Não informado'}</p>
            <p><strong>Válido até:</strong> ${item.validade_formatada}</p>
            
            <div class="card-footer">
                <a href="insumo-detalhe.html?id=${item.codigo}" class="btn-details">Ver Detalhes</a>
            </div>
        `;
        return card;
    }

        function closeModal() {
         if (selectionModal) selectionModal.style.display = 'none';
         if (detailsModal) detailsModal.style.display = 'none';
         if (detailsForm) detailsForm.reset(); 
         const serialDatalist = document.getElementById('serial-list-direto');
         if (serialDatalist) serialDatalist.innerHTML = '';
         const locationDatalist = document.getElementById('location-list-direto'); // Limpa locais
         if (locationDatalist) locationDatalist.innerHTML = ''; // Limpa locais
     }

    
    document.querySelectorAll('#selectionModal .modal-close-btn, #selectionModal .btn-cancel, #detailsModal .modal-close-btn, #detailsModal .btn-cancel')
        .forEach(btn => btn?.addEventListener('click', closeModal));

    async function openCategorySelectionModal() {
        if (!selectionModal || !selectionGrid) {
            console.error("Elementos do modal de seleção não encontrados.");
            return;
        }
        try {
            const response = await fetch('/api/insumos/tipos', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Falha ao buscar tipos de insumo.');
            const tiposDeInsumo = await response.json();
            
            selectionGrid.innerHTML = ''; // Limpa o grid
            tiposDeInsumo.forEach(tipo => {
                const card = document.createElement('div');
                card.className = 'insumo-card-select';
                card.innerHTML = `
                    <img src="${tipo.imagem || 'images/logotipo.png'}" alt="${tipo.descricao}">
                    <h3>${tipo.descricao}</h3>
                `;
                card.addEventListener('click', () => openDetailsModal(tipo.descricao));
                selectionGrid.appendChild(card);
            });
            selectionModal.style.display = 'flex';
        } catch (error) {
            alert('Erro ao carregar os tipos de insumo: ' + error.message);
        }
    }

    /**
     * [ALTERADO] Agora é 'async' e busca a lista de seriais para o autocomplete.
     */
async function fetchLocations(cnpj) {
        try {
            const response = await fetch(`/api/filiais/${cnpj}/locations`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.warn("Falha ao buscar locais:", error);
            return [];
        }
    }

async function openDetailsModal(descricaoInsumo) {
        if (!detailsModal || !detailsFormContainer) {
             console.error("Elementos do modal de detalhes não encontrados.");
             return;
        }
        closeModal(); // Fecha outros modais se abertos
        detailsModal.querySelector('#detailsModalTitle').textContent = `Detalhes para: ${descricaoInsumo}`;
        
        const hoje = new Date().toISOString().split('T')[0];
        
        // --- BUSCA DADOS PARA AUTOCOMPLETE ---
        let seriais = [];
        let locais = [];

        if (descricaoInsumo.toLowerCase().includes('extintor') && filialCnpj) {
            try {
                const response = await fetch(`/api/insumos/filial/${filialCnpj}/seriais`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (response.ok) seriais = await response.json();
            } catch (error) { console.warn("Não foi possível carregar seriais:", error); }
        }
        if (filialCnpj) {
            locais = await fetchLocations(filialCnpj); // Usa a função helper
        }
        // --- FIM DA BUSCA ---


        // --- MONTAGEM DO HTML ---
        let serialInputHtml = '';
        const serialDatalistId = 'serial-list-direto';
        let serialDatalistHtml = `<datalist id="${serialDatalistId}">`;
        seriais.forEach(s => { serialDatalistHtml += `<option value="${s}"></option>`; });
        serialDatalistHtml += '</datalist>';

        if (descricaoInsumo.toLowerCase().includes('extintor')) {
            serialInputHtml = `
                <div class="form-group">
                    <label for="numero_serial">Nº Serial (Obrigatório):</label> 
                    <input type="text" id="numero_serial" name="numero_serial" list="${serialDatalistId}" autocomplete="off" required> 
                </div>
            `;
        }

        const locationDatalistId = 'location-list-direto';
        let locationDatalistHtml = `<datalist id="${locationDatalistId}">`;
        locais.forEach(l => { locationDatalistHtml += `<option value="${l}"></option>`; });
        locationDatalistHtml += '</datalist>';

        detailsFormContainer.innerHTML = `
            <input type="hidden" name="descricao" value="${descricaoInsumo}"> 
            ${serialInputHtml} 
            <div class="form-group">
                <label for="local">Localização (Obrigatório):</label>
                <input type="text" id="local" name="local" list="${locationDatalistId}" required autocomplete="off"> </div>
            <div class="form-group">
                <label for="descricao_item">Descrição Adicional (Opcional):</label>
                <textarea id="descricao_item" name="descricao_item" rows="3" maxlength="255"></textarea>
            </div>
            <div class="form-group">
                <label for="validade">Data de Validade:</label>
                <input type="date" id="validade" name="validade" min="${hoje}">
            </div>
            ${serialDatalistHtml} 
            ${locationDatalistHtml} `;
        // --- FIM DA MONTAGEM ---

        const validadeInput = detailsFormContainer.querySelector('#validade');
        if (validadeInput) {
             validadeInput.addEventListener('input', () => {
                 const ano = validadeInput.value.split('-')[0];
                 if (ano && ano.length > 4) {
                     alert('O ano deve ter no máximo 4 dígitos.');
                     validadeInput.value = '';
                 }
             });
        }
        detailsModal.style.display = 'flex';
    }
    if (btnAdicionarInsumoDireto) {
    btnAdicionarInsumoDireto.addEventListener('click', (e) => {
        e.preventDefault();
        console.log("Botão Adicionar Insumo Direto clicado!"); // <-- PONTO DE DEBUG 1
        openCategorySelectionModal(); 
    });
} else {
    console.error("Botão #btnAdicionarInsumoDireto não encontrado!"); // <-- PONTO DE DEBUG 2
}
if (detailsForm) {
        detailsForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // ESSENCIAL: Impede o reload da página
            const formData = new FormData(detailsForm);
            const data = Object.fromEntries(formData.entries());

            // --- Validações (Exemplo: data) ---
            if (data.validade) {
                const ano = data.validade.split('-')[0];
                if (ano.length !== 4) {
                    alert('Ano da validade inválido. Use 4 dígitos.');
                    return; // Impede o envio
                }
                const hoje = new Date().toISOString().split('T')[0];
                if (data.validade < hoje) {
                    alert('A data de validade não pode ser anterior à data atual.');
                    return; // Impede o envio
                }
            }
            // --- Fim Validações ---


            // --- Envio para a API ---
            // Certifique-se que 'filialCnpj' está acessível neste escopo (deve estar, pois foi definido no início do DOMContentLoaded)
            if (!filialCnpj) {
                 alert("Erro crítico: CNPJ da filial não encontrado para o envio. Recarregue a página.");
                 return;
            }

            const saveButton = detailsForm.querySelector('.btn-save'); // Pega o botão de salvar
            if(saveButton) saveButton.disabled = true; // Desabilita durante o envio

            try {
                const response = await fetch(`/api/insumos/filial/${filialCnpj}/direto`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify(data) // Envia os dados do formulário
                });

                const result = await response.json();

                if (!response.ok) {
                    // Se a API retornar erro (ex: serial obrigatório faltando)
                    throw new Error(result.message || `Erro ${response.status}`);
                }
                
                // Se a API retornou sucesso:
                alert(result.message || 'Insumo adicionado/atualizado com sucesso!');
                closeModal();           // Fecha o modal
                carregarInsumosGerais(); // Recarrega a lista de insumos na página ATUAL

            } catch (error) {
                // Se fetch falhar ou API retornar erro:
                alert(`Erro ao adicionar insumo: ${error.message}`);
            } finally {
                 if(saveButton) saveButton.disabled = false; // Reabilita o botão
            }
        });
    } else {
        console.error("Elemento do formulário #detailsModalForm não encontrado!");
    }





    function inicializarPagina() {
        carregarDetalhesFilial();
        carregarInsumosGerais();
    }

    inicializarPagina();

    window.addEventListener('pageshow', function(event) {
        // 'persisted' é true se a página foi carregada do bfcache
        if (event.persisted) {
            console.log('Página carregada do cache. Recarregando dados...');
            inicializarPagina();
        }
    });
});

function parseDateAsLocal(dateString) {
    if (!dateString) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        console.error("Formato de data inválido recebido:", dateString);
        return null;
    }
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day); 
}