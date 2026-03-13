import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Animated, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import CustomAlert from "./customalert";
import { readCardIdBLE, rechargeCardBLE } from "@/app/bluetooth/manager";
import { rechargeMachineRFID } from "@/app/api/machine";
import { checkCardOnServer } from "@/app/api/initialize";

const { width } = Dimensions.get("window");

// ─────────────────────────────────────────────
// RECHARGE FLOW (server-first):
//
// 1. User enters amount → presses Recharge
// 2. READ_ID: tap card → get card_id (nothing written)
// 3. Check server with card_id:
//    a. API error         → show "Server Error"
//    b. Card NOT on server → show "Card Not Initialized"
//    c. Card EXISTS       → proceed to step 4
// 4. BLE RECHARGE: tap card again → update balance on card
// 5. Server sync: record transaction
//    a. Success           → show success ✅
//    b. Server fail       → show sync error with card ID
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

  // ── Helpers ──────────────────────────────────
  const shake = () => {
    Animated.sequence([
      Animated.timing(inputShake, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(inputShake, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(inputShake, { toValue: 6,  duration: 60, useNativeDriver: true }),
      Animated.timing(inputShake, { toValue: 0,  duration: 60, useNativeDriver: true }),
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

  // ── BLE error → user-friendly message map ──
  const BLE_ERRORS: Record<string, { title: string; message: string; type: "error" | "warning" }> = {
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
    MIN_25_FIRST: {
      title: "Minimum ₹20 Required",
      message: "First recharge on this card must be at least ₹20.",
      type: "warning",
    },
    FAIL: {
      title: "Recharge Failed",
      message: "Card update failed. Please try again.",
      type: "error",
    },
    UNKNOWN: {
      title: "Unknown Error",
      message: "Something went wrong. Please try again.",
      type: "error",
    },
  };

  // ─────────────────────────────────────────────
  // MAIN HANDLER
  // ─────────────────────────────────────────────
  const handleRecharge = () => {
    const cleanAmount = amount.replace(/[^0-9]/g, "");
    if (!cleanAmount || parseInt(cleanAmount) <= 0) {
      shake();
      showError("Invalid Amount", "Please enter a valid amount to recharge");
      return;
    }

    const finalAmount = parseInt(cleanAmount);

    Animated.sequence([
      Animated.spring(btnScale, { toValue: 0.92, useNativeDriver: true, tension: 300 }),
      Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true, tension: 300 }),
    ]).start();

    setIsLoading(true);

    // ─────────────────────────────────────────────
    // STEP 2: READ_ID — tap card, get UID (nothing written)
    // ─────────────────────────────────────────────
    setLoadingLabel("Tap card to scan...");

    readCardIdBLE(async (idResult) => {
      console.log("READ_ID result:", JSON.stringify(idResult));

      if (idResult.error) {
        setIsLoading(false);
        const errInfo = BLE_ERRORS[idResult.error] ?? BLE_ERRORS["UNKNOWN"];
        showError(errInfo.title, errInfo.message, errInfo.type);
        return;
      }

      if (!idResult.cardId) {
        setIsLoading(false);
        showError("Card Read Failed", "Could not read card ID. Try again.");
        return;
      }

      const cardId = idResult.cardId;

      // ─────────────────────────────────────────────
      // STEP 3: Check server — is this card registered?
      // ─────────────────────────────────────────────
      setLoadingLabel("Checking server...");
      const serverCard = await checkCardOnServer(cardId);

      if (serverCard === null) {
        // API error
        setIsLoading(false);
        showError("Server Error", "Could not verify card status. Please try again.");
        return;
      }

      if (!serverCard.exists) {
        // Card not on server → not initialized or was deleted
        setIsLoading(false);
        showError(
          "Card Not Initialized",
          "This card is not registered in the system.\nPlease initialize the card first.",
          "warning"
        );
        return;
      }

      // ─────────────────────────────────────────────
      // STEP 4: Card exists on server → BLE recharge
      // (2nd tap — user taps card again to update balance)
      // ─────────────────────────────────────────────
      setLoadingLabel("Tap card again to recharge...");

      rechargeCardBLE(String(machineId), cleanAmount, async (bleResult) => {
        console.log("BLE RECHARGE result:", JSON.stringify(bleResult));

        if (!bleResult.success) {
          setIsLoading(false);
          const errKey = bleResult.error ?? "UNKNOWN";
          const errInfo = BLE_ERRORS[errKey] ?? BLE_ERRORS["UNKNOWN"];
          showError(errInfo.title, errInfo.message, errInfo.type);
          return;
        }

        // ─────────────────────────────────────────────
        // STEP 5: BLE success → sync to server
        // ─────────────────────────────────────────────
        setLoadingLabel("Syncing with server...");

        try {
          await rechargeMachineRFID(
            String(machineId),
            finalAmount,
            bleResult.cardId ?? cardId   // use BLE card_id, fallback to READ_ID card_id
          );

          setIsLoading(false);
          setAlertType("success");
          setAlertTitle("Recharge Successful!");
          setAlertMessage(
            `₹${finalAmount} added to your card.\nNew Balance: ₹${bleResult.balance ?? "—"}`
          );
          setShowAlert(true);
        } catch (e: any) {
          setIsLoading(false);
          console.log("Server sync failed after BLE success:", e);

          const serverMsg = (e?.message ?? "").toLowerCase();

          if (serverMsg.includes("insufficient") || serverMsg.includes("balance")) {
            showError(
              "Machine Balance Low",
              "Machine does not have enough balance. Please contact admin.",
              "warning"
            );
          } else if (serverMsg.includes("not found") || serverMsg.includes("card")) {
            showError(
              "Card Not Registered",
              "This card is not registered. Please initialize the card first.",
              "warning"
            );
          } else {
            // Card recharged physically but server didn't record — critical
            showError(
              "Sync Failed — Contact Admin",
              `Card was recharged ₹${finalAmount} but server sync failed.\nCard ID: ${bleResult.cardId ?? cardId}\nPlease show this message to admin.`
            );
          }
        }
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
            {isLoading
              ? loadingLabel.includes("again")
                ? "Tap card a second time to update balance"
                : "Please wait..."
              : "Tap your card on the reader after pressing Recharge"}
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