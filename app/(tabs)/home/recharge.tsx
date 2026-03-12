import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Animated, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import CustomAlert from "./customalert";
import { rechargeCardBLE } from "@/app/bluetooth/manager";
import { rechargeMachineRFID } from "@/app/api/machine";

const { width } = Dimensions.get("window");

// ─────────────────────────────────────────────
// PRODUCTION FLOW (Server-First):
//
//  1. Read card via BLE → get cardId
//  2. Call server → deduct machine balance
//  3. If server OK → recharge card via BLE
//  4. If BLE fails after server deducted → show
//     "contact support" (transaction already recorded)
//  5. If server fails → card is never touched ✅
// ─────────────────────────────────────────────

export default function RechargeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const machineId = Array.isArray(params.machineId) ? params.machineId[0] : params.machineId;

  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Processing...");
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

  const showError = (title: string, message: string) => {
    setAlertType("error");
    setAlertTitle(title);
    setAlertMessage(message);
    setShowAlert(true);
  };

  const handleRecharge = async () => {
    const cleanAmount = amount.replace(/[^0-9]/g, "");
    if (!cleanAmount || parseInt(cleanAmount) <= 0) {
      shake();
      showError("Invalid Amount", "Please enter a valid amount");
      return;
    }

    const finalAmount = parseInt(cleanAmount);

    Animated.sequence([
      Animated.spring(btnScale, { toValue: 0.92, useNativeDriver: true, tension: 300 }),
      Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, tension: 300 }),
    ]).start();

    setIsLoading(true);

    // ── STEP 1: BLE — tap card to get cardId FIRST ──
    // We need cardId before calling server
    setLoadingLabel("Tap card on reader...");

    rechargeCardBLE(String(machineId), cleanAmount, async (bleResult) => {
      console.log("BLE RESULT:", JSON.stringify(bleResult));

      // ── BLE failed (no card, not init, etc) ──
      if (!bleResult.success) {
        setIsLoading(false);
        const errorMessages: Record<string, { title: string; message: string }> = {
          NO_DEVICE:            { title: "Not Connected",        message: "No BLE device connected." },
          BLE_ERROR:            { title: "BLE Error",            message: "Communication error. Try again." },
          NO_CARD:              { title: "No Card",              message: "Place card on reader and try again." },
          NOT_INIT:             { title: "Card Not Initialized", message: "Initialize the card first." },
          COMMUNICATION_FAILED: { title: "Timeout",              message: "Device did not respond. Try again." },
          MIN_25_FIRST:         { title: "Minimum ₹25",          message: "First recharge must be at least ₹25." },
          FAIL:                 { title: "Recharge Failed",      message: "Card update failed. Try again." },
        };
        const err = bleResult.error ?? "UNKNOWN";
        const mapped = errorMessages[err] ?? { title: "Error", message: err };
        showError(mapped.title, mapped.message);
        return;
      }

      // ── BLE success — we have cardId and balance updated on card ──
      // ── STEP 2: Sync to server ──
      setLoadingLabel("Syncing with server...");

      try {
        await rechargeMachineRFID(String(machineId), finalAmount, bleResult.cardId ?? "");

        // ── ALL GOOD ✅ ──
        setIsLoading(false);
        setAlertType("success");
        setAlertTitle("Recharge Successful!");
        setAlertMessage(`₹${finalAmount} added to card.\nNew Balance: ₹${bleResult.balance ?? "?"}`);
        setShowAlert(true);

      } catch (e: any) {
        // ── SERVER SYNC FAILED after card was already recharged ──
        // Card has money but server didn't record it.
        // This is the edge case — show a clear support message.
        setIsLoading(false);
        console.log("Server sync failed after BLE success:", e);

        const serverMsg = e?.message ?? "";

        if (
          serverMsg.toLowerCase().includes("insufficient") ||
          serverMsg.toLowerCase().includes("balance")
        ) {
          showError(
            "Machine Balance Low",
            "Machine does not have enough balance.\nPlease contact admin."
          );
        } else if (
          serverMsg.toLowerCase().includes("not found") ||
          serverMsg.toLowerCase().includes("card")
        ) {
          showError(
            "Card Not Registered",
            "This card is not registered in the system.\nPlease initialize it first."
          );
        } else {
          // Card recharged but server failed — user has money on card
          // but transaction not recorded. Flag this clearly.
          showError(
            "Sync Failed — Contact Support",
            `Card was recharged ₹${finalAmount} but server sync failed.\nPlease show this to admin.\nError: ${serverMsg.slice(0, 80)}`
          );
        }
      }
    });
  };

  const handleAlertClose = () => {
    setShowAlert(false);
    if (alertType === "success") {
      setAmount("");
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bgBase} />
      <View style={styles.bgOrb} />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} disabled={isLoading}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recharge Card</Text>
          <View style={{ width: 42 }} />
        </View>

        {/* Card visual */}
        <View style={styles.cardVisual}>
          <View style={styles.cardChip} />
          <Ionicons name="card" size={28} color="rgba(242,203,7,0.4)" style={styles.cardIcon} />
          <Text style={styles.cardLabel}>RFID CARD</Text>
        </View>

        {/* Amount input area */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Enter Amount</Text>

          <Animated.View style={[styles.amountRow, { transform: [{ translateX: inputShake }] }]}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput
              style={styles.amountInput}
              keyboardType="numeric"
              value={amount}
              onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ""))}
              maxLength={6}
              placeholder="0"
              placeholderTextColor="rgba(255,255,255,0.2)"
              selectionColor="#F2CB07"
              editable={!isLoading}
            />
          </Animated.View>

          <View style={styles.amountUnderline} />
          <Text style={styles.amountHint}>Tap your card on the reader after pressing go</Text>
        </View>

        {/* Quick amounts */}
        <View style={styles.quickRow}>
          {[50, 100, 150, 200].map((q) => (
            <TouchableOpacity
              key={q}
              style={[styles.quickChip, amount === String(q) && styles.quickChipActive]}
              onPress={() => setAmount(String(q))}
              disabled={isLoading}
            >
              <Text style={[styles.quickText, amount === String(q) && styles.quickTextActive]}>
                ₹{q}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Submit button */}
        <Animated.View style={[styles.btnWrap, { transform: [{ scale: btnScale }] }]}>
          <TouchableOpacity
            style={[styles.submitBtn, isLoading && styles.submitBtnLoading]}
            onPress={handleRecharge}
            activeOpacity={0.88}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Ionicons name="radio-outline" size={20} color="#1A0E4F" />
                <Text style={styles.submitText}>{loadingLabel}</Text>
              </>
            ) : (
              <>
                <Text style={styles.submitText}>Recharge Now</Text>
                <View style={styles.submitArrow}>
                  <Ionicons name="arrow-forward" size={20} color="#1A0E4F" />
                </View>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      <CustomAlert
        visible={showAlert}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onConfirm={handleAlertClose}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  bgBase: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0F0A2E" },
  bgOrb: {
    position: "absolute", top: -100, right: -80,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: "rgba(56,32,140,0.5)",
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

  cardVisual: {
    backgroundColor: "rgba(242,203,7,0.08)",
    borderWidth: 1, borderColor: "rgba(242,203,7,0.2)",
    borderRadius: 20, height: 130,
    marginBottom: 36, padding: 20,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  cardChip: {
    width: 36, height: 28, borderRadius: 6,
    backgroundColor: "rgba(242,203,7,0.25)",
    borderWidth: 1, borderColor: "rgba(242,203,7,0.4)",
  },
  cardIcon: { position: "absolute", bottom: 16, right: 20 },
  cardLabel: {
    position: "absolute", bottom: 20, left: 20,
    fontSize: 10, color: "rgba(242,203,7,0.5)",
    letterSpacing: 3, fontWeight: "700",
  },

  amountSection: { alignItems: "center", marginBottom: 32 },
  amountLabel: {
    fontSize: 13, color: "rgba(255,255,255,0.4)",
    letterSpacing: 2, fontWeight: "600", marginBottom: 16,
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
    marginTop: 8, marginBottom: 14,
  },
  amountHint: {
    fontSize: 12, color: "rgba(255,255,255,0.3)",
    textAlign: "center", paddingHorizontal: 40,
  },

  quickRow: {
    flexDirection: "row", justifyContent: "center",
    gap: 10, marginBottom: 32,
  },
  quickChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
    borderColor: "rgba(242,203,7,0.2)",
    backgroundColor: "rgba(242,203,7,0.06)",
  },
  quickChipActive: {
    backgroundColor: "rgba(242,203,7,0.18)",
    borderColor: "#F2CB07",
  },
  quickText: { color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: "600" },
  quickTextActive: { color: "#F2CB07" },

  btnWrap: { paddingHorizontal: 0 },
  submitBtn: {
    backgroundColor: "#F2CB07",
    borderRadius: 16, height: 58,
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 12,
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.25)",
    shadowColor: "#F2CB07",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
  },
  submitBtnLoading: {
    backgroundColor: "rgba(242,203,7,0.6)",
    shadowOpacity: 0.1,
  },
  submitText: { color: "#1A0E4F", fontSize: 17, fontWeight: "800", letterSpacing: 0.3 },
  submitArrow: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(26,14,79,0.2)",
    alignItems: "center", justifyContent: "center",
  },
});