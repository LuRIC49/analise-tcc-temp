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
     * NOVO: Adiciona um insumo diretamente ao inventário (sem vistoria).
     * Salva no estado atual (mutavel) e no histórico (imutavel com vistoria_codigo NULL).
     */
    static async createDirect(data) {
        const { filial_cnpj, tipo_descricao, validade, local, descricao_item } = data;
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const insumo_codigo = await Insumo.findOrCreateType(tipo_descricao, connection);
            
            // 1. Insere no inventário geral da filial (tabela mutável)
            const queryMutavel = 'INSERT INTO insumo_filial_mutavel (insumo_codigo, filial_cnpj, validade, local, descricao) VALUES (?, ?, ?, ?, ?)';
            const [mutavelResult] = await connection.execute(queryMutavel, [insumo_codigo, filial_cnpj, validade || null, local, descricao_item || null]);
            
            // Cria um objeto com os dados inseridos para logar
            const dadosParaHistorico = {
                insumo_codigo,
                filial_cnpj,
                vistoria_codigo: null, // Explícitamente nulo
                validade: validade || null,
                local,
                descricao: descricao_item || null
            };

            // 2. Insere no histórico (tabela imutável) com vistoria_codigo NULL
            await InsumoFilial.createImutavelRecord(dadosParaHistorico, null, connection);
            
            await connection.commit();
            return mutavelResult; // Retorna o resultado da inserção na tabela mutável

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Método auxiliar para inserir no histórico imutável (reutilizado)
     * Certifique-se de que este método já existe ou adicione-o.
     */
    static async createImutavelRecord(insumoData, vistoriaCodigoOverride = null, connection) {
        const conn = connection || db;
        const query = `
            INSERT INTO insumo_filial_vistoria_imutavel 
                (insumo_codigo, filial_cnpj, vistoria_codigo, validade, local, descricao) 
            VALUES (?, ?, ?, ?, ?, ?);
        `;
        const vistoriaCodigoParaSalvar = vistoriaCodigoOverride !== null ? vistoriaCodigoOverride : (insumoData.vistoria_codigo || null);
        await conn.execute(query, [
            insumoData.insumo_codigo,
            insumoData.filial_cnpj,
            vistoriaCodigoParaSalvar,
            insumoData.validade || null,
            insumoData.local,
            insumoData.descricao || null
        ]);
    }











    static async findByFilial(filialCnpj) {
        const query = `
            SELECT inf.codigo, inf.validade, inf.local, inf.descricao AS descricao_item, i.descricao, i.imagem
            FROM insumo_filial_mutavel AS inf
            JOIN insumo AS i ON inf.insumo_codigo = i.codigo
            WHERE inf.filial_cnpj = ?
            ORDER BY i.descricao ASC;
        `;
        const [rows] = await db.query(query, [filialCnpj]);

        return rows.map(row => {
            let status = 'status-ok'; // Padrão Verde

            if (row.validade) {
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);

                const dataValidade = parseDateAsLocal(row.validade);

                const diffTime = dataValidade - hoje;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 0) {
                    status = 'status-expired'; // Vermelho
                } else if (diffDays <= 30) {
                    status = 'status-warning'; // Amarelo
                }
            }
            return {
                ...row,
                status: status,
                validade_formatada: formatDateForClient(row.validade)
            };
        });
    }



/**
     * Busca um único insumo do inventário geral pelo seu ID,
     * garantindo que ele pertença à empresa do usuário logado.
     * @param {number} id - O ID do registro em insumo_filial_mutavel.
     * @param {string} empresaCnpj - O CNPJ da empresa logada para verificação de propriedade.
     * @returns {Promise<object|null>} O objeto do insumo ou null.
     */
    static async findById(id, empresaCnpj) {
        const query = `
            SELECT inf.*, i.descricao as tipo_insumo, i.imagem
            FROM insumo_filial_mutavel AS inf
            JOIN insumo AS i ON inf.insumo_codigo = i.codigo
            JOIN filial AS f ON inf.filial_cnpj = f.cnpj
            WHERE inf.codigo = ? AND f.empresa_cnpj = ?;
        `;
        const [rows] = await db.query(query, [id, empresaCnpj]);

        if (rows.length === 0) return null;

        const row = rows[0];
        return {
            ...row,
            validade_formatada: formatDateForClient(row.validade)
        };
    }









    /**
     * Lista todos os insumos registrados DENTRO de uma vistoria específica.
     * @param {number} vistoriaId 
     * @returns {Promise<Array>} array com os insumos da vistoria.
     */
    static async findByVistoria(vistoriaId) {
        const query = `
            SELECT i.descricao, inf.*
            FROM insumo_filial_vistoria_imutavel AS inf
            JOIN insumo AS i ON inf.insumo_codigo = i.codigo
            WHERE inf.vistoria_codigo = ?;
        `;
        const [rows] = await db.query(query, [vistoriaId]);
        return rows;
    }

/**
     * ATUALIZADO: Adiciona um novo insumo.
     * Insere tanto no histórico (imutavel) quanto no estado atual (mutavel).
     */
    static async create(data) {
        const { filial_cnpj, vistoria_codigo, tipo_descricao, validade, local, descricao_item } = data;
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const insumo_codigo = await Insumo.findOrCreateType(tipo_descricao, connection);
            
            // 1. Insere no histórico da vistoria (tabela imutável)
            const queryImutavel = 'INSERT INTO insumo_filial_vistoria_imutavel (insumo_codigo, filial_cnpj, vistoria_codigo, validade, local, descricao) VALUES (?, ?, ?, ?, ?, ?)';
            await connection.execute(queryImutavel, [insumo_codigo, filial_cnpj, vistoria_codigo, validade || null, local, descricao_item || null]);

            // 2. Insere no inventário geral da filial (tabela mutável)
            const queryMutavel = 'INSERT INTO insumo_filial_mutavel (insumo_codigo, filial_cnpj, validade, local, descricao) VALUES (?, ?, ?, ?, ?)';
            await connection.execute(queryMutavel, [insumo_codigo, filial_cnpj, validade || null, local, descricao_item || null]);
            
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error; // Propaga o erro para o controller
        } finally {
            connection.release();
        }
    }


static async remove(id) {
        const [result] = await db.execute('DELETE FROM insumo_filial_mutavel WHERE codigo = ?', [id]);
        return result.affectedRows;
    }
    
/**
     * NOVO: Atualiza os dados de um insumo no inventário geral (mutável).
     * @param {number} id - O ID do registro em insumo_filial_mutavel.
     * @param {object} data - Contém os novos dados (validade, local, descricao).
     * @returns {Promise<number>} O número de linhas afetadas.
     */
    static async update(id, data) {
        const { validade, local, descricao } = data;
        const query = `
            UPDATE insumo_filial_mutavel
            SET validade = ?, local = ?, descricao = ?
            WHERE codigo = ?;
        `;
        const [result] = await db.execute(query, [validade || null, local, descricao || null, id]);
        return result.affectedRows;
    }


}

module.exports = { Insumo, InsumoFilial };