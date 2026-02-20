import * as SecureStore from "expo-secure-store";

const API_BASE = "https://sv0gotfhtb.execute-api.ap-south-1.amazonaws.com/Prod";

// ── Check machine wallet balance before recharge ──
export async function fetchMachineBalance(machineId: string): Promise<number> {
  const token = await SecureStore.getItemAsync("auth_token");

  const response = await fetch(`${API_BASE}/warden/fetchMachineBalance/${machineId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const json = await response.json();
  console.log("Machine balance check:", json);

  if (!response.ok) throw new Error(json.message || "Failed to fetch machine balance");

  const balance = parseFloat(json.data?.balance ?? "0");
  return isNaN(balance) ? 0 : balance;
}

// ── Sync recharge to server after BLE success ──
export async function rechargeMachineRFID(machineId: string, amount: number) {
  const token = await SecureStore.getItemAsync("auth_token");

  const payload = { recharge_amount: String(amount) };
  console.log("Recharge payload:", JSON.stringify(payload));

  const response = await fetch(`${API_BASE}/warden/recharge/${machineId}`, {
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

  if (!response.ok) throw new Error(text);

  return JSON.parse(text);
}