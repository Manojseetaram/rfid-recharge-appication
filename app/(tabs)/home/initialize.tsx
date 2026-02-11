import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import CustomAlert from "./customalert";
import { initializeCardBLE } from "@/app/bluetooth/manager";
import { addTransaction } from "./transactionStore";

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
  console.log("🟦 handleInitialize called");

  const trimmedAmount = amount.trim();
  setAmount(trimmedAmount);

  if (!trimmedAmount || parseFloat(trimmedAmount) <= 0) {
    setAlertType("error");
    setAlertTitle("Invalid Amount");
    setAlertMessage("Please enter a valid amount");
    setShowAlert(true);
    return;
  }

  try {
    await initializeCardBLE(trimmedAmount, async (result) => {
      console.log("CALLBACK RECEIVED:", JSON.stringify(result));

     
      if (result.error === "CARD_ALREADY_INITIALIZED") {
        setAlertType("error");
        setAlertTitle("Card Already Initialized");
        setAlertMessage(
          `This card already has ₹${result.balance || 0}. Recharge instead.`
        );
        setShowAlert(true);
        return;
      }

      
      if (result.error === "NO_CARD") {
        setAlertType("error");
        setAlertTitle("No Card Detected");
        setAlertMessage("Please tap a card on the reader.");
        setShowAlert(true);
        return;
      }


      if (result.error) {
        setAlertType("error");
        setAlertTitle("Initialization Failed");
        setAlertMessage("Please try again.");
        setShowAlert(true);
        return;
      }

      // ----- SUCCESS -----
      if (result.success) {
        await addTransaction("initialize", parseFloat(trimmedAmount));

        setAlertType("success");
        setAlertTitle("Card Initialized");
        setAlertMessage(`Card initialized with ₹${trimmedAmount}`);
        setShowAlert(true);
      }
    });

  } catch (err) {
    console.log("Initialization error:", err);

    setAlertType("error");
    setAlertTitle("Connection Error");
    setAlertMessage("Device communication failed.");
    setShowAlert(true);
  }
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