import { createContext, useContext, useState, ReactNode } from "react";

type HistoryItem = {
  id: string;
  amount: number;
};

const HistoryContext = createContext<{
  history: HistoryItem[];
  addHistory: (item: HistoryItem) => void;
} | null>(null);

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  
  const addHistory = (item: HistoryItem) => {
    setHistory((prev) => [item, ...prev]);
  };

  return (
    <HistoryContext.Provider value={{ history, addHistory }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error("useHistory must be inside HistoryProvider");
  return ctx;
}
