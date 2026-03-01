"use client";

import { createContext, useCallback, useContext, useState } from "react";

const UnsavedChangesContext = createContext(null);

export function UnsavedChangesProvider({ children }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Store handler wrapped in a thunk so React doesn't call it as an updater function
  const [saveHandler, setSaveHandler] = useState(null);

  // Editors call this whenever their unsaved state or save function changes
  const register = useCallback((hasChanges, onSave) => {
    setHasUnsavedChanges(hasChanges);
    setSaveHandler(onSave ? () => onSave : null);
  }, []);

  // Editors call this on unmount to clear the state
  const clear = useCallback(() => {
    setHasUnsavedChanges(false);
    setSaveHandler(null);
  }, []);

  return (
    <UnsavedChangesContext.Provider value={{ hasUnsavedChanges, saveHandler, register, clear }}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  const ctx = useContext(UnsavedChangesContext);
  if (!ctx) throw new Error("useUnsavedChanges must be used within UnsavedChangesProvider");
  return ctx;
}
