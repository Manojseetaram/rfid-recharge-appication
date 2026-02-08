import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useHistory } from "../../context/HistoryContext";

export default function ConnectScreen() {
  const router = useRouter();
  const { addHistory } = useHistory();

  const [copies, setCopies] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");

  const handleProceedToPrint = () => {
    const trimmedCopies = copies.trim();
    const trimmedAmount = amount.trim();

    if (!trimmedCopies || !trimmedAmount) return;

    setStatus("processing");

    setTimeout(() => {
      addHistory({
        id: `CARD-${Date.now()}`,
        amount: Number(trimmedAmount),
      });

      // ✅ CLEAR INPUTS
      setCopies("");
      setAmount("");

      // ✅ SHOW SUCCESS
      setStatus("done");

      // ✅ RESET STATUS AFTER 2s
      setTimeout(() => {
        setStatus("idle");
      }, 2000);
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* 🔝 HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Printer Connected</Text>

          {/* spacer to center title */}
          <View style={{ width: 28 }} />
        </View>

        {/* CARD */}
        <View style={styles.card}>
          <Text style={styles.text}>Bluetooth: ON</Text>
          <Text style={styles.text}>Status: Connected</Text>

          <TextInput
            placeholder="Enter number of copies"
            placeholderTextColor="#CFC6F5"
            value={copies}
            onChangeText={setCopies}
            keyboardType="numeric"
            editable={status !== "processing"}
            style={styles.input}
          />

          <TextInput
            placeholder="Enter amount"
            placeholderTextColor="#CFC6F5"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            editable={status !== "processing"}
            style={styles.input}
          />

          {status === "processing" && (
            <Text style={styles.statusText}>Processing print…</Text>
          )}

          {status === "done" && (
            <Text style={styles.successText}>Print successful</Text>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              (!copies.trim() ||
                !amount.trim() ||
                status === "processing") && { opacity: 0.6 },
            ]}
            onPress={handleProceedToPrint}
            disabled={
              !copies.trim() ||
              !amount.trim() ||
              status === "processing"
            }
          >
            <Text style={styles.buttonText}>Proceed to Print</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#38208C",
  },
  container: {
    flex: 1,
    padding: 20,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerTitle: {
    color: "#F2CB07",
    fontSize: 20,
    fontWeight: "700",
  },

  card: {
    backgroundColor: "#2D1873",
    borderRadius: 14,
    padding: 20,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 16,
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#3E2A9B",
    borderRadius: 10,
    padding: 14,
    color: "#FFFFFF",
    marginTop: 12,
  },

  statusText: {
    color: "#FFFFFF",
    marginTop: 14,
    textAlign: "center",
  },
  successText: {
    color: "#F2CB07",
    marginTop: 14,
    textAlign: "center",
    fontWeight: "600",
  },

  button: {
    backgroundColor: "#F2CB07",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#1A1426",
    fontSize: 16,
    fontWeight: "600",
  },
});
