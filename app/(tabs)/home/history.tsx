import React, { useState, useCallback } from "react";
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
import { useFocusEffect } from "@react-navigation/native";

import { fetchRechargeHistory } from "@/app/api/history";

type FilterType = "all" | "weekly" | "monthly" | "yearly";

export default function HistoryScreen() {
  const router = useRouter();
  const { deviceName, machineId } = useLocalSearchParams();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          const data = await fetchRechargeHistory(machineId as string);

          if (!Array.isArray(data)) {
            setTransactions([]);
            return;
          }

          const formatted = data
            .filter((item: any) => item != null)
            .map((item: any, index: number) => {
              // ✅ API returns separate date "2026-02-11" and time "11:22:53"
              // Combine them into a proper datetime string
              const dateTimeStr = item.date && item.time
                ? `${item.date}T${item.time}`
                : null;

              const rawDate = dateTimeStr ? new Date(dateTimeStr) : new Date();

              return {
                // ✅ No _id in API — use index as unique key
                id: `${item.date}-${item.time}-${index}`,
                // ✅ API has no "type" — all records are recharges
                type: "recharge",
                // ✅ API field is "recharge_amount" not "amount"
                amount: Number(item.recharge_amount ?? 0),
                rawDate,
                displayDate: rawDate.toLocaleString(),
                userName: item.user_name || "Unknown",
                machineName: item.machine_name || "",
              };
            });

          // Sort newest first
          formatted.sort(
            (a: any, b: any) => b.rawDate.getTime() - a.rawDate.getTime()
          );

          setTransactions(formatted);
        } catch (e) {
          console.log("History fetch failed:", e);
          setTransactions([]);
        }
      };

      load();
    }, [machineId])
  );

  const getFilteredTransactions = () => {
    const now = new Date();
    return transactions.filter((t) => {
      const txDate: Date = t.rawDate;
      switch (filter) {
        case "weekly": {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return txDate >= weekAgo;
        }
        case "monthly": {
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          return txDate >= monthAgo;
        }
        case "yearly": {
          const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          return txDate >= yearAgo;
        }
        default:
          return true;
      }
    });
  };

  const filteredTransactions = getFilteredTransactions();

  const calculateTotal = () =>
    filteredTransactions.reduce((total, t) => total + t.amount, 0);

  const total = calculateTotal();

  const renderTransaction = ({ item }: any) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionLeft}>
        <View style={[styles.iconContainer, styles.iconCredit]}>
          <Ionicons name="arrow-down" size={20} color="#38208C" />
        </View>
        <View>
          <Text style={styles.transactionType}>Recharge</Text>
          <Text style={styles.transactionDate}>{item.displayDate}</Text>
          {item.userName ? (
            <Text style={styles.transactionUser}>By: {item.userName}</Text>
          ) : null}
        </View>
      </View>
      <Text style={[styles.transactionAmount, styles.amountCredit]}>
        +₹{item.amount}
      </Text>
    </View>
  );

  const FilterButton = ({ type, label }: { type: FilterType; label: string }) => (
    <TouchableOpacity
      style={[styles.filterButton, filter === type && styles.filterButtonActive]}
      onPress={() => setFilter(type)}
    >
      <Text style={[styles.filterText, filter === type && styles.filterTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ position: "absolute", left: 0 }}
          >
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transaction History</Text>
        </View>

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

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>
            {filter === "all"
              ? "Total Recharged"
              : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Total`}
          </Text>
          <Text style={[styles.totalAmount, styles.totalPositive]}>
            ₹{total.toFixed(2)}
          </Text>
          <Text style={styles.totalCount}>
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""}
          </Text>
        </View>

        <FlatList
          style={{ flex: 1 }}
          data={filteredTransactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={48} color="rgba(255,255,255,0.3)" />
              <Text style={styles.emptyText}>No transactions in this period</Text>
            </View>
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
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: "600", color: "#FFF" },
  filterContainer: { marginBottom: 16, maxHeight: 40, flexGrow: 0 },
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
  filterButtonActive: { backgroundColor: "#F2CB07", borderColor: "#F2CB07" },
  filterText: { fontSize: 14, fontWeight: "600", color: "rgba(255, 255, 255, 0.7)" },
  filterTextActive: { color: "#38208C" },
  totalCard: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#F2CB07",
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
  },
  totalLabel: { fontSize: 14, color: "rgba(255, 255, 255, 0.8)", marginBottom: 8, fontWeight: "500" },
  totalAmount: { fontSize: 32, fontWeight: "700" },
  totalPositive: { color: "#F2CB07" },
  totalNegative: { color: "#FF5252" },
  totalCount: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 6 },
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
  transactionType: { fontSize: 16, fontWeight: "600", color: "#FFF" },
  transactionDate: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  transactionUser: { fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 },
  transactionAmount: { fontSize: 18, fontWeight: "700" },
  amountCredit: { color: "#F2CB07" },
  emptyContainer: { alignItems: "center", marginTop: 60, gap: 16 },
  emptyText: { color: "rgba(255,255,255,0.5)", fontSize: 16 },
  listContent: { gap: 12, paddingBottom: 20 },
});