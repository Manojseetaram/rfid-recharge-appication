import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

import { readCardBalanceBLE } from "@/app/bluetooth/manager";

export default function BalanceScreen() {
  const router = useRouter();
  const { deviceName } = useLocalSearchParams();

  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

const readBalance = async () => {
  setLoading(true);

  try {
    await readCardBalanceBLE((value) => {
      setBalance(value);
      setLoading(false);
    });
  } catch (err) {
    console.log(err);
    setLoading(false);
  }
};


useEffect(() => {
  const timer = setTimeout(() => {
    readBalance();
  }, 300);
  return () => clearTimeout(timer);
}, []);



  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Card Balance</Text>

          <TouchableOpacity onPress={readBalance}>
            <Ionicons name="refresh" size={26} color="#F2CB07" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {loading ? (
            <>
              <ActivityIndicator size="large" color="#F2CB07" />
              <Text style={{ color: "#FFF", marginTop: 10 }}>
                Tap card to read balance...
              </Text>
            </>
          ) : balance !== null ? (
            <View style={styles.balanceCard}>
              <Ionicons name="wallet" size={60} color="#F2CB07" />

              <Text style={styles.balanceLabel}>Available Balance</Text>

              <View style={styles.balanceAmount}>
                <Text style={{ fontSize: 40, color: "#FFF", fontWeight: "700" }}>₹</Text>
                <Text style={styles.balanceText}>{balance}</Text>
              </View>

              <Text style={styles.deviceInfo}>{deviceName}</Text>
            </View>
          ) : null}
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