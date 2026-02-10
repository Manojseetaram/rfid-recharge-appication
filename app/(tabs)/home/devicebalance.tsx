import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getConnectedDevice } from "@/app/bluetooth/manager";

export default function DeviceBalanceScreen() {
  const router = useRouter();
  const { deviceName, deviceId } = useLocalSearchParams();
  const [deviceBalance, setDeviceBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch balance on mount
  useEffect(() => {
    readBalanceFromCard();
  }, []);

  const readBalanceFromCard = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const device = getConnectedDevice();
      
      if (!device) {
        setError("Device not connected");
        setLoading(false);
        return;
      }

      // TODO: Replace with your actual BLE read
      // Example BLE read from ESP32:
      // const services = await device.services();
      // const characteristic = await device.readCharacteristicForService(
      //   'YOUR_SERVICE_UUID',
      //   'YOUR_BALANCE_CHARACTERISTIC_UUID'
      // );
      // const balance = parseFloat(characteristic.value);
      
      // MOCK DATA for now - simulating BLE read delay
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Random mock balance (replace with actual BLE read)
      const mockBalance = Math.floor(Math.random() * 800) + 50; // 50-850
      setDeviceBalance(mockBalance);
      
    } catch (err: any) {
      console.error("Error reading balance:", err);
      setError("Failed to read from card");
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
          <Text style={styles.headerTitle}>Device Balance</Text>
          <TouchableOpacity onPress={readBalanceFromCard} disabled={loading}>
            <Ionicons 
              name="refresh" 
              size={26} 
              color={loading ? "rgba(242, 203, 7, 0.5)" : "#F2CB07"} 
            />
          </TouchableOpacity>
        </View>

        {/* CONTENT - Just Balance in Center */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#F2CB07" />
              <Text style={styles.loadingText}>Reading from device...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerContainer}>
              <Ionicons name="alert-circle" size={64} color="#FF5252" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={readBalanceFromCard}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : deviceBalance !== null ? (
            <View style={styles.centerContainer}>
              <View style={styles.balanceRow}>
                <Text style={styles.rupeeSymbol}>₹</Text>
                <Text style={styles.balanceAmount}>{deviceBalance.toFixed(2)}</Text>
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
    color: "#FFF" 
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Center Container
  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  
  // Balance Display
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
  
  // Loading State
  loadingText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 16,
  },
  
  // Error State
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
    backgroundColor: "rgba(255, 82, 82, 0.2)",
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