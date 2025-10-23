const db = require('../db');
const { parseDateAsLocal, formatDateForClient } = require('../utils/dateFormatter');

class Insumo {
    static async findAllTypes() {
        const [rows] = await db.query('SELECT codigo, descricao, imagem FROM insumo ORDER BY descricao ASC');
        return rows;
    }

    static async findOrCreateType(descricao, connection) {
        const conn = connection || db;
        let [rows] = await conn.query('SELECT codigo FROM insumo WHERE descricao = ?', [descricao]);
        if (rows.length > 0) {
            return rows[0].codigo;
        } else {
            const [result] = await conn.execute('INSERT INTO insumo (descricao) VALUES (?)', [descricao]);
            return result.insertId;
        }
    }
}

class InsumoFilial {

    /**
     * [REVISADO - Simplificado] Adiciona ou ATUALIZA um insumo diretamente no inventário (sem vistoria).
     * OPERA APENAS NA TABELA MUTÁVEL. Não cria registro na tabela imutável.
     */
    static async createDirect(data) {
        const { filial_cnpj, tipo_descricao, validade, local, descricao_item, numero_serial } = data;
        // Validação básica (controller já valida serial obrigatório para extintor)
        if (!filial_cnpj || !tipo_descricao || !local) {
             throw new Error("Dados essenciais faltando (CNPJ Filial, Tipo, Local) para createDirect.");
        }
        
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const insumo_codigo = await Insumo.findOrCreateType(tipo_descricao, connection);
            let codigoExistente = null;

            // Busca item existente apenas se houver serial (para evitar duplicatas acidentais)
            // Itens sem serial (ou não-extintores) podem ter múltiplos registros (um por local/validade talvez?)
            // A regra de negócio aqui precisa ser clara. Assumindo que serial é a chave única junto com tipo/filial.
            if (numero_serial && numero_serial.trim() !== '') {
                 const queryBuscaExistente = `
                     SELECT codigo FROM insumo_filial_mutavel 
                     WHERE filial_cnpj = ? AND insumo_codigo = ? AND numero_serial = ? 
                     FOR UPDATE; 
                 `;
                 const [rowsExistente] = await connection.query(queryBuscaExistente, [filial_cnpj, insumo_codigo, numero_serial]);
                 if (rowsExistente.length > 0) {
                     codigoExistente = rowsExistente[0].codigo;
                 }
            }

            let resultadoOperacaoMutavel;

            if (codigoExistente) {
                // --- ATUALIZAÇÃO DIRETA (Apenas Mutável) ---
                console.log(`Atualizando insumo existente (mutavel.codigo=${codigoExistente}) via Adicionar Direto (sem log histórico)`);
                const queryMutavelUpdate = 'UPDATE insumo_filial_mutavel SET validade = ?, local = ?, descricao = ? WHERE codigo = ?';
                [resultadoOperacaoMutavel] = await connection.execute(queryMutavelUpdate, [validade || null, local, descricao_item || null, codigoExistente]);
                
            } else {
                // --- INSERÇÃO DIRETA (Apenas Mutável) ---
                 console.log(`Inserindo novo insumo via Adicionar Direto (sem log histórico)`);
                const queryMutavelInsert = 'INSERT INTO insumo_filial_mutavel (insumo_codigo, filial_cnpj, validade, local, descricao, numero_serial) VALUES (?, ?, ?, ?, ?, ?)';
                [resultadoOperacaoMutavel] = await connection.execute(queryMutavelInsert, [insumo_codigo, filial_cnpj, validade || null, local, descricao_item || null, numero_serial || null]);
            }
            
            // REMOVIDO: Bloco que chamava createImutavelRecord foi totalmente removido daqui.
            
            await connection.commit();
            return resultadoOperacaoMutavel; 

        } catch (error) {
            await connection.rollback();
            console.error("Erro em createDirect:", error); 
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Método auxiliar para inserir no histórico imutável (usado por create e updateAndLog).
     * NÃO é mais usado por createDirect.
     */
    static async createImutavelRecord(insumoData, vistoriaCodigoOverride = null, connection) {
        const conn = connection || db;
        const numeroSerial = insumoData.numero_serial || null;
        const validade = insumoData.validade || null;
        const local = insumoData.local || null;
        const descricao = insumoData.descricao_item !== undefined ? insumoData.descricao_item : (insumoData.descricao || null); 
        const insumoCodigo = insumoData.insumo_codigo;
        const filialCnpj = insumoData.filial_cnpj;

        if(!insumoCodigo || !filialCnpj) {
             console.error("Dados incompletos para createImutavelRecord:", insumoData);
             throw new Error("Dados incompletos (insumo_codigo ou filial_cnpj) ao tentar salvar histórico.");
        }

        const query = `
            INSERT INTO insumo_filial_vistoria_imutavel 
                (insumo_codigo, filial_cnpj, vistoria_codigo, validade, local, descricao, numero_serial) 
            VALUES (?, ?, ?, ?, ?, ?, ?);
        `; 
        const vistoriaCodigoParaSalvar = vistoriaCodigoOverride !== null ? vistoriaCodigoOverride : (insumoData.vistoria_codigo === undefined ? null : insumoData.vistoria_codigo); 
        
        await conn.execute(query, [
            insumoCodigo, filialCnpj, vistoriaCodigoParaSalvar, validade, local, descricao, numeroSerial
        ]);
    }

    // --- Métodos de Busca (findByFilial, findSeriaisByFilial, findLocationsByFilial, findById, findByVistoria) ---
    // (Manter como estavam)
    static async findByFilial(filialCnpj) { /* ...código mantido... */ 
        const query = ` SELECT inf.codigo, inf.validade, inf.local, inf.descricao AS descricao_item, i.descricao, i.imagem, inf.numero_serial FROM insumo_filial_mutavel AS inf JOIN insumo AS i ON inf.insumo_codigo = i.codigo WHERE inf.filial_cnpj = ? ORDER BY i.descricao ASC; `; 
        const [rows] = await db.query(query, [filialCnpj]);
        return rows.map(row => { let status = 'status-ok'; if (row.validade) { const hoje = new Date(); hoje.setHours(0, 0, 0, 0); const dataValidade = parseDateAsLocal(row.validade); if (dataValidade) { const diffTime = dataValidade - hoje; const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); if (diffDays < 0) { status = 'status-expired'; } else if (diffDays <= 30) { status = 'status-warning'; } } else { status = 'status-warning'; } } return { ...row, status: status, validade_formatada: formatDateForClient(row.validade) }; });
     }
    static async findSeriaisByFilial(filialCnpj) { /* ...código mantido... */ 
        const query = ` SELECT DISTINCT numero_serial FROM insumo_filial_mutavel WHERE filial_cnpj = ? AND numero_serial IS NOT NULL ORDER BY numero_serial ASC; `; const [rows] = await db.query(query, [filialCnpj]); return rows.map(row => row.numero_serial);
     }
    static async findLocationsByFilial(filialCnpj) { /* ...código mantido... */ 
        const query = ` SELECT DISTINCT local FROM insumo_filial_mutavel WHERE filial_cnpj = ? AND local IS NOT NULL AND local <> '' ORDER BY local ASC; `; const [rows] = await db.query(query, [filialCnpj]); return rows.map(row => row.local); 
    }
    static async findById(id, empresaCnpj) { /* ...código mantido... */ 
        const query = ` SELECT inf.*, i.descricao as tipo_insumo, i.imagem FROM insumo_filial_mutavel AS inf JOIN insumo AS i ON inf.insumo_codigo = i.codigo JOIN filial AS f ON inf.filial_cnpj = f.cnpj WHERE inf.codigo = ? AND f.empresa_cnpj = ?; `; const [rows] = await db.query(query, [id, empresaCnpj]); if (rows.length === 0) return null; const row = rows[0]; return { ...row, validade_formatada: formatDateForClient(row.validade) };
     }
    static async findByVistoria(vistoriaId) { /* ...código mantido... */ 
        const query = ` SELECT im.*, i.descricao AS tipo_insumo, i.imagem, mut.codigo AS codigo_atual FROM insumo_filial_vistoria_imutavel AS im JOIN insumo AS i ON im.insumo_codigo = i.codigo LEFT JOIN insumo_filial_mutavel AS mut ON im.filial_cnpj = mut.filial_cnpj AND im.insumo_codigo = mut.insumo_codigo AND im.numero_serial <=> mut.numero_serial WHERE im.vistoria_codigo = ? ORDER BY im.codigo ASC; `; const [rows] = await db.query(query, [vistoriaId]); return rows.map(row => ({ ...row, validade_formatada: formatDateForClient(row.validade) }));
     }

