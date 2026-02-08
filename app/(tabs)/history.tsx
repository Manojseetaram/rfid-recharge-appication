import { View, Text, StyleSheet, FlatList } from "react-native";

const historyData = [
  {
    id: "CARD-1023",
    amount: 25,
  },
  {
    id: "CARD-2041",
    amount: 40,
  },
];

export default function HistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Print History</Text>

      <FlatList
        data={historyData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardText}>Card ID: {item.id}</Text>
            <Text style={styles.amount}>₹ {item.amount}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#38208C",
    padding: 16,
  },
  title: {
    color: "#F2CB07",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#2D1873",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  amount: {
    color: "#F2CB07",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 6,
  },
});
