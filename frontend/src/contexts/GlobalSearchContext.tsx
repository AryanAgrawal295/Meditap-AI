import React, { createContext, useContext, useState, useCallback } from 'react';

export interface GlobalSearchState {
  query: string;
  isOpen: boolean;
  highlightId?: string;
}

interface GlobalSearchContextType {
  searchState: GlobalSearchState;
  setSearchQuery: (query: string) => void;
  setSearchOpen: (isOpen: boolean) => void;
  clearSearch: () => void;
}

const GlobalSearchContext = createContext<GlobalSearchContextType | undefined>(
  undefined
);

export function GlobalSearchProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [searchState, setSearchState] = useState<GlobalSearchState>({
    query: '',
    isOpen: false,
  });

  const setSearchQuery = useCallback((query: string) => {
    setSearchState((prev) => ({ ...prev, query }));
  }, []);

  const setSearchOpen = useCallback((isOpen: boolean) => {
    setSearchState((prev) => ({ ...prev, isOpen }));
  }, []);

  const clearSearch = useCallback(() => {
    setSearchState({
      query: '',
      isOpen: false,
    });
  }, []);

  return (
    <GlobalSearchContext.Provider
      value={{
        searchState,
        setSearchQuery,
        setSearchOpen,
        clearSearch,
      }}
    >
      {children}
    </GlobalSearchContext.Provider>
  );
}

export function useGlobalSearch() {
  const context = useContext(GlobalSearchContext);
  if (!context) {
    throw new Error(
      'useGlobalSearch must be used within GlobalSearchProvider'
    );
  }
  return context;
}
