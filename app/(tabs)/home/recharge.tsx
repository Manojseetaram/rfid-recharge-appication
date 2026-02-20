import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

import CustomAlert from "./customalert";
import { rechargeCardBLE } from "@/app/bluetooth/manager";
import { rechargeMachineRFID } from "@/app/api/machine";

export default function RechargeScreen() {

  const router = useRouter();
  const params = useLocalSearchParams();

  // ✅ FIX 1 — SAFE MACHINE ID
  const machineId =
    Array.isArray(params.machineId)
      ? params.machineId[0]
      : params.machineId;

  const [amount, setAmount] = useState("");

  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState<"success" | "error">("success");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  
  
const handleRecharge = async () => {
  const cleanAmount = amount.replace(/[^0-9]/g, "");

  if (!cleanAmount || parseInt(cleanAmount) <= 0) {
    setAlertType("error");
    setAlertTitle("Invalid Amount");
    setAlertMessage("Please enter a valid amount");
    setShowAlert(true);
    return;
  }

  const finalAmount = parseInt(cleanAmount);

  rechargeCardBLE(
    String(machineId),
    cleanAmount,
    (result) => {
      console.log("BLE RESULT:", JSON.stringify(result));

      if (result.success) {
        // BLE card updated — now sync server
        setTimeout(async () => {
          try {
            await rechargeMachineRFID(String(machineId), finalAmount);

            setAlertType("success");
            setAlertTitle("Recharge Successful!");
            setAlertMessage(
              `₹${finalAmount} added.\nNew Balance: ₹${result.balance ?? "?"}`
            );
            setShowAlert(true);

          } catch (e: any) {
            console.log("Server sync failed:", e);
            // Card WAS recharged, server failed — still show partial success
            setAlertType("error");
            setAlertTitle("Sync Warning");
            setAlertMessage(
              `Card recharged but server update failed.\nPlease contact support.`
            );
            setShowAlert(true);
          }
        }, 700);
        return;
      }

      // Handle specific BLE errors
      const errorMessages: Record<string, { title: string; message: string }> = {
        NO_DEVICE:           { title: "Not Connected",        message: "No BLE device connected." },
        BLE_ERROR:           { title: "BLE Error",            message: "Communication error. Try again." },
        NO_CARD:             { title: "No Card",              message: "Place card on reader and try again." },
        NOT_INIT:            { title: "Card Not Initialized", message: "Initialize the card first." },
        COMMUNICATION_FAILED:{ title: "Timeout",              message: "Device did not respond. Try again." },
        MIN_25_FIRST:        { title: "Minimum ₹25",          message: "First recharge must be at least ₹25." },
        FAIL:                { title: "Recharge Failed",      message: "Card update failed. Try again." },
      };

      const err = result.error ?? "UNKNOWN";
      const mapped = errorMessages[err] ?? { title: "Error", message: err };

      setAlertType("error");
      setAlertTitle(mapped.title);
      setAlertMessage(mapped.message);
      setShowAlert(true);
    }
  );
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
      <View style={styles.container}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recharge Card</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.content}>

          <Text style={styles.label}>Enter Recharge Amount</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.rupeeSymbol}>₹</Text>

            {/* ✅ FIX 4 — CLEAN INPUT */}
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={amount}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9]/g, "");
                setAmount(cleaned);
              }}
              maxLength={6}
            />
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleRecharge}>
            <Ionicons name="arrow-forward" size={28} color="#38208C" />
          </TouchableOpacity>

        </View>

        <CustomAlert
          visible={showAlert}
          type={alertType}
          title={alertTitle}
          message={alertMessage}
          onConfirm={handleAlertClose}
        />

      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#38208C" },
  container: { flex: 1, padding: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: "600", 
    color: "#FFF" 
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  rupeeSymbol: {
    fontSize: 48,
    color: "#F2CB07",
    fontWeight: "700",
    marginRight: 8,
  },
  input: {
    fontSize: 48,
    fontWeight: "700",
    color: "#FFF",
    minWidth: 100,
    textAlign: "left",
  },
  submitButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F2CB07",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});