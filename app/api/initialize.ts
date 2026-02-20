import * as SecureStore from "expo-secure-store";

const API_BASE = "https://sv0gotfhtb.execute-api.ap-south-1.amazonaws.com/Prod";

export async function initializeMachineRFID(machineId: string, amount: number) {
  const token = await SecureStore.getItemAsync("auth_token");

  if (!token) throw new Error("Token missing");

  // Send as STRING — same pattern as recharge which works
  const payload = { initialize_amount: String(amount) };

  console.log("Initialize payload:", JSON.stringify(payload));

  const response = await fetch(`${API_BASE}/warden/initialize/${machineId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  console.log("Initialize response:", text);
  console.log("Initialize status:", response.status);

  if (!response.ok) throw new Error(text);

  return JSON.parse(text);
}