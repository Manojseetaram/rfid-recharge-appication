import * as SecureStore from "expo-secure-store";

const API_BASE = "https://sv0gotfhtb.execute-api.ap-south-1.amazonaws.com/Prod";

// ─────────────────────────────────────────────
// RESULT TYPE for server registration
// ─────────────────────────────────────────────
export type ServerRegisterResult =
  | { status: "success" }
  | { status: "already_registered" }
  | { status: "safe_to_retry"; message: string }    // 4xx / network — DB never touched
  | { status: "ambiguous_failure"; message: string }; // 5xx — DB state unknown

// ─────────────────────────────────────────────
// CHECK IF CARD EXISTS ON SERVER (by card_id only)
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

    if (response.status === 404) return { exists: false };
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
// Returns structured result instead of throwing
// ─────────────────────────────────────────────
export async function initializeMachineRFID(
  machineId: string,
  amount: number,
  cardId: string,
  usn: string
): Promise<ServerRegisterResult> {
  try {
    const token = await SecureStore.getItemAsync("auth_token");
    if (!token) return { status: "safe_to_retry", message: "Auth token missing." };

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
    console.log("Initialize response:", text, "status:", response.status);

    if (response.status === 200) return { status: "success" };

    if (response.status === 409) return { status: "already_registered" };

    // 4xx = failed before DB was touched — safe to retry
    if (response.status >= 400 && response.status < 500) {
      return { status: "safe_to_retry", message: text || `Server rejected request (${response.status})` };
    }

    // 5xx = server crashed — DB state is unknown
    return { status: "ambiguous_failure", message: text || `Server error (${response.status})` };

  } catch (e: any) {
    // Network error — server never received it, safe to retry
    return { status: "safe_to_retry", message: "Network error. Check your connection." };
  }
}