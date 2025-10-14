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

    btnVerVistorias.addEventListener('click', (event) => {
        event.preventDefault();
        window.location.href = `vistorias.html?cnpj=${filialCnpj}`;
    });

    async function carregarDetalhesFilial() {
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
        insumosGridDiv.innerHTML = '<p>Carregando insumos...</p>';
        try {
            const response = await fetch(`/api/filiais/${filialCnpj}/inventario`, { headers: { 'Authorization': `Bearer ${token}` } });
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

    function createInsumoCard(item) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${item.imagem || 'images/logotipo.png'}" alt="${item.descricao}">
            <p><strong>Local:</strong> ${item.local || 'Não informado'}</p>
            <p><strong>Válido até:</strong> ${item.validade ? new Date(item.validade).toLocaleDateString() : 'N/A'}</p>
        `;
        return card;
    }

    carregarDetalhesFilial();
    carregarInsumosGerais();
});