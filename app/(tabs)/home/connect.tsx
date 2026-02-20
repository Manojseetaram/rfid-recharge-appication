import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  disconnectDevice,
  getConnectedDevice,
  monitorDevice,
  removeMonitor,
} from "@/app/bluetooth/manager";
import CustomAlert from "./customalert";

const { width } = Dimensions.get("window");

// ── Action tile component ──
function ActionTile({
  icon,
  label,
  onPress,
  full,
  delay = 0,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  full?: boolean;
  delay?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideIn = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.spring(slideIn, { toValue: 0, tension: 80, friction: 12, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, tension: 300 }).start();
  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300 }).start();

  return (
    <Animated.View
      style={[
        full ? tileStyles.wrapFull : tileStyles.wrapHalf,
        { opacity: fadeIn, transform: [{ scale }, { translateY: slideIn }] },
      ]}
    >
      <TouchableOpacity
        style={tileStyles.tile}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Corner accent */}
        <View style={tileStyles.cornerTL} />
        <View style={tileStyles.cornerBR} />

        <View style={tileStyles.iconCircle}>
          <Ionicons name={icon as any} size={full ? 36 : 30} color="#F2CB07" />
        </View>
        <Text style={[tileStyles.label, full && tileStyles.labelFull]}>{label}</Text>
        <View style={tileStyles.arrow}>
          <Ionicons name="arrow-forward" size={12} color="rgba(242,203,7,0.5)" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const tileStyles = StyleSheet.create({
  wrapFull: { width: "100%" },
  wrapHalf: { flex: 1 },
  tile: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    padding: 22,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 130,
    gap: 10,
    overflow: "hidden",
    position: "relative",
  },
  cornerTL: {
    position: "absolute", top: 0, left: 0,
    width: 28, height: 28,
    borderTopWidth: 2, borderLeftWidth: 2,
    borderColor: "rgba(242,203,7,0.25)",
    borderTopLeftRadius: 20,
  },
  cornerBR: {
    position: "absolute", bottom: 0, right: 0,
    width: 28, height: 28,
    borderBottomWidth: 2, borderRightWidth: 2,
    borderColor: "rgba(242,203,7,0.12)",
    borderBottomRightRadius: 20,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: "rgba(242,203,7,0.1)",
    borderWidth: 1,
    borderColor: "rgba(242,203,7,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  labelFull: { fontSize: 16 },
  arrow: {
    position: "absolute",
    bottom: 12, right: 14,
  },
});

