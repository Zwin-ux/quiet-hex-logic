import React, { useRef, useEffect, useState } from "react";
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
import * as Haptics from "expo-haptics";

import * as InAppPurchases from 'expo-in-app-purchases';

SplashScreen.preventAutoHideAsync();

const PRODUCTION_URL = "https://openboard.io/";
const SUBSCRIPTION_ID = "openboard_plus_monthly";
const APP_VERSION = "1.0.1";

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [splashHidden, setSplashHidden] = useState(false);

  useEffect(() => {
    const setupIAP = async () => {
      try {
        await InAppPurchases.connectAsync();
        InAppPurchases.setPurchaseListener(async ({ responseCode, results, errorCode }) => {
          if (responseCode === InAppPurchases.IAPResponseCode.OK) {
            results?.forEach(purchase => {
              if (!purchase.acknowledged) {
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

    // Fallback: hide splash after 1s if onLoadEnd hasn't fired
    const timer = setTimeout(async () => {
      if (!splashHidden) {
        await SplashScreen.hideAsync();
        setSplashHidden(true);
      }
    }, 1000);

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
      switch (data.type) {
        case 'PURCHASE_PREMIUM':
          await InAppPurchases.getProductsAsync([SUBSCRIPTION_ID]);
          await InAppPurchases.purchaseItemAsync(SUBSCRIPTION_ID);
          break;
        case 'RESTORE_PURCHASES': {
          const { results } = await InAppPurchases.getPurchaseHistoryAsync();
          webViewRef.current?.injectJavaScript(`
            window.dispatchEvent(new CustomEvent('iap-restore', { detail: ${JSON.stringify(results)} }));
            true;
          `);
          break;
        }
        case 'NAVIGATE_TO':
          if (data.url) {
            webViewRef.current?.injectJavaScript(`window.location.href = '${data.url}'; true;`);
          }
          break;
        case 'HAPTIC_FEEDBACK':
          if (data.style === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          else if (data.style === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          else if (data.style === 'heavy') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          else if (data.style === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'SHARE': {
          const { Share } = require('react-native');
          await Share.share({ message: data.message || 'Check out Hexology!', url: data.url });
          break;
        }
      }
    } catch (e) {
      console.error("Native message error", e);
    }
  };

  const injectedJS = `
    window.isNativeApp = true;
    window.nativePlatform = "${Platform.OS}";
    window.nativeAppVersion = "${APP_VERSION}";
    window.triggerNativePurchase = () => {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PURCHASE_PREMIUM' }));
    };
    window.triggerNativeRestore = () => {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'RESTORE_PURCHASES' }));
    };
    window.triggerHaptic = (style) => {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'HAPTIC_FEEDBACK', style: style || 'light' }));
    };
    window.triggerShare = (message, url) => {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SHARE', message, url }));
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
        cacheEnabled={true}
        injectedJavaScript={injectedJS}
        onMessage={onMessage}
        onLoadEnd={async () => {
          if (!splashHidden) {
            await SplashScreen.hideAsync();
            setSplashHidden(true);
          }
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
