// app/bluetooth/manager.ts
import { BleManager, Device } from "react-native-ble-plx";

let manager: BleManager | null = null;
let connectedDevice: Device | null = null;
let disconnectSubscription: any = null;

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