// ── Main screen ──
export default function CardHomeScreen() {
  const router = useRouter();
  const { deviceName, deviceId, machineId } = useLocalSearchParams();

  const [disconnected, setDisconnected] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-16)).current;
  const statusPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Header entrance
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(headerSlide, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();

    // Status dot pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(statusPulse, { toValue: 0.4, duration: 900, useNativeDriver: true }),
        Animated.timing(statusPulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    // ── ALL ORIGINAL LOGIC UNTOUCHED ──
    const device = getConnectedDevice();
    if (device) {
      monitorDevice(() => {
        setDisconnected(true);
        setShowAlert(true);
      });
    }

    return () => {
      removeMonitor();
      disconnectDevice();
    };
  }, []);

  const handleAlertConfirm = async () => {
    setShowAlert(false);
    await disconnectDevice();
    router.replace("/home");
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Background layers */}
      <View style={styles.bgBase} />
      <View style={styles.bgOrb1} />
      <View style={styles.bgOrb2} />

      <View style={styles.container}>

        {/* ── Header ── */}
        <Animated.View
          style={[styles.header, {
            opacity: headerFade,
            transform: [{ translateY: headerSlide }],
          }]}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerDevice}>{deviceName || "Device"}</Text>
            <View style={styles.statusRow}>
              <Animated.View style={[styles.statusDot, { opacity: statusPulse }]} />
              <Text style={styles.statusText}>
                {disconnected ? "Disconnected" : "Connected"}
              </Text>
            </View>
          </View>

          {/* Signal strength indicator */}
          <View style={styles.signalWrap}>
            {[0.4, 0.7, 1].map((h, i) => (
              <View
                key={i}
                style={[
                  styles.signalBar,
                  {
                    height: 8 + i * 6,
                    opacity: disconnected ? 0.2 : h,
                    backgroundColor: disconnected ? "#FF5252" : "#F2CB07",
                  },
                ]}
              />
            ))}
          </View>
        </Animated.View>

        {/* ── Device info strip ── */}
        <Animated.View style={[styles.infoStrip, { opacity: headerFade }]}>
          <Ionicons name="hardware-chip-outline" size={14} color="rgba(242,203,7,0.6)" />
          <Text style={styles.infoStripText}>
            {String(machineId).slice(0, 8).toUpperCase()}...
          </Text>
          <View style={styles.infoStripDivider} />
          <Ionicons name="bluetooth" size={14} color="rgba(242,203,7,0.6)" />
          <Text style={styles.infoStripText}>BLE</Text>
        </Animated.View>

        {/* ── Action grid ── */}
        <View style={styles.grid}>

          {/* Initialize — full width, top */}
          <ActionTile
            icon="link"
            label="Initialize Card"
            full
            delay={100}
            onPress={() =>
              router.push({
                pathname: "/home/initialize",
                params: { deviceName, deviceId, machineId },
              })
            }
          />

          {/* Row 2 */}
          <View style={styles.row}>
            <ActionTile
              icon="card"
              label="Recharge"
              delay={180}
              onPress={() =>
                router.push({
                  pathname: "/home/recharge",
                  params: { deviceName, deviceId, machineId },
                })
              }
            />
            <ActionTile
              icon="wallet"
              label="Card Balance"
              delay={240}
              onPress={() =>
                router.push({
                  pathname: "/home/balance",
                  params: { deviceName, deviceId },
                })
              }
            />
          </View>

          {/* Row 3 */}
          <View style={styles.row}>
            <ActionTile
              icon="time"
              label="History"
              delay={300}
              onPress={() =>
                router.push({
                  pathname: "/home/history",
                  params: { deviceName, deviceId, machineId },
                })
              }
            />
            <ActionTile
              icon="wallet-outline"
              label="Device Balance"
              delay={360}
              onPress={() =>
                router.push({
                  pathname: "/home/devicebalance",
                  params: { deviceName, deviceId, machineId },
                })
              }
            />
          </View>

        </View>
      </View>

      <CustomAlert
        visible={showAlert}
        type="error"
        title="Device Disconnected"
        message={`${deviceName || "Device"} was disconnected.`}
        onConfirm={handleAlertConfirm}
        confirmText="OK"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  bgBase: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0F0A2E" },
  bgOrb1: {
    position: "absolute", top: -60, right: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: "rgba(56,32,140,0.55)",
  },
  bgOrb2: {
    position: "absolute", bottom: 40, left: -70,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: "rgba(20,10,60,0.7)",
  },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  headerCenter: { flex: 1 },
  headerDevice: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.3,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  statusDot: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: "#4ADE80",
  },
  statusText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    fontWeight: "500",
  },
  signalWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    paddingBottom: 2,
  },
  signalBar: {
    width: 4,
    borderRadius: 2,
  },

  // Info strip
  infoStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(242,203,7,0.06)",
    borderWidth: 1,
    borderColor: "rgba(242,203,7,0.12)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 20,
    alignSelf: "flex-start",
  },
  infoStripText: {
    color: "rgba(242,203,7,0.6)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  infoStripDivider: {
    width: 1, height: 12,
    backgroundColor: "rgba(242,203,7,0.2)",
  },

  // Grid
  grid: { flex: 1, gap: 14 },
  row: { flexDirection: "row", gap: 14 },
});