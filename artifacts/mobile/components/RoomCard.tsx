import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import type { RoomCalculation } from "@/types";
import { formatArea, formatEuro, formatNumber } from "@/utils/calc";

interface RoomCardProps {
  calculation: RoomCalculation;
  onPress: () => void;
  onDelete: () => void;
}

export function RoomCard({ calculation, onPress, onDelete }: RoomCardProps) {
  const c = Colors.dark;
  const { room, roomType, roomGroup, frequencyOption, monthlyHours, monthlyCost } = calculation;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: c.card,
          borderColor: c.cardBorder,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.roomName, { color: c.text }]} numberOfLines={1}>
            {room.name || roomType.label}
          </Text>
          <View style={[styles.badge, { backgroundColor: c.accent + "22" }]}>
            <Text style={[styles.badgeText, { color: c.accent }]}>
              {roomGroup.label}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={onDelete}
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Feather name="trash-2" size={16} color={c.textTertiary} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        <MetricItem label="Fläche" value={formatArea(room.area)} color={c} />
        <MetricItem label="Häufigkeit" value={frequencyOption.label} color={c} />
        <MetricItem label="Leistung" value={formatNumber(calculation.effectivePerformanceValue, 0) + " m²/h"} color={c} />
      </View>

      <View style={[styles.footer, { borderTopColor: c.separator }]}>
        <View style={styles.footerItem}>
          <Text style={[styles.footerLabel, { color: c.textSecondary }]}>Std/Monat</Text>
          <Text style={[styles.footerValue, { color: c.text }]}>
            {formatNumber(monthlyHours)} h
          </Text>
        </View>
        <View style={[styles.footerDivider, { backgroundColor: c.separator }]} />
        <View style={styles.footerItem}>
          <Text style={[styles.footerLabel, { color: c.textSecondary }]}>Kosten/Monat</Text>
          <Text style={[styles.footerValue, { color: c.accent }]}>
            {formatEuro(monthlyCost)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function MetricItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: typeof Colors.dark;
}) {
  return (
    <View style={styles.metricItem}>
      <Text style={[styles.metricLabel, { color: color.textTertiary }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: color.textSecondary }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 8,
  },
  headerLeft: {
    flex: 1,
    gap: 6,
  },
  roomName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  grid: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  metricItem: {
    flex: 1,
    gap: 2,
  },
  metricLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
  },
  metricValue: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  footer: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  footerItem: {
    flex: 1,
    gap: 3,
  },
  footerLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
  },
  footerValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  footerDivider: {
    width: 1,
    marginHorizontal: 16,
  },
});
