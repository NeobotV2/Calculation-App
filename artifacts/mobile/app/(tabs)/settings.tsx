import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useCalc } from "@/context/CalcContext";
import type { RoomType } from "@/types";
import { generateId } from "@/utils/calc";

const c = Colors.dark;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useCalc();

  const [companyName, setCompanyName] = useState(settings.companyName);
  const [projectName, setProjectName] = useState(settings.projectName);
  const [hourlyRate, setHourlyRate] = useState(String(settings.hourlyRate).replace(".", ","));

  const [editRoomType, setEditRoomType] = useState<RoomType | null>(null);
  const [showAddRoomType, setShowAddRoomType] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : 0;

  const handleSaveGeneral = useCallback(() => {
    const rate = parseFloat(hourlyRate.replace(",", "."));
    if (isNaN(rate) || rate <= 0) {
      Alert.alert("Fehler", "Stundensatz muss größer als 0 sein.");
      return;
    }
    updateSettings({
      companyName: companyName.trim(),
      projectName: projectName.trim() || "Neues Objekt",
      hourlyRate: rate,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Gespeichert", "Einstellungen wurden gespeichert.");
  }, [companyName, projectName, hourlyRate, updateSettings]);

  const handleDeleteRoomType = useCallback(
    (id: string) => {
      Alert.alert("Raumart löschen", "Möchten Sie diese Raumart löschen?", [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen",
          style: "destructive",
          onPress: () => {
            updateSettings({
              roomTypes: settings.roomTypes.filter((rt) => rt.id !== id),
            });
          },
        },
      ]);
    },
    [settings.roomTypes, updateSettings]
  );

  const handleSaveRoomType = useCallback(
    (rt: RoomType) => {
      const exists = settings.roomTypes.find((r) => r.id === rt.id);
      if (exists) {
        updateSettings({
          roomTypes: settings.roomTypes.map((r) => (r.id === rt.id ? rt : r)),
        });
      } else {
        updateSettings({
          roomTypes: [...settings.roomTypes, rt],
        });
      }
    },
    [settings.roomTypes, updateSettings]
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <LinearGradient
        colors={[c.accent + "10", "transparent"]}
        style={[styles.headerGradient, { height: topInset + 80, pointerEvents: "none" }]}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topInset + 16, paddingBottom: bottomInset + 100 },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.screenTitle, { color: c.text }]}>Einstellungen</Text>

        <SectionCard title="Allgemein">
          <InputField
            label="Firmenname"
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="Optional"
          />
          <InputField
            label="Objektname"
            value={projectName}
            onChangeText={setProjectName}
            placeholder="Neues Objekt"
          />
          <InputField
            label="Stundensatz (€)"
            value={hourlyRate}
            onChangeText={setHourlyRate}
            placeholder="18,50"
            keyboardType="decimal-pad"
          />
          <Pressable
            onPress={handleSaveGeneral}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: c.accent, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.saveBtnText}>Speichern</Text>
          </Pressable>
        </SectionCard>

        <SectionCard
          title="Raumarten"
          action={
            <Pressable
              onPress={() => setShowAddRoomType(true)}
              style={styles.addIconBtn}
            >
              <Feather name="plus" size={18} color={c.accent} />
            </Pressable>
          }
        >
          {settings.roomTypes.map((rt) => {
            const group = settings.roomGroups.find((g) => g.id === rt.groupId);
            return (
              <View
                key={rt.id}
                style={[styles.roomTypeRow, { borderBottomColor: c.separator }]}
              >
                <View style={styles.roomTypeInfo}>
                  <Text style={[styles.roomTypeLabel, { color: c.text }]}>
                    {rt.label}
                  </Text>
                  <Text style={[styles.roomTypeSub, { color: c.textTertiary }]}>
                    {group?.label ?? ""} · {rt.performanceValue} m²/h
                  </Text>
                </View>
                <View style={styles.roomTypeActions}>
                  <Pressable
                    onPress={() => setEditRoomType(rt)}
                    hitSlop={8}
                    style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                  >
                    <Feather name="edit-2" size={15} color={c.textSecondary} />
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteRoomType(rt.id)}
                    hitSlop={8}
                    style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                  >
                    <Feather name="trash-2" size={15} color={c.error} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </SectionCard>

        <View style={[styles.versionCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <Text style={[styles.versionText, { color: c.textTertiary }]}>
            Reinigungskalkulator v1.0 · MVP
          </Text>
        </View>
      </ScrollView>

      {(editRoomType || showAddRoomType) && (
        <RoomTypeEditModal
          visible={!!(editRoomType || showAddRoomType)}
          roomType={editRoomType ?? undefined}
          roomGroups={settings.roomGroups}
          onClose={() => {
            setEditRoomType(null);
            setShowAddRoomType(false);
          }}
          onSave={handleSaveRoomType}
        />
      )}
    </View>
  );
}

function SectionCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
          {title}
        </Text>
        {action}
      </View>
      <View
        style={[styles.sectionBody, { backgroundColor: c.card, borderColor: c.cardBorder }]}
      >
        {children}
      </View>
    </View>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "decimal-pad";
}) {
  return (
    <View style={styles.inputRow}>
      <Text style={[styles.inputLabel, { color: c.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.textInput, { color: c.text, borderBottomColor: c.separator }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textTertiary}
        keyboardType={keyboardType}
      />
    </View>
  );
}

interface RoomTypeEditModalProps {
  visible: boolean;
  roomType?: RoomType;
  roomGroups: { id: string; label: string }[];
  onClose: () => void;
  onSave: (rt: RoomType) => void;
}

function RoomTypeEditModal({
  visible,
  roomType,
  roomGroups,
  onClose,
  onSave,
}: RoomTypeEditModalProps) {
  const insets = useSafeAreaInsets();
  const [label, setLabel] = useState(roomType?.label ?? "");
  const [performance, setPerformance] = useState(
    roomType ? String(roomType.performanceValue) : ""
  );
  const [groupId, setGroupId] = useState(roomType?.groupId ?? roomGroups[0]?.id ?? "");

  const handleSave = () => {
    const perf = parseFloat(performance.replace(",", "."));
    if (!label.trim()) {
      Alert.alert("Fehler", "Bitte geben Sie eine Bezeichnung ein.");
      return;
    }
    if (isNaN(perf) || perf <= 0) {
      Alert.alert("Fehler", "Leistungswert muss größer als 0 sein.");
      return;
    }
    onSave({
      id: roomType?.id ?? generateId(),
      label: label.trim(),
      performanceValue: perf,
      groupId,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: c.background }]}>
        <View style={[styles.modalTop, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.topBtn, { opacity: pressed ? 0.5 : 1 }]}
          >
            <Feather name="x" size={22} color={c.textSecondary} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: c.text }]}>
            {roomType ? "Raumart bearbeiten" : "Raumart hinzufügen"}
          </Text>
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: c.accent, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.saveBtnText}>Speichern</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.modalContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: c.textSecondary }]}>Bezeichnung</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.card, borderColor: c.cardBorder, color: c.text }]}
              value={label}
              onChangeText={setLabel}
              placeholder="z. B. Serverraum"
              placeholderTextColor={c.textTertiary}
              autoFocus
            />
          </View>
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: c.textSecondary }]}>
              Leistungswert (m²/h)
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.card, borderColor: c.cardBorder, color: c.text }]}
              value={performance}
              onChangeText={setPerformance}
              placeholder="z. B. 150"
              placeholderTextColor={c.textTertiary}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: c.textSecondary }]}>Gruppe</Text>
            <View style={styles.chipRow}>
              {roomGroups.map((g) => {
                const selected = groupId === g.id;
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => setGroupId(g.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? c.accent : c.card,
                        borderColor: selected ? c.accent : c.cardBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? "#fff" : c.textSecondary },
                      ]}
                    >
                      {g.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  screenTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  sectionCard: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sectionBody: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    padding: 16,
    gap: 12,
  },
  inputRow: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.2,
  },
  textInput: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  saveBtn: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  addIconBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  roomTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  roomTypeInfo: {
    flex: 1,
    gap: 2,
  },
  roomTypeLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  roomTypeSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  roomTypeActions: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    marginLeft: 12,
  },
  versionCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    marginTop: 4,
  },
  versionText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  modalContainer: { flex: 1 },
  modalTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.cardBorder,
  },
  topBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  modalContent: {
    padding: 16,
  },
  formSection: {
    marginBottom: 20,
    gap: 8,
  },
  formLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});
