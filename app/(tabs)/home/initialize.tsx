import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import CustomAlert from "./customalert";
import { initializeCardBLE } from "@/app/bluetooth/manager";
import { initializeMachineRFID } from "@/app/api/initialize";

export default function InitializeScreen() {
  const router = useRouter();
  const { deviceName, deviceId, machineId } = useLocalSearchParams();
  const [amount, setAmount] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState<"success" | "error">("success");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const btnScale = useRef(new Animated.Value(1)).current;
  const inputShake = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(inputShake, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(inputShake, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(inputShake, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(inputShake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  // ── ALL ORIGINAL LOGIC UNTOUCHED ──
  const handleInitialize = async () => {
    const value = parseInt(amount, 10);
    if (!amount || isNaN(value) || value <= 0) {
      shake();
      setAlertType("error"); setAlertTitle("Invalid Amount");
      setAlertMessage("Please enter a valid amount"); setShowAlert(true); return;
    }
    if (value < 200) {
      shake();
      setAlertType("error"); setAlertTitle("Minimum ₹200");
      setAlertMessage("Initialization requires minimum ₹200"); setShowAlert(true); return;
    }
    Animated.sequence([
      Animated.spring(btnScale, { toValue: 0.92, useNativeDriver: true, tension: 300 }),
      Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, tension: 300 }),
    ]).start();

    initializeCardBLE(value.toString(), async (result) => {
      console.log("BLE INIT RESULT:", JSON.stringify(result));
      if (result.error === "CARD_ALREADY_INITIALIZED") {
        setAlertType("error"); setAlertTitle("Already Initialized");
        setAlertMessage(`Card already has ₹${result.balance ?? 0}`); setShowAlert(true); return;
      }
      if (result.error === "NO_CARD_DETECTED") {
        setAlertType("error"); setAlertTitle("No Card");
        setAlertMessage("Place card on the reader and try again"); setShowAlert(true); return;
      }
      if (result.error === "MINIMUM_200_REQUIRED") {
        setAlertType("error"); setAlertTitle("Minimum ₹200");
        setAlertMessage("Initialization requires minimum ₹200"); setShowAlert(true); return;
      }
      if (result.error) {
        setAlertType("error"); setAlertTitle("Initialization Failed");
        setAlertMessage(result.error); setShowAlert(true); return;
      }
      if (result.success) {
        setTimeout(async () => {
          try {
            console.log("Syncing with server...");
            await initializeMachineRFID(machineId as string, value);
            setAlertType("success"); setAlertTitle("Card Initialized!");
            setAlertMessage(`₹${value} loaded on card.\nNew Card Balance: ₹${result.balance ?? value}`);
            setShowAlert(true);
          } catch (e: any) {
            console.log("Server sync failed:", e);
            setAlertType("error"); setAlertTitle("Sync Warning");
            setAlertMessage("Card initialized but machine wallet was not deducted.\nPlease contact support.");
            setShowAlert(true);
          }
        }, 700);
      }
    });
  };

  const handleAlertClose = () => {
    setShowAlert(false);
    if (alertType === "success") { setAmount(""); router.back(); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bgBase} />
      <View style={styles.bgOrb} />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Initialize Card</Text>
          <View style={{ width: 42 }} />
        </View>

      

        {/* Steps */}
        <View style={styles.stepsRow}>
          {["Enter Amount", "Tap Card", "Done"].map((step, i) => (
            <React.Fragment key={step}>
              <View style={styles.step}>
                <View style={[styles.stepDot, i === 0 && styles.stepDotActive]}>
                  <Text style={styles.stepNum}>{i + 1}</Text>
                </View>
                <Text style={styles.stepLabel}>{step}</Text>
              </View>
              {i < 2 && <View style={styles.stepLine} />}
            </React.Fragment>
          ))}
        </View>

        {/* Amount input */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>LOAD AMOUNT</Text>
          <Animated.View style={[styles.amountRow, { transform: [{ translateX: inputShake }] }]}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor="rgba(255,255,255,0.2)"
              keyboardType="numeric"
              value={amount}
              onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, "").replace(/^0+/, ""))}
              maxLength={6}
              selectionColor="#F2CB07"
            />
          </Animated.View>
          <View style={styles.amountUnderline} />
          <Text style={styles.minText}>Minimum ₹200</Text>
        </View>

        {/* Quick amounts */}
        <View style={styles.quickRow}>
          {[200, 500, 1000, 2000].map((q) => (
            <TouchableOpacity
              key={q}
              style={[styles.quickChip, amount === String(q) && styles.quickChipActive]}
              onPress={() => setAmount(String(q))}
            >
              <Text style={[styles.quickText, amount === String(q) && styles.quickTextActive]}>
                ₹{q}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Button */}
        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <TouchableOpacity style={styles.submitBtn} onPress={handleInitialize} activeOpacity={0.88}>
            <Ionicons name="link" size={20} color="#1A0E4F" />
            <Text style={styles.submitText}>Initialize Card</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <CustomAlert
        visible={showAlert} type={alertType}
        title={alertTitle} message={alertMessage}
        onConfirm={handleAlertClose}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  bgBase: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0F0A2E" },
  bgOrb: {
    position: "absolute", bottom: -80, left: -80,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: "rgba(56,32,140,0.45)",
  },
  container: { flex: 1, paddingHorizontal: 22, paddingTop: 8 },
  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 22,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFF", letterSpacing: 0.3 },

  // Info banner
  infoBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "rgba(242,203,7,0.07)",
    borderWidth: 1, borderColor: "rgba(242,203,7,0.18)",
    borderRadius: 14, padding: 14, marginBottom: 24,
  },
  infoIcon: { marginTop: 1 },
  infoText: { flex: 1, fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 18 },

  // Steps
  stepsRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", marginBottom: 32, gap: 0,
  },
  step: { alignItems: "center", gap: 6 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  stepDotActive: {
    backgroundColor: "rgba(242,203,7,0.2)",
    borderColor: "#F2CB07",
  },
  stepNum: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.6)" },
  stepLabel: { fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: 0.5 },
  stepLine: { width: 40, height: 1, backgroundColor: "rgba(255,255,255,0.1)", marginBottom: 14 },

  // Amount
  amountSection: { alignItems: "center", marginBottom: 28 },
  amountLabel: {
    fontSize: 11, color: "rgba(255,255,255,0.35)",
    letterSpacing: 3, fontWeight: "700", marginBottom: 16,
  },
  amountRow: { flexDirection: "row", alignItems: "center" },
  rupee: { fontSize: 40, color: "#F2CB07", fontWeight: "700", marginRight: 4 },
  amountInput: {
    fontSize: 64, fontWeight: "800", color: "#FFF",
    minWidth: 80, textAlign: "center",
  },
  amountUnderline: {
    width: 120, height: 2, borderRadius: 1,
    backgroundColor: "rgba(242,203,7,0.3)",
    marginTop: 8, marginBottom: 10,
  },
  minText: { fontSize: 12, color: "rgba(242,203,7,0.5)", fontWeight: "600" },

  // Quick
  quickRow: { flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 32 },
  quickChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(242,203,7,0.2)",
    backgroundColor: "rgba(242,203,7,0.05)",
  },
  quickChipActive: { backgroundColor: "rgba(242,203,7,0.18)", borderColor: "#F2CB07" },
  quickText: { color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: "600" },
  quickTextActive: { color: "#F2CB07" },

  // Button
  submitBtn: {
    backgroundColor: "#F2CB07", borderRadius: 16, height: 58,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.25)",
    shadowColor: "#F2CB07", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
  },
  submitText: { color: "#1A0E4F", fontSize: 17, fontWeight: "800", letterSpacing: 0.3 },
});