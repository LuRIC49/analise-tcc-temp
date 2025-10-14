const bcrypt = require('bcryptjs');

// 1. Defina a senha que você quer usar para o seu administrador
const senhaAdmin = '123123123'; // <-- MUDE PARA A SENHA DESEJADA

// 2. O "custo" do hash (salt rounds). 10 é o mesmo valor que você usa no seu controller.
const saltRounds = 10;

console.log(`Gerando hash para a senha: "${senhaAdmin}"`);

// 3. Gera o hash
bcrypt.hash(senhaAdmin, saltRounds, function(err, hash) {
    if (err) {
        console.error('Ocorreu um erro ao gerar o hash:', err);
        return;
    }

    console.log('\n✅ Hash gerado com sucesso!');
    console.log('\n--- COPIE O HASH ABAIXO E COLE NO BANCO DE DADOS ---');
    console.log(hash);
    console.log('----------------------------------------------------');
});