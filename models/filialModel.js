const db = require('../db');

class Filial {


    /**
     * @param {string} filialCnpj 
     * @returns {Promise<Array<string>>} Array com os nomes dos locais.
     */
    static async findLocationsByFilial(filialCnpj) {
        
        const query = `
            SELECT DISTINCT local 
            FROM insumo_filial_mutavel 
            WHERE filial_cnpj = ? 
              AND local IS NOT NULL 
              AND local <> '' -- Ignora vazios
            ORDER BY local ASC;
        `;
        const [rows] = await db.query(query, [filialCnpj]);
        return rows.map(row => row.local); 
    }
    /**
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
     * @param {string} empresaCnpj 
     * @returns {Promise<Array>}
     */
    static async findByEmpresa(empresaCnpj) {
        const query = 'SELECT * FROM filial WHERE empresa_cnpj = ? ORDER BY nome ASC';
        const [rows] = await db.query(query, [empresaCnpj]);
        return rows;
    }

    /**
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