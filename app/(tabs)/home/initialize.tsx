import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { addTransaction } from "./transactionStore";
import CustomAlert from "./customalert";


export default function InitializeScreen() {
  const router = useRouter();
  const { deviceName, deviceId } = useLocalSearchParams();
  const [amount, setAmount] = useState("");
  
  // Alert states
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState<"success" | "error">("success");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const handleInitialize = () => {
    if (!amount || parseFloat(amount) <= 0) {
      setAlertType("error");
      setAlertTitle("Invalid Amount");
      setAlertMessage("Please enter a valid amount");
      setShowAlert(true);
      return;
    }

    // ✅ Add transaction to store
    addTransaction("initialize", parseFloat(amount));

    // Show success alert
    setAlertType("success");
    setAlertTitle("Success!");
    setAlertMessage(`Card initialized with ₹${amount}`);
    setShowAlert(true);
  };

  const handleAlertClose = () => {
    setShowAlert(false);
    if (alertType === "success") {
      setAmount(""); // Clear input on success
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Initialize Card</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.content}>
          <Text style={styles.label}>Enter Initialize Amount</Text>

          {/* AMOUNT INPUT */}
          <View style={styles.inputContainer}>
            <Text style={{ fontSize: 24, color: "#F2CB07", fontWeight: "700" }}>₹</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              placeholderTextColor="rgba(255,255,255,0.5)"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
          </View>

          {/* INITIALIZE BUTTON */}
          <TouchableOpacity style={styles.button} onPress={handleInitialize}>
            <Text style={styles.buttonText}>Initialize Amount</Text>
          </TouchableOpacity>
        </View>

        {/* Custom Alert */}
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