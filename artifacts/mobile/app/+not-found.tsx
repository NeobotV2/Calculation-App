import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

export default function NotFoundScreen() {
  const c = Colors.dark;
  return (
    <>
      <Stack.Screen options={{ title: "Nicht gefunden" }} />
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <Text style={[styles.title, { color: c.text }]}>
          Diese Seite existiert nicht.
        </Text>
        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: c.accent }]}>
            Zur Startseite
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
