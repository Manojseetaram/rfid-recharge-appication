// app/bluetooth/manager.ts
import { BleManager, Device } from "react-native-ble-plx";
import { Buffer } from "buffer";
let manager: BleManager | null = null;
let connectedDevice: Device | null = null;
let disconnectSubscription: any = null;


const SERVICE_UUID = "12345678-1234-1234-1234-1234567890ab";
const CHARACTERISTIC_UUID = "abcd1234-1234-1234-1234-abcdef123456";
export async function readCardBalanceBLE(onBalance: (balance: number) => void) {
  if (!connectedDevice) throw new Error("No device connected");

  // send READ command
  await connectedDevice.writeCharacteristicWithResponseForService(
    SERVICE_UUID,
    CHARACTERISTIC_UUID,
    Buffer.from("READ").toString("base64")
  );

  // listen for response
  connectedDevice.monitorCharacteristicForService(
    SERVICE_UUID,
    CHARACTERISTIC_UUID,
    (error, characteristic) => {
      if (error) {
        console.log("Monitor error:", error);
        return;
      }

      if (characteristic?.value) {
        const msg = Buffer.from(characteristic.value, "base64").toString("utf8");
        console.log("ESP32:", msg);

        if (msg.startsWith("BALANCE|")) {
          const value = parseInt(msg.split("|")[1]);
          onBalance(value);
        }
      }
    }
  );
}

export async function initializeCardBLE(amount: string) {
  if (!connectedDevice) throw new Error("No device connected");

  const message = `INIT|${amount}`;

  await connectedDevice.writeCharacteristicWithResponseForService(
    SERVICE_UUID,
    CHARACTERISTIC_UUID,
    Buffer.from(message).toString("base64")
  );
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
