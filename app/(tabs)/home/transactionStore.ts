import AsyncStorage from "@react-native-async-storage/async-storage";

export type Transaction = {
  id: string;
  type: "initialize" | "recharge" | "deduct";
  amount: number;
  date: string;
};

const STORAGE_KEY = "transactions_store";

// Load transactions
export async function getTransactions(): Promise<Transaction[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export async function addTransaction(type: string, amount: number) {
  console.log("Saving transaction:", type, amount);

  const existing = await getTransactions();
  console.log("Existing:", existing);

  const newTransaction = {
    id: Date.now().toString(),
    type,
    amount,
    date: new Date().toLocaleString(),
  };

  const updated = [newTransaction, ...existing];

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  console.log("Saved:", updated);
}


export async function clearTransactions() {
  await AsyncStorage.removeItem(STORAGE_KEY);
  console.log(" All transactions cleared");
}