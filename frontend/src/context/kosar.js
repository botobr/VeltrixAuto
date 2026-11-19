import { createContext, useContext } from 'react';

export const MAX_MENNYISEG = 99;
export const KosarContext = createContext(null);

export const useKosar = () => {
    const context = useContext(KosarContext);
    if (!context) throw new Error('A useKosar a KosarProvideren belül használható.');
    return context;
};
