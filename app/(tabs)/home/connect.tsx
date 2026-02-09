import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function CardHomeScreen() {
  const router = useRouter();
  const { deviceName, deviceId } = useLocalSearchParams();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{deviceName || "Device"}</Text>
            <Text style={styles.headerSubtitle}>Connected</Text>
          </View>
          <View style={{ width: 28 }} />
        </View>

        {/* BOXES */}
        <View style={styles.content}>
          {/* Initialize Card - Full Width */}
          <TouchableOpacity style={styles.boxFull}>
            <Ionicons name="link" size={40} color="#F2CB07" />
            <Text style={styles.boxText}>Initialize Card</Text>
          </TouchableOpacity>

          {/* Recharge & Balance - Grid Row */}
          <View style={styles.gridRow}>
            <TouchableOpacity style={styles.boxHalf}>
              <Ionicons name="card" size={36} color="#F2CB07" />
              <Text style={styles.boxText}>Recharge</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.boxHalf}>
              <Ionicons name="wallet" size={36} color="#F2CB07" />
              <Text style={styles.boxText}>Balance</Text>
            </TouchableOpacity>
          </View>

          {/* History - Full Width */}
          <TouchableOpacity style={styles.boxFull}>
            <Ionicons name="time" size={40} color="#F2CB07" />
            <Text style={styles.boxText}>History</Text>
          </TouchableOpacity>
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
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: "600", 
    color: "#FFF" 
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#F2CB07",
    marginTop: 2,
  },
  content: {
    flex: 1,
    gap: 20,
  },
  boxFull: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    width: "100%",
    height: 140,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(242, 203, 7, 0.3)",
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 20,
  },
  boxHalf: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    flex: 1,
    height: 140,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(242, 203, 7, 0.3)",
  },
  boxText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "500",
    color: "#FFF",
    textAlign: "center",
  },
});