import { createContext, useContext } from 'react';

export const MAX_OSSZEHASONLITAS = 4;
export const OsszehasonlitasContext = createContext(null);

export const useOsszehasonlitas = () => {
    const context = useContext(OsszehasonlitasContext);
    if (!context) throw new Error('A useOsszehasonlitas az OsszehasonlitasProvideren belül használható.');
    return context;
};
