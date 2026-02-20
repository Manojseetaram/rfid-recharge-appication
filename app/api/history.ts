import * as SecureStore from "expo-secure-store";

const API_BASE =
  "https://sv0gotfhtb.execute-api.ap-south-1.amazonaws.com/Prod";

export async function fetchRechargeHistory(machineId: string) {

  const token = await SecureStore.getItemAsync("auth_token");

  const response = await fetch(
    `${API_BASE}/warden/recharge-history/${machineId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error("Failed to fetch history");
  }

  return data.data;
}
