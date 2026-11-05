const publicUser = (user) => {
    const userData = user.toObject ? user.toObject() : { ...user };
    delete userData.jelszo;
    delete userData.mentettKeresesek;
    userData.kedvencek = (userData.kedvencek || []).map(String);
    return userData;
};

module.exports = publicUser;
