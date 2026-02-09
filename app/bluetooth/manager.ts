import { BleManager } from "react-native-ble-plx";

let manager: BleManager | null = null;

export function getBleManager() {
  if (!manager) {
    manager = new BleManager();
  }
  return manager;
}