    // --- Métodos de Modificação (create via vistoria, updateAndLog, findHistoryById, remove) ---
    // (Manter como estavam - Eles AINDA usam createImutavelRecord)
    
     static async create(data) { // Adição/Atualização via Vistoria (AINDA LOGA NO IMUTÁVEL)
        const { filial_cnpj, vistoria_codigo, tipo_descricao, validade, local, descricao_item, numero_serial } = data; 
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const insumo_codigo = await Insumo.findOrCreateType(tipo_descricao, connection);
            
            // 1. Loga estado da vistoria no imutável (mantido)
            const dadosParaHistoricoImutavel = { insumo_codigo, filial_cnpj, vistoria_codigo, validade, local, descricao: descricao_item, numero_serial };
            await InsumoFilial.createImutavelRecord(dadosParaHistoricoImutavel, vistoria_codigo, connection); 

            // 2. Insere ou Atualiza mutável (lógica mantida)
            let codigoExistenteMutavel = null;
            if (numero_serial && numero_serial.trim() !== '') {
                 const queryBuscaMutavel = ` SELECT codigo FROM insumo_filial_mutavel WHERE filial_cnpj = ? AND insumo_codigo = ? AND numero_serial = ? FOR UPDATE; `;
                 const [rowsMutavel] = await connection.query(queryBuscaMutavel, [filial_cnpj, insumo_codigo, numero_serial]);
                 if (rowsMutavel.length > 0) codigoExistenteMutavel = rowsMutavel[0].codigo;
            } 
            if (codigoExistenteMutavel) {
                 const queryMutavelUpdate = 'UPDATE insumo_filial_mutavel SET validade = ?, local = ?, descricao = ? WHERE codigo = ?';
                 await connection.execute(queryMutavelUpdate, [validade || null, local, descricao_item || null, codigoExistenteMutavel]);
            } else {
                 const queryMutavelInsert = 'INSERT INTO insumo_filial_mutavel (insumo_codigo, filial_cnpj, validade, local, descricao, numero_serial) VALUES (?, ?, ?, ?, ?, ?)'; 
                 await connection.execute(queryMutavelInsert, [insumo_codigo, filial_cnpj, validade || null, local, descricao_item || null, numero_serial || null]); 
            }
            
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            console.error("Erro em create (via vistoria):", error);
            throw error; 
        } finally {
            connection.release();
        }
    }


    static async updateAndLog(id, newData, empresaCnpj) { // Edição Manual (AINDA LOGA NO IMUTÁVEL)
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const queryBusca = ` SELECT inf.* FROM insumo_filial_mutavel AS inf JOIN filial AS f ON inf.filial_cnpj = f.cnpj WHERE inf.codigo = ? AND f.empresa_cnpj = ? FOR UPDATE; `;
            const [rows] = await connection.query(queryBusca, [id, empresaCnpj]);

            if (rows.length === 0) { throw new Error('Insumo não encontrado ou você não tem permissão.'); }
            const estadoAntigo = rows[0];

            // Loga estado antigo com NULL (mantido)
            await InsumoFilial.createImutavelRecord(estadoAntigo, null, connection); 

            const { validade, local, descricao, numero_serial } = newData; 
            const queryUpdate = ` UPDATE insumo_filial_mutavel SET validade = ?, local = ?, descricao = ?, numero_serial = ? WHERE codigo = ?; `; 
            const [updateResult] = await connection.execute(queryUpdate, [ validade || null, local, descricao || null, numero_serial || null, id ]);

            await connection.commit();
            return updateResult.affectedRows;

        } catch (error) {
            await connection.rollback();
            console.error("Erro em updateAndLog:", error);
            throw error; 
        } finally {
            connection.release();
        }
    }

    static async findHistoryById(idMutavel, empresaCnpj) { // Busca Histórico (mantido)
        /* ...código mantido... */ 
        const connection = await db.getConnection(); try { const queryBuscaMutavel = ` 
            SELECT inf.insumo_codigo, 
            inf.filial_cnpj, 
            inf.numero_serial FROM insumo_filial_mutavel AS inf JOIN filial AS f ON inf.filial_cnpj = f.cnpj WHERE inf.codigo = ? AND f.empresa_cnpj = ?; `; 
            const [rowsMutavel] = await connection.query(queryBuscaMutavel, 
                [idMutavel, empresaCnpj]); if (rowsMutavel.length === 0) {
                     return null; } const { insumo_codigo, filial_cnpj, numero_serial } = rowsMutavel[0]; const queryBuscaImutavel = ` 
                     SELECT im.codigo AS historia_id, 
                     im.vistoria_codigo, 
                     im.validade, 
                     im.local, 
                     im.descricao, 
                     im.numero_serial, 
                     i.descricao AS tipo_insumo FROM insumo_filial_vistoria_imutavel AS im JOIN insumo AS i ON im.insumo_codigo = i.codigo WHERE im.insumo_codigo = ? AND im.filial_cnpj = ? AND im.numero_serial <=> ? ORDER BY im.codigo ASC; `; const [rowsImutavel] = await connection.query(queryBuscaImutavel, [insumo_codigo, filial_cnpj, numero_serial]); return rowsImutavel.map(row => ({ ...row, validade_formatada: formatDateForClient(row.validade) })); } catch (error) { console.error("Erro no Model ao buscar histórico:", error); throw error; } finally { connection.release(); }
    }


    static async remove(id) {
        const [result] = await db.execute('DELETE FROM insumo_filial_mutavel WHERE codigo = ?', [id]);
        return result.affectedRows;
    }
}

module.exports = { Insumo, InsumoFilial };