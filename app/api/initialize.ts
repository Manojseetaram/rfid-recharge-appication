import * as SecureStore from "expo-secure-store";

const API_BASE =
  "https://sv0gotfhtb.execute-api.ap-south-1.amazonaws.com/Prod";

export async function initializeMachineRFID(
  machineId: string,
  amount: number
) {

  const token = await SecureStore.getItemAsync("auth_token");

  if (!token) {
    throw new Error("Token missing");
  }

  const response = await fetch(
    `${API_BASE}/warden/initialize/${machineId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        initialize_amount: amount,
      }),
    }
  );

  const data = await response.json();

  console.log("INIT SERVER:", data);

  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }

  return data;
}
