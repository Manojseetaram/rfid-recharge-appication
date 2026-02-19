import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";

const API_BASE =
  "https://sv0gotfhtb.execute-api.ap-south-1.amazonaws.com/Prod";

export default function DeviceBalanceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const deviceName = params.deviceName as string | undefined;
  const machineId = params.machineId as string | undefined;

  const [deviceBalance, setDeviceBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBalance();
  }, []);

const fetchBalance = async () => {
  setLoading(true);
  setError(null);

  try {
    if (!machineId) {
      setError("Machine ID missing");
      return;
    }

 const token = await SecureStore.getItemAsync("auth_token");

    const url = `${API_BASE}/warden/fetchMachineBalance/${machineId}`;
    console.log("Fetching balance:", url);

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,   // ⭐ REQUIRED
      },
    });

    const json = await res.json();
    console.log("Balance response:", json);

    if (res.ok && json.data?.balance !== undefined) {
      const balanceValue = parseFloat(json.data.balance);
      setDeviceBalance(isNaN(balanceValue) ? 0 : balanceValue);
    } else {
      setError(json.message || "Failed to fetch balance");
    }
  } catch (err) {
    console.log("Balance error:", err);
    setError("Server error");
  } finally {
    setLoading(false);
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

          <Text style={styles.headerTitle}>
            {deviceName || "Device Balance"}
          </Text>

          <TouchableOpacity onPress={fetchBalance} disabled={loading}>
            <Ionicons
              name="refresh"
              size={26}
              color={loading ? "rgba(242, 203, 7, 0.5)" : "#F2CB07"}
            />
          </TouchableOpacity>
        </View>

        {/* CONTENT */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#F2CB07" />
              <Text style={styles.loadingText}>Fetching balance...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerContainer}>
              <Ionicons name="alert-circle" size={64} color="#FF5252" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchBalance}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : deviceBalance !== null ? (
            <View style={styles.centerContainer}>
              <View style={styles.balanceRow}>
                <Text style={styles.rupeeSymbol}>₹</Text>
                <Text style={styles.balanceAmount}>
                  {deviceBalance.toFixed(2)}
                </Text>
              </View>
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
    color: "#FFF",
  },

  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },

  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  rupeeSymbol: {
    fontSize: 48,
    color: "#F2CB07",
    fontWeight: "700",
    marginRight: 12,
  },

  balanceAmount: {
    fontSize: 72,
    fontWeight: "700",
    color: "#FFF",
  },

  loadingText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    marginTop: 16,
  },

  errorText: {
    fontSize: 18,
    color: "#FF5252",
    fontWeight: "500",
    textAlign: "center",
    marginTop: 16,
  },

  retryButton: {
    marginTop: 16,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: "rgba(255,82,82,0.2)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FF5252",
  },

  retryText: {
    color: "#FF5252",
    fontWeight: "600",
    fontSize: 16,
  },
});
