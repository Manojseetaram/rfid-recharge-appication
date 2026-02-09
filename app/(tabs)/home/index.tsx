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

import { scanForDevices } from "@/app/bluetooth/bluetooth";
import { requestBlePermissions } from "@/app/bluetooth/permissions";
import { getBleManager } from "@/app/bluetooth/manager";

export default function HomeScreen() {
  const router = useRouter();
  const [devices, setDevices] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);

  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startScan = async () => {
    const ok = await requestBlePermissions();
    if (!ok) return;

    const bleManager = getBleManager();
    const state = await bleManager.state();
    if (state !== "PoweredOn") return;

    bleManager.stopDeviceScan();
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);

    setDevices([]);
    setScanning(true);

    scanForDevices((device) => {
      // 🔹 Only show your ESP32 devices
      const isOurDevice =
        device.name?.startsWith("Recharge-") ||
        device.manufacturerData?.includes("RECHARGE");
      if (!isOurDevice) return;

      setDevices((prev) => {
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

      await device.connect(); // connect to ESP32
      console.log("Connected to", device.name);

      await device.discoverAllServicesAndCharacteristics();
      console.log("Services discovered");

    router.push({
  pathname: "/home/connect", 
  params: { deviceName: device.name, deviceId: device.id },
});

    } catch (err) {
      console.log("Connection error:", err);
    }
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
        <Ionicons name="bluetooth" size={24} color="#F2CB07" />
        <Text style={styles.headerTitle}>Available Devices</Text>

        <TouchableOpacity onPress={startScan} disabled={scanning}>
          <Ionicons
            name={scanning ? "refresh-circle" : "refresh"}
            size={26}
            color="#F2CB07"
          />
        </TouchableOpacity>
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
    </SafeAreaView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#38208C", padding: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },
  card: { backgroundColor: "#2D1873", borderRadius: 14, padding: 20 },
  cardTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "600", marginBottom: 8 },
  status: { color: "#FFFFFF", marginBottom: 20, fontSize: 12, opacity: 0.8 },
  button: { backgroundColor: "#F2CB07", paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#1A1426", fontSize: 16, fontWeight: "600" },
});
