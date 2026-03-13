import * as SecureStore from "expo-secure-store";

const API_BASE = "https://sv0gotfhtb.execute-api.ap-south-1.amazonaws.com/Prod";

// ─────────────────────────────────────────────
// CHECK IF CARD IS REGISTERED ON SERVER
// Returns card info if found, null on API error
// { exists: false } if 404 / not found → safe to re-init
// ─────────────────────────────────────────────
export async function checkCardOnServer(cardId: string): Promise<{
  exists: boolean;
  balance?: number;
  usn?: string;
} | null> {
  try {
    const token = await SecureStore.getItemAsync("auth_token");
    if (!token) throw new Error("Token missing");

    const response = await fetch(
      `${API_BASE}/machine-user/rfid/check-card/${cardId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const text = await response.text();
    console.log("Check card response:", text, "status:", response.status);

    // 404 → card not on server → safe to re-init
    if (response.status === 404) return { exists: false };

    // Any other non-OK → API error, be safe
    if (!response.ok) return null;

    const json = JSON.parse(text);
    const data = json.data ?? json;

    return {
      exists: true,
      balance: parseFloat(data.balance ?? data.recharge_amount ?? "0"),
      usn: data.usn ?? data.student_usn ?? "",
    };
  } catch (e) {
    console.log("checkCardOnServer error:", e);
    return null;
  }
}

// ─────────────────────────────────────────────
// INITIALIZE CARD ON SERVER
// Call this AFTER BLE init succeeds
// ─────────────────────────────────────────────
export async function initializeMachineRFID(
  machineId: string,
  amount: number,
  cardId: string,
  usn: string
) {
  const token = await SecureStore.getItemAsync("auth_token");
  if (!token) throw new Error("Token missing");

  const payload = {
    card_id: cardId,
    usn: usn,
    recharge_amount: String(amount),
  };

  console.log("Initialize payload:", JSON.stringify(payload));

  const response = await fetch(
    `${API_BASE}/machine-user/rfid/initiate/${machineId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );

  const text = await response.text();
  console.log("Initialize response:", text);
  console.log("Initialize status:", response.status);

  if (!response.ok) throw new Error(text);

  return JSON.parse(text);
}