import React, { useState, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ScrollView, Animated,
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
  const listFade = useRef(new Animated.Value(0)).current;

  // ── ALL ORIGINAL LOGIC UNTOUCHED ──
  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          const data = await fetchRechargeHistory(machineId as string);
          if (!Array.isArray(data)) { setTransactions([]); return; }
          const formatted = data
            .filter((item: any) => item != null)
            .map((item: any, index: number) => {
              const dateTimeStr = item.date && item.time ? `${item.date}T${item.time}` : null;
              const rawDate = dateTimeStr ? new Date(dateTimeStr) : new Date();
              return {
                id: `${item.date}-${item.time}-${index}`,
                type: "recharge",
                amount: Number(item.recharge_amount ?? 0),
                rawDate,
                displayDate: rawDate.toLocaleString(),
                userName: item.user_name || "",
                machineName: item.machine_name || "",
              };
            });
          formatted.sort((a: any, b: any) => b.rawDate.getTime() - a.rawDate.getTime());
          setTransactions(formatted);
          Animated.timing(listFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        } catch (e) {
          console.log("History fetch failed:", e);
          setTransactions([]);
        }
      };
      listFade.setValue(0);
      load();
    }, [machineId])
  );

  const getFilteredTransactions = () => {
    const now = new Date();
    return transactions.filter((t) => {
      const txDate: Date = t.rawDate;
      switch (filter) {
        case "weekly": return txDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case "monthly": return txDate >= new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        case "yearly":  return txDate >= new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        default: return true;
      }
    });
  };

  const filteredTransactions = getFilteredTransactions();
  const total = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

  const renderTransaction = ({ item, index }: any) => (
    <View style={[styles.txCard, index === 0 && styles.txCardFirst]}>
      {/* Left accent */}
      <View style={styles.txAccent} />

      <View style={styles.txIconWrap}>
        <Ionicons name="arrow-down" size={18} color="#1A0E4F" />
      </View>

      <View style={styles.txInfo}>
        <Text style={styles.txType}>Recharge</Text>
        <Text style={styles.txDate}>{item.displayDate}</Text>
        {item.userName ? (
          <Text style={styles.txUser}>by {item.userName}</Text>
        ) : null}
      </View>

      <View style={styles.txRight}>
        <Text style={styles.txAmount}>+₹{item.amount}</Text>
      </View>
    </View>
  );

  const FilterBtn = ({ type, label }: { type: FilterType; label: string }) => (
    <TouchableOpacity
      style={[styles.filterBtn, filter === type && styles.filterBtnActive]}
      onPress={() => setFilter(type)}
    >
      <Text style={[styles.filterText, filter === type && styles.filterTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bgBase} />
      <View style={styles.bgOrb} />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>History</Text>
          <View style={{ width: 42 }} />
        </View>

        {/* Filter pills */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={styles.filterScroll} contentContainerStyle={styles.filterRow}
        >
          <FilterBtn type="all" label="All" />
          <FilterBtn type="weekly" label="Weekly" />
          <FilterBtn type="monthly" label="Monthly" />
          <FilterBtn type="yearly" label="Yearly" />
        </ScrollView>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryCardTopLine} />

          <View style={styles.summaryLeft}>
            <Text style={styles.summaryLabel}>
              {filter === "all" ? "Total Recharged" : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Total`}
            </Text>
            <View style={styles.summaryAmountRow}>
              <Text style={styles.summaryRupee}>₹</Text>
              <Text style={styles.summaryAmount}>{total.toFixed(0)}</Text>
            </View>
          </View>

          <View style={styles.summaryRight}>
            <View style={styles.summaryCountBox}>
              <Text style={styles.summaryCount}>{filteredTransactions.length}</Text>
              <Text style={styles.summaryCountLabel}>transactions</Text>
            </View>
          </View>
        </View>

        {/* Section label */}
        {filteredTransactions.length > 0 && (
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>RECENT</Text>
            <View style={styles.sectionLine} />
          </View>
        )}

        {/* List */}
        <Animated.View style={[{ flex: 1 }, { opacity: listFade }]}>
          <FlatList
            data={filteredTransactions}
            keyExtractor={(item) => item.id}
            renderItem={renderTransaction}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="receipt-outline" size={36} color="rgba(242,203,7,0.3)" />
                </View>
                <Text style={styles.emptyTitle}>No transactions</Text>
                <Text style={styles.emptySub}>No records found for this period</Text>
              </View>
            }
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  bgBase: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0F0A2E" },
  bgOrb: {
    position: "absolute", top: -60, right: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: "rgba(56,32,140,0.5)",
  },
  container: { flex: 1, paddingHorizontal: 22, paddingTop: 8 },
  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 18,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFF", letterSpacing: 0.3 },

  // Filters
  filterScroll: { maxHeight: 40, flexGrow: 0, marginBottom: 18 },
  filterRow: { gap: 8 },
  filterBtn: {
    paddingHorizontal: 18, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    justifyContent: "center", alignItems: "center",
  },
  filterBtnActive: { backgroundColor: "#F2CB07", borderColor: "#F2CB07" },
  filterText: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.5)" },
  filterTextActive: { color: "#1A0E4F" },

  // Summary card
  summaryCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    padding: 20, marginBottom: 20,
    flexDirection: "row", alignItems: "center",
    overflow: "hidden",
  },
  summaryCardTopLine: {
    position: "absolute", top: 0, left: 0, right: 0,
    height: 1, backgroundColor: "rgba(242,203,7,0.2)",
  },
  summaryLeft: { flex: 1 },
  summaryLabel: { fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1.5, fontWeight: "600", marginBottom: 6 },
  summaryAmountRow: { flexDirection: "row", alignItems: "flex-end" },
  summaryRupee: { fontSize: 20, color: "#F2CB07", fontWeight: "700", marginBottom: 4, marginRight: 2 },
  summaryAmount: { fontSize: 40, fontWeight: "800", color: "#FFF", letterSpacing: -1 },
  summaryRight: {},
  summaryCountBox: {
    backgroundColor: "rgba(242,203,7,0.1)",
    borderWidth: 1, borderColor: "rgba(242,203,7,0.2)",
    borderRadius: 14, padding: 14, alignItems: "center",
  },
  summaryCount: { fontSize: 24, fontWeight: "800", color: "#F2CB07" },
  summaryCountLabel: { fontSize: 10, color: "rgba(242,203,7,0.5)", letterSpacing: 1, marginTop: 2 },

  // Section label
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  sectionLabel: { fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: 3, fontWeight: "700" },
  sectionLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.06)" },

  // Transaction cards
  txCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 14, gap: 12, overflow: "hidden",
  },
  txCardFirst: { borderColor: "rgba(242,203,7,0.2)" },
  txAccent: {
    position: "absolute", left: 0, top: 10, bottom: 10,
    width: 3, backgroundColor: "#F2CB07", borderRadius: 2,
  },
  txIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "#F2CB07",
    alignItems: "center", justifyContent: "center",
    marginLeft: 6,
  },
  txInfo: { flex: 1 },
  txType: { fontSize: 14, fontWeight: "700", color: "#FFF" },
  txDate: { fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  txUser: { fontSize: 10, color: "rgba(242,203,7,0.4)", marginTop: 1 },
  txRight: {},
  txAmount: { fontSize: 17, fontWeight: "800", color: "#F2CB07" },

  // Empty
  emptyWrap: { alignItems: "center", paddingTop: 40, gap: 12 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 22,
    backgroundColor: "rgba(242,203,7,0.05)",
    borderWidth: 1, borderColor: "rgba(242,203,7,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "rgba(255,255,255,0.4)" },
  emptySub: { fontSize: 13, color: "rgba(255,255,255,0.2)", textAlign: "center" },
  listContent: { gap: 10, paddingBottom: 30 },
});