import { BleManager, Device } from "react-native-ble-plx";
import { Buffer } from "buffer";

let manager: BleManager | null = null;
let connectedDevice: Device | null = null;
let disconnectSubscription: any = null;

const SERVICE_UUID        = "12345678-1234-1234-1234-1234567890ab";
const CHARACTERISTIC_UUID = "abcd1234-1234-1234-1234-abcdef123456";

// ─────────────────────────────────────────────
// INTERNAL: shared monitor + write helper
// Reduces duplication across all BLE operations.
// ─────────────────────────────────────────────
function monitorAndWrite<T>(
  command: object,
  parser: (data: any) => T | null,
  onResult: (result: T) => void,
  onError: (err: string) => void
) {
  if (!connectedDevice) {
    onError("NO_DEVICE");
    return;
  }

  let finished = false;

  connectedDevice.monitorCharacteristicForService(
    SERVICE_UUID,
    CHARACTERISTIC_UUID,
    (error, characteristic) => {
      if (finished) return;

      if (error) {
        finished = true;
        onError("BLE_ERROR");
        return;
      }

      if (!characteristic?.value) return;

      try {
        const msg = Buffer.from(characteristic.value, "base64").toString("utf8");
        console.log("RAW BLE:", msg);
        const data = JSON.parse(msg);
        const parsed = parser(data);
        if (parsed !== null) {
          finished = true;
          onResult(parsed);
        }
      } catch (_) {}
    }
  );

  connectedDevice
    .writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      Buffer.from(JSON.stringify(command)).toString("base64")
    )
    .catch(() => {
      if (!finished) {
        finished = true;
        onError("COMMUNICATION_FAILED");
      }
    });
}

// ─────────────────────────────────────────────
// READ_ID — Reads only the card UID, touches nothing else.
// Called FIRST during initialization so we can check the server
// before deciding whether to INIT or FORCE_INIT.
// ─────────────────────────────────────────────
export function readCardIdBLE(
  onResult: (result: { success?: boolean; cardId?: string; error?: string }) => void
) {
  if (!connectedDevice) {
    onResult({ error: "NO_DEVICE" });
    return;
  }

  let finished = false;

  connectedDevice.monitorCharacteristicForService(
    SERVICE_UUID,
    CHARACTERISTIC_UUID,
    (error, characteristic) => {
      if (finished) return;

      if (error) {
        finished = true;
        onResult({ error: "BLE_ERROR" });
        return;
      }

      if (!characteristic?.value) return;

      try {
        const msg = Buffer.from(characteristic.value, "base64").toString("utf8");
        console.log("RAW BLE (READ_ID):", msg);
        const data = JSON.parse(msg);

        if (data.status === "SUCCESS" && data.card_id) {
          finished = true;
          onResult({ success: true, cardId: data.card_id });
          return;
        }

        if (data.error) {
          finished = true;
          onResult({ error: data.error === "NO_CARD" ? "NO_CARD_DETECTED" : data.error });
        }
      } catch (_) {}
    }
  );

  connectedDevice
    .writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      Buffer.from(JSON.stringify({ command: "READ_ID" })).toString("base64")
    )
    .catch(() => {
      if (!finished) {
        finished = true;
        onResult({ error: "COMMUNICATION_FAILED" });
      }
    });
}

// ─────────────────────────────────────────────
// READ CARD BALANCE
// ─────────────────────────────────────────────
export async function readCardBalanceBLE(
  onBalance: (balance: number) => void,
  onError?: (error: string) => void
) {
  if (!connectedDevice) {
    onError?.("NO_DEVICE");
    return;
  }

  let finished = false;

  connectedDevice.monitorCharacteristicForService(
    SERVICE_UUID,
    CHARACTERISTIC_UUID,
    (error, characteristic) => {
      if (finished) return;

      if (error) {
        finished = true;
        onError?.("BLE_ERROR");
        return;
      }

      if (!characteristic?.value) return;

      try {
        const msg = Buffer.from(characteristic.value, "base64").toString("utf8");
        console.log("RAW BLE (READ):", msg);
        const data = JSON.parse(msg);

        if (data.balance !== undefined) {
          finished = true;
          onBalance(data.balance);
          return;
        }

        if (data.error) {
          finished = true;
          onError?.(data.error);
        }
      } catch (_) {}
    }
  );

  try {
    await connectedDevice.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      Buffer.from(JSON.stringify({ command: "READ" })).toString("base64")
    );
  } catch (_) {
    if (!finished) {
      finished = true;
      onError?.("COMMUNICATION_FAILED");
    }
  }
}

