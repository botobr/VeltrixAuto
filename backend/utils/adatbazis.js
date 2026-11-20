const mongoose = require('mongoose');
const dns = require('dns');

dns.setServers(['8.8.8.8', '8.8.4.4']);

const adatbazisKapcsolodas = async () => {
    const connection = await mongoose.connect(process.env.MONGO_DB);
    return connection;
};

module.exports = adatbazisKapcsolodas;