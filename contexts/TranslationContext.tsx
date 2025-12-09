"use client";

import * as React from "react";

const defaultTranslationContext = {
    _t: (key: string) => key,
};

export const TranslationContext = React.createContext(defaultTranslationContext);

export const useTranslation = () => {
    return React.useContext(TranslationContext);
};

export const useTranslationContext = () => {
    return React.useContext(TranslationContext);
};

type TranslationProviderProps = {
    children: React.ReactNode;
};

export const TranslationProvider = ({ children }: TranslationProviderProps) => {
    // Simple pass-through translation (no internationalization)
    const _t = (key: string) => key;

    return (
        <TranslationContext.Provider value={{ _t }}>
            {children}
        </TranslationContext.Provider>
    );
};