// ─────────────────────────────────────────────
// RECHARGE CARD
// ─────────────────────────────────────────────
export async function rechargeCardBLE(
  machineId: string,
  amount: string,
  onResult: (result: {
    success?: boolean;
    error?: string;
    balance?: number;
    cardId?: string;
  }) => void
) {
  if (!connectedDevice) {
    onResult({ error: "NO_DEVICE" });
    return;
  }

  let finished = false;

  connectedDevice.monitorCharacteristicForService(
    SERVICE_UUID,
    CHARACTERISTIC_UUID,
    (error, characteristic) => {
      if (finished) return;

      if (error) {
        finished = true;
        onResult({ error: "BLE_ERROR" });
        return;
      }

      if (!characteristic?.value) return;

      try {
        const msg = Buffer.from(characteristic.value, "base64").toString("utf8");
        const data = JSON.parse(msg);

        if (data.status === "SUCCESS") {
          finished = true;
          onResult({
            success: true,
            balance: data.updated_balance,
            cardId: data.card_id ?? data.cardId ?? data.uid ?? "",
          });
          return;
        }

        if (data.error) {
          finished = true;
          onResult({ error: data.error });
        }
      } catch (_) {}
    }
  );

  try {
    await connectedDevice.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      Buffer.from(
        JSON.stringify({ command: "RECHARGE", amount: Number(amount) })
      ).toString("base64")
    );
  } catch (_) {
    if (!finished) {
      finished = true;
      onResult({ error: "COMMUNICATION_FAILED" });
    }
  }
}

// ─────────────────────────────────────────────
// INITIALIZE CARD — For brand-new cards (never initialized).
// Server check must be done BEFORE calling this.
// ─────────────────────────────────────────────
export async function initializeCardBLE(
  amount: string,
  onResult: (result: {
    success?: boolean;
    error?: string;
    balance?: number;
    cardId?: string;
  }) => void
) {
  if (!connectedDevice) {
    onResult({ error: "NO_DEVICE" });
    return;
  }

  let finished = false;

  connectedDevice.monitorCharacteristicForService(
    SERVICE_UUID,
    CHARACTERISTIC_UUID,
    (error, characteristic) => {
      if (finished) return;

      if (error) {
        finished = true;
        onResult({ error: "BLE_ERROR" });
        return;
      }

      if (!characteristic?.value) return;

      try {
        const msg = Buffer.from(characteristic.value, "base64").toString("utf8");
        const data = JSON.parse(msg);
        console.log("RAW BLE (INIT):", msg);

        if (data.status === "SUCCESS") {
          finished = true;
          onResult({ success: true, balance: data.updated_balance, cardId: data.card_id });
          return;
        }

        if (data.error) {
          finished = true;
          switch (data.error) {
            case "NO_CARD":        onResult({ error: "NO_CARD_DETECTED" }); break;
            case "ALREADY_INIT":   onResult({ error: "CARD_ALREADY_INITIALIZED", balance: data.balance, cardId: data.card_id ?? "" }); break;
            case "WRITE_FAIL":     onResult({ error: "CARD_WRITE_FAILED" }); break;
            case "FORMAT_FAIL":    onResult({ error: "CARD_FORMAT_FAILED" }); break;
            case "MIN_100":
            case "MIN_200":
            case "MIN_50":         onResult({ error: "MINIMUM_REQUIRED" }); break;
            default:               onResult({ error: "UNKNOWN_ERROR" }); break;
          }
        }
      } catch (_) {}
    }
  );

  try {
    await connectedDevice.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      Buffer.from(
        JSON.stringify({ command: "INIT", amount: Number(amount) })
      ).toString("base64")
    );
  } catch (_) {
    if (!finished) {
      finished = true;
      onResult({ error: "COMMUNICATION_FAILED" });
    }
  }
}

