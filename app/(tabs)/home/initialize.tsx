import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Animated, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import CustomAlert from "./customalert";
import {
  readCardIdBLE,
  initializeCardBLE,
} from "@/app/bluetooth/manager";
import { initializeMachineRFID, checkCardOnServer } from "@/app/api/initialize";

export default function InitializeScreen() {
  const router = useRouter();
  const { deviceName, deviceId, machineId } = useLocalSearchParams();

  const [amount, setAmount] = useState("");
  const [usn, setUsn] = useState("");
  const [cardUUID, setCardUUID] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Processing...");
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState<"success" | "error" | "warning">("success");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const btnScale = useRef(new Animated.Value(1)).current;
  const inputShake = useRef(new Animated.Value(0)).current;
  const cardUUIDOpacity = useRef(new Animated.Value(0)).current;
  const cardUUIDTranslate = useRef(new Animated.Value(12)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(inputShake, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(inputShake, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(inputShake, { toValue: 6,  duration: 60, useNativeDriver: true }),
      Animated.timing(inputShake, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const showMsg = (type: "success" | "error" | "warning", title: string, message: string) => {
    setAlertType(type); setAlertTitle(title); setAlertMessage(message); setShowAlert(true);
  };

  const revealCardUUID = (uuid: string) => {
    setCardUUID(uuid);
    cardUUIDOpacity.setValue(0);
    cardUUIDTranslate.setValue(12);
    Animated.parallel([
      Animated.timing(cardUUIDOpacity,   { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(cardUUIDTranslate, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  };

  const doBleInit = (value: number, cardId: string) => {
    setLoadingLabel("Tap card again to write...");
    initializeCardBLE(value.toString(), async (result) => {
      if (result.cardId) revealCardUUID(result.cardId);
      if (result.error === "NO_CARD_DETECTED") { setIsLoading(false); showMsg("error", "No Card", "Place card on the reader and try again."); return; }
      if (result.error === "MINIMUM_REQUIRED") { setIsLoading(false); showMsg("error", "Minimum ₹100", "Initialization requires minimum ₹100."); return; }
      if (result.error === "CARD_ALREADY_INITIALIZED") {
        setIsLoading(false);
        showMsg("warning", "Card Already Initialized", `This card is already registered.\n\nCard ID: ${cardId}\n\nPlease contact an administrator.`);
        return;
      }
      if (result.error) { setIsLoading(false); showMsg("error", "Initialization Failed", `Error: ${result.error}\nCard ID: ${cardId}`); return; }
      if (result.success && result.cardId) await doServerRegister(result.cardId, value, result.balance ?? value);
    });
  };

  const doServerRegister = async (cardId: string, value: number, balance: number) => {
    setLoadingLabel("Registering on server...");
    try {
      await initializeMachineRFID(machineId as string, value, cardId, usn.trim());
      setIsLoading(false);
      showMsg("success", "Card Initialized!", `₹${value} loaded successfully.\nBalance: ₹${balance}\nCard ID: ${cardId}\nUSN: ${usn.trim()}`);
    } catch (e: any) {
      setIsLoading(false);
      showMsg("error", "Critical: Sync Failed", `Card was written but server registration failed.\n\nCard ID: ${cardId}\nUSN: ${usn.trim()}\n\nPlease contact admin immediately.`);
    }
  };

  const handleInitialize = () => {
    const value = parseInt(amount, 10);
    if (!amount || isNaN(value) || value <= 0) { shake(); showMsg("error", "Invalid Amount", "Please enter a valid amount."); return; }
    if (value < 100) { shake(); showMsg("error", "Minimum ₹100", "Initialization requires minimum ₹100."); return; }
    if (!usn.trim()) { shake(); showMsg("error", "USN Required", "Please enter the student's register number."); return; }

    Animated.sequence([
      Animated.spring(btnScale, { toValue: 0.92, useNativeDriver: true, tension: 300 }),
      Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true, tension: 300 }),
    ]).start();

    setIsLoading(true);
    setLoadingLabel("Tap card to scan...");

    readCardIdBLE(async (idResult) => {
      if (idResult.error === "NO_CARD_DETECTED" || idResult.error === "NO_CARD") { setIsLoading(false); showMsg("error", "No Card", "Place card on the reader and try again."); return; }
      if (idResult.error || !idResult.cardId) { setIsLoading(false); showMsg("error", "Card Read Failed", "Could not read card. Try again."); return; }

      const cardId = idResult.cardId;
      revealCardUUID(cardId);
      setLoadingLabel("Checking server...");

      const serverCard = await checkCardOnServer(cardId);
      if (serverCard === null) { setIsLoading(false); showMsg("error", "Server Error", "Could not verify card with server. Please check your connection and try again."); return; }
      if (serverCard.exists) {
        setIsLoading(false);
        showMsg("warning", "Card Already Registered", `This card is already initialized and cannot be re-initialized.\n\nCard ID: ${cardId}\nBalance: ₹${serverCard.balance ?? 0}\nUSN: ${serverCard.usn ?? "—"}\n\nIf this is an error, contact admin.`);
        return;
      }
      setTimeout(() => doBleInit(value, cardId), 300);
    });
  };

  const handleAlertClose = () => {
    setShowAlert(false);
    if (alertType === "success") {
      setAmount(""); setUsn(""); setCardUUID(null);
      cardUUIDOpacity.setValue(0); cardUUIDTranslate.setValue(12);
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bgBase} />
      <View style={styles.bgOrb} />
      <View style={styles.bgOrbTop} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} disabled={isLoading}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Initialize Card</Text>
          <View style={{ width: 42 }} />
        </View>

        {/* Steps */}
        <View style={styles.stepsRow}>
          {["Enter Details", "Tap Card", "Done"].map((step, i) => (
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

        {/* USN Input */}
        <View style={styles.fieldSection}>
          <Animated.View style={{ transform: [{ translateX: inputShake }] }}>
            <TextInput
              style={styles.fieldInput}
              placeholder="Enter your register number"
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={usn}
              onChangeText={(text) => setUsn(text.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              autoCapitalize="characters"
              maxLength={12}
              selectionColor="#F2CB07"
              editable={!isLoading}
            />
          </Animated.View>
          <View style={styles.fieldUnderline} />
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
              editable={!isLoading}
            />
          </Animated.View>
          <View style={styles.amountUnderline} />
          <Text style={styles.minText}>Minimum ₹100</Text>
        </View>

        {/* Quick amounts */}
        <View style={styles.quickRow}>
          {[100, 150, 200, 250].map((q) => (
            <TouchableOpacity key={q} style={[styles.quickChip, amount === String(q) && styles.quickChipActive]} onPress={() => setAmount(String(q))} disabled={isLoading}>
              <Text style={[styles.quickText, amount === String(q) && styles.quickTextActive]}>₹{q}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Card UUID */}
        {cardUUID && (
          <Animated.View style={[styles.uuidCard, { opacity: cardUUIDOpacity, transform: [{ translateY: cardUUIDTranslate }] }]}>
            <View style={styles.uuidRow}>
              <View style={styles.uuidIconWrap}><Ionicons name="card-outline" size={18} color="#F2CB07" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.uuidTitle}>CARD UUID</Text>
                <Text style={styles.uuidValue} numberOfLines={1} ellipsizeMode="middle">{cardUUID}</Text>
              </View>
              <View style={styles.uuidBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#4ADE80" />
                <Text style={styles.uuidBadgeText}>Detected</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Loading hint */}
        {isLoading && (
          <View style={styles.hintBox}>
            <Ionicons name="information-circle-outline" size={16} color="rgba(242,203,7,0.6)" />
            <Text style={styles.hintText}>{loadingLabel.includes("Tap") ? "Hold your card near the reader" : "Please wait..."}</Text>
          </View>
        )}

        {/* Button */}
        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <TouchableOpacity style={[styles.submitBtn, isLoading && styles.submitBtnLoading]} onPress={handleInitialize} activeOpacity={0.88} disabled={isLoading}>
            {isLoading ? (
              <><Ionicons name="radio-outline" size={20} color="#1A0E4F" /><Text style={styles.submitText}>{loadingLabel}</Text></>
            ) : (
              <><Ionicons name="link" size={20} color="#1A0E4F" /><Text style={styles.submitText}>Initialize Card</Text></>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <CustomAlert visible={showAlert} type={alertType} title={alertTitle} message={alertMessage} onConfirm={handleAlertClose} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  bgBase: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0F0A2E" },
  bgOrb: { position: "absolute", bottom: -80, left: -80, width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(56,32,140,0.45)" },
  bgOrbTop: { position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(242,203,7,0.06)" },
  scrollContent: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 40 }, // ← paddingTop: 20

  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 28,
  },
  backBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFF", letterSpacing: 0.3 },

  stepsRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 32 },
  step: { alignItems: "center", gap: 6 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  stepDotActive: { backgroundColor: "rgba(242,203,7,0.2)", borderColor: "#F2CB07" },
  stepNum: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.6)" },
  stepLabel: { fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: 0.5 },
  stepLine: { width: 40, height: 1, backgroundColor: "rgba(255,255,255,0.1)", marginBottom: 14 },

  fieldSection: { marginBottom: 28 },
  fieldInput: { fontSize: 15, fontWeight: "700", color: "#FFF", paddingVertical: 6, letterSpacing: 1 },
  fieldUnderline: { height: 2, borderRadius: 1, backgroundColor: "rgba(255,255,255,0.12)", marginTop: 6 },

  amountSection: { alignItems: "center", marginBottom: 28 },
  amountLabel: { fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 3, fontWeight: "700", marginBottom: 16 },
  amountRow: { flexDirection: "row", alignItems: "center" },
  rupee: { fontSize: 40, color: "#F2CB07", fontWeight: "700", marginRight: 4 },
  amountInput: { fontSize: 64, fontWeight: "800", color: "#FFF", minWidth: 80, textAlign: "center" },
  amountUnderline: { width: 120, height: 2, borderRadius: 1, backgroundColor: "rgba(242,203,7,0.3)", marginTop: 8, marginBottom: 10 },
  minText: { fontSize: 12, color: "rgba(242,203,7,0.5)", fontWeight: "600" },

  quickRow: { flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 28 },
  quickChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "rgba(242,203,7,0.2)", backgroundColor: "rgba(242,203,7,0.05)" },
  quickChipActive: { backgroundColor: "rgba(242,203,7,0.18)", borderColor: "#F2CB07" },
  quickText: { color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: "600" },
  quickTextActive: { color: "#F2CB07" },

  uuidCard: { backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(74,222,128,0.25)", borderRadius: 16, padding: 14, marginBottom: 16 },
  uuidRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  uuidIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(242,203,7,0.1)", alignItems: "center", justifyContent: "center" },
  uuidTitle: { fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: 2, fontWeight: "700", marginBottom: 3 },
  uuidValue: { fontSize: 15, color: "#FFF", fontWeight: "700", letterSpacing: 1.5, fontFamily: "monospace" },
  uuidBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(74,222,128,0.1)", borderWidth: 1, borderColor: "rgba(74,222,128,0.2)", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  uuidBadgeText: { fontSize: 11, color: "#4ADE80", fontWeight: "600" },

  hintBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(242,203,7,0.05)", borderWidth: 1, borderColor: "rgba(242,203,7,0.1)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16 },
  hintText: { fontSize: 12, color: "rgba(255,255,255,0.45)", flex: 1 },

  submitBtn: { backgroundColor: "#F2CB07", borderRadius: 16, height: 58, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.25)", shadowColor: "#F2CB07", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8 },
  submitBtnLoading: { backgroundColor: "rgba(242,203,7,0.6)", shadowOpacity: 0.1 },
  submitText: { color: "#1A0E4F", fontSize: 17, fontWeight: "800", letterSpacing: 0.3 },
});