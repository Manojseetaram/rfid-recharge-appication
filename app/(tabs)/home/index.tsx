import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { scanForDevices } from "@/app/bluetooth/bluetooth";
import { requestBlePermissions } from "@/app/bluetooth/permissions";
import { disconnectDevice, getBleManager, resetBleManager, setConnectedDevice } from "@/app/bluetooth/manager";
import CustomAlert from "./customalert";
import { useFocusEffect } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";

const { width, height } = Dimensions.get("window");
const API_BASE = "https://sv0gotfhtb.execute-api.ap-south-1.amazonaws.com/Prod";

// ── Animated scan pulse ring ──
function ScanPulse({ scanning }: { scanning: boolean }) {
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (scanning) {
      const anim = Animated.loop(
        Animated.stagger(600, [
          Animated.sequence([
            Animated.timing(pulse1, { toValue: 1, duration: 1400, useNativeDriver: true }),
            Animated.timing(pulse1, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(pulse2, { toValue: 1, duration: 1400, useNativeDriver: true }),
            Animated.timing(pulse2, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulse1.setValue(0);
      pulse2.setValue(0);
    }
  }, [scanning]);

  const pulseStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0.15, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
  });

  return (
    <View style={scanStyles.wrapper}>
      <Animated.View style={[scanStyles.ring, pulseStyle(pulse1)]} />
      <Animated.View style={[scanStyles.ring, pulseStyle(pulse2)]} />
      <View style={scanStyles.core}>
        <Ionicons name="bluetooth" size={30} color="#F2CB07" />
      </View>
    </View>
  );
}

const scanStyles = StyleSheet.create({
  wrapper: { width: 100, height: 100, alignItems: "center", justifyContent: "center" },
  ring: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#F2CB07",
  },
  core: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(242,203,7,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(242,203,7,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
});

// ── Device card ──
function DeviceCard({ item, onConnect }: { item: any; onConnect: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, tension: 300 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300 }),
    ]).start(onConnect);
  };

  const machineNo = item.name?.replace("Recharge-", "") ?? "";

  return (
    <Animated.View style={[{ transform: [{ scale }] }]}>
      <View style={deviceStyles.card}>
        {/* Left accent bar */}
        <View style={deviceStyles.accentBar} />

        <View style={deviceStyles.iconWrap}>
          <Ionicons name="hardware-chip-outline" size={26} color="#F2CB07" />
        </View>

        <View style={deviceStyles.info}>
          <Text style={deviceStyles.name}>{item.name}</Text>
          <View style={deviceStyles.row}>
            <View style={deviceStyles.dot} />
            <Text style={deviceStyles.sub}>ID: {machineNo.toUpperCase()}</Text>
          </View>
        </View>

        <TouchableOpacity style={deviceStyles.connectBtn} onPress={handlePress} activeOpacity={0.8}>
          <Text style={deviceStyles.connectText}>Connect</Text>
          <Ionicons name="arrow-forward" size={14} color="#1A0E4F" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const deviceStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 16,
    gap: 14,
    overflow: "hidden",
  },
  accentBar: {
    position: "absolute",
    left: 0, top: 12, bottom: 12,
    width: 3,
    backgroundColor: "#F2CB07",
    borderRadius: 2,
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "rgba(242,203,7,0.1)",
    borderWidth: 1,
    borderColor: "rgba(242,203,7,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, gap: 5 },
  name: { color: "#FFF", fontSize: 15, fontWeight: "700", letterSpacing: 0.2 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: "#4ADE80",
  },
  sub: { color: "rgba(255,255,255,0.45)", fontSize: 11, letterSpacing: 0.5 },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F2CB07",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  connectText: { color: "#1A0E4F", fontSize: 13, fontWeight: "800" },
});

// ── Main screen ──
export default function HomeScreen() {
  const router = useRouter();
  const [devices, setDevices] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);



