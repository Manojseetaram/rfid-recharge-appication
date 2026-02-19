import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { addTransaction } from "./transactionStore";
import CustomAlert from "./customalert";
import { rechargeCardBLE } from "@/app/bluetooth/manager";
import { rechargeMachineRFID } from "@/app/api/machine";

export default function RechargeScreen() {
  const router = useRouter();
const { deviceName, deviceId, machineId } = useLocalSearchParams();

  const [amount, setAmount] = useState("");
  
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState<"success" | "error">("success");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

 const handleRecharge = async () => {

  const trimmedAmount = amount.trim();

  if (!trimmedAmount || parseFloat(trimmedAmount) <= 0) {
    setAlertType("error");
    setAlertTitle("Invalid Amount");
    setAlertMessage("Please enter a valid amount");
    setShowAlert(true);
    return;
  }

  rechargeCardBLE(machineId as string, trimmedAmount, async (result) => {

    console.log("BLE RESULT:", result);

    // 🟢 CARD UPDATED SUCCESSFULLY
    if (result.success) {

      try {

        // ⭐ SERVER UPDATE AFTER BLE SUCCESS
        await rechargeMachineRFID(
          machineId as string,
          parseFloat(trimmedAmount)
        );

        await addTransaction("recharge", parseFloat(trimmedAmount));

        setAlertType("success");
        setAlertTitle("Recharge Successful!");
        setAlertMessage(`₹${trimmedAmount} added successfully to your card`);
        setShowAlert(true);

      } catch (e) {

        console.log("Server Sync Failed:", e);

        setAlertType("error");
        setAlertTitle("Server Sync Failed");
        setAlertMessage("Card updated but server failed. Try again.");
        setShowAlert(true);
      }

      return;
    }

    // 🔴 NOT INITIALIZED
    if (result.error === "NOT_INIT") {
      setAlertType("error");
      setAlertTitle("Card Not Initialized");
      setAlertMessage("Please initialize this card first");
      setShowAlert(true);
      return;
    }

    // 🔴 OTHER ERRORS
    if (result.error) {
      setAlertType("error");
      setAlertTitle("Recharge Failed");
      setAlertMessage(result.error);
      setShowAlert(true);
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
          <Text style={styles.headerTitle}>Recharge Card</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.content}>
          <Text style={styles.label}>Enter Recharge Amount</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.rupeeSymbol}>₹</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
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