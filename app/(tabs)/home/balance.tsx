import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { readCardIdBLE, readCardBalanceBLE } from "@/app/bluetooth/manager";
import { checkCardOnServer } from "@/app/api/initialize";
import CustomAlert from "./customalert";

// ─────────────────────────────────────────────
// BALANCE CHECK FLOW (server-first):
//
// 1. READ_ID: tap card → get card_id (nothing written)
// 2. Check server with card_id:
//    a. API error         → show "Server Error"
//    b. Card NOT on server → show "Card Not Initialized"
//    c. Card EXISTS       → proceed to step 3
// 3. BLE READ: read balance from card
// ─────────────────────────────────────────────

export default function BalanceScreen() {
  const router = useRouter();
  const { deviceName } = useLocalSearchParams();

  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Loading phase label so the user knows what to do at each step
  const [loadingLabel, setLoadingLabel] = useState<"scan" | "checking" | "reading">("scan");

  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState<"error" | "warning">("error");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const spinAnim  = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
  };

  const spinLoop = () => {
    spinAnim.setValue(0);
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
    ).start();
  };

  const showError = (title: string, message: string, type: "error" | "warning" = "error") => {
    setAlertType(type);
    setAlertTitle(title);
    setAlertMessage(message);
    setShowAlert(true);
  };

  // ─────────────────────────────────────────────
  // MAIN: readBalance
  // Step 1 → Step 2 → Step 3
  // ─────────────────────────────────────────────
  const readBalance = () => {
    setLoading(true);
    setBalance(null);
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.8);
    spinLoop();

    // ── STEP 1: READ_ID — tap card, get UID (nothing written) ──
    setLoadingLabel("scan");

    readCardIdBLE(async (idResult) => {
      console.log("READ_ID result:", JSON.stringify(idResult));

      if (idResult.error || !idResult.cardId) {
        setLoading(false);
        if (idResult.error === "NO_CARD_DETECTED" || idResult.error === "NO_CARD") {
          showError("No Card Detected", "Place your RFID card flat on the reader and try again.", "warning");
        } else if (idResult.error === "NO_DEVICE") {
          showError("Not Connected", "No device connected. Please go back and reconnect.");
        } else {
          showError("Card Read Failed", "Could not read card. Please try again.");
        }
        return;
      }

      const cardId = idResult.cardId;

      // ── STEP 2: Check server — is this card registered? ──
      setLoadingLabel("checking");

      const serverCard = await checkCardOnServer(cardId);

      if (serverCard === null) {
        setLoading(false);
        showError("Server Error", "Could not verify card status. Please try again.");
        return;
      }

      if (!serverCard.exists) {
        setLoading(false);
        showError(
          "Card Not Initialized",
          "This card is not registered in the system.\nPlease initialize the card first.",
          "warning"
        );
        return;
      }

      // ── STEP 3: Card exists on server → read balance from card ──
      setLoadingLabel("reading");

      try {
        await readCardBalanceBLE(
          (value) => {
            setBalance(value);
            setLoading(false);
            animateIn();
          },
          (err) => {
            console.log("readCardBalanceBLE error:", err);
            setLoading(false);
            showError("Balance Read Failed", "Could not read balance from card. Try again.");
          }
        );
      } catch (err) {
        console.log("readCardBalanceBLE threw:", err);
        setLoading(false);
        showError("Balance Read Failed", "Could not read balance from card. Try again.");
      }
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => { readBalance(); }, 300);
    return () => clearTimeout(timer);
  }, []);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  // Dynamic loading UI labels per step
  const loadingTitle = loadingLabel === "scan"
    ? "Tap Card to Scan"
    : loadingLabel === "checking"
    ? "Checking Server..."
    : "Reading Balance...";

  const loadingSubtitle = loadingLabel === "scan"
    ? "Hold your RFID card on the reader"
    : loadingLabel === "checking"
    ? "Verifying card registration"
    : "Hold card still on the reader";

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
          <Text style={styles.headerTitle}>Card Balance</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={readBalance} disabled={loading}>
            <Animated.View style={{ transform: [{ rotate: loading ? spin : "0deg" }] }}>
              <Ionicons name="refresh" size={20} color="#F2CB07" />
            </Animated.View>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingWrap}>
              {/* NFC scan animation */}
              <View style={styles.nfcOuter}>
                <View style={styles.nfcMid}>
                  <View style={styles.nfcInner}>
                    {loadingLabel === "checking" ? (
                      <Ionicons name="cloud-outline" size={32} color="#F2CB07" />
                    ) : (
                      <Ionicons
                        name="wifi"
                        size={32}
                        color="#F2CB07"
                        style={{ transform: [{ rotate: "180deg" }] }}
                      />
                    )}
                  </View>
                </View>
              </View>
              <Text style={styles.loadingTitle}>{loadingTitle}</Text>
              <Text style={styles.loadingSubtitle}>{loadingSubtitle}</Text>
            </View>
          ) : balance !== null ? (
            <Animated.View
              style={[styles.balanceCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
            >
              {/* Top accent */}
              <View style={styles.cardTopAccent} />

              <View style={styles.walletIconWrap}>
                <Ionicons name="wallet" size={32} color="#F2CB07" />
              </View>

              <Text style={styles.balanceLabel}>Available Balance</Text>

              <View style={styles.balanceRow}>
                <Text style={styles.balanceRupee}>₹</Text>
                <Text style={styles.balanceAmount}>{balance}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.deviceRow}>
                <Ionicons name="hardware-chip-outline" size={14} color="rgba(242,203,7,0.5)" />
                <Text style={styles.deviceName}>{deviceName || "Device"}</Text>
              </View>

              {/* Corner brackets */}
              <View style={styles.cornerTL} />
              <View style={styles.cornerBR} />
            </Animated.View>
          ) : null}
        </View>
      </View>

      <CustomAlert
        visible={showAlert}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onConfirm={() => setShowAlert(false)}
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
    backgroundColor: "rgba(56,32,140,0.5)",
  },
  bgOrb2: {
    position: "absolute", bottom: 80, left: -80,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: "rgba(20,10,60,0.6)",
  },
  container: { flex: 1, paddingHorizontal: 22, paddingTop: 8 },
  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 24,
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

  content: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Loading
  loadingWrap: { alignItems: "center", gap: 20 },
  nfcOuter: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: "rgba(242,203,7,0.05)",
    borderWidth: 1, borderColor: "rgba(242,203,7,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  nfcMid: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: "rgba(242,203,7,0.08)",
    borderWidth: 1, borderColor: "rgba(242,203,7,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  nfcInner: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "rgba(242,203,7,0.12)",
    borderWidth: 1.5, borderColor: "rgba(242,203,7,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  loadingTitle:    { fontSize: 18, fontWeight: "700", color: "#FFF" },
  loadingSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.4)", textAlign: "center" },

  // Balance card
  balanceCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 24, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 32, alignItems: "center", gap: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4, shadowRadius: 28, elevation: 12,
  },
  cardTopAccent: {
    position: "absolute", top: 0, left: 0, right: 0,
    height: 1, backgroundColor: "rgba(242,203,7,0.25)",
  },
  cornerTL: {
    position: "absolute", top: 0, left: 0,
    width: 32, height: 32,
    borderTopWidth: 2, borderLeftWidth: 2,
    borderColor: "rgba(242,203,7,0.3)", borderTopLeftRadius: 24,
  },
  cornerBR: {
    position: "absolute", bottom: 0, right: 0,
    width: 32, height: 32,
    borderBottomWidth: 2, borderRightWidth: 2,
    borderColor: "rgba(242,203,7,0.15)", borderBottomRightRadius: 24,
  },
  walletIconWrap: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: "rgba(242,203,7,0.1)",
    borderWidth: 1, borderColor: "rgba(242,203,7,0.25)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  balanceLabel:  { fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 2, fontWeight: "600" },
  balanceRow:    { flexDirection: "row", alignItems: "flex-start", marginTop: 4 },
  balanceRupee:  { fontSize: 32, color: "#F2CB07", fontWeight: "700", marginTop: 8 },
  balanceAmount: { fontSize: 72, fontWeight: "800", color: "#FFF", letterSpacing: -2 },
  divider:       { width: 60, height: 1, backgroundColor: "rgba(255,255,255,0.1)", marginVertical: 12 },
  deviceRow:     { flexDirection: "row", alignItems: "center", gap: 6 },
  deviceName:    { fontSize: 12, color: "rgba(242,203,7,0.5)", fontWeight: "600", letterSpacing: 1 },
});