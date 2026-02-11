import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { scanForDevices } from "@/app/bluetooth/bluetooth";
import { requestBlePermissions } from "@/app/bluetooth/permissions";
import { disconnectDevice, getBleManager, setConnectedDevice } from "@/app/bluetooth/manager";
import CustomAlert from "./customalert";

const API_BASE =
  "https://sv0gotfhtb.execute-api.ap-south-1.amazonaws.com/Prod";

export default function HomeScreen() {
  const router = useRouter();
  const [devices, setDevices] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);

  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scan for BLE devices
  const startScan = async () => {
    const ok = await requestBlePermissions();
    if (!ok) return;

    const bleManager = getBleManager();
    const state = await bleManager.state();
    if (state !== "PoweredOn") return;

    // Stop previous scan
    bleManager.stopDeviceScan();
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);

    setDevices([]);   // 🔥 clear old devices
    setScanning(true);

    scanForDevices((device) => {
      // Only accept devices that start with Recharge-
      if (!device.name?.startsWith("Recharge-")) return;

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

  // Check machine in backend
  const fetchMachineInfo = async (machineNo: string) => {
    try {
      const url = `${API_BASE}/machine/FetchConnectedMachines/${machineNo}`;
      console.log("Checking machine:", url );

      const res = await fetch(url);
      const json = await res.json();

      console.log("Machine API response:", json);

      if (json.status === "success") return json.data;
    } catch (err) {
      console.log("Machine check error:", err);
    }
    return null;
  };

  // Connect device
  const connectToDevice = async (device: any) => {
    try {
      const bleManager = getBleManager();
      bleManager.stopDeviceScan(); // 🔥 stop scan before connect
      setScanning(false);

      if (!device.name?.startsWith("Recharge-")) {
        Alert.alert("Invalid device");
        return;
      }

      const machineNo = device.name.replace("Recharge-", "").trim();
console.log("MachineNo extracted:", machineNo);

console.log(machineNo, machineNo.length);

      // Step 1: verify machine from server
      const machineInfo = await fetchMachineInfo(machineNo);

      if (!machineInfo) {
        Alert.alert("Machine not registered in server");
        return;
      }

      console.log("Machine verified:", machineInfo.machine_name);

      // Step 2: connect BLE
      await disconnectDevice();
      await device.connect();
      await device.discoverAllServicesAndCharacteristics();

      setConnectedDevice(device);

      router.push({
        pathname: "/home/connect",
        params: {
          deviceName: machineInfo.machine_name,
          deviceId: device.id,
          machineNo: machineInfo.machine_no,
          machineId: machineInfo.machine_id,
        },
      });

    } catch (err) {
      console.log("Connection error:", err);
      Alert.alert("Connection failed");
    }
  };

  const handleLogout = () => setShowLogoutAlert(true);

  const confirmLogout = async () => {
    await disconnectDevice();
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
          <TouchableOpacity onPress={startScan} disabled={scanning}>
            <Ionicons
              name={scanning ? "refresh-circle" : "refresh"}
              size={26}
              color="#F2CB07"
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={26} color="#FF5252" />
          </TouchableOpacity>
        </View>
      </View>

      {/* DEVICE LIST */}
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#38208C", padding: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerRight: { flexDirection: "row", gap: 12 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
  card: { backgroundColor: "#2D1873", borderRadius: 14, padding: 20 },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
  status: { color: "#fff", marginBottom: 20, fontSize: 12, opacity: 0.8 },
  button: { backgroundColor: "#F2CB07", padding: 12, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#1A1426", fontSize: 16, fontWeight: "600" },
});
