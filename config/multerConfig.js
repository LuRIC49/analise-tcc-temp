const multer = require('multer');
const path = require('path');
const fs = require('fs');

//define a pasta das imagens
const uploadPath = path.join(__dirname, '..', 'public', 'uploads');

//verifica se o diretorio existe
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath); //salva no diretorio
    },
    filename: (req, file, cb) => {
        // Cria um nome de arquivo único para evitar conflitos (ex: 1678886400000.png)
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB por arquivo
    fileFilter: (req, file, cb) => {
        // Filtro para aceitar apenas imagens
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
    cb(new Error('Apenas imagens são permitidas (jpeg, jpg, png, gif)!'));
    }
});

module.exports = upload;