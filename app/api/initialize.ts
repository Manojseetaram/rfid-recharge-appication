import * as SecureStore from "expo-secure-store";

const API_BASE = "https://sv0gotfhtb.execute-api.ap-south-1.amazonaws.com/Prod";

export async function initializeMachineRFID(
  machineId: string,
  amount: number,
  cardId: string,
  usn: string,
) {
  const token = await SecureStore.getItemAsync("auth_token");
  if (!token) throw new Error("Token missing");

  // ✅ Only 3 fields — matches backend reqBody exactly
  const payload = {
    card_id: cardId,
    usn: usn,
    recharge_amount: String(amount),
  };

  console.log("Initialize payload:", JSON.stringify(payload));

  // ✅ machineId interpolated into URL — not literal `:machine_id`
  const response = await fetch(`${API_BASE}/machine-user/rfid/initiate/${machineId}`, {
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