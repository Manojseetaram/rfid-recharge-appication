import { getBleManager } from "./manager";

export const scanForDevices = (onDeviceFound: (device: any) => void) => {
  const bleManager = getBleManager();

  bleManager.stopDeviceScan();

  bleManager.startDeviceScan(null, null, (error, device) => {
    if (error) {
      console.log("Scan error:", error.message);
      return;
    }

    if (device) {
      onDeviceFound(device);
    }
  });
};