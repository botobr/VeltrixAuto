const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
    {
        nev: {
            type: String,
            required: true,
            trim: true,
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
        statusz: {
            type: String,
            required: true,
            enum: ['admin'],
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

userSchema.methods.comparePassword = function (jelszo) {
    return bcrypt.compare(jelszo, this.jelszo);
};

const UserModel = mongoose.model('user', userSchema);

module.exports = UserModel;