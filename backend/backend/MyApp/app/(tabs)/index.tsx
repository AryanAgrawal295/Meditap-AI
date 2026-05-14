import Constants from 'expo-constants';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

const FALLBACK_URL = 'https://meditap-ai-1.onrender.com';
const configuredUrl =
  typeof Constants.expoConfig?.extra?.webAppUrl === 'string'
    ? Constants.expoConfig.extra.webAppUrl.trim()
    : '';
const WEBSITE_URL = configuredUrl || FALLBACK_URL;

type ScreenState =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'error'; message: string };

export default function HomeScreen() {
  const [screenState, setScreenState] = useState<ScreenState>({ kind: 'loading' });

  const errorView =
    screenState.kind === 'error' ? (
      <View style={styles.messageCard}>
        <Text style={styles.title}>Web app unavailable</Text>
        <Text style={styles.body}>{screenState.message}</Text>
        <Text style={styles.urlLabel}>Current URL</Text>
        <Text selectable style={styles.urlValue}>
          {WEBSITE_URL}
        </Text>
        <Text style={styles.hint}>
          Set `expo.extra.webAppUrl` in `app.json` to your published frontend URL and restart Expo.
        </Text>
      </View>
    ) : null;

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        source={{ uri: WEBSITE_URL }}
        startInLoadingState
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        onLoadEnd={() => {
          setScreenState({ kind: 'ready' });
        }}
        onError={({ nativeEvent }) => {
          setScreenState({
            kind: 'error',
            message: nativeEvent.description || 'The page could not be loaded.',
          });
        }}
        onHttpError={({ nativeEvent }) => {
          setScreenState({
            kind: 'error',
            message: `The server responded with HTTP ${nativeEvent.statusCode}.`,
          });
        }}
        renderLoading={() => (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#0f766e" />
            <Text style={styles.loadingText}>Loading Meditap...</Text>
          </View>
        )}
        renderError={() => errorView}
      />

      {screenState.kind === 'error' ? (
        <View style={styles.overlay}>
          {errorView}
          <Pressable style={styles.retryButton} onPress={() => setScreenState({ kind: 'loading' })}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7f7',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#f4f7f7',
  },
  loadingText: {
    fontSize: 16,
    color: '#0f172a',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f4f7f7',
  },
  messageCard: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#334155',
    marginBottom: 16,
  },
  urlLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  urlValue: {
    fontSize: 13,
    color: '#0f766e',
    marginBottom: 16,
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
  },
  retryButton: {
    marginTop: 16,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#0f766e',
  },
  retryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
