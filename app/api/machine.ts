import * as SecureStore from "expo-secure-store";

const API_BASE = "https://sv0gotfhtb.execute-api.ap-south-1.amazonaws.com/Prod";

export async function rechargeMachineRFID(machineId: string, amount: number) {
  const token = await SecureStore.getItemAsync("auth_token");

  // Server expects recharge_amount as a STRING, not a number
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