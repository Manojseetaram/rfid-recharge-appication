import * as SecureStore from "expo-secure-store";

const API_BASE = "https://sv0gotfhtb.execute-api.ap-south-1.amazonaws.com/Prod";

export async function rechargeMachineRFID(machineId: string, amount: number) {
  const token = await SecureStore.getItemAsync("auth_token");

  const payload = { recharge_amount: Number(amount) };  // ← plain object, NOT stringified
  console.log("Recharge payload:", payload);

  const response = await fetch(`${API_BASE}/warden/recharge/${machineId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),  // ← ONE stringify only
  });

  const text = await response.text();
  console.log("Recharge response:", text, "Status:", response.status);

  if (!response.ok) throw new Error(text);

  return JSON.parse(text);
}