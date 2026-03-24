import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { KpiCard } from "@/components/KpiCard";
import { RoomCard } from "@/components/RoomCard";
import { RoomFormModal } from "@/components/RoomFormModal";
import Colors from "@/constants/colors";
import { useCalc } from "@/context/CalcContext";
import type { Room, RoomCalculation } from "@/types";
import { formatArea, formatEuro, formatNumber } from "@/utils/calc";

const c = Colors.dark;

export default function KalkulationScreen() {
  const insets = useSafeAreaInsets();
  const {
    rooms,
    settings,
    calculations,
    totals,
    frequencyOptions,
    addRoom,
    updateRoom,
    removeRoom,
    updateSettings,
  } = useCalc();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [editingProjectName, setEditingProjectName] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState(settings.projectName);

  const handleAddRoom = useCallback(
    (room: Omit<Room, "id">) => {
      addRoom(room);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [addRoom]
  );

  const handleUpdateRoom = useCallback(
    (id: string) => (room: Omit<Room, "id">) => {
      updateRoom(id, room);
    },
    [updateRoom]
  );

  const handleSaveProjectName = useCallback(() => {
    updateSettings({ projectName: projectNameInput.trim() || "Neues Objekt" });
    setEditingProjectName(false);
  }, [projectNameInput, updateSettings]);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : 0;

  const validCalcs = calculations.filter(
    (c): c is RoomCalculation => c !== null
  );

  const renderRoom = useCallback(
    ({ item, index }: { item: Room; index: number }) => {
      const calc = calculations[index];
      if (!calc) return null;
      return (
        <RoomCard
          calculation={calc}
          onPress={() => setEditRoom(item)}
          onDelete={() => {
            removeRoom(item.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
        />
      );
    },
    [calculations, removeRoom]
  );

  const keyExtractor = useCallback((item: Room) => item.id, []);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <LinearGradient
        colors={[c.accent + "18", "transparent"]}
        style={[styles.headerGradient, { height: topInset + 120, pointerEvents: "none" }]}
      />

      <FlatList
        data={rooms}
        keyExtractor={keyExtractor}
        renderItem={renderRoom}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: topInset + 16, paddingBottom: bottomInset + 120 },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.headerRow}>
              {editingProjectName ? (
                <TextInput
                  style={[styles.projectNameInput, { color: c.text, borderBottomColor: c.accent }]}
                  value={projectNameInput}
                  onChangeText={setProjectNameInput}
                  autoFocus
                  onBlur={handleSaveProjectName}
                  onSubmitEditing={handleSaveProjectName}
                  returnKeyType="done"
                />
              ) : (
                <Pressable
                  onPress={() => {
                    setProjectNameInput(settings.projectName);
                    setEditingProjectName(true);
                  }}
                  style={styles.projectNameWrap}
                >
                  <Text style={[styles.projectName, { color: c.text }]} numberOfLines={1}>
                    {settings.projectName}
                  </Text>
                  <Feather name="edit-2" size={14} color={c.textTertiary} style={{ marginLeft: 6 }} />
                </Pressable>
              )}
            </View>

            <View style={styles.kpiGrid}>
              <View style={styles.kpiRow}>
                <KpiCard
                  label="Gesamtfläche"
                  value={formatArea(totals.totalArea)}
                  flex={1}
                />
                <KpiCard
                  label="Std/Monat"
                  value={formatNumber(totals.totalMonthlyHours) + " h"}
                  flex={1}
                />
              </View>
              <KpiCard
                label="Monatspreis"
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
                  label="Preis/m²"
                  value={totals.pricePerSqm > 0 ? formatEuro(totals.pricePerSqm) : "—"}
                  flex={1}
                />
              </View>
            </View>

            <View style={[styles.sectionHeader]}>
              <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
                {rooms.length > 0
                  ? `${rooms.length} ${rooms.length === 1 ? "Raum" : "Räume"}`
                  : "Räume"}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="layers"
            title="Noch keine Räume"
            subtitle={'Tippen Sie auf "Raum hinzufügen" um die Kalkulation zu starten.'}
          />
        }
      />

      <View
        style={[
          styles.fab,
          {
            bottom: bottomInset + (Platform.OS === "web" ? 84 : 90),
          },
        ]}
      >
        <Pressable
          onPress={() => {
            setShowAddModal(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={({ pressed }) => [
            styles.fabButton,
            { backgroundColor: c.accent, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
          ]}
        >
          <Feather name="plus" size={22} color="#fff" />
          <Text style={styles.fabText}>Raum hinzufügen</Text>
        </Pressable>
      </View>

      <RoomFormModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddRoom}
        roomTypes={settings.roomTypes}
        roomGroups={settings.roomGroups}
        frequencyOptions={frequencyOptions}
      />

      {editRoom && (
        <RoomFormModal
          visible={!!editRoom}
          onClose={() => setEditRoom(null)}
          onSave={handleUpdateRoom(editRoom.id)}
          onDelete={() => removeRoom(editRoom.id)}
          initialRoom={editRoom}
          roomTypes={settings.roomTypes}
          roomGroups={settings.roomGroups}
          frequencyOptions={frequencyOptions}
        />
      )}
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
  listContent: {
    paddingHorizontal: 16,
  },
  listHeader: {
    marginBottom: 16,
  },
  headerRow: {
    marginBottom: 16,
  },
  projectNameWrap: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  projectName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  projectNameInput: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    borderBottomWidth: 2,
    paddingBottom: 2,
  },
  kpiGrid: {
    gap: 8,
    marginBottom: 20,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  fab: {
    position: "absolute",
    left: 16,
    right: 16,
  },
  fabButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 6,
  },
  fabText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
