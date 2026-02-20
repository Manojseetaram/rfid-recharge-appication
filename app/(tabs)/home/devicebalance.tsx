import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";

const API_BASE = "https://sv0gotfhtb.execute-api.ap-south-1.amazonaws.com/Prod";

export default function DeviceBalanceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const deviceName = params.deviceName as string | undefined;
  const machineId = params.machineId as string | undefined;

  const [deviceBalance, setDeviceBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  let spinLoop: Animated.CompositeAnimation | null = null;

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
  };

  // ── ALL ORIGINAL LOGIC UNTOUCHED ──
  const fetchBalance = async () => {
    setLoading(true);
    setError(null);
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.85);
    spinAnim.setValue(0);
    spinLoop = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 900, useNativeDriver: true })
    );
    spinLoop.start();

    try {
      if (!machineId) { setError("Machine ID missing"); return; }
      const token = await SecureStore.getItemAsync("auth_token");
      const url = `${API_BASE}/warden/fetchMachineBalance/${machineId}`;
      console.log("Fetching balance:", url);
      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      console.log("Balance response:", json);
      if (res.ok && json.data?.balance !== undefined) {
        const balanceValue = parseFloat(json.data.balance);
        setDeviceBalance(isNaN(balanceValue) ? 0 : balanceValue);
        animateIn();
      } else {
        setError(json.message || "Failed to fetch balance");
      }
    } catch (err) {
      console.log("Balance error:", err);
      setError("Server error");
    } finally {
      spinLoop?.stop();
      setLoading(false);
    }
  };

  useEffect(() => { fetchBalance(); }, []);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bgBase} />
      <View style={styles.bgOrb1} />
      <View style={styles.bgOrb2} />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{deviceName || "Device"}</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchBalance} disabled={loading}>
            <Animated.View style={{ transform: [{ rotate: loading ? spin : "0deg" }] }}>
              <Ionicons name="refresh" size={20} color="#F2CB07" />
            </Animated.View>
          </TouchableOpacity>
        </View>

        <Text style={styles.screenSubtitle}>Machine Wallet Balance</Text>

        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingWrap}>
              <View style={styles.loadingRing}>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Ionicons name="refresh" size={36} color="#F2CB07" />
                </Animated.View>
              </View>
              <Text style={styles.loadingText}>Fetching balance...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorWrap}>
              <View style={styles.errorIcon}>
                <Ionicons name="alert-circle" size={40} color="#FF5252" />
              </View>
              <Text style={styles.errorTitle}>Failed to load</Text>
              <Text style={styles.errorMsg}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchBalance}>
                <Ionicons name="refresh" size={16} color="#FF5252" />
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : deviceBalance !== null ? (
            <Animated.View
              style={[styles.balanceCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
            >
              <View style={styles.cardTopAccent} />
              <View style={styles.cornerTL} />
              <View style={styles.cornerBR} />

              {/* Machine icon */}
              <View style={styles.machineIconWrap}>
                <Ionicons name="hardware-chip-outline" size={32} color="#F2CB07" />
              </View>

              <Text style={styles.balanceLabel}>WALLET BALANCE</Text>

              <View style={styles.balanceRow}>
                <Text style={styles.balanceRupee}>₹</Text>
                <Text style={styles.balanceAmount}>{deviceBalance.toFixed(2)}</Text>
              </View>

              <View style={styles.divider} />

              {/* Status chip */}
              <View style={styles.statusChip}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Active</Text>
              </View>
            </Animated.View>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  bgBase: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0F0A2E" },
  bgOrb1: {
    position: "absolute", top: -50, left: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: "rgba(56,32,140,0.5)",
  },
  bgOrb2: {
    position: "absolute", bottom: 60, right: -80,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: "rgba(20,10,60,0.6)",
  },
  container: { flex: 1, paddingHorizontal: 22, paddingTop: 8 },
  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 4,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFF", letterSpacing: 0.3 },
  refreshBtn: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: "rgba(242,203,7,0.08)",
    borderWidth: 1, borderColor: "rgba(242,203,7,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  screenSubtitle: {
    fontSize: 12, color: "rgba(255,255,255,0.3)",
    textAlign: "center", letterSpacing: 1.5,
    fontWeight: "600", marginBottom: 32,
  },

  content: { flex: 1, justifyContent: "center", alignItems: "center" },

  loadingWrap: { alignItems: "center", gap: 20 },
  loadingRing: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: "rgba(242,203,7,0.08)",
    borderWidth: 1.5, borderColor: "rgba(242,203,7,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  loadingText: { fontSize: 14, color: "rgba(255,255,255,0.4)" },

  errorWrap: { alignItems: "center", gap: 12 },
  errorIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: "rgba(255,82,82,0.08)",
    borderWidth: 1, borderColor: "rgba(255,82,82,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  errorTitle: { fontSize: 18, fontWeight: "700", color: "#FFF" },
  errorMsg: { fontSize: 13, color: "rgba(255,255,255,0.4)", textAlign: "center" },
  retryBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12,
    backgroundColor: "rgba(255,82,82,0.1)",
    borderWidth: 1, borderColor: "rgba(255,82,82,0.25)",
    marginTop: 4,
  },
  retryText: { color: "#FF5252", fontWeight: "700", fontSize: 14 },

  balanceCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 24, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 36, alignItems: "center", gap: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4, shadowRadius: 28, elevation: 12,
  },
  cardTopAccent: {
    position: "absolute", top: 0, left: 0, right: 0,
    height: 1, backgroundColor: "rgba(242,203,7,0.2)",
  },
  cornerTL: {
    position: "absolute", top: 0, left: 0,
    width: 32, height: 32,
    borderTopWidth: 2, borderLeftWidth: 2,
    borderColor: "rgba(242,203,7,0.25)", borderTopLeftRadius: 24,
  },
  cornerBR: {
    position: "absolute", bottom: 0, right: 0,
    width: 32, height: 32,
    borderBottomWidth: 2, borderRightWidth: 2,
    borderColor: "rgba(242,203,7,0.12)", borderBottomRightRadius: 24,
  },
  machineIconWrap: {
    width: 68, height: 68, borderRadius: 18,
    backgroundColor: "rgba(242,203,7,0.1)",
    borderWidth: 1, borderColor: "rgba(242,203,7,0.25)",
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  balanceLabel: {
    fontSize: 11, color: "rgba(255,255,255,0.35)",
    letterSpacing: 3, fontWeight: "700",
  },
  balanceRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 4 },
  balanceRupee: { fontSize: 30, color: "#F2CB07", fontWeight: "700", marginTop: 10 },
  balanceAmount: { fontSize: 68, fontWeight: "800", color: "#FFF", letterSpacing: -2 },
  divider: { width: 60, height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 8 },
  statusChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(74,222,128,0.1)",
    borderWidth: 1, borderColor: "rgba(74,222,128,0.25)",
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ADE80" },
  statusText: { color: "#4ADE80", fontSize: 12, fontWeight: "700" },
});