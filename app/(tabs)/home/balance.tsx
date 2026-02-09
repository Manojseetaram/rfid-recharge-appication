import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getBalance } from "./transactionStore";  // ← Import here

export default function BalanceScreen() {
  const router = useRouter();
  const { deviceName, deviceId } = useLocalSearchParams();
  const [balance, setBalance] = useState<number>(0);

  const fetchBalance = () => {
    const currentBalance = getBalance();
    setBalance(currentBalance);
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  // Auto-refresh balance every second
  useEffect(() => {
    const interval = setInterval(() => {
      setBalance(getBalance());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const refreshBalance = () => {
    fetchBalance();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Card Balance</Text>
          <TouchableOpacity onPress={refreshBalance}>
            <Ionicons name="refresh" size={26} color="#F2CB07" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* BALANCE CARD */}
          <View style={styles.balanceCard}>
            <Ionicons name="wallet" size={60} color="#F2CB07" />
            
            <Text style={styles.balanceLabel}>Available Balance</Text>
            
            <View style={styles.balanceAmount}>
              <Text style={{ fontSize: 40, color: "#FFF", fontWeight: "700" }}>₹</Text>
              <Text style={styles.balanceText}>{balance}</Text>
            </View>

            <Text style={styles.deviceInfo}>{deviceName}</Text>
          </View>
        </View>
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
    justifyContent: "center",
  },
  balanceCard: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(242, 203, 7, 0.3)",
    padding: 40,
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    marginTop: 20,
    marginBottom: 10,
  },
  balanceAmount: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  balanceText: {
    fontSize: 56,
    fontWeight: "700",
    color: "#FFF",
    marginLeft: 5,
  },
  deviceInfo: {
    fontSize: 14,
    color: "#F2CB07",
    marginTop: 30,
  },
});