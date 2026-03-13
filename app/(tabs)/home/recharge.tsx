import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Animated, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import CustomAlert from "./customalert";
import { rechargeCardBLE, readCardIdBLE } from "@/app/bluetooth/manager";
import { rechargeMachineRFID } from "@/app/api/machine";

const { width } = Dimensions.get("window");

// ─────────────────────────────────────────────
// TRUE SERVER-FIRST FLOW:
//  1. User enters amount → presses Recharge
//  2. BLE READ_ID: tap card → get cardId only (no balance change)
//  3. SERVER: call recharge-rfid first
//     → 400: card inactive / not found / machine low → ABORT, BLE never touched
//     → 200: server confirmed OK, transaction recorded
//  4. BLE RECHARGE: now update physical card balance
//     → if BLE fails here, transaction already on server → show admin message
// ─────────────────────────────────────────────

export default function RechargeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const machineId = Array.isArray(params.machineId)
    ? params.machineId[0]
    : params.machineId;

  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Processing...");

  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState<"success" | "error" | "warning">("success");
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

  const showError = (
    title: string,
    message: string,
    type: "error" | "warning" = "error"
  ) => {
    setAlertType(type);
    setAlertTitle(title);
    setAlertMessage(message);
    setShowAlert(true);
  };

  // ── BLE READ_ID errors ──
  const BLE_READ_ERRORS: Record<string, { title: string; message: string; type: "error" | "warning" }> = {
    NO_DEVICE: {
      title: "Not Connected",
      message: "No device connected. Please go back and reconnect.",
      type: "error",
    },
    BLE_ERROR: {
      title: "Communication Error",
      message: "BLE communication failed. Move card closer and try again.",
      type: "error",
    },
    NO_CARD: {
      title: "No Card Detected",
      message: "Place your RFID card flat on the reader and try again.",
      type: "warning",
    },
    NO_CARD_DETECTED: {
      title: "No Card Detected",
      message: "Place your RFID card flat on the reader and try again.",
      type: "warning",
    },
    COMMUNICATION_FAILED: {
      title: "Device Timeout",
      message: "Device did not respond. Please try again.",
      type: "error",
    },
    UNKNOWN: {
      title: "Unknown Error",
      message: "Something went wrong. Please try again.",
      type: "error",
    },
  };

  // ── BLE RECHARGE errors (after server already succeeded) ──
  const BLE_RECHARGE_ERRORS: Record<string, { title: string; message: string; type: "error" | "warning" }> = {
    NO_DEVICE: {
      title: "Not Connected",
      message: "No device connected. Please go back and reconnect.",
      type: "error",
    },
    BLE_ERROR: {
      title: "Communication Error",
      message: "BLE communication failed. Move card closer and try again.",
      type: "error",
    },
    NO_CARD: {
      title: "No Card Detected",
      message: "Place your RFID card flat on the reader and try again.",
      type: "warning",
    },
    NOT_INIT: {
      title: "Card Not Initialized",
      message: "This card has not been initialized yet. Please initialize it first.",
      type: "warning",
    },
    COMMUNICATION_FAILED: {
      title: "Device Timeout",
      message: "Device did not respond. Please try again.",
      type: "error",
    },
    FAIL: {
      title: "Card Update Failed",
      message: "Card update failed. Please try again.",
      type: "error",
    },
    UNKNOWN: {
      title: "Unknown Error",
      message: "Something went wrong. Please try again.",
      type: "error",
    },
  };

  // ── Parse server error → friendly message ──
  // Server returns errors like:
  //   {"status":"error","error":"failed to recharge RFID card. Please try again"}
  //   {"status":"error","error":"machine not found or balance unavailable"}
  const parseServerError = (
    rawError: string
  ): { title: string; message: string; type: "error" | "warning" } => {
    let msg = "";
    try {
      const json = JSON.parse(rawError);
      msg = (json.error ?? json.message ?? rawError).toLowerCase();
    } catch (_) {
      msg = rawError.toLowerCase();
    }

    if (msg.includes("inactive") || msg.includes("deactivated") || msg.includes("blocked")) {
      return {
        title: "Card Inactive",
        message: "This card has been deactivated. Please contact admin.",
        type: "warning",
      };
    }
    if (msg.includes("not found") || msg.includes("not registered")) {
      return {
        title: "Card Not Registered",
        message: "This card is not registered. Please initialize it first.",
        type: "warning",
      };
    }
    if (
      msg.includes("machine not found") ||
      msg.includes("balance unavailable") ||
      msg.includes("insufficient") ||
      msg.includes("machine balance")
    ) {
      return {
        title: "Machine Balance Low",
        message: "Machine does not have enough balance. Please contact admin.",
        type: "warning",
      };
    }
    if (msg.includes("failed to recharge")) {
      return {
        title: "Recharge Failed",
        message: "Server could not process this recharge. Please try again.",
        type: "error",
      };
    }

    return {
      title: "Server Error",
      message: "This card is diactivated .",
      type: "error",
    };
  };

  const handleRecharge = async () => {
    const cleanAmount = amount.replace(/[^0-9]/g, "");
    if (!cleanAmount || parseInt(cleanAmount) <= 0) {
      shake();
      showError("Invalid Amount", "Please enter a valid amount to recharge");
      return;
    }

    const finalAmount = parseInt(cleanAmount);

    Animated.sequence([
      Animated.spring(btnScale, { toValue: 0.92, useNativeDriver: true, tension: 300 }),
      Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, tension: 300 }),
    ]).start();

    setIsLoading(true);

    // ─────────────────────────────────────────
    // STEP 1: BLE READ_ID — get card ID only, no balance change
    // ─────────────────────────────────────────
    setLoadingLabel("Tap card to scan...");

    readCardIdBLE(async (readResult) => {
      console.log("READ_ID result:", JSON.stringify(readResult));

      if (!readResult.success || !readResult.cardId) {
        setIsLoading(false);
        const errKey = readResult.error ?? "UNKNOWN";
        const errInfo = BLE_READ_ERRORS[errKey] ?? BLE_READ_ERRORS["UNKNOWN"];
        showError(errInfo.title, errInfo.message, errInfo.type);
        return;
      }

      const cardId = readResult.cardId;

      // ─────────────────────────────────────────
      // STEP 2: SERVER CHECK — validate card active + machine balance
      // If this fails → abort completely, card is untouched
      // ─────────────────────────────────────────
      setLoadingLabel("Verifying with server...");

      try {
        await rechargeMachineRFID(String(machineId), finalAmount, cardId);
      } catch (e: any) {
        // Server rejected → card inactive / not found / machine balance low
        setIsLoading(false);
        console.log("Server rejected recharge:", e?.message);
        const errInfo = parseServerError(e?.message ?? "");
        showError(errInfo.title, errInfo.message, errInfo.type);
        return; // ← BLE recharge NEVER happens
      }

      // ─────────────────────────────────────────
      // STEP 3: SERVER APPROVED → now update physical card via BLE
      // ─────────────────────────────────────────
      setLoadingLabel("Tap card again to complete...");

      rechargeCardBLE(String(machineId), cleanAmount, (bleResult) => {
        console.log("BLE RECHARGE result:", JSON.stringify(bleResult));
        setIsLoading(false);

        if (!bleResult.success) {
          // Server already recorded the transaction but BLE failed
          // Show a specific message so admin can reconcile
          const errKey = bleResult.error ?? "UNKNOWN";
          const errInfo = BLE_RECHARGE_ERRORS[errKey] ?? BLE_RECHARGE_ERRORS["UNKNOWN"];
          showError(
            "Card Update Failed — Contact Admin",
            `Server transaction was recorded but card update failed.\nCard ID: ${cardId}\nError: ${errInfo.message}\nPlease show this to admin.`,
            "error"
          );
          return;
        }

        // ── All done ✅ ──
        setAlertType("success");
        setAlertTitle("Recharge Successful!");
        setAlertMessage(
          `₹${finalAmount} added to your card.\nNew Balance: ₹${bleResult.balance ?? "—"}`
        );
        setShowAlert(true);
      });
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
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            disabled={isLoading}
          >
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recharge Card</Text>
          <View style={{ width: 42 }} />
        </View>

        {/* Card visual */}
        <View style={styles.cardVisual}>
          <View style={styles.cardChip} />
          <Ionicons
            name="card"
            size={28}
            color="rgba(242,203,7,0.4)"
            style={styles.cardIcon}
          />
          <Text style={styles.cardLabel}>RFID CARD</Text>
        </View>

        {/* Amount input area */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Enter Amount</Text>

          <Animated.View
            style={[styles.amountRow, { transform: [{ translateX: inputShake }] }]}
          >
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
          <Text style={styles.amountHint}>
            Tap your card on the reader when prompted
          </Text>
        </View>

        {/* Quick amounts */}
        <View style={styles.quickRow}>
          {[50, 100, 150, 200].map((q) => (
            <TouchableOpacity
              key={q}
              style={[
                styles.quickChip,
                amount === String(q) && styles.quickChipActive,
              ]}
              onPress={() => setAmount(String(q))}
              disabled={isLoading}
            >
              <Text
                style={[
                  styles.quickText,
                  amount === String(q) && styles.quickTextActive,
                ]}
              >
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