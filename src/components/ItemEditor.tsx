import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ItemPatch } from '../domain/adjustments';
import { KIND_LABEL } from '../domain/plan';
import type { ItemKind, PrescribedItem } from '../domain/types';
import { useTheme } from '../ui/theme';
import { BigButton, Chip } from './ui';

const KINDS: ItemKind[] = ['main', 'variation', 'activation_single', 'walkout', 'backoff', 'accessory', 'core'];

/** Editar (ou criar) um exercício do plano. Os textos seguem o formato da planilha. */
export function ItemEditor({
  item,
  onSave,
  onDelete,
  onClose,
}: {
  item: PrescribedItem | null; // null = novo
  onSave: (patch: ItemPatch & { name: string; setsText: string }) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const [f, setF] = useState({
    name: item?.name ?? '',
    setsText: item?.setsText ?? '3x8-12',
    load: item ? (item.loadText === '—' ? '' : item.loadText) : '',
    rpe: item ? (item.rpeText === '—' ? '' : item.rpeText) : '',
    rest: item ? (item.restText === '—' ? '' : item.restText) : '',
    notes: item?.notes ?? '',
    kind: item?.kind ?? ('accessory' as ItemKind),
  });
  const valid = f.name.trim().length > 1 && /^\d+(-\d+)?\s*[x×]/i.test(f.setsText.trim());
  const field = (key: 'name' | 'setsText' | 'load' | 'rpe' | 'rest' | 'notes', label: string, hint?: string) => (
    <View style={{ gap: 4 }}>
      <Text style={{ color: t.muted, fontSize: 14, fontWeight: '600' }}>{label}</Text>
      <TextInput
        value={f[key]}
        onChangeText={(v) => setF({ ...f, [key]: v })}
        placeholder={hint}
        placeholderTextColor={t.muted}
        style={[styles.input, { color: t.text, backgroundColor: t.card, borderColor: t.border }]}
        accessibilityLabel={label}
      />
    </View>
  );
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={{ color: t.text, fontSize: 22, fontWeight: '800' }}>{item ? 'Editar exercício' : 'Novo exercício'}</Text>
          {field('name', 'Exercício')}
          {field('setsText', 'Séries × reps', 'ex.: 4x4, 3x8-12, 2-3x10')}
          {field('load', 'Carga (kg)', 'ex.: 140, 205-210, 100+, vazio')}
          {field('rpe', 'RPE', 'ex.: 7, 7-7.5, ≤8')}
          {field('rest', 'Descanso', 'ex.: 5 min, 3-4 min')}
          {field('notes', 'Observações')}
          <Text style={{ color: t.muted, fontSize: 14, fontWeight: '600' }}>Tipo</Text>
          <View style={styles.wrap}>
            {KINDS.map((k) => (
              <Chip key={k} label={KIND_LABEL[k]} selected={f.kind === k} onPress={() => setF({ ...f, kind: k })} />
            ))}
          </View>
          {item?.pctBased ? (
            <Text style={{ color: t.warn, fontSize: 13 }}>Mudar a carga desliga o recálculo por % deste item.</Text>
          ) : null}
          <BigButton
            label="Salvar"
            variant="success"
            disabled={!valid}
            onPress={() => {
              const patch: ItemPatch & { name: string; setsText: string } = { name: f.name.trim(), setsText: f.setsText.trim(), notes: f.notes, kind: f.kind };
              if (!item || f.load !== (item.loadText === '—' ? '' : item.loadText)) patch.load = f.load.trim() || '—';
              if (!item || f.rpe !== (item.rpeText === '—' ? '' : item.rpeText)) patch.rpe = f.rpe.trim();
              if (!item || f.rest !== (item.restText === '—' ? '' : item.restText)) patch.rest = f.rest.trim();
              onSave(patch);
            }}
          />
          {onDelete ? <BigButton label="Remover do plano" variant="danger" onPress={onDelete} /> : null}
          <BigButton label="Cancelar" variant="neutral" onPress={onClose} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 12, paddingBottom: 48 },
  input: { minHeight: 52, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, fontSize: 17 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
