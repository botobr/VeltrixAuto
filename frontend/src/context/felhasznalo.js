import { createContext, useContext } from 'react';

export const FelhasznaloContext = createContext(null);

export const useFelhasznalo = () => {
    const context = useContext(FelhasznaloContext);
    if (!context) throw new Error('A useFelhasznalo az AuthProvideren belül használható.');
    return context;
};
