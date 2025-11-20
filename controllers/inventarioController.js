const { parseDateAsLocal, formatDateForClient } = require('../utils/dateFormatter');
const Filial = require('../models/filialModel');
const Vistoria = require('../models/vistoriaModel');
const { Insumo, InsumoFilial } = require('../models/insumoModel');
const db = require('../db');
const { createInventoryPdf } = require('../utils/pdfGenerator');


function isValidFutureDate(dateString) {
    if (!dateString) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
    const inputDate = parseDateAsLocal(dateString);
    if (!inputDate || isNaN(inputDate)) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return inputDate >= today;
}
function isNotEmpty(value) {
     return value !== null && value !== undefined && String(value).trim() !== ''; 
    }


function sortInventoryByValidity(inventory) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const mapped = inventory.map(item => {
        let sortStatus = 1;
        let validityDate = item.validade ? parseDateAsLocal(item.validade) : null;
        if (validityDate) {
            const diffTime = validityDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays < 0) { sortStatus = 3; }
            else if (diffDays <= 30) { sortStatus = 2; }
        } else { sortStatus = 1; } 
        return { ...item, sortStatus, validityDate };
    });
    mapped.sort((a, b) => {
        if (a.sortStatus !== b.sortStatus) { return a.sortStatus - b.sortStatus; }
        if (a.sortStatus === 1) { 
             if (!a.validityDate && !b.validityDate) return 0;
             if (!a.validityDate) return -1;
             if (!b.validityDate) return 1;
             return b.validityDate - a.validityDate;
        } else { 
             if (!a.validityDate && !b.validityDate) return 0;
             if (!a.validityDate) return 1;
             if (!b.validityDate) return -1;
             return a.validityDate - b.validityDate;
        }
    });
    return mapped;
}




