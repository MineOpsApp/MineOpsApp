import { Alert, Pressable, StyleSheet, Text } from 'react-native';

export function SosButton() {
  function handlePress() {
    Alert.alert(
      'SOS alert',
      'Emergency alert prepared. In the next phase this will notify supervisors and safety officers.',
      [{ text: 'OK' }],
    );
  }

  return (
    <Pressable
      accessibilityLabel="Send SOS emergency alert"
      accessibilityRole="button"
      onPress={handlePress}
      style={styles.button}
    >
      <Text style={styles.text}>SOS</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#b42318',
    borderRadius: 8,
    bottom: 22,
    elevation: 6,
    height: 58,
    justifyContent: 'center',
    position: 'absolute',
    right: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    width: 72,
  },
  text: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
  },
});
