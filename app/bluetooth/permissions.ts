import { PermissionsAndroid, Platform } from "react-native";

export async function requestBlePermissions() {
  if (Platform.OS !== "android") return true;

  const granted = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
  ]);

  return Object.values(granted).every(
    (result) => result === PermissionsAndroid.RESULTS.GRANTED
  );
}