// ─────────────────────────────────────────────
// FORCE INITIALIZE CARD
// Used when card was deleted from server but is still physically initialized.
// Skips ALREADY_INIT guard on firmware. Resets balance to 0 then writes new amount.
// Server check must confirm card does NOT exist before calling this.
// ─────────────────────────────────────────────
export async function forceInitializeCardBLE(
  amount: string,
  onResult: (result: {
    success?: boolean;
    error?: string;
    balance?: number;
    cardId?: string;
  }) => void
) {
  if (!connectedDevice) {
    onResult({ error: "NO_DEVICE" });
    return;
  }

  let finished = false;

  connectedDevice.monitorCharacteristicForService(
    SERVICE_UUID,
    CHARACTERISTIC_UUID,
    (error, characteristic) => {
      if (finished) return;

      if (error) {
        finished = true;
        onResult({ error: "BLE_ERROR" });
        return;
      }

      if (!characteristic?.value) return;

      try {
        const msg = Buffer.from(characteristic.value, "base64").toString("utf8");
        const data = JSON.parse(msg);
        console.log("RAW BLE (FORCE_INIT):", msg);

        if (data.status === "SUCCESS") {
          finished = true;
          onResult({ success: true, balance: data.updated_balance, cardId: data.card_id });
          return;
        }

        if (data.error) {
          finished = true;
          switch (data.error) {
            case "NO_CARD":     onResult({ error: "NO_CARD_DETECTED" }); break;
            case "WRITE_FAIL":  onResult({ error: "CARD_WRITE_FAILED" }); break;
            case "FORMAT_FAIL": onResult({ error: "CARD_FORMAT_FAILED" }); break;
            default:            onResult({ error: data.error }); break;
          }
        }
      } catch (_) {}
    }
  );

  try {
    await connectedDevice.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      Buffer.from(
        JSON.stringify({ command: "FORCE_INIT", amount: Number(amount) })
      ).toString("base64")
    );
  } catch (_) {
    if (!finished) {
      finished = true;
      onResult({ error: "COMMUNICATION_FAILED" });
    }
  }
}

// ─────────────────────────────────────────────
// BLE MANAGER SINGLETON
// ─────────────────────────────────────────────
export function getBleManager() {
  if (!manager) manager = new BleManager();
  return manager;
}

export function setConnectedDevice(device: Device | null) {
  connectedDevice = device;
}

export function getConnectedDevice(): Device | null {
  return connectedDevice;
}

export async function disconnectDevice() {
  if (!connectedDevice) return;

  const deviceToDisconnect = connectedDevice;
  connectedDevice = null;

  try {
    await deviceToDisconnect.cancelConnection();
  } catch (e) {
    console.log("Cancel connection error:", e);
  }

  try {
    await deviceToDisconnect.isConnected().then(async (connected) => {
      if (connected) await new Promise((res) => setTimeout(res, 500));
    });
  } catch (_) {}

  console.log("Fully disconnected");
}

export function monitorDevice(onDisconnected: () => void) {
  if (!connectedDevice) return;
  removeMonitor();
  disconnectSubscription = connectedDevice.onDisconnected((error, device) => {
    console.log("Device unexpectedly disconnected:", device?.name);
    connectedDevice = null;
    disconnectSubscription = null;
    onDisconnected();
  });
}

export function removeMonitor() {
  if (disconnectSubscription) {
    try { disconnectSubscription.remove(); } catch (_) {}
    disconnectSubscription = null;
  }
}

export async function resetBleManager() {
  if (manager) {
    try { await manager.destroy(); } catch (_) {}
    manager = null;
  }
}