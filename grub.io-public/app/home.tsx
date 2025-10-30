import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "../src/hooks/useAuth";
import HomeScreen from "../src/screens/home-screen";

/**
 * Functional component representing the Home Page.
 * @returns {JSX.Element} HomePage component
 */
export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading]);

  if (loading) {
    return null; 
  }

  return <HomeScreen />;
}