const dotenv = require('dotenv');
dotenv.config();

const app = require('./app')();
const adatbazisKapcsolodas = require('./utils/adatbazis');

const PORT = process.env.PORT || 3600;

adatbazisKapcsolodas()
    .then(() => {
        console.log('Sikeres adatbázis csatlakozás!');

        app.listen(PORT, () => {
            console.log(`http://localhost:${PORT}/api`);
        });
    })
    .catch((error) => {
        console.error(`Hiba: ${error.message}`);
        process.exit(1);
    });
