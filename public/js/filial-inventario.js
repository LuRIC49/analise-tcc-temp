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

    const filialNameInfo = document.getElementById('filial-name-info');
    const filialCnpjInfo = document.getElementById('filial-cnpj-info');
    const filialAddressInfo = document.getElementById('filial-address-info');
    const filialEmailInfo = document.getElementById('filial-email-info');
    const insumosGridDiv = document.getElementById('insumos-gerais-grid');
    const btnVerVistorias = document.getElementById('btnVerVistorias');
    const btnAdicionarInsumoDireto = document.getElementById('btnAdicionarInsumoDireto');

    const btnGerarRelatorio = document.getElementById('btnGerarRelatorio');
    
    const selectionModal = document.getElementById('selectionModal');
    const detailsModal = document.getElementById('detailsModal');
    const detailsForm = document.getElementById('detailsModalForm');
    const selectionGrid = selectionModal ? selectionModal.querySelector('.selection-grid') : null;
    const detailsFormContainer = detailsModal ? detailsModal.querySelector('#formInputsContainer') : null;
    const serialSearchInput = document.getElementById('serialSearchInput');
    const statusFilter = document.getElementById('statusFilter'); 
    const serialSearchList = document.getElementById('serialSearchList');
    let todosOsInsumos = [];
    
    
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

            
            
            const status = statusFilter.value;
            const serial = serialSearchInput.value;

            
            const params = new URLSearchParams();
            if (status && status !== 'todos') {
                params.append('status', status);
            }
            if (serial && serial.trim() !== '') {
                params.append('serial', serial);
            }
            const queryString = params.toString();
            
            
            const fetchUrl = `/api/filiais/${filialCnpj}/report?${queryString}`;
            

            try {
                const response = await fetch(fetchUrl, { 
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    
                    let errorMsg = `Erro ${response.status}: ${response.statusText}`;
                    try {
                         const errorResult = await response.json();
                         errorMsg = errorResult.message || errorMsg;
                    } catch(e) { }
                    throw new Error(errorMsg);
                }

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `Relatorio_Inventario_${filialCnpj}.pdf`; 
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();

            } catch (error) {
                console.error('Erro ao gerar ou baixar relatório:', error);
                Notifier.showError(`Não foi possível gerar o relatório: ${error.message}`); 
            } finally {
                btnGerarRelatorio.disabled = false;
                btnGerarRelatorio.textContent = originalButtonText;
            }
        });
    }

    
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
            filialNameInfo.title = filial.nome; 

            filialCnpjInfo.innerHTML = `<strong>CNPJ:</strong> ${filial.cnpj}`;
            

            filialAddressInfo.innerHTML = `<strong>ENDEREÇO:</strong> ${filial.endereco}`;
            filialAddressInfo.title = filial.endereco; 

            filialEmailInfo.innerHTML = `<strong>EMAIL:</strong> ${filial.email_responsavel}`;
            filialEmailInfo.title = filial.email_responsavel; 
            

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

            todosOsInsumos = await response.json(); 
            
            
            
            const seriais = new Set();
            

            todosOsInsumos.forEach(item => {
                if (item.numero_serial) seriais.add(item.numero_serial);
            });

            
            if (serialSearchList) {
                serialSearchList.innerHTML = ''; 
                seriais.forEach(s => {
                    const option = document.createElement('option');
                    option.value = s;
                    serialSearchList.appendChild(option);
                });
            }

            
            
            

            
            aplicarFiltros(); 

        } catch (error) {
            todosOsInsumos = []; 
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
            
            
            
            let serialHtml = '';
                    if (item.numero_serial) {
            serialHtml = `<p><strong>Nº Serial:</strong> ${item.numero_serial}</p>`;
                    } else {
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

            function renderizarInsumos(listaInsumos) {
        if (!insumosGridDiv) return;
        insumosGridDiv.innerHTML = ''; 

        if (listaInsumos.length === 0) {
            insumosGridDiv.innerHTML = '<p>Nenhum insumo encontrado para este filtro.</p>';
        } else {
            listaInsumos.forEach(item => {
                const card = createInsumoCard(item);
                insumosGridDiv.appendChild(card);
            });
        }
    }

    /**
     * [NOVA FUNÇÃO]
     * É chamada sempre que o usuário digita ou muda o filtro de status.
     */
function aplicarFiltros() {
        const termoBusca = serialSearchInput.value.toLowerCase();
        const status = statusFilter.value; 

        let insumosFiltrados = todosOsInsumos;

        
        if (status !== 'todos') {
            insumosFiltrados = insumosFiltrados.filter(item => item.status === status);
        }

        
        if (termoBusca) {
            insumosFiltrados = insumosFiltrados.filter(item => {
                const serial = item.numero_serial || '';
                return serial.toLowerCase().includes(termoBusca); 
            });
        }

        
        
        insumosFiltrados.sort((a, b) => {
            
            const dateA = parseDateAsLocal(a.validade);
            const dateB = parseDateAsLocal(b.validade);

            
            if (dateA && dateB) return dateA - dateB; 
            if (dateA) return -1; 
            if (dateB) return 1;  
            return 0; 
        });

        
        renderizarInsumos(insumosFiltrados);
    }





        function closeModal() {
         if (selectionModal) selectionModal.style.display = 'none';
         if (detailsModal) detailsModal.style.display = 'none';
         if (detailsForm) detailsForm.reset(); 
         const serialDatalist = document.getElementById('serial-list-direto');
         if (serialDatalist) serialDatalist.innerHTML = '';
         const locationDatalist = document.getElementById('location-list-direto'); 
         if (locationDatalist) locationDatalist.innerHTML = ''; 
     }

    if (serialSearchInput) {
        serialSearchInput.addEventListener('input', aplicarFiltros); 
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', aplicarFiltros);
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
            
            selectionGrid.innerHTML = ''; 
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
                closeModal(); 
                detailsModal.querySelector('#detailsModalTitle').textContent = `Detalhes para: ${descricaoInsumo}`;

                const hoje = new Date().toISOString().split('T')[0];

                
                let seriais = [];
                let locais = [];

                if (filialCnpj) {
                    try {
                        
                        const response = await fetch(
                            `/api/insumos/filial/${filialCnpj}/seriais-por-tipo?tipo=${encodeURIComponent(descricaoInsumo)}`, 
                            { headers: { 'Authorization': `Bearer ${token}` } }
                        );
                        if (response.ok) seriais = await response.json();
                    } catch (error) { 
                        console.warn("Não foi possível carregar seriais por tipo:", error); 
                    }
                    
                    
                    locais = await fetchLocations(filialCnpj);
                }


                
                let serialInputHtml = '';
                const serialDatalistId = 'serial-list-direto';
                let serialDatalistHtml = `<datalist id="${serialDatalistId}">`;
                seriais.forEach(s => { serialDatalistHtml += `<option value="${s}"></option>`; });
                serialDatalistHtml += '</datalist>';

                
                        
                        
                serialInputHtml = `
                <div class="form-group">
                <label for="numero_serial">Nº Serial (Obrigatório):</label> 
                <input type="text" id="numero_serial" name="numero_serial" list="${serialDatalistId}" autocomplete="off"> 
                </div>
                `;
                

                const locationDatalistId = 'location-list-direto';
                let locationDatalistHtml = `<datalist id="${locationDatalistId}">`;
                locais.forEach(l => { locationDatalistHtml += `<option value="${l}"></option>`; });
                locationDatalistHtml += '</datalist>';

                detailsFormContainer.innerHTML = `
                <input type="hidden" name="descricao" value="${descricaoInsumo}"> 
                ${serialInputHtml} 
                <div class="form-group">
                <label for="local">Localização (Obrigatório):</label>
                <input type="text" id="local" name="local" list="${locationDatalistId}" autocomplete="off"> </div>
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
                

                
                const serialInput = detailsFormContainer.querySelector('#numero_serial');
                const localInput = detailsFormContainer.querySelector('#local');
                const validadeInput = detailsFormContainer.querySelector('#validade');

                if (serialInput) {
                serialInput.addEventListener('blur', () => validateRequired(serialInput, 'Nº Serial'));
                }
                if (localInput) {
                localInput.addEventListener('blur', () => validateRequired(localInput, 'Localização'));
                }
                if (validadeInput) {
                 validadeInput.addEventListener('blur', () => validateDate(validadeInput));

                 validadeInput.addEventListener('input', () => {
                 const ano = validadeInput.value.split('-')[0];
                 if (ano && ano.length > 4) {
                 validadeInput.value = '';
                 }
                 });
                }
                detailsModal.style.display = 'flex';
                }

if (btnAdicionarInsumoDireto) {
        btnAdicionarInsumoDireto.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Botão Adicionar Insumo Direto clicado!"); 
            openCategorySelectionModal(); 
        });
    } else {
        console.error("Botão #btnAdicionarInsumoDireto não encontrado!"); 
    }
    if (detailsForm) {
        detailsForm.addEventListener('submit', async (event) => {
            event.preventDefault(); 

            
            let isValid = true;
            const serialInput = detailsForm.querySelector('#numero_serial');
            const localInput = detailsForm.querySelector('#local');
            const validadeInput = detailsForm.querySelector('#validade');

            if (serialInput) {
                isValid = validateRequired(serialInput, 'Nº Serial') && isValid;
            }
            isValid = validateRequired(localInput, 'Localização') && isValid;
            isValid = validateDate(validadeInput) && isValid;

            if (!isValid) {
                return; 
            }
            
            
            const formData = new FormData(detailsForm);
            const data = Object.fromEntries(formData.entries());

            
            if (data.validade) {
                const ano = data.validade.split('-')[0];
                if (ano.length !== 4) {
                    Notifier.showError('Ano da validade inválido. Use 4 dígitos.');
                    return; 
                }
                
            }
            


            
            if (!filialCnpj) {
                 Notifier.showError("Erro crítico: CNPJ da filial não encontrado.");
                 return;
            }

            const saveButton = detailsForm.querySelector('.btn-save'); 
            if(saveButton) saveButton.disabled = true; 

            try {
                const response = await fetch(`/api/insumos/filial/${filialCnpj}/direto`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify(data) 
                });

            const result = await response.json();
                if (!response.ok) throw new Error(result.message || `Erro ${response.status}`);
                
                Notifier.showSuccess(result.message || 'Insumo adicionado/atualizado com sucesso!'); 
                closeModal();           
                carregarInsumosGerais(); 

            } catch (error) {
                Notifier.showError(`Erro ao adicionar insumo: ${error.message}`); 
            } finally {
                 if(saveButton) saveButton.disabled = false; 
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
        
        if (event.persisted) {
            console.log('Página carregada do cache. Recarregando dados...');
            inicializarPagina();
        }
    });
});


function parseDateAsLocal(dateString) {
    if (!dateString) return null;

    
    
    
    const dateOnly = dateString.split('T')[0];
    

    
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) { 
        
        console.error("Formato de data inválido recebido:", dateString); 
        return null;
    }
    
    const [year, month, day] = dateOnly.split('-').map(Number);
    
    return new Date(year, month - 1, day); 
}
