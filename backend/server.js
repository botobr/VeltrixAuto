const dotenv = require('dotenv');
dotenv.config();

const app = require('./app')();
const adatbazisKapcsolodas = require('./utils/adatbazis');
const { takaritasInditasa } = require('./utils/takaritas');

const PORT = process.env.PORT || 3600;

adatbazisKapcsolodas()
    .then(() => {
        console.log('Sikeres adatbázis csatlakozás!');

        app.listen(PORT, () => {
            console.log('http://localhost:' + PORT + '/api');
        });

        // 10 percenként lemondjuk a ki nem fizetett rendeléseket (TAKARITAS=ki esetén nem)
        if (process.env.TAKARITAS !== 'ki') {
            takaritasInditasa(10);
        }
    })
    .catch((error) => {
        console.error('Hiba: ' + error.message);
        process.exit(1);
    });