exports.listarSeriaisPorFilial = async (req, res) => {
    try {
        const { cnpj: filialCnpj } = req.params;
        const seriais = await InsumoFilial.findSeriaisByFilial(filialCnpj);
        res.json(seriais);
    } catch (error) {
        console.error('Erro ao listar números de serial:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.listarSeriaisPorFilialETipo = async (req, res) => {
    try {
        const { cnpj: filialCnpj } = req.params;
        const { tipo } = req.query; 

        if (!tipo) {
            return res.json([]); 
        }

        
        const [rows] = await db.query('SELECT codigo FROM insumo WHERE descricao = ?', [tipo]);

        
        if (rows.length === 0) {
            return res.json([]);
        }
        
        const insumoCodigo = rows[0].codigo;

        
        const seriais = await InsumoFilial.findSeriaisByFilialAndCodigo(filialCnpj, insumoCodigo);
        res.json(seriais);

    } catch (error) {
        console.error('Erro ao listar números de serial por tipo:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};




exports.listarInventario = async (req, res) => {
    try {
        const { cnpj: filialCnpj } = req.params;
        const inventario = await InsumoFilial.findByFilial(filialCnpj);
        res.json(inventario);
    } catch (error) {
        console.error('Erro ao listar inventário:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};



exports.editarInsumo = async (req, res) => {
    try {
        const { id } = req.params;
        const { empresaCnpj } = req.user;
        
        const { validade, local, descricao, numero_serial } = req.body; 

        
         if (!isNotEmpty(local)) return res.status(400).json({ message: 'A localização é obrigatória.' });
         if (!isValidFutureDate(validade)) { 
            return res.status(400).json({ message: 'Data de validade inválida. Use AAAA-MM-DD, não pode ser vazia ou passada.' });
         }
         if (!isNotEmpty(numero_serial)) { 
             return res.status(400).json({ message: 'O Número de Serial é obrigatório.' });
         }
        

        
        const queryBuscaTipo = ` SELECT i.descricao as tipo_insumo FROM insumo_filial_mutavel inf JOIN insumo i ON inf.insumo_codigo = i.codigo JOIN filial f ON inf.filial_cnpj = f.cnpj WHERE inf.codigo = ? AND f.empresa_cnpj = ?; `;
        const [rowsTipo] = await db.query(queryBuscaTipo, [id, empresaCnpj]);
        if (rowsTipo.length === 0) {
             return res.status(404).json({ message: 'Insumo não encontrado ou você não tem permissão.' });
        }
        

        
        const affectedRows = await InsumoFilial.update(
            id,
            { validade, local, descricao, numero_serial },
            empresaCnpj
        );

        if (affectedRows === 0) { throw new Error('Falha ao atualizar o insumo (affectedRows=0).'); }
        res.json({ message: 'Insumo atualizado com sucesso!' });
    } catch (error) {
        
        console.error('Erro ao editar insumo:', error);
        if (error.code === 'ER_LOCK_WAIT_TIMEOUT') { res.status(503).json({ message: 'Sistema ocupado. Tente novamente.' }); }
        else if (error.message.includes('não encontrado')) { res.status(404).json({ message: error.message }); }
        else { res.status(500).json({ message: error.message || 'Erro interno do servidor.' }); }
    }
};

exports.buscarInsumoPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const { empresaCnpj } = req.user;
        const insumo = await InsumoFilial.findById(id, empresaCnpj);
        if (!insumo) {
            return res.status(404).json({ message: 'Insumo não encontrado ou você não tem permissão para acessá-lo.' });
        }
        res.json(insumo);
    } catch (error) {
        console.error('Erro ao buscar detalhes do insumo:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.adicionarInsumoDireto = async (req, res) => {
    try {
        const { cnpj: filial_cnpj } = req.params;
        
        const insumoData = req.body;

        
        if (!isNotEmpty(insumoData.descricao)) return res.status(400).json({ message: 'O tipo do insumo (descrição) é obrigatório.' });
        if (!isNotEmpty(insumoData.local)) return res.status(400).json({ message: 'A localização é obrigatória.' });
        if (!isValidFutureDate(insumoData.validade)) { 
            return res.status(400).json({ message: 'Data de validade inválida. Use AAAA-MM-DD, não pode ser vazia ou passada.' });
        }
        if (!isNotEmpty(insumoData.numero_serial)) { 
            return res.status(400).json({ message: 'O Número de Serial é obrigatório.' });
        }
        

        await InsumoFilial.createDirect({
            ...insumoData,
            filial_cnpj,
            tipo_descricao: insumoData.descricao
            
        });
        res.status(201).json({ message: 'Insumo adicionado/atualizado no inventário com sucesso!' });
    } catch (error) {
        console.error('Erro ao adicionar insumo direto:', error);
        if (error.code === 'ER_DUP_ENTRY') {
             res.status(409).json({ message: 'Erro de duplicidade detectado (Serial já existe?).'}); 
        } else {
             res.status(500).json({ message: error.message || 'Erro interno do servidor.' });
        }
    }
};

exports.excluirItemInventario = async (req, res) => {
    try {
        const { id } = req.params;
        const { empresaCnpj } = req.user;
        const insumoExistente = await InsumoFilial.findById(id, empresaCnpj);
        if (!insumoExistente) {
            return res.status(404).json({ message: 'Insumo não encontrado ou você não tem permissão para excluí-lo.' });
        }
        const affectedRows = await InsumoFilial.remove(id);
        if (affectedRows === 0) {
            return res.status(404).json({ message: 'Falha ao excluir o insumo.' });
        }
        res.json({ message: 'Insumo removido do inventário com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir insumo:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.buscarHistoricoInsumo = async (req, res) => {
    try {
        const { id } = req.params;
        const { empresaCnpj } = req.user;
        const historico = await InsumoFilial.findHistoryById(id, empresaCnpj);
        if (!historico) {
             return res.status(404).json({ message: 'Insumo não encontrado ou você não tem permissão.' });
        }
        res.json(historico);
    } catch (error) {
        console.error('Erro ao buscar histórico do insumo:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar histórico.' });
    }
};

exports.excluirRegistroHistorico = async (req, res) => {
    try {
        const { historia_id } = req.params;
        const { empresaCnpj } = req.user;
        const affectedRows = await InsumoFilial.removeImutavelRecord(historia_id, empresaCnpj);
        if (affectedRows === 0) {
            throw new Error('Não foi possível excluir o registro. Pode já ter sido removido ou a vistoria finalizada.');
        }
        res.json({ message: 'Registro de insumo removido da vistoria com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir registro histórico:', error);
        let statusCode = 500;
        if (error.message.includes('não encontrado') || error.message.includes('permissão')) {
            statusCode = 404;
        } else if (error.message.includes('finalizada')) {
            statusCode = 403;
        }
        res.status(statusCode).json({ message: error.message || 'Erro interno do servidor.' });
    }
};

exports.gerarRelatorioInventario = async (req, res) => {
    try {
        const { cnpj: filialCnpj } = req.params;
        const { empresaCnpj } = req.user;
        
        
        
        const { status, serial } = req.query;

        
        const inventarioBruto = await InsumoFilial.findByFilial(filialCnpj);
        const filialDetails = await Filial.findById(filialCnpj, empresaCnpj);

        
        let inventarioFiltrado = inventarioBruto;

        if (status && status !== 'todos') {
            inventarioFiltrado = inventarioFiltrado.filter(item => item.status === status);
        }

        if (serial) {
            const termoSerial = serial.toLowerCase();
            inventarioFiltrado = inventarioFiltrado.filter(item => 
                item.numero_serial && item.numero_serial.toLowerCase().includes(termoSerial)
            );
        }
        
        
        if (inventarioFiltrado.length === 0) {
            
            return res.status(404).json({ message: 'Nenhum item encontrado para os filtros selecionados.' });
        }
        
        
        const inventarioOrdenado = sortInventoryByValidity(inventarioFiltrado);
        const filename = `Relatorio_Inventario_${filialCnpj}_${new Date().toISOString().split('T')[0]}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        await createInventoryPdf(inventarioOrdenado, filialDetails, res);

    } catch (error) {
        console.error('Erro ao gerar relatório de inventário:', error);
        if (!res.headersSent) {
             res.status(500).json({ message: error.message || 'Erro interno ao gerar o relatório.' });
        } else {
             console.error("Erro após início do envio do PDF. Resposta pode estar incompleta.");
             res.end();
        }
    }
};


