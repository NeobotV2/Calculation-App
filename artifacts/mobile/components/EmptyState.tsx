import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

interface EmptyStateProps {
  icon: FeatherIconName;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  const c = Colors.dark;
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: c.backgroundTertiary }]}>
        <Feather name={icon} size={28} color={c.textTertiary} />
      </View>
      <Text style={[styles.title, { color: c.textSecondary }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: c.textTertiary }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 12,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
});
