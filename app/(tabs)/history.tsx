import { View, Text, StyleSheet, FlatList } from "react-native";
import { useHistory } from "../context/HistoryContext";


export default function HistoryScreen() {
  const { history } = useHistory();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Print History</Text>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={{ color: "#FFF", textAlign: "center" }}>
            No history yet
          </Text>
        }
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
