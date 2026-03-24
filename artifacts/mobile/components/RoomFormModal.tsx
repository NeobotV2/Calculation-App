import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import type { FrequencyKey, FrequencyOption, Room, RoomGroup, RoomType } from "@/types";
import { formatNumber } from "@/utils/calc";

interface RoomFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (room: Omit<Room, "id">) => void;
  onDelete?: () => void;
  initialRoom?: Room;
  roomTypes: RoomType[];
  roomGroups: RoomGroup[];
  frequencyOptions: FrequencyOption[];
}

export function RoomFormModal({
  visible,
  onClose,
  onSave,
  onDelete,
  initialRoom,
  roomTypes,
  roomGroups,
  frequencyOptions,
}: RoomFormModalProps) {
  const c = Colors.dark;
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState(roomTypes[0]?.id ?? "");
  const [area, setArea] = useState("");
  const [frequencyKey, setFrequencyKey] = useState<FrequencyKey>("1x_week");
  const [performanceOverride, setPerformanceOverride] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedRoomType = roomTypes.find((rt) => rt.id === selectedRoomTypeId);

  useEffect(() => {
    if (visible) {
      if (initialRoom) {
        setName(initialRoom.name);
        setSelectedRoomTypeId(initialRoom.roomTypeId);
        setArea(String(initialRoom.area));
        setFrequencyKey(initialRoom.frequencyKey);
        setPerformanceOverride(
          initialRoom.performanceValueOverride
            ? String(initialRoom.performanceValueOverride)
            : ""
        );
      } else {
        setName("");
        setSelectedRoomTypeId(roomTypes[0]?.id ?? "");
        setArea("");
        setFrequencyKey("1x_week");
        setPerformanceOverride("");
      }
      setErrors({});
    }
  }, [visible, initialRoom, roomTypes]);

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    const areaNum = parseFloat(area.replace(",", "."));
    if (!area || isNaN(areaNum) || areaNum <= 0) {
      errs.area = "Fläche muss größer als 0 sein";
    }
    if (performanceOverride) {
      const perf = parseFloat(performanceOverride.replace(",", "."));
      if (isNaN(perf) || perf <= 0) {
        errs.performance = "Leistungswert muss größer als 0 sein";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [area, performanceOverride]);

  const handleSave = useCallback(() => {
    if (!validate()) return;
    const areaNum = parseFloat(area.replace(",", "."));
    const perfNum = performanceOverride
      ? parseFloat(performanceOverride.replace(",", "."))
      : undefined;

    onSave({
      name: name.trim(),
      roomTypeId: selectedRoomTypeId,
      area: areaNum,
      frequencyKey,
      performanceValueOverride: perfNum,
    });
    onClose();
  }, [validate, area, performanceOverride, name, selectedRoomTypeId, frequencyKey, onSave, onClose]);

  const handleDelete = useCallback(() => {
    Alert.alert("Raum löschen", "Möchten Sie diesen Raum wirklich löschen?", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen",
        style: "destructive",
        onPress: () => {
          onDelete?.();
          onClose();
        },
      },
    ]);
  }, [onDelete, onClose]);

  const performancePlaceholder = selectedRoomType
    ? formatNumber(selectedRoomType.performanceValue, 0)
    : "";

  const groupedRoomTypes = roomGroups.map((group) => ({
    group,
    types: roomTypes.filter((rt) => rt.groupId === group.id),
  })).filter((g) => g.types.length > 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.topBtn, { opacity: pressed ? 0.5 : 1 }]}
          >
            <Feather name="x" size={22} color={c.textSecondary} />
          </Pressable>
          <Text style={[styles.topTitle, { color: c.text }]}>
            {initialRoom ? "Raum bearbeiten" : "Raum hinzufügen"}
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
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Section title="Bezeichnung" color={c}>
            <TextInput
              style={[styles.input, { backgroundColor: c.card, borderColor: c.cardBorder, color: c.text }]}
              placeholder="Optionaler Raumname"
              placeholderTextColor={c.textTertiary}
              value={name}
              onChangeText={setName}
              maxLength={60}
            />
          </Section>

          <Section title="Raumart" color={c}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupScroll}>
              {groupedRoomTypes.map(({ group, types }) => (
                <View key={group.id} style={styles.typeGroup}>
                  <Text style={[styles.groupLabel, { color: c.textTertiary }]}>{group.label}</Text>
                  <View style={styles.typeRow}>
                    {types.map((rt) => {
                      const selected = selectedRoomTypeId === rt.id;
                      return (
                        <Pressable
                          key={rt.id}
                          onPress={() => {
                            setSelectedRoomTypeId(rt.id);
                            setPerformanceOverride("");
                          }}
                          style={[
                            styles.typeChip,
                            {
                              backgroundColor: selected ? c.accent : c.card,
                              borderColor: selected ? c.accent : c.cardBorder,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.typeChipText,
                              { color: selected ? "#fff" : c.textSecondary },
                            ]}
                          >
                            {rt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          </Section>

          <Section title="Fläche (m²)" color={c} error={errors.area}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: c.card,
                  borderColor: errors.area ? c.error : c.cardBorder,
                  color: c.text,
                },
              ]}
              placeholder="z. B. 120"
              placeholderTextColor={c.textTertiary}
              value={area}
              onChangeText={(t) => {
                setArea(t);
                if (errors.area) setErrors((e) => ({ ...e, area: "" }));
              }}
              keyboardType="decimal-pad"
            />
          </Section>

          <Section title="Reinigungshäufigkeit" color={c}>
            <View style={styles.freqGrid}>
              {frequencyOptions.map((f) => {
                const selected = frequencyKey === f.key;
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => setFrequencyKey(f.key)}
                    style={[
                      styles.freqChip,
                      {
                        backgroundColor: selected ? c.accent : c.card,
                        borderColor: selected ? c.accent : c.cardBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.freqChipText,
                        { color: selected ? "#fff" : c.textSecondary },
                      ]}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Section
            title={`Leistungswert (m²/h)${selectedRoomType ? ` — Standard: ${formatNumber(selectedRoomType.performanceValue, 0)}` : ""}`}
            color={c}
            error={errors.performance}
          >
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: c.card,
                  borderColor: errors.performance ? c.error : c.cardBorder,
                  color: c.text,
                },
              ]}
              placeholder={performancePlaceholder + " (Standard)"}
              placeholderTextColor={c.textTertiary}
              value={performanceOverride}
              onChangeText={(t) => {
                setPerformanceOverride(t);
                if (errors.performance) setErrors((e) => ({ ...e, performance: "" }));
              }}
              keyboardType="decimal-pad"
            />
          </Section>

          {initialRoom && onDelete && (
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [
                styles.deleteBtn,
                { borderColor: c.error + "55", opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="trash-2" size={16} color={c.error} />
              <Text style={[styles.deleteBtnText, { color: c.error }]}>Raum löschen</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function Section({
  title,
  error,
  children,
  color,
}: {
  title: string;
  error?: string;
  children: React.ReactNode;
  color: typeof Colors.dark;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: color.textSecondary }]}>{title}</Text>
      {children}
      {error ? (
        <Text style={[styles.errorText, { color: color.error }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
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
  topTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 0,
  },
  section: {
    marginBottom: 20,
    gap: 8,
  },
  sectionLabel: {
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
  errorText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: -4,
  },
  groupScroll: {
    marginHorizontal: -16,
    paddingLeft: 16,
  },
  typeGroup: {
    marginRight: 20,
    gap: 6,
  },
  groupLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  typeRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    maxWidth: 200,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  freqGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  freqChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  freqChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  deleteBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
