import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import CustomAlert from "./customalert";
import { initializeCardBLE } from "@/app/bluetooth/manager";
import { initializeMachineRFID } from "@/app/api/initialize";

const API_BASE = "https://sv0gotfhtb.execute-api.ap-south-1.amazonaws.com/Prod";

export default function InitializeScreen() {
  const router = useRouter();
  const { deviceName, deviceId, machineId } = useLocalSearchParams();
  const [amount, setAmount] = useState("");
  
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState<"success" | "error">("success");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");



const handleInitialize = async () => {

  const trimmedAmount = amount.trim();

  if (!trimmedAmount || Number(trimmedAmount) <= 0) {
    setAlertType("error");
    setAlertTitle("Invalid Amount");
    setAlertMessage("Please enter a valid amount");
    setShowAlert(true);
    return;
  }

  initializeCardBLE(trimmedAmount, async (result) => {

    console.log("BLE RESULT:", result);

    // ❌ Card already initialized
    if (result.error === "CARD_ALREADY_INITIALIZED") {
      setAlertType("error");
      setAlertTitle("Already Initialized");
      setAlertMessage(
        `Card already has ₹${result.balance || 0}`
      );
      setShowAlert(true);
      return;
    }

    // ❌ No card tapped
    if (result.error === "NO_CARD_DETECTED") {
      setAlertType("error");
      setAlertTitle("No Card");
      setAlertMessage("Tap card on reader");
      setShowAlert(true);
      return;
    }

    // ❌ ESP Error
    if (result.error) {
      setAlertType("error");
      setAlertTitle("Initialization Failed");
      setAlertMessage(result.error);
      setShowAlert(true);
      return;
    }

    // ✅ BLE SUCCESS → CALL SERVER
    if (result.success) {

      try {

        console.log("Sending INIT to backend...");

        await initializeMachineRFID(
          machineId as string,
          Number(trimmedAmount)
        );

        setAlertType("success");
        setAlertTitle("Initialized");
        setAlertMessage(`₹${trimmedAmount} added to card`);
        setShowAlert(true);

      } catch (e) {

        console.log("SERVER INIT FAILED:", e);

        setAlertType("error");
        setAlertTitle("Server Sync Failed");
        setAlertMessage("Card updated but machine wallet not deducted.");
        setShowAlert(true);
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
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Initialize Card</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.content}>
          <Text style={styles.label}>Enter Initialize Amount</Text>

          <View style={styles.inputContainer}>
            <Text style={{ fontSize: 24, color: "#F2CB07", fontWeight: "700" }}>₹</Text>
           <TextInput
  style={styles.input}
  placeholder="Enter amount"
  placeholderTextColor="rgba(255,255,255,0.5)"
  keyboardType="numeric"
  value={amount}
  onChangeText={(text) => {
    const cleaned = text.replace(/[^0-9]/g, ""); // numbers only
    setAmount(cleaned);
  }}
  maxLength={6}
/>

          </View>

          <TouchableOpacity style={styles.button} onPress={handleInitialize}>
            <Text style={styles.buttonText}>Initialize Card</Text>
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
  },
  label: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFF",
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(242, 203, 7, 0.3)",
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 30,
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: "600",
    color: "#FFF",
    marginLeft: 10,
  },
  button: {
    backgroundColor: "#F2CB07",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#38208C",
    fontSize: 18,
    fontWeight: "700",
  },
});