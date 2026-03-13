import * as SecureStore from "expo-secure-store";

const API_BASE = "https://sv0gotfhtb.execute-api.ap-south-1.amazonaws.com/Prod";

// ─────────────────────────────────────────────
// FETCH MACHINE BALANCE
// ─────────────────────────────────────────────
export async function fetchMachineBalance(machineId: string): Promise<number> {
  const token = await SecureStore.getItemAsync("auth_token");

  const response = await fetch(`${API_BASE}/machine-user/fetchMachineBalance/${machineId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const json = await response.json();
  if (!response.ok) throw new Error(json.message || "Failed to fetch machine balance");

  const balance = parseFloat(json.data?.balance ?? "0");
  return isNaN(balance) ? 0 : balance;
}

// ─────────────────────────────────────────────
// SERVER-FIRST RECHARGE
// Called BEFORE BLE — server validates:
//   • card exists and is active
//   • machine has enough balance
// If server returns 400 → card inactive / not found / machine balance low
// Only if this succeeds (200) do we proceed to BLE physical recharge
// ─────────────────────────────────────────────
export async function rechargeMachineRFID(
  machineId: string,
  amount: number,
  cardId: string
): Promise<{ success: boolean; transactionId?: string }> {
  const token = await SecureStore.getItemAsync("auth_token");

  const payload = {
    recharge_amount: String(amount),
    card_id: cardId,
  };

  console.log("Recharge payload:", JSON.stringify(payload));

  const response = await fetch(`${API_BASE}/machine-user/recharge-rfid/${machineId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  console.log("Recharge response:", text);
  console.log("Status:", response.status);

  // Server rejects → card inactive / not found / machine balance low
  // Throw raw text so recharge.tsx can parse the exact error message
  if (!response.ok) throw new Error(text);

  const json = JSON.parse(text);
  return {
    success: true,
    transactionId: json.data?.transaction_id ?? json.transaction_id,
  };
}