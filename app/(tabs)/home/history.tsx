import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getTransactions } from "./transactionStore";  // ← Make sure this file exists!

export default function HistoryScreen() {
  const router = useRouter();
  const { deviceName, deviceId } = useLocalSearchParams();
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    setTransactions(getTransactions());
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTransactions(getTransactions());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const renderTransaction = ({ item }: any) => {
    const isCredit = item.type === "recharge" || item.type === "initialize";
    
    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionLeft}>
          <View style={[
            styles.iconContainer, 
            isCredit ? styles.iconCredit : styles.iconDebit
          ]}>
            <Ionicons 
              name={isCredit ? "arrow-down" : "arrow-up"} 
              size={20} 
              color="#38208C" 
            />
          </View>
          <View>
            <Text style={styles.transactionType}>
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </Text>
            <Text style={styles.transactionDate}>{item.date}</Text>
          </View>
        </View>
        
        <Text style={[
          styles.transactionAmount,
          isCredit ? styles.amountCredit : styles.amountDebit
        ]}>
          {isCredit ? "+" : "-"}₹{item.amount}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transaction History</Text>
          <View style={{ width: 28 }} />
        </View>

        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          contentContainerStyle={{ gap: 12 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No transactions yet</Text>
          }
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
    marginBottom: 20,
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: "600", 
    color: "#FFF" 
  },
  transactionCard: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(242, 203, 7, 0.3)",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transactionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCredit: {
    backgroundColor: "#4CAF50",
  },
  iconDebit: {
    backgroundColor: "#FF5252",
  },
  transactionType: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  transactionDate: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: "700",
  },
  amountCredit: {
    color: "#4CAF50",
  },
  amountDebit: {
    color: "#FF5252",
  },
  emptyText: {
    color: "#FFF",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
});