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
    static async findByFilial(filialCnpj) {
        const query = `
            SELECT inf.codigo, inf.validade, inf.local, inf.descricao AS descricao_item, i.descricao, i.imagem
            FROM insumo_filial AS inf
            JOIN insumo AS i ON inf.insumo_codigo = i.codigo
            WHERE inf.filial_cnpj = ?
            ORDER BY i.descricao ASC;
        `;
        const [rows] = await db.query(query, [filialCnpj]);

        // LÓGICA DE NEGÓCIO 100% NO BACKEND
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

            // Retorna um objeto PRONTO para o frontend consumir
            return {
                ...row,
                status: status,
                validade_formatada: formatDateForClient(row.validade) // Novo campo apenas para exibição
            };
        });
    }

    /**
     * Lista todos os insumos registrados DENTRO de uma vistoria específica.
     * @param {number} vistoriaId - O ID da vistoria.
     * @returns {Promise<Array>} Um array com os insumos da vistoria.
     */
    static async findByVistoria(vistoriaId) {
        const query = `
            SELECT i.descricao, inf.*
            FROM insumo_filial AS inf
            JOIN insumo AS i ON inf.insumo_codigo = i.codigo
            WHERE inf.vistoria_codigo = ?;
        `;
        const [rows] = await db.query(query, [vistoriaId]);
        return rows;
    }

    /**
     * Adiciona um novo insumo a uma vistoria (e à filial).
     * @param {object} data - Contém filial_cnpj, vistoria_codigo, tipo_descricao, etc.
     * @returns {Promise<object>} O resultado da inserção.
     */
    static async create(data) {
        const { filial_cnpj, vistoria_codigo, tipo_descricao, validade, local, descricao_item } = data;
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const insumo_codigo = await Insumo.findOrCreateType(tipo_descricao, connection);
            const query = 'INSERT INTO insumo_filial (insumo_codigo, filial_cnpj, vistoria_codigo, validade, local, descricao) VALUES (?, ?, ?, ?, ?, ?)';
            const [result] = await connection.execute(query, [insumo_codigo, filial_cnpj, vistoria_codigo, validade || null, local, descricao_item || null]);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Remove um insumo do inventário (insumo_filial).
     * @param {number} id - O ID do registro em insumo_filial.
     * @returns {Promise<number>} O número de linhas afetadas.
     */
    static async remove(id) {
        const [result] = await db.execute('DELETE FROM insumo_filial WHERE codigo = ?', [id]);
        return result.affectedRows;
    }
}

module.exports = { Insumo, InsumoFilial };