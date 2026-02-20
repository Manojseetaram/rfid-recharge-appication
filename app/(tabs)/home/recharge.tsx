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
import { fetchMachineBalance, rechargeMachineRFID } from "@/app/api/machine";

const { width } = Dimensions.get("window");

export default function RechargeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const machineId = Array.isArray(params.machineId) ? params.machineId[0] : params.machineId;

  const [amount, setAmount] = useState("");
  const [isChecking, setIsChecking] = useState(false); // balance check loading state
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

  const handleRecharge = async () => {
    const cleanAmount = amount.replace(/[^0-9]/g, "");
    if (!cleanAmount || parseInt(cleanAmount) <= 0) {
      shake();
      setAlertType("error");
      setAlertTitle("Invalid Amount");
      setAlertMessage("Please enter a valid amount");
      setShowAlert(true);
      return;
    }

    const finalAmount = parseInt(cleanAmount);

    Animated.sequence([
      Animated.spring(btnScale, { toValue: 0.92, useNativeDriver: true, tension: 300 }),
      Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, tension: 300 }),
    ]).start();

    // ── STEP 1: Check machine wallet balance BEFORE BLE ──
    setIsChecking(true);
    try {
      const machineBalance = await fetchMachineBalance(String(machineId));
      console.log(`Machine balance: ₹${machineBalance}, Recharge amount: ₹${finalAmount}`);

      if (machineBalance < finalAmount) {
        // ❌ NOT ENOUGH BALANCE — block recharge entirely
        shake();
        setAlertType("error");
        setAlertTitle("Insufficient Machine Balance");
        setAlertMessage(
          `Machine wallet has only ₹${machineBalance.toFixed(2)}.\nCannot recharge ₹${finalAmount}.`
        );
        setShowAlert(true);
        setIsChecking(false);
        return;
      }
    } catch (e: any) {
      console.log("Balance check failed:", e);
      setAlertType("error");
      setAlertTitle("Balance Check Failed");
      setAlertMessage("Could not verify machine balance.\nPlease try again.");
      setShowAlert(true);
      setIsChecking(false);
      return;
    }
    setIsChecking(false);

    // ── STEP 2: BLE recharge (balance is sufficient) ──
    rechargeCardBLE(String(machineId), cleanAmount, (result) => {
      console.log("BLE RESULT:", JSON.stringify(result));

      if (result.success) {
        // ── STEP 3: Sync to server ──
        setTimeout(async () => {
          try {
            await rechargeMachineRFID(String(machineId), finalAmount);
            setAlertType("success");
            setAlertTitle("Recharge Successful!");
            setAlertMessage(`₹${finalAmount} added.\nNew Balance: ₹${result.balance ?? "?"}`);
            setShowAlert(true);
          } catch (e: any) {
            console.log("Server sync failed:", e);
            setAlertType("error");
            setAlertTitle("Sync Warning");
            setAlertMessage("Card recharged but server update failed.\nPlease contact support.");
            setShowAlert(true);
          }
        }, 700);
        return;
      }

      // BLE errors
      const errorMessages: Record<string, { title: string; message: string }> = {
        NO_DEVICE:            { title: "Not Connected",        message: "No BLE device connected." },
        BLE_ERROR:            { title: "BLE Error",            message: "Communication error. Try again." },
        NO_CARD:              { title: "No Card",              message: "Place card on reader and try again." },
        NOT_INIT:             { title: "Card Not Initialized", message: "Initialize the card first." },
        COMMUNICATION_FAILED: { title: "Timeout",              message: "Device did not respond. Try again." },
        MIN_25_FIRST:         { title: "Minimum ₹25",          message: "First recharge must be at least ₹25." },
        FAIL:                 { title: "Recharge Failed",      message: "Card update failed. Try again." },
      };
      const err = result.error ?? "UNKNOWN";
      const mapped = errorMessages[err] ?? { title: "Error", message: err };
      setAlertType("error");
      setAlertTitle(mapped.title);
      setAlertMessage(mapped.message);
      setShowAlert(true);
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
              editable={!isChecking}
            />
          </Animated.View>

          <View style={styles.amountUnderline} />
          <Text style={styles.amountHint}>Tap your card on the reader after pressing go</Text>
        </View>

        {/* Quick amounts */}
        <View style={styles.quickRow}>
          {[50, 100, 200, 500].map((q) => (
            <TouchableOpacity
              key={q}
              style={[styles.quickChip, amount === String(q) && styles.quickChipActive]}
              onPress={() => setAmount(String(q))}
              disabled={isChecking}
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
            style={[styles.submitBtn, isChecking && styles.submitBtnLoading]}
            onPress={handleRecharge}
            activeOpacity={0.88}
            disabled={isChecking}
          >
            {isChecking ? (
              <>
                <Ionicons name="cloud-download-outline" size={20} color="#1A0E4F" />
                <Text style={styles.submitText}>Checking Balance...</Text>
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