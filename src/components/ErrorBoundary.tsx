import { Component, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown, info: { componentStack: string }) {
    // eslint-disable-next-line no-console
    console.error('Unhandled render error caught by ErrorBoundary:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Ionicons name="warning" size={40} color="#e0a83a" style={styles.icon} />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            The app hit an unexpected error and this screen couldn't load. Your data is safe — try again, and if it keeps happening, please let us know what you were doing.
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f0f',
    padding: 32,
  },
  icon: { marginBottom: 16 },
  title: { color: '#ffffff', fontSize: 18, fontWeight: '900', marginBottom: 10, textAlign: 'center' },
  message: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '500', lineHeight: 20, marginBottom: 24, textAlign: 'center' },
  button: { backgroundColor: '#e0a83a', borderRadius: 10, paddingHorizontal: 28, paddingVertical: 12 },
  buttonText: { color: '#1a1a1a', fontSize: 15, fontWeight: '900' },
});
