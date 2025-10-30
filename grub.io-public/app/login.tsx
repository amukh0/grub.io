import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "../src/hooks/useAuth";
import LoginScreen from "../src/screens/login-screen";

/**
 * Functional component representing the Login Page.
 * @returns {JSX.Element} LoginPage component
 */
export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/home");
    }
  }, [user, loading]);

  return <LoginScreen/>;
}