const startScan = async () => {
  const ok = await requestBlePermissions();
  if (!ok) return;

  await resetBleManager();   // ✅ Proper reset

  const bleManager = getBleManager();

  const state = await bleManager.state();
  if (state !== "PoweredOn") return;

  setDevices([]);
  setScanning(true);

  bleManager.stopDeviceScan();

  scanForDevices((device) => {
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

  const fetchMachineInfo = async (machineNo: string) => {
    try {
      const token = await SecureStore.getItemAsync("auth_token");
      const url = `${API_BASE}/warden/fetchConnectedMachines/${machineNo}`;
      console.log("Checking machine:", url);
      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      console.log("Machine API response:", json);
      if (json.status === "success") return json.data;
    } catch (err) {
      console.log("Machine check error:", err);
    }
    return null;
  };

  const connectToDevice = async (device: any) => {
    try {
      const bleManager = getBleManager();
      bleManager.stopDeviceScan();
      setScanning(false);
      if (!device.name?.startsWith("Recharge-")) {
        Alert.alert("Invalid device");
        return;
      }
      const machineNo = device.name.replace("Recharge-", "").trim();
      console.log("MachineNo extracted:", machineNo);
      console.log(machineNo, machineNo.length);
      const machineInfo = await fetchMachineInfo(machineNo);
      if (!machineInfo) {
        Alert.alert("Machine not registered in server");
        return;
      }
      console.log("Machine verified:", machineInfo.machine_name);
      await disconnectDevice();
      await device.connect();
      await device.discoverAllServicesAndCharacteristics();
      try {
        await device.requestMTU(185);
        console.log("MTU increased");
      } catch (e) {
        console.log("MTU request failed (not critical):", e);
      }
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
    await SecureStore.deleteItemAsync("auth_token");
    await SecureStore.deleteItemAsync("is_logged_in");
    setShowLogoutAlert(false);
    router.replace("/login");
  };

  useFocusEffect(
    useCallback(() => {
      startScan();
      return () => {
        const bleManager = getBleManager();
        bleManager.stopDeviceScan();
        if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      };
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Background layers */}
      <View style={styles.bgBase} />
      <View style={styles.bgOrb1} />
      <View style={styles.bgOrb2} />

      <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerEyebrow}>LORENTA</Text>
            <Text style={styles.headerTitle}>Devices</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconBtn, scanning && styles.iconBtnActive]}
              onPress={startScan}
              disabled={scanning}
            >
              <Ionicons name={scanning ? "refresh-circle" : "refresh"} size={22} color="#F2CB07" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtnDanger} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color="#FF5252" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Scan area ── */}
        <View style={styles.scanArea}>
          <ScanPulse scanning={scanning} />
          <Text style={styles.scanLabel}>
            {scanning ? "Scanning for devices..." : "Tap refresh to scan"}
          </Text>
          {scanning && (
            <View style={styles.scanningBadge}>
              <View style={styles.scanningDot} />
              <Text style={styles.scanningText}>LIVE</Text>
            </View>
          )}
        </View>

        {/* ── Device count chip ── */}
        {devices.length > 0 && (
          <View style={styles.countRow}>
            <View style={styles.countChip}>
              <Text style={styles.countText}>{devices.length} device{devices.length !== 1 ? "s" : ""} found</Text>
            </View>
            <View style={styles.dividerLine} />
          </View>
        )}

        {/* ── Device list ── */}
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <DeviceCard item={item} onConnect={() => connectToDevice(item)} />
          )}
          ListEmptyComponent={
            !scanning ? (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="bluetooth-outline" size={36} color="rgba(242,203,7,0.3)" />
                </View>
                <Text style={styles.emptyTitle}>No devices found</Text>
                <Text style={styles.emptySub}>Make sure your device is powered on and nearby</Text>
              </View>
            ) : null
          }
        />
      </Animated.View>

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
  safe: { flex: 1 },
  bgBase: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0F0A2E" },
  bgOrb1: {
    position: "absolute", top: -80, right: -60,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: "rgba(56,32,140,0.6)",
  },
  bgOrb2: {
    position: "absolute", bottom: 60, left: -80,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: "rgba(30,15,80,0.8)",
  },
  container: { flex: 1, paddingHorizontal: 22, paddingTop: 8 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  headerEyebrow: {
    fontSize: 10,
    color: "rgba(242,203,7,0.6)",
    letterSpacing: 4,
    fontWeight: "700",
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.3,
  },
  headerActions: { flexDirection: "row", gap: 10 },
  iconBtn: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: "rgba(242,203,7,0.1)",
    borderWidth: 1, borderColor: "rgba(242,203,7,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  iconBtnActive: { backgroundColor: "rgba(242,203,7,0.2)" },
  iconBtnDanger: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: "rgba(255,82,82,0.1)",
    borderWidth: 1, borderColor: "rgba(255,82,82,0.2)",
    alignItems: "center", justifyContent: "center",
  },

  // Scan area
  scanArea: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    gap: 14,
  },
  scanLabel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  scanningBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(74,222,128,0.12)",
    borderWidth: 1, borderColor: "rgba(74,222,128,0.3)",
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20,
  },
  scanningDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: "#4ADE80",
  },
  scanningText: {
    color: "#4ADE80",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },

  // Count chip
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  countChip: {
    backgroundColor: "rgba(242,203,7,0.12)",
    borderWidth: 1, borderColor: "rgba(242,203,7,0.25)",
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20,
  },
  countText: { color: "#F2CB07", fontSize: 12, fontWeight: "700" },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.07)" },

  // List
  list: { gap: 12, paddingBottom: 30 },

  // Empty
  emptyWrap: { alignItems: "center", paddingTop: 20, gap: 12 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: "rgba(242,203,7,0.05)",
    borderWidth: 1, borderColor: "rgba(242,203,7,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  emptyTitle: { color: "rgba(255,255,255,0.5)", fontSize: 16, fontWeight: "600" },
  emptySub: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 13, textAlign: "center",
    paddingHorizontal: 40,
  },
});