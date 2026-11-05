const dotenv = require('dotenv');
dotenv.config();

const app = require('./app')();
const dbConnection = require('./utils/dbConnect.js');

const PORT = process.env.PORT || 3600;

dbConnection()
    .then(() => {
        console.log('Sikeres adatbázis csatlakozás!');

        app.listen(PORT, () => {
            console.log(`http://localhost:${PORT}/api`);
        });
    })
    .catch((error) => {
        console.error(`Hiba: ${error.message}`);
    });
