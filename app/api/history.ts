import * as SecureStore from "expo-secure-store";

const API_BASE = "https://sv0gotfhtb.execute-api.ap-south-1.amazonaws.com/Prod";

export async function fetchRechargeHistory(machineId: string) {
  const token = await SecureStore.getItemAsync("auth_token");

  console.log("Fetching history for machineId:", machineId);

  const response = await fetch(
    `${API_BASE}/warden/recharge-history/${machineId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  const data = await response.json();
  console.log("History API response:", JSON.stringify(data));
  console.log("History API status:", response.status);

  if (!response.ok) {
    // Log the full error so we can see exactly what server says
    console.log("History error detail:", data.error || data.message || "Unknown");
    throw new Error(data.error || data.message || "Failed to fetch history");
  }

  // Handle case where data.data might be null or empty
  if (!data.data) {
    console.log("No history data returned — returning empty array");
    return [];
  }

  return data.data;
}