import React, { useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  BackHandler,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import * as SplashScreen from "expo-splash-screen";

import * as InAppPurchases from 'expo-in-app-purchases';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const PRODUCTION_URL = "https://hexology.me/";
const SUBSCRIPTION_ID = "hexology_plus_monthly";

export default function App() {
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    // 1. Setup IAP Connection
    const setupIAP = async () => {
      try {
        await InAppPurchases.connectAsync();
        InAppPurchases.setPurchaseListener(async ({ responseCode, results, errorCode }) => {
          if (responseCode === InAppPurchases.IAPResponseCode.OK) {
            results?.forEach(purchase => {
              if (!purchase.acknowledged) {
                // Inform webview of success
                webViewRef.current?.injectJavaScript(`
                  window.dispatchEvent(new CustomEvent('iap-success', { detail: ${JSON.stringify(purchase)} }));
                  true;
                `);
                InAppPurchases.finishTransactionAsync(purchase, true);
              }
            });
          } else {
             webViewRef.current?.injectJavaScript(`
              window.dispatchEvent(new CustomEvent('iap-error', { detail: { code: "${errorCode}" } }));
              true;
            `);
          }
        });
      } catch (e) {
        console.error("IAP connect error", e);
      }
    };
    
    setupIAP();

    // 2. Hide splash screen
    const timer = setTimeout(async () => {
      await SplashScreen.hideAsync();
    }, 3000);

    const onBackPress = () => {
      if (webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    let backHandler: { remove: () => void } | undefined;
    if (Platform.OS === "android") {
      backHandler = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    }

    return () => {
      clearTimeout(timer);
      if (backHandler) {
        backHandler.remove();
      }
      InAppPurchases.disconnectAsync();
    };
  }, []);

  const onMessage = async (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'PURCHASE_PREMIUM') {
        await InAppPurchases.getProductsAsync([SUBSCRIPTION_ID]);
        await InAppPurchases.purchaseItemAsync(SUBSCRIPTION_ID);
      }
      if (data.type === 'RESTORE_PURCHASES') {
        const { results } = await InAppPurchases.getPurchaseHistoryAsync();
        webViewRef.current?.injectJavaScript(`
          window.dispatchEvent(new CustomEvent('iap-restore', { detail: ${JSON.stringify(results)} }));
          true;
        `);
      }
    } catch (e) {
      console.error("Native message error", e);
    }
  };

  const injectedJS = `
    window.isNativeApp = true;
    window.nativePlatform = "${Platform.OS}";
    window.triggerNativePurchase = () => {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PURCHASE_PREMIUM' }));
    };
    window.triggerNativeRestore = () => {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'RESTORE_PURCHASES' }));
    };
    true;
  `;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <WebView
        ref={webViewRef}
        source={{ uri: PRODUCTION_URL }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        injectedJavaScript={injectedJS}
        onMessage={onMessage}
        onLoadEnd={async () => {
          await SplashScreen.hideAsync();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  webview: {
    flex: 1,
    backgroundColor: "#000000",
  },
});
