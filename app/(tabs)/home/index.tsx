import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";


import { scanForDevices } from "@/app/bluetooth/bluetooth";
import { requestBlePermissions } from "@/app/bluetooth/permissions";
import { disconnectDevice, getBleManager, setConnectedDevice } from "@/app/bluetooth/manager";
import CustomAlert from "./customalert";

export default function HomeScreen() {
  const router = useRouter();
  const [devices, setDevices] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);

  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const startScan = async () => {
  const ok = await requestBlePermissions();
  if (!ok) return;

  const bleManager = getBleManager();
  const state = await bleManager.state();
  if (state !== "PoweredOn") return;

  // Stop any previous scan
  bleManager.stopDeviceScan();
  if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);

  setScanning(true);

  scanForDevices((device) => {
    const isOurDevice =
      device.name?.startsWith("Recharge-") ||
      device.manufacturerData?.includes("RECHARGE");
    if (!isOurDevice) return;

    setDevices((prev) => {
      // Merge new device if not already in list
      if (prev.some((d) => d.id === device.id)) return prev;
      return [...prev, device];
    });
  });

  scanTimeoutRef.current = setTimeout(() => {
    bleManager.stopDeviceScan();
    setScanning(false);
  }, 5000);
};




const connectToDevice = async (device: any) => {
  try {
    setScanning(false);
    console.log("Connecting to", device.name);

    // Disconnect previous device if any
    await disconnectDevice();

    // Connect new device
    await device.connect();
    console.log("Connected to", device.name);

    await device.discoverAllServicesAndCharacteristics();
    console.log("Services discovered");

    // Save this device globally
    setConnectedDevice(device);

    router.push({
      pathname: "/home/connect",
      params: { deviceName: device.name, deviceId: device.id },
    });
  } catch (err) {
    console.log("Connection error:", err);
  }
};


  const handleLogout = () => {
    setShowLogoutAlert(true);
  };

  const confirmLogout = async () => {
  // Disconnect BLE device first
  await disconnectDevice();

  // Clear local storage
  await AsyncStorage.removeItem("is_logged_in");
  await AsyncStorage.removeItem("user_email");
  
  setShowLogoutAlert(false);
  router.replace("/login");
};


  useEffect(() => {
    startScan();
    return () => {
      const bleManager = getBleManager();
      bleManager.stopDeviceScan();
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="bluetooth" size={24} color="#F2CB07" />
          <Text style={styles.headerTitle}>Available Devices</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={startScan} disabled={scanning} style={styles.iconButton}>
            <Ionicons
              name={scanning ? "refresh-circle" : "refresh"}
              size={26}
              color="#F2CB07"
            />
          </TouchableOpacity>

          {/* LOGOUT BUTTON */}
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={26} color="#FF5252" />
          </TouchableOpacity>
        </View>
      </View>

      {/* DEVICE LIST */}
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12 }}
        ListEmptyComponent={
          !scanning ? (
            <Text style={{ color: "#fff", textAlign: "center", marginTop: 40 }}>
              No devices found
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name || "Unknown Device"}</Text>
            <Text style={styles.status}>{item.id}</Text>

            <TouchableOpacity
              style={styles.button}
              onPress={() => connectToDevice(item)}
            >
              <Text style={styles.buttonText}>Connect</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Logout Confirmation Alert */}
      <CustomAlert
        visible={showLogoutAlert}
        type="confirm"
        title="Logout"
        message="Are you sure you want to logout?"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutAlert(false)}
        confirmText="Logout"
        cancelText="Cancel"
      />
    </SafeAreaView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#38208C", padding: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },
  iconButton: {
    padding: 4,
  },
  logoutButton: {
    padding: 4,
  },
  card: { backgroundColor: "#2D1873", borderRadius: 14, padding: 20 },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  status: { color: "#FFFFFF", marginBottom: 20, fontSize: 12, opacity: 0.8 },
  button: {
    backgroundColor: "#F2CB07",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#1A1426", fontSize: 16, fontWeight: "600" },
});