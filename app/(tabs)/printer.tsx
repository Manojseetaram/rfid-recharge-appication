import { View, Text, StyleSheet } from 'react-native';

export default function PrinterScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Printer Division 1</Text>

      <View style={styles.card}>
        <Text style={styles.text}>Status: Connected</Text>
        <Text style={styles.text}>Bluetooth: ON</Text>
        <Text style={styles.text}>Ready for Printing</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#38208C',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    color: '#F2CB07',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#2D1873',
    borderRadius: 14,
    padding: 20,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 10,
  },
});
