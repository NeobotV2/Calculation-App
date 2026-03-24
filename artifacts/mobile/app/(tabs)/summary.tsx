import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { KpiCard } from "@/components/KpiCard";
import Colors from "@/constants/colors";
import { useCalc } from "@/context/CalcContext";
import type { RoomCalculation } from "@/types";
import { formatArea, formatEuro, formatNumber } from "@/utils/calc";

const c = Colors.dark;

export default function SummaryScreen() {
  const insets = useSafeAreaInsets();
  const { rooms, settings, calculations, totals, loadDemoData, resetAll } =
    useCalc();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : 0;

  const validCalcs = calculations.filter(
    (calc): calc is RoomCalculation => calc !== null
  );

  const handleReset = useCallback(() => {
    Alert.alert(
      "Alles zurücksetzen",
      "Alle Räume und Einstellungen werden zurückgesetzt. Fortfahren?",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Zurücksetzen",
          style: "destructive",
          onPress: () => {
            resetAll();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          },
        },
      ]
    );
  }, [resetAll]);

  const handleDemo = useCallback(() => {
    loadDemoData();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [loadDemoData]);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <LinearGradient
        colors={[c.accent + "14", "transparent"]}
        style={[styles.headerGradient, { height: topInset + 100, pointerEvents: "none" }]}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topInset + 16, paddingBottom: bottomInset + 100 },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.screenTitle, { color: c.text }]}>Auswertung</Text>
            {settings.projectName ? (
              <Text style={[styles.projectSub, { color: c.textSecondary }]}>
                {settings.projectName}
              </Text>
            ) : null}
          </View>
        </View>

        {rooms.length === 0 ? (
          <EmptyState
            icon="bar-chart-2"
            title="Keine Daten"
            subtitle="Fügen Sie Räume in der Kalkulation hinzu, um hier eine Auswertung zu sehen."
          />
        ) : (
          <>
            <View style={styles.kpiGrid}>
              <View style={styles.kpiRow}>
                <KpiCard
                  label="Räume gesamt"
                  value={String(totals.roomCount)}
                  flex={1}
                />
                <KpiCard
                  label="Gesamtfläche"
                  value={formatArea(totals.totalArea)}
                  flex={1}
                />
              </View>
              <KpiCard
                label="Monatspreis gesamt"
                value={formatEuro(totals.totalMonthlyCost)}
                accent
              />
              <View style={styles.kpiRow}>
                <KpiCard
                  label="Jahrespreis"
                  value={formatEuro(totals.totalAnnualCost)}
                  flex={1}
                />
                <KpiCard
                  label="Std/Monat"
                  value={formatNumber(totals.totalMonthlyHours) + " h"}
                  flex={1}
                />
              </View>
              <KpiCard
                label="Preis pro m²/Monat"
                value={
                  totals.pricePerSqm > 0 ? formatEuro(totals.pricePerSqm) : "—"
                }
              />
            </View>

            <Text
              style={[styles.tableTitle, { color: c.textSecondary }]}
            >
              Raumdetails
            </Text>

            <View
              style={[
                styles.table,
                { backgroundColor: c.card, borderColor: c.cardBorder },
              ]}
            >
              <View
                style={[styles.tableHeader, { borderBottomColor: c.separator }]}
              >
                <Text
                  style={[styles.thCell, styles.thName, { color: c.textTertiary }]}
                >
                  Raum
                </Text>
                <Text style={[styles.thCell, { color: c.textTertiary }]}>m²</Text>
                <Text style={[styles.thCell, { color: c.textTertiary }]}>Std/Mo</Text>
                <Text style={[styles.thCell, { color: c.textTertiary, textAlign: "right" }]}>
                  €/Mo
                </Text>
              </View>
              {validCalcs.map((calc, i) => (
                <View
                  key={calc.room.id}
                  style={[
                    styles.tableRow,
                    i < validCalcs.length - 1 && {
                      borderBottomColor: c.separator,
                      borderBottomWidth: 1,
                    },
                  ]}
                >
                  <View style={[styles.tdCell, styles.thName]}>
                    <Text
                      style={[styles.tdName, { color: c.text }]}
                      numberOfLines={1}
                    >
                      {calc.room.name || calc.roomType.label}
                    </Text>
                    <Text style={[styles.tdSub, { color: c.textTertiary }]}>
                      {calc.roomType.label}
                    </Text>
                  </View>
                  <Text style={[styles.tdCell, { color: c.textSecondary }]}>
                    {formatNumber(calc.room.area, 0)}
                  </Text>
                  <Text style={[styles.tdCell, { color: c.textSecondary }]}>
                    {formatNumber(calc.monthlyHours)}
                  </Text>
                  <Text
                    style={[
                      styles.tdCell,
                      { color: c.accent, textAlign: "right", fontFamily: "Inter_600SemiBold" },
                    ]}
                  >
                    {formatEuro(calc.monthlyCost)}
                  </Text>
                </View>
              ))}
              <View style={[styles.tableFooter, { borderTopColor: c.accent + "55" }]}>
                <Text style={[styles.tfLabel, { color: c.text }, styles.thName]}>
                  Gesamt
                </Text>
                <Text style={[styles.tfCell, { color: c.textSecondary }]}>
                  {formatNumber(totals.totalArea, 0)}
                </Text>
                <Text style={[styles.tfCell, { color: c.textSecondary }]}>
                  {formatNumber(totals.totalMonthlyHours)}
                </Text>
                <Text
                  style={[
                    styles.tfCell,
                    { color: c.accent, textAlign: "right", fontFamily: "Inter_700Bold" },
                  ]}
                >
                  {formatEuro(totals.totalMonthlyCost)}
                </Text>
              </View>
            </View>

            {settings.companyName ? (
              <View
                style={[
                  styles.companyCard,
                  { backgroundColor: c.card, borderColor: c.cardBorder },
                ]}
              >
                <Feather name="briefcase" size={14} color={c.textTertiary} />
                <Text style={[styles.companyText, { color: c.textSecondary }]}>
                  {settings.companyName}
                </Text>
              </View>
            ) : null}
          </>
        )}

        <View style={styles.actions}>
          <Pressable
            onPress={handleDemo}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: c.card, borderColor: c.cardBorder, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="zap" size={16} color={c.accent} />
            <Text style={[styles.actionBtnText, { color: c.accent }]}>
              Demo Daten laden
            </Text>
          </Pressable>
          <Pressable
            onPress={handleReset}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: c.card,
                borderColor: c.error + "44",
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather name="trash-2" size={16} color={c.error} />
            <Text style={[styles.actionBtnText, { color: c.error }]}>
              Alles zurücksetzen
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
  content: {
    paddingHorizontal: 16,
  },
  headerRow: {
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  projectSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  kpiGrid: {
    gap: 8,
    marginBottom: 24,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
  },
  tableTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  table: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  tableFooter: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1.5,
  },
  thCell: {
    flex: 1,
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  thName: {
    flex: 2,
  },
  tdCell: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  tdName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  tdSub: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  tfLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  tfCell: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  companyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
  },
  companyText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  actions: {
    gap: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
