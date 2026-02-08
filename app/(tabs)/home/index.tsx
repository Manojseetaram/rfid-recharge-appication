import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Printing Devices</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Printer Division 1</Text>
        <Text style={styles.status}>Status: Not Connected</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/(tabs)/home/connect')}
        >
          <Text style={styles.buttonText}>Connect</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#38208C',
    padding: 20,
  },
  title: {
    color: '#F2CB07',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#2D1873',
    borderRadius: 14,
    padding: 20,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  status: {
    color: '#FFFFFF',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#F2CB07',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#1A1426',
    fontSize: 16,
    fontWeight: '600',
  },
});
