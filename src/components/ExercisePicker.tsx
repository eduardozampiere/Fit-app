import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import catalogJson from '../../assets/catalog/exercicios.json';
import type { SwapScope } from '../domain/adjustments';
import {
  MUSCLE_LABEL,
  MUSCLE_ORDER,
  catalogSubtitle,
  exerciseFromCatalog,
  exerciseFromName,
  findCycleExercise,
  searchCatalog,
  type Catalog,
} from '../domain/catalog';
import type { Exercise } from '../domain/types';
import { radius, space, useTheme } from '../ui/theme';
import { ExerciseImage } from './ExerciseImage';
import { Chip, ListRow, SheetHeader, TextField } from './ui';

const catalog = catalogJson as unknown as Catalog;
/** Largura da miniatura: as imagens são faixas largas. Fundo branco (accentText) porque elas têm fundo branco. */
const THUMB_W = 72;

/**
 * Escolher o exercício que entra no lugar de outro: lista pré-cadastrada (busca em português ou
 * inglês, filtro por grupo muscular) ou um nome novo. O pai renderiza só aberto.
 */
export function ExercisePicker({
  mode = 'swap',
  currentName = '',
  isLift = false,
  cycleExercises,
  onPick,
  onClose,
}: {
  /** `swap` troca o exercício de um item; `add` acrescenta um exercício ao treino */
  mode?: 'swap' | 'add';
  currentName?: string;
  /** o item é um dos três movimentos: trocar desliga o cálculo por % e as regras dele */
  isLift?: boolean;
  cycleExercises: readonly Exercise[];
  onPick: (exercise: Exercise, scope: SwapScope) => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [scope, setScope] = useState<SwapScope>('item');
  const results = useMemo(() => searchCatalog(catalog.exercises, query, muscle), [query, muscle]);
  const typed = query.trim();
  const canCreate =
    typed.length > 1 &&
    !findCycleExercise(cycleExercises, typed) &&
    !results.some((e) => e.name.toLowerCase() === typed.toLowerCase());

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <SheetHeader title={mode === 'add' ? 'Adicionar exercício' : 'Trocar exercício'} />
        <View style={styles.top}>
          {mode === 'swap' ? (
            <Text style={{ color: t.muted, fontSize: 14 }} numberOfLines={1}>
              No lugar de: {currentName}
            </Text>
          ) : null}
          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar exercício (ex.: puxada, remada)"
            autoCorrect={false}
            clearButtonMode="while-editing"
            accessibilityLabel="Buscar exercício"
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            keyboardShouldPersistTaps="handled"
          >
            <Chip label="Todos" selected={muscle === null} onPress={() => setMuscle(null)} />
            {MUSCLE_ORDER.map((m) => (
              <Chip key={m} label={MUSCLE_LABEL[m]} selected={muscle === m} onPress={() => setMuscle(muscle === m ? null : m)} />
            ))}
          </ScrollView>
          {mode === 'swap' ? (
            <View style={styles.chips}>
              <Chip label="Só neste treino" selected={scope === 'item'} onPress={() => setScope('item')} />
              <Chip label="Daqui para frente" selected={scope === 'forward'} onPress={() => setScope('forward')} />
            </View>
          ) : null}
          {mode === 'swap' && scope === 'forward' ? (
            <Text style={{ color: t.muted, fontSize: 13 }}>Troca também este exercício nos treinos das semanas seguintes.</Text>
          ) : null}
          {mode === 'swap' && isLift ? (
            <Text style={{ color: t.warn, fontSize: 13 }}>
              É um dos três movimentos: trocar desliga o cálculo da carga por % e as regras de segurança dele neste item.
            </Text>
          ) : null}
        </View>
        <FlatList
          data={results}
          keyExtractor={(e) => e.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: 48 }}
          ListEmptyComponent={
            <Text style={{ color: t.muted, fontSize: 15, paddingVertical: space.lg }}>Nenhum exercício encontrado.</Text>
          }
          ListFooterComponent={
            canCreate ? (
              <ListRow
                title={`Criar “${typed}”`}
                subtitle="Exercício novo, fora da lista"
                icon="add-circle-outline"
                onPress={() => onPick(exerciseFromName(cycleExercises, typed), scope)}
              />
            ) : undefined
          }
          renderItem={({ item, index }) => (
            <ListRow
              title={item.name}
              subtitle={catalogSubtitle(item)}
              leading={<Thumb image={item.image} />}
              onPress={() => onPick(exerciseFromCatalog(cycleExercises, item), scope)}
              last={index === results.length - 1}
            />
          )}
        />
      </View>
    </Modal>
  );
}

/** Miniatura da linha: a imagem do exercício, ou um ícone quando não há (ou antes de carregar). */
function Thumb({ image }: { image: string | null }) {
  const t = useTheme();
  return (
    <View style={[styles.thumb, { backgroundColor: image ? t.accentText : t.surface }]}>
      <Ionicons name="barbell-outline" size={20} color={t.muted} style={image ? styles.thumbIcon : undefined} />
      {image ? <ExerciseImage uri={image} width={THUMB_W} height={44} fit="contain" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  thumbIcon: { position: 'absolute' },
  thumb: {
    width: THUMB_W,
    height: 44,
    borderRadius: radius.cell,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  top: { padding: space.lg, gap: space.sm },
  chips: { flexDirection: 'row', gap: space.sm },
});
