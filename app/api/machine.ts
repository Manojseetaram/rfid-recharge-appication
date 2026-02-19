import * as SecureStore from "expo-secure-store";

const API_BASE =
  "https://sv0gotfhtb.execute-api.ap-south-1.amazonaws.com/Prod";

export async function rechargeMachineRFID(
  machineId: string,
  amount: number
) {

  const token = await SecureStore.getItemAsync("auth_token");

  console.log("🔐 TOKEN:", token);
  console.log("🏭 MACHINE ID:", machineId);
  console.log("💰 AMOUNT:", amount);

  const response = await fetch(
    `${API_BASE}/warden/recharge/${machineId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        recharge_amount: amount,
      }),
    }
  );

  const text = await response.text();

  console.log("🧨 SERVER RESPONSE:", text);
  console.log("📛 STATUS:", response.status);

  if (!response.ok) {
    throw new Error(text);
  }

  return JSON.parse(text);
}
