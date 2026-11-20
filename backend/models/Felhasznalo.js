const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { SZEREPKOROK } = require('../utils/jogosultsagok');

const mentettKeresesSchema = new mongoose.Schema(
    {
        nev: { type: String, required: true, trim: true, maxlength: 80 },
        // A szűrőparaméterek ugyanabban a formában, ahogy az /api/autok várja őket.
        parameterek: { type: Map, of: String, default: {} },
        ertesites: { type: Boolean, default: true },
        utolsoMegtekintes: { type: Date, default: Date.now },
    },
    { timestamps: true },
);

const userSchema = new mongoose.Schema(
    {
        nev: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        jelszo: {
            type: String,
            required: true,
            minlength: 6,
        },
        // A régi, már létező fiókok visszamenőleg hitelesítettnek számítanak.
        emailHitelesitve: { type: Boolean, default: true },
        emailHitelesitoTokenHash: { type: String, default: null, select: false },
        emailHitelesitoLejarat: { type: Date, default: null, select: false },
        jelszoVisszaallitoTokenHash: { type: String, default: null, select: false },
        jelszoVisszaallitoLejarat: { type: Date, default: null, select: false },
        statusz: {
            type: String,
            required: true,
            enum: SZEREPKOROK,
            default: 'felhasznalo',
        },
        kedvencek: {
            type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'auto' }],
            default: [],
        },
        mentettKeresesek: {
            type: [mentettKeresesSchema],
            default: [],
        },
    },
    { timestamps: true },
);

userSchema.pre('save', async function () {
    if (!this.isModified('jelszo')) {
        return;
    }

    this.jelszo = await bcrypt.hash(this.jelszo, 12);
});

userSchema.methods.jelszoEgyezik = function (jelszo) {
    return bcrypt.compare(jelszo, this.jelszo);
};

const FelhasznaloModel = mongoose.model('user', userSchema);

module.exports = FelhasznaloModel;
module.exports.SZEREPKOROK = SZEREPKOROK;
