import { Stack } from "expo-router";
import { AuthProvider } from "../src/context/AuthContext";


/**
 * Function RootLayout that wraps the app with AuthProvider and Stack navigator.
 * @returns RootLayout component that wraps the app with AuthProvider and Stack navigator.
 */
export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack />
    </AuthProvider>
  );
}
