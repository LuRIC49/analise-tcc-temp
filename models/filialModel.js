const db = require('../db');

class Filial {
    /**
     * Busca uma única filial pelo seu CNPJ, garantindo que ela pertença à empresa logada.
     * @param {string} filialCnpj
     * @param {string} empresaCnpj 
     * @returns {Promise<object|null>}
     */
    static async findById(filialCnpj, empresaCnpj) {
        const query = 'SELECT * FROM filial WHERE cnpj = ? AND empresa_cnpj = ?';
        const [rows] = await db.query(query, [filialCnpj, empresaCnpj]);
        return rows[0];
    }

    /**
     * Busca todas as filiais pertencentes a uma empresa.
     * @param {string} empresaCnpj 
     * @returns {Promise<Array>} array com todas as filiais encontradas.
     */
    static async findByEmpresa(empresaCnpj) {
        const query = 'SELECT * FROM filial WHERE empresa_cnpj = ? ORDER BY nome ASC';
        const [rows] = await db.query(query, [empresaCnpj]);
        return rows;
    }

    /**
     * Cria um novo registro de filial no banco de dados.
     * @param {object} data - nome, cnpj, endereco, email_responsavel.
     * @param {string} empresaCnpj 
     * @returns {Promise<object>}
     */
    static async create(data, empresaCnpj) {
        const { nome, cnpj, endereco, email_responsavel } = data;
        const query = 'INSERT INTO filial (cnpj, empresa_cnpj, nome, endereco, email_responsavel) VALUES (?, ?, ?, ?, ?)';
        const [result] = await db.execute(query, [cnpj, empresaCnpj, nome, endereco, email_responsavel]);
        return result;
    }
}

module.exports = Filial;