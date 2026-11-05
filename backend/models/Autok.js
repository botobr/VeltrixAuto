const mongoose = require('mongoose');

const autokSchema = new mongoose.Schema(
    {
        marka: {
            type: String,
            required: true,
            trim: true,
        },
        modell: {
            type: String,
            required: true,
            trim: true,
        },
        szin: {
            type: String,
            required: true,
            trim: true,
        },
        kivitel: {
            type: String,
            required: true,
            trim: true,
        },
        uzemanyag: {
            type: String,
            required: true,
            trim: true,
        },
        szarmazasi_hely: {
            type: String,
            required: true,
            trim: true,
        },
        evjarat: {
            type: Number,
            required: true,
            min: 0,
        },
        vetel_ar: {
            type: Number,
            required: true,
            min: 0,
        },
        teljesitmeny: {
            type: Number,
            required: true,
            min: 0,
        },
        hengerur_tartalom: {
            type: Number,
            required: true,
            min: 0,
        },
        kmora_allas: {
            type: Number,
            required: true,
            min: 0,
        },
        kep: {
            type: String,
            required: true,
        },
        kepPublicId: {
            type: String,
        },
        elado_nev: {
            type: String,
            trim: true,
            maxlength: 120,
            default: '',
        },
        elado_telefonszam: {
            type: String,
            trim: true,
            maxlength: 40,
            default: '',
        },
        leiras: {
            type: String,
            trim: true,
            maxlength: 2000,
            default: '',
        },
    },
    { timestamps: true },
);

const AutoModel = mongoose.model('auto', autokSchema);

module.exports = AutoModel;