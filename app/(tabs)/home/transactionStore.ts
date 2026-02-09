// Simple in-memory store for transactions and balance
type Transaction = {
  id: string;
  type: "initialize" | "recharge" | "deduct";
  amount: number;
  date: string;
};

let transactions: Transaction[] = [
  { id: "1", type: "initialize", amount: 500, date: "2025-02-05 11:20 AM" },
  { id: "2", type: "recharge", amount: 100, date: "2025-02-09 10:30 AM" },
];

let balance = 600; // Initial balance (500 + 100)

// Get all transactions
export function getTransactions(): Transaction[] {
  return [...transactions];
}

// Get current balance
export function getBalance(): number {
  return balance;
}

// Add a new transaction
export function addTransaction(type: "initialize" | "recharge" | "deduct", amount: number) {
  const newTransaction: Transaction = {
    id: Date.now().toString(),
    type,
    amount,
    date: new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  };

  transactions.unshift(newTransaction);

  // Update balance
  if (type === "initialize" || type === "recharge") {
    balance += amount;
  } else if (type === "deduct") {
    balance -= amount;
  }
}

// Calculate balance from all transactions
export function recalculateBalance() {
  balance = transactions.reduce((total, transaction) => {
    if (transaction.type === "initialize" || transaction.type === "recharge") {
      return total + transaction.amount;
    } else if (transaction.type === "deduct") {
      return total - transaction.amount;
    }
    return total;
  }, 0);
  return balance;
}