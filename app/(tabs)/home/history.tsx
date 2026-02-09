import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getTransactions } from "./transactionStore";

type FilterType = "all" | "weekly" | "monthly" | "yearly";

export default function HistoryScreen() {
  const router = useRouter();
  const { deviceName, deviceId } = useLocalSearchParams();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    setTransactions(getTransactions());
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTransactions(getTransactions());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getFilteredTransactions = () => {
    const now = new Date();
    return transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.date);

      switch (filter) {
        case "weekly":
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return transactionDate >= weekAgo;

        case "monthly":
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          return transactionDate >= monthAgo;

        case "yearly":
          const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          return transactionDate >= yearAgo;

        case "all":
        default:
          return true;
      }
    });
  };

  const calculateTotal = () => {
    const filtered = getFilteredTransactions();
    return filtered.reduce((total, transaction) => {
      const isCredit = transaction.type === "recharge" || transaction.type === "initialize";
      return total + (isCredit ? transaction.amount : -transaction.amount);
    }, 0);
  };

  const filteredTransactions = getFilteredTransactions();
  const total = calculateTotal();

  const renderTransaction = ({ item }: any) => {
    const isCredit = item.type === "recharge" || item.type === "initialize";
    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionLeft}>
          <View
            style={[styles.iconContainer, isCredit ? styles.iconCredit : styles.iconDebit]}
          >
            <Ionicons name={isCredit ? "arrow-down" : "arrow-up"} size={20} color="#38208C" />
          </View>
          <View>
            <Text style={styles.transactionType}>
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </Text>
            <Text style={styles.transactionDate}>{item.date}</Text>
          </View>
        </View>
        <Text
          style={[styles.transactionAmount, isCredit ? styles.amountCredit : styles.amountDebit]}
        >
          {isCredit ? "+" : "-"}₹{item.amount}
        </Text>
      </View>
    );
  };

  const FilterButton = ({ type, label }: { type: FilterType; label: string }) => (
    <TouchableOpacity
      style={[styles.filterButton, filter === type && styles.filterButtonActive]}
      onPress={() => setFilter(type)}
    >
      <Text style={[styles.filterText, filter === type && styles.filterTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transaction History</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Filter Buttons */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          <FilterButton type="all" label="All" />
          <FilterButton type="weekly" label="Weekly" />
          <FilterButton type="monthly" label="Monthly" />
          <FilterButton type="yearly" label="Yearly" />
        </ScrollView>

        {/* Total Card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>
            {filter === "all"
              ? "Total Balance"
              : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Total`}
          </Text>
          <Text
            style={[styles.totalAmount, total >= 0 ? styles.totalPositive : styles.totalNegative]}
          >
            ₹{Math.abs(total).toFixed(2)}
          </Text>
        </View>

        {/* Transaction List */}
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          contentContainerStyle={{
            paddingBottom: 60, // bigger bottom gap for better UI
            gap: 12,
            paddingTop: 10,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No transactions in this period</Text>
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
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFF",
  },

  // Filter Buttons
  filterContainer: { marginBottom: 8 },
  filterContent: { gap: 8 },
  filterButton: {
    paddingHorizontal: 20,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(242, 203, 7, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: "#F2CB07",
    borderColor: "#F2CB07",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.7)",
  },
  filterTextActive: { color: "#38208C" },

  // Total Card
  totalCard: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#F2CB07",
    padding: 20,
    marginVertical: 12,
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 8,
    fontWeight: "500",
  },
  totalAmount: { fontSize: 32, fontWeight: "700" },
  totalPositive: { color: "#F2CB07" },
  totalNegative: { color: "#FF5252" },

  // Transaction Cards
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
  transactionLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCredit: { backgroundColor: "#F2CB07" },
  iconDebit: { backgroundColor: "#FF5252" },
  transactionType: { fontSize: 16, fontWeight: "600", color: "#FFF" },
  transactionDate: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  transactionAmount: { fontSize: 18, fontWeight: "700" },
  amountCredit: { color: "#F2CB07" },
  amountDebit: { color: "#FF5252" },

  emptyText: {
    color: "#FFF",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
});
