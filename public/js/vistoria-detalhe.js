document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const vistoriaId = urlParams.get('id');

    if (!vistoriaId) {
        document.querySelector('main').innerHTML = '<h1>Erro: ID da vistoria não fornecido.</h1>';
        return;
    }

    const vistoriaTitle = document.getElementById('vistoria-title');
    const vistoriaInfoDiv = document.getElementById('vistoria-info');
    const insumosGrid = document.getElementById('insumos-vistoria-grid');
    const btnAdicionarInsumo = document.getElementById('btnAdicionarInsumo');
    const btnFinalizarVistoria = document.getElementById('btnFinalizarVistoria');
    const selectionModal = document.getElementById('selectionModal');
    const detailsModal = document.getElementById('detailsModal');
    const detailsForm = document.getElementById('detailsModalForm');
    
    let filialCnpjGlobal = null;

    async function carregarDadosVistoria() {
        try {
            const response = await fetch(`/api/vistorias/${vistoriaId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Vistoria não encontrada.');
            const { detalhes, insumos } = await response.json();
            
            filialCnpjGlobal = detalhes.filial_cnpj;
            const dataInicio = new Date(detalhes.data_inicio).toLocaleDateString();
            vistoriaTitle.textContent = `Vistoria #${detalhes.codigo}`;
            vistoriaInfoDiv.innerHTML = `
                <p><strong>Técnico:</strong> ${detalhes.tecnico_responsavel}</p>
                <p><strong>Data de Início:</strong> ${dataInicio}</p>
                <p><strong>Status:</strong> ${detalhes.data_fim ? 'Finalizada' : 'Em Andamento'}</p>
                `;
            

            if (detalhes.data_fim) {
                btnAdicionarInsumo.style.display = 'none';
                btnFinalizarVistoria.style.display = 'none';
            }
            
            insumosGrid.innerHTML = '';
            if (insumos.length === 0) {
                insumosGrid.innerHTML = '<p>Nenhum insumo registrado nesta vistoria ainda.</p>';
            } else {
                insumos.forEach(item => insumosGrid.appendChild(createInsumoCard(item)));
            }
        } catch (error) {
            document.querySelector('main').innerHTML = `<h1>${error.message}</h1>`;
        }
    }

    function createInsumoCard(item) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <h3>${item.descricao}</h3>
            <p><strong>Local:</strong> ${item.local || 'Não informado'}</p>
            <p><strong>Validade:</strong> ${item.validade ? new Date(item.validade).toLocaleDateString() : 'N/A'}</p>
        `;
        return card;
    }

    function closeModal() {
        selectionModal.style.display = 'none';
        detailsModal.style.display = 'none';
    }
    document.querySelectorAll('.modal-close-btn, .btn-cancel').forEach(btn => btn.addEventListener('click', closeModal));

    btnAdicionarInsumo.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/insumos/tipos', { headers: { 'Authorization': `Bearer ${token}` } });
            const tiposDeInsumo = await response.json();
            
            const gridContainer = selectionModal.querySelector('.selection-grid');
            gridContainer.innerHTML = '';
            tiposDeInsumo.forEach(tipo => {
                const card = document.createElement('div');
                card.className = 'insumo-card-select';
                card.innerHTML = `
                    <img src="${tipo.imagem || 'images/logotipo.png'}" alt="${tipo.descricao}">
                    <h3>${tipo.descricao}</h3>
                `;
                card.addEventListener('click', () => openDetailsModal(tipo.descricao));
                gridContainer.appendChild(card);
            });
            selectionModal.style.display = 'flex';
        } catch (error) {
            alert('Erro ao carregar os tipos de insumo.');
        }
    });

        function openDetailsModal(descricaoInsumo) {
            closeModal();
            detailsModal.querySelector('#detailsModalTitle').textContent = `Detalhes para: ${descricaoInsumo}`;
            const formContainer = detailsModal.querySelector('#formInputsContainer');

            const hoje = new Date().toISOString().split('T')[0];

            formContainer.innerHTML = `
                <input type="hidden" name="descricao" value="${descricaoInsumo}">

                <div class="form-group">
                    <label for="local">Localização (Obrigatório):</label>
                    <input type="text" id="local" name="local" required>
                </div>

                <div class="form-group">
                    <label for="descricao_item">Descrição (Opcional):</label>
                    <textarea id="descricao_item" name="descricao_item" rows="3" maxlength="255"></textarea>
                </div>

                <div class="form-group">
                    <label for="validade">Data de Validade:</label>
                    <input type="date" id="validade" name="validade" min="${hoje}">
                </div>
            `;
            
            const anovalidadeInput = formContainer.querySelector('#validade');
            anovalidadeInput.addEventListener('input', () => {
                const ano = anovalidadeInput.value.split('-')[0];
                if (ano && ano.length > 4) {
                    alert('O ano deve ter no máximo 4 dígitos.');
                    anovalidadeInput.value = '';
                }
            });

            detailsModal.style.display = 'flex';
        }
    
    detailsForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(detailsForm);
        const data = Object.fromEntries(formData.entries());
        data.filial_cnpj = filialCnpjGlobal;

        try {
            const response = await fetch(`/api/vistorias/${vistoriaId}/insumos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            alert(result.message);
            closeModal();
            carregarDadosVistoria();
        } catch (error) {
            alert(`Erro: ${error.message}`);
        }
    });

    btnFinalizarVistoria.addEventListener('click', async (e) => {
        e.preventDefault();
        if (confirm('Tem certeza que deseja finalizar esta vistoria?')) {
            try {
                const response = await fetch(`/api/vistorias/${vistoriaId}/finalizar`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                
                alert(result.message);
                window.location.reload();
            } catch (error) {
                alert(`Erro: ${error.message}`);
            }
        }
    });

    carregarDadosVistoria();
});