import { BleManager, Device } from "react-native-ble-plx";
import { Buffer } from "buffer";

let manager: BleManager | null = null;
let connectedDevice: Device | null = null;
let disconnectSubscription: any = null;

const SERVICE_UUID = "12345678-1234-1234-1234-1234567890ab";
const CHARACTERISTIC_UUID = "abcd1234-1234-1234-1234-abcdef123456";

// ─────────────────────────────────────────────
// ROOT CAUSE OF CRASH:
// Calling sub.remove() triggers cancelTransaction()
// in native Android code, which calls onError(null)
// → crashes PromiseImpl.reject(null code).
//
// SOLUTION: NEVER call remove() inside monitor callbacks.
// Just set finished = true so all future callbacks
// (including the native cleanup error) are ignored.
// ─────────────────────────────────────────────

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
      if (finished) return; // ignore ALL callbacks after first result

      if (error) {
        finished = true;
        onError?.("BLE_ERROR");
        return;
      }

      if (!characteristic?.value) return;

      try {
        const msg = Buffer.from(characteristic.value, "base64").toString("utf8");
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


export async function rechargeCardBLE(
  machineId: string,
  amount: string,
  onResult: (result: { success?: boolean; error?: string; balance?: number }) => void
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
      if (finished) return; // ignore ALL callbacks after first result

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
          onResult({ success: true, balance: data.updated_balance });
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
// INITIALIZE CARD
// ─────────────────────────────────────────────
export async function initializeCardBLE(
  amount: string,
  onResult: (result: { success?: boolean; error?: string; balance?: number }) => void
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
      if (finished) return; // ignore ALL callbacks after first result

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
          onResult({ success: true, balance: data.updated_balance });
          return;
        }

        if (data.error) {
          finished = true;

          switch (data.error) {
            case "NO_CARD":
              onResult({ error: "NO_CARD_DETECTED" });
              break;
            case "ALREADY_INIT":
              onResult({ error: "CARD_ALREADY_INITIALIZED", balance: data.balance });
              break;
            case "WRITE_FAIL":
              onResult({ error: "CARD_WRITE_FAILED" });
              break;
            case "FORMAT_FAIL":
              onResult({ error: "CARD_FORMAT_FAILED" });
              break;
            case "MIN_200":
              onResult({ error: "MINIMUM_200_REQUIRED" });
              break;
            default:
              onResult({ error: "UNKNOWN_ERROR" });
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
// BLE MANAGER SINGLETON
// ─────────────────────────────────────────────
export function getBleManager() {
  if (!manager) {
    manager = new BleManager();
  }
  return manager;
}

// ─────────────────────────────────────────────
// DEVICE CONNECTION HELPERS
// ─────────────────────────────────────────────
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

  // Wait until actually disconnected
  try {
    await deviceToDisconnect.isConnected().then(async (connected) => {
      if (connected) {
        await new Promise((res) => setTimeout(res, 500));
      }
    });
  } catch (_) {}

  console.log("Fully disconnected");
}

// ─────────────────────────────────────────────
// DISCONNECT MONITOR
// ─────────────────────────────────────────────
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
    try {
      disconnectSubscription.remove();
    } catch (_) {}
    disconnectSubscription = null;
  }
}

export async function resetBleManager() {
  if (manager) {
    try {
      await manager.destroy();
    } catch (_) {}
    manager = null;
  }
}