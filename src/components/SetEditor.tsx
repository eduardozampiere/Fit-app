import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatKg, formatNumber } from '../domain/format';
import { RPE_CHOICES } from '../domain/rpe';
import type { Grip, SetLog } from '../domain/types';
import { useTheme } from '../ui/theme';
import { BigButton, Chip, SectionTitle, Stepper, TextField } from './ui';

export type EditableSet = Omit<SetLog, 'id' | 'sessionLogId' | 'doneAt'> & { id?: string };

const GRIPS: { value: Grip; label: string }[] = [
  { value: 'hook', label: 'Hook' },
  { value: 'strap', label: 'Strap' },
  { value: 'double', label: 'Dupla' },
];

export function SetEditor({
  visible,
  title,
  initial,
  showGrip,
  onSave,
  onDelete,
  onClose,
}: {
  visible: boolean;
  title: string;
  initial: EditableSet | null;
  showGrip: boolean;
  onSave: (s: EditableSet) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const t = useTheme();
  // O pai remonta o editor (key) a cada série aberta, então o estado inicial basta.
  const [s, setS] = useState<EditableSet | null>(initial);
  if (!s) return null;
  const set = (patch: Partial<EditableSet>) => setS({ ...s, ...patch, asPlanned: false });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: t.text }]}>{title}</Text>
          <Text style={[styles.sub, { color: t.muted }]}>Série {s.setIndex}</Text>

          <Stepper label="Carga" value={s.loadKg} step={2.5} onChange={(v) => set({ loadKg: v })} format={formatKg} />
          {s.durationSec !== null ? (
            <Stepper
              label="Tempo (s)"
              value={s.durationSec}
              step={1}
              onChange={(v) => set({ durationSec: v })}
              format={(v) => (v === null ? '—' : `${formatNumber(v)} s`)}
            />
          ) : (
            <Stepper
              label="Repetições"
              value={s.reps}
              step={1}
              onChange={(v) => set({ reps: v })}
              format={(v) => (v === null ? '—' : formatNumber(v))}
            />
          )}

          <SectionTitle>RPE</SectionTitle>
          <View style={styles.wrap}>
            <Chip label="—" selected={s.rpe === null} onPress={() => set({ rpe: null })} accessibilityLabel="Sem RPE" />
            {RPE_CHOICES.map((r) => (
              <Chip key={r} label={formatNumber(r)} selected={s.rpe === r} onPress={() => set({ rpe: r })} accessibilityLabel={`RPE ${formatNumber(r)}`} />
            ))}
          </View>

          {showGrip ? (
            <>
              <SectionTitle>Pegada</SectionTitle>
              <View style={styles.wrap}>
                <Chip label="—" selected={s.grip === null} onPress={() => set({ grip: null })} accessibilityLabel="Pegada não informada" />
                {GRIPS.map((g) => (
                  <Chip key={g.value} label={g.label} selected={s.grip === g.value} onPress={() => set({ grip: g.value })} />
                ))}
              </View>
            </>
          ) : null}

          <SectionTitle>Cinto</SectionTitle>
          <View style={styles.wrap}>
            <Chip label="—" selected={s.belt === null} onPress={() => set({ belt: null })} accessibilityLabel="Cinto não informado" />
            <Chip label="Com cinto" selected={s.belt === true} onPress={() => set({ belt: true })} />
            <Chip label="Sem cinto" selected={s.belt === false} onPress={() => set({ belt: false })} />
          </View>

          <SectionTitle>Resultado</SectionTitle>
          <View style={styles.wrap}>
            <Chip label="Completou" selected={!s.failed} onPress={() => set({ failed: false })} />
            <Chip label="Falhou" selected={s.failed} onPress={() => set({ failed: true })} accessibilityLabel="Marcar série como falha" />
          </View>

          <SectionTitle>Observação</SectionTitle>
          <TextField
            value={s.note ?? ''}
            onChangeText={(v) => set({ note: v || null })}
            placeholder="ex.: lombar tensa, subiu lento"
            maxLength={140}
            accessibilityLabel="Observação da série"
          />

          <BigButton label="Salvar série" variant="success" onPress={() => onSave(s)} />
          {onDelete ? <BigButton label="Apagar série" variant="danger" onPress={onDelete} /> : null}
          <BigButton label="Cancelar" variant="neutral" onPress={onClose} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 14, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '800' },
  sub: { fontSize: 15, marginTop: -8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
