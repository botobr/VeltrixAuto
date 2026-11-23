import { createContext, useContext } from 'react';

export const FelhasznaloContext = createContext(null);

// a bejelentkezett felhasználó adatai bármelyik komponensben
export const useFelhasznalo = () => {
    const context = useContext(FelhasznaloContext);
    if (!context) {
        throw new Error('A useFelhasznalo csak a FelhasznaloProvideren belül használható.');
    }
    return context;
};
