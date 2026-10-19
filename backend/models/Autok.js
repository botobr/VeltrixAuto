const mongoose = require('mongoose');

const autokSchema = new mongoose.Schema(
    {
        marka: {
            type: String,
            required: true,
        },
        modell: {
            type: String,
            required: true,
        },
        szin: {
            type: String,
            required: true,
        },
        kivitel: {
            type: String,
            required: true,
        },
        uzemanyag: {
            type: String,
            required: true,
        },
        szarmazasi_hely: {
            type: String,
            required: true,
        },
        evjarat: {
            type: Number,
            required: true,
        },
        vetel_ar: {
            type: Number,
            required: true,
        },
        teljesitmeny: {
            type: Number,
            required: true,
        },
        hengerur_tartalom: {
            type: Number,
            required: true,
        },
        kmora_allas: {
            type: Number,
            required: true,
        },
        kep: {
            type: String,
            required: true,
        },
    },
    { timestamps: true },
);

const AutoModel = mongoose.model('auto', autokSchema);

module.exports = AutoModel;