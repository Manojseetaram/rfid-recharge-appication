const API_BASE =
  "https://sv0gotfhtb.execute-api.ap-south-1.amazonaws.com/Prod";
export async function fetchMachineBalance(machineId: string) {
  const response = await fetch(
    `${API_BASE}/machine/fetch-machine-balance/${machineId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch balance");
  }

  return data;
}
