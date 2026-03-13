import * as SecureStore from "expo-secure-store";

const API_BASE = "https://sv0gotfhtb.execute-api.ap-south-1.amazonaws.com/Prod";

// ─────────────────────────────────────────────
// CHECK IF CARD EXISTS ON SERVER (by card_id only)
//
// Returns:
//   null           → API error → BLOCK (safe)
//   { exists: false } → 404, card not registered → ALLOW init
//   { exists: true  } → card already registered → BLOCK forever
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

    // 404 → not registered → allow init
    if (response.status === 404) return { exists: false };

    // Other error → block to be safe
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
// REGISTER CARD ON SERVER
// Called AFTER BLE init succeeds
// ─────────────────────────────────────────────
export async function initializeMachineRFID(
  machineId: string,
  amount: number,
  cardId: string,
  usn: string
): Promise<{ success: boolean }> {
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

  return { success: true };
}