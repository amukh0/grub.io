import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useAuth } from "../src/hooks/useAuth";

/**
 * Functional component representing the Index Page, includes starting animation.
 * @returns {JSX.Element} IndexPage component
 */
export default function IndexPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current; // create once very strange error

  useEffect(() => {
    // splashy splash
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1400,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500); // 2500 = 2.5 seconds

    return () => clearTimeout(timer);
  }, [fadeAnim]);

  useEffect(() => {
    if (!showSplash && !loading) {
      if (user) {
        router.replace("/home");
      } else {
        router.replace("/login");
      }
    }
  }, [showSplash, user, loading, router]);

  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <LottieView
          source={require("../assets/hamburger.json")} // does file exist?
          autoPlay
          loop={false}
          style={{ width: 200, height: 200 }}
        />
        <Animated.Text style={[styles.appName, { opacity: fadeAnim }]}>
          Grub.io
        </Animated.Text>
      </View>
    );
  }

  return null;
}

/**
 * Styles for the IndexPage component.
 */
const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  appName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2D3436",
    marginTop: 20,
    letterSpacing: 1,
  },
});
