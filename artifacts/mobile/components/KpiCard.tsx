import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

interface KpiCardProps {
  label: string;
  value: string;
  accent?: boolean;
  flex?: number;
}

export function KpiCard({ label, value, accent = false, flex = 1 }: KpiCardProps) {
  const c = Colors.dark;
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: accent ? c.accent + "18" : c.card,
          borderColor: accent ? c.accent + "55" : c.cardBorder,
          flex,
        },
      ]}
    >
      <Text
        style={[styles.value, { color: accent ? c.accent : c.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={[styles.label, { color: c.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minWidth: 0,
    gap: 4,
  },
  value: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.2,
  },
});
