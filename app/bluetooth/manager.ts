// app/bluetooth/manager.ts
import { BleManager, Device } from "react-native-ble-plx";
import { Buffer } from "buffer";
let manager: BleManager | null = null;
let connectedDevice: Device | null = null;
let disconnectSubscription: any = null;


const SERVICE_UUID = "12345678-1234-1234-1234-1234567890ab";
const CHARACTERISTIC_UUID = "abcd1234-1234-1234-1234-abcdef123456";
let balanceMonitor: any = null;

export async function readCardBalanceBLE(onBalance: (balance: number) => void) {
  if (!connectedDevice) throw new Error("No device connected");

  try {
    let received = false;

    const monitor = connectedDevice.monitorCharacteristicForService(
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      (error, characteristic) => {
        if (error) {
          console.log("Monitor error:", error.message);
          return;
        }

        if (!characteristic?.value) return;

        const msg = Buffer.from(characteristic.value, "base64").toString("utf8");
        console.log("ESP32:", msg);

        if (received) return;

        try {
          const data = JSON.parse(msg);

          if (data.balance !== undefined) {
            received = true;
            onBalance(data.balance);
            // ⭐ Don't remove monitor manually
          }

          if (data.error) {
            console.log("ESP Error:", data.error);
          }

        } catch (e) {
          console.log("JSON parse error:", e);
        }
      }
    );

    // Send READ command
    const message = JSON.stringify({ command: "READ" });

    await connectedDevice.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      Buffer.from(message).toString("base64")
    );

  } catch (err) {
    console.log("readCardBalanceBLE error:", err);
  }
}
export async function rechargeCardBLE(
  amount: string,
  onResult: (result: { success?: boolean; error?: string; balance?: number }) => void
) {
  console.log("🔵 rechargeCardBLE started with amount:", amount);
  
  if (!connectedDevice) {
    throw new Error("No device connected");
  }

  let responseReceived = false;

  try {
    const monitor = connectedDevice.monitorCharacteristicForService(
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      (error, characteristic) => {
        if (error) {
          console.log("🔴 Monitor error:", error.message);
          return;
        }

        if (!characteristic?.value) return;

        const msg = Buffer.from(characteristic.value, "base64").toString("utf8");
        console.log("📩 ESP32 Recharge Response:", msg);

        if (responseReceived) return;

        try {
          const data = JSON.parse(msg);
          console.log("📦 Parsed recharge data:", JSON.stringify(data));

          // ⭐ SUCCESS - just check for "OK" status
          if (data.status === "OK") {
            responseReceived = true;
            console.log("✅ RECHARGE SUCCESS");
            onResult({ success: true }); // No balance needed
          } 
          // Handle errors
          else if (data.error) {
            responseReceived = true;
            console.log("❌ RECHARGE ERROR:", data.error);
            onResult({ error: data.error });
          }

        } catch (e) {
          console.log("🔴 JSON parse error:", e);
        }
      }
    );

    const message = JSON.stringify({
      command: "RECHARGE",
      amount: parseInt(amount)
    });

    console.log("📤 Sending RECHARGE command:", message);

    await connectedDevice.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      Buffer.from(message).toString("base64")
    );

  } catch (err) {
    console.log("🔴 Error:", err);
    if (!responseReceived) {
      onResult({ error: "COMMUNICATION_FAILED" });
    }
  }
}
export async function initializeCardBLE(
  amount: string,
  onResult: (result: { success?: boolean; error?: string; balance?: number }) => void
) {
  console.log("🔵 initializeCardBLE started");
  
  if (!connectedDevice) {
    throw new Error("No device connected");
  }

  let responseReceived = false;

  try {
    const monitor = connectedDevice.monitorCharacteristicForService(
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      (error, characteristic) => {
        if (error) {
          console.log("Monitor error:", error.message);
          return;
        }

        if (!characteristic?.value) return;

        const msg = Buffer.from(characteristic.value, "base64").toString("utf8");
        console.log(" ESP32:", msg);

        if (responseReceived) return;

        try {
          const data = JSON.parse(msg);

          // ⭐ Handle new shorter status codes
          if (data.status === "OK") {
            responseReceived = true;
            console.log(" SUCCESS");
            onResult({ success: true, balance: data.balance });
          } 
         else if (data.error) {
  responseReceived = true;
  console.log(" ERROR:", data.error);

  // Convert ESP errors to UI-friendly errors
  switch (data.error) {
    case "NO_CARD":
      onResult({ error: "NO_CARD_DETECTED" });
      break;

    case "ALREADY_INIT":
      onResult({
        error: "CARD_ALREADY_INITIALIZED",
        balance: data.balance,
      });
      break;

    case "WRITE_FAIL":
      onResult({ error: "CARD_WRITE_FAILED" });
      break;

    case "FORMAT_FAIL":
      onResult({ error: "CARD_FORMAT_FAILED" });
      break;

    default:
      onResult({ error: "UNKNOWN_ERROR" });
  }
}

        } catch (e) {
          console.log("🔴 JSON parse error:", e);
        }
      }
    );

    const message = JSON.stringify({
      command: "INIT",
      amount: parseInt(amount)
    });

    console.log("📤 Sending INIT command");

    await connectedDevice.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      Buffer.from(message).toString("base64")
    );

  } catch (err) {
    console.log("🔴 Error:", err);
    if (!responseReceived) {
      onResult({ error: "COMMUNICATION_FAILED" });
    }
  }
}
export function getBleManager() {
  if (!manager) {
    manager = new BleManager();
  }
  return manager;
}

// Save connected device
export function setConnectedDevice(device: Device | null) {
  connectedDevice = device;
}

// Get connected device
export function getConnectedDevice(): Device | null {
  return connectedDevice;
}

// Disconnect if connected
export async function disconnectDevice() {
  if (connectedDevice) {
    try {
      await connectedDevice.cancelConnection();
      console.log("Device disconnected:", connectedDevice.name);
    } catch (err) {
      console.log("Error disconnecting device:", err);
    } finally {
      connectedDevice = null;
    }
  }
}

// Monitor for sudden disconnections
export function monitorDevice(onDisconnected: () => void) {
  if (!connectedDevice) return;

  // Remove previous subscription
  if (disconnectSubscription) {
    disconnectSubscription.remove();
    disconnectSubscription = null;
  }

  disconnectSubscription = connectedDevice.onDisconnected((error, device) => {
    console.log("Device unexpectedly disconnected:", device?.name);
    connectedDevice = null;
    disconnectSubscription = null;
    onDisconnected();
  });
}

// Remove monitor subscription
export function removeMonitor() {
  if (disconnectSubscription) {
    disconnectSubscription.remove();
    disconnectSubscription = null;
  }
}
