const db = require('../db');

class Vistoria {

    /**
     * @param {number} id - O código da vistoria.
     * @param {string} empresaCnpj - O CNPJ da empresa logada.
     * @returns {Promise<object|null>}
     */
    static async findByIdAndEmpresa(id, empresaCnpj) {
        const query = `
            SELECT v.* FROM vistoria AS v
            JOIN filial AS f ON v.filial_cnpj = f.cnpj
            WHERE v.codigo = ? AND f.empresa_cnpj = ?;
        `;
        const [rows] = await db.query(query, [id, empresaCnpj]);
        return rows[0];
    }


    /**
     * Busca uma vistoria pelo seu Código.
     * @param {number} id 
     * @returns {Promise<object|null>}
     */
    static async findById(id) {
        const [rows] = await db.query('SELECT * FROM vistoria WHERE codigo = ?', [id]);
        return rows[0];
    }

    /**
     * Busca todas as vistorias de uma filial específica.
     * @param {string} filialCnpj 
     * @returns {Promise<Array>} array com as vistorias encontradas.
     */
    static async findByFilial(filialCnpj) {
        const query = 'SELECT * FROM vistoria WHERE filial_cnpj = ? ORDER BY data_inicio DESC';
        const [rows] = await db.query(query, [filialCnpj]);
        return rows;
    }

    /**
     * Cria uma nova vistoria.
     * @param {object} data - Contém filial_cnpj e tecnico_responsavel.
     * @returns {Promise<number>} O ID da nova vistoria criada.
     */
    static async create({ filial_cnpj, tecnico_responsavel }) {
        const query = 'INSERT INTO vistoria (filial_cnpj, data_inicio, tecnico_responsavel) VALUES (?, CURDATE(), ?)';
        const [result] = await db.execute(query, [filial_cnpj, tecnico_responsavel]);
        return result.insertId;
    }

    /**
     * Marca uma vistoria como finalizada, preenchendo a data_fim.
     * @param {number} id 
     * @returns {Promise<number>}
     */
    static async finalize(id) {
        const query = 'UPDATE vistoria SET data_fim = CURDATE() WHERE codigo = ?';
        const [result] = await db.execute(query, [id]);
        return result.affectedRows;
    }


}

module.exports = Vistoria;