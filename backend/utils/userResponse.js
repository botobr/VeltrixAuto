const publicUser = (user) => {
    const userData = user.toObject ? user.toObject() : { ...user };
    delete userData.jelszo;
    return userData;
};

module.exports = publicUser;
