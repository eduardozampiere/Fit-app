import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatNumber, parseDecimal } from '../domain/format';
import { macrosFor, slugify, type FavoriteMeal, type Food, type MealEntry, type MealType } from '../domain/nutrition';
import { TOUCH, useTheme } from '../ui/theme';
import { BigButton, Card, Chip, Stepper } from './ui';

const GRAM_CHIPS = [30, 50, 100, 150, 200, 300, 400];

export function macroLine(m: { kcal: number; protein: number; carbs: number; fat: number }): string {
  return `${formatNumber(m.kcal, 0)} kcal · P ${formatNumber(m.protein)} · C ${formatNumber(m.carbs)} · G ${formatNumber(m.fat)}`;
}

/** Escolher alimento + gramas para uma refeição. */
export function FoodPicker({
  visible,
  foods,
  meal,
  date,
  onAdd,
  onNewFood,
  onClose,
}: {
  visible: boolean;
  foods: Food[];
  meal: MealType;
  date: string;
  onAdd: (e: Omit<MealEntry, 'id'>) => void;
  onNewFood: () => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const [query, setQuery] = useState('');
  const [food, setFood] = useState<Food | null>(null);
  const [grams, setGrams] = useState(100);
  const q = slugify(query);
  const list = foods.filter((f) => slugify(f.name).includes(q));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {food ? (
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={[styles.title, { color: t.text }]}>{food.name}</Text>
            <Stepper label="Gramas" value={grams} step={10} onChange={setGrams} format={(v) => `${formatNumber(v ?? 0, 0)} g`} />
            <View style={styles.wrap}>
              {GRAM_CHIPS.map((g) => (
                <Chip key={g} label={`${g} g`} selected={grams === g} onPress={() => setGrams(g)} />
              ))}
            </View>
            <Card>
              <Text style={{ color: t.text, fontSize: 17, fontWeight: '700' }}>{macroLine(macrosFor(food, grams))}</Text>
            </Card>
            <BigButton
              label="Adicionar"
              variant="success"
              onPress={() => {
                onAdd({ date, meal, kind: 'food', label: food.name, foodId: food.id, grams, ...macrosFor(food, grams) });
                setFood(null);
                setQuery('');
              }}
            />
            <BigButton label="Voltar" variant="neutral" onPress={() => setFood(null)} />
          </ScrollView>
        ) : (
          <View style={{ flex: 1, padding: 16, gap: 12 }}>
            <Text style={[styles.title, { color: t.text }]}>Adicionar alimento</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar"
              placeholderTextColor={t.muted}
              autoFocus
              style={[styles.input, { color: t.text, backgroundColor: t.card, borderColor: t.border }]}
              accessibilityLabel="Buscar alimento"
            />
            <FlatList
              data={list}
              keyExtractor={(f) => f.id}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setFood(item);
                    setGrams(100);
                  }}
                  style={[styles.row, { backgroundColor: t.card, borderColor: t.border }]}
                >
                  <Text style={{ color: t.text, fontSize: 17, fontWeight: '700' }}>{item.name}</Text>
                  <Text style={{ color: t.muted, fontSize: 13 }}>por 100 g: {macroLine(item)}</Text>
                </Pressable>
              )}
              ListFooterComponent={
                <View style={{ gap: 8, marginTop: 12 }}>
                  <BigButton label="Cadastrar alimento novo" variant="neutral" onPress={onNewFood} />
                  <BigButton label="Fechar" variant="neutral" onPress={onClose} />
                </View>
              }
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Cadastrar ou editar alimento (valores por 100 g). */
export function FoodEditor({
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  initial: Food | null;
  onSave: (f: Food) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const [name, setName] = useState(initial?.name ?? '');
  const [vals, setVals] = useState({
    kcal: initial ? formatNumber(initial.kcal) : '',
    protein: initial ? formatNumber(initial.protein) : '',
    carbs: initial ? formatNumber(initial.carbs) : '',
    fat: initial ? formatNumber(initial.fat) : '',
  });
  const nums = {
    kcal: parseDecimal(vals.kcal),
    protein: parseDecimal(vals.protein),
    carbs: parseDecimal(vals.carbs),
    fat: parseDecimal(vals.fat),
  };
  const valid = name.trim().length > 1 && Object.values(nums).every((n) => n !== null && n >= 0);
  const fields: { key: keyof typeof vals; label: string }[] = [
    { key: 'kcal', label: 'Calorias (kcal)' },
    { key: 'protein', label: 'Proteína (g)' },
    { key: 'carbs', label: 'Carboidrato (g)' },
    { key: 'fat', label: 'Gordura (g)' },
  ];
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: t.text }]}>{initial ? 'Editar alimento' : 'Novo alimento'}</Text>
          <Text style={{ color: t.muted, fontSize: 14 }}>Valores por 100 g (veja o rótulo).</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nome"
            placeholderTextColor={t.muted}
            style={[styles.input, { color: t.text, backgroundColor: t.card, borderColor: t.border }]}
            accessibilityLabel="Nome do alimento"
          />
          {fields.map((f) => (
            <View key={f.key} style={{ gap: 4 }}>
              <Text style={{ color: t.muted, fontSize: 14, fontWeight: '600' }}>{f.label}</Text>
              <TextInput
                value={vals[f.key]}
                onChangeText={(v) => setVals({ ...vals, [f.key]: v })}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={t.muted}
                style={[styles.input, { color: t.text, backgroundColor: t.card, borderColor: t.border }]}
                accessibilityLabel={f.label}
              />
            </View>
          ))}
          <BigButton
            label="Salvar"
            variant="success"
            disabled={!valid}
            onPress={() =>
              onSave({
                id: initial?.id ?? slugify(name),
                name: name.trim(),
                kcal: nums.kcal!,
                protein: nums.protein!,
                carbs: nums.carbs!,
                fat: nums.fat!,
              })
            }
          />
          {onDelete ? <BigButton label="Apagar alimento" variant="danger" onPress={onDelete} /> : null}
          <BigButton label="Cancelar" variant="neutral" onPress={onClose} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Lista de alimentos para editar. */
export function FoodsManager({
  foods,
  onEdit,
  onNew,
  onClose,
}: {
  foods: Food[];
  onEdit: (f: Food) => void;
  onNew: () => void;
  onClose: () => void;
}) {
  const t = useTheme();
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.body}>
        <Text style={[styles.title, { color: t.text }]}>Alimentos</Text>
        <BigButton label="Cadastrar alimento novo" onPress={onNew} />
        {foods.map((f) => (
          <Pressable
            key={f.id}
            accessibilityRole="button"
            accessibilityLabel={`Editar ${f.name}`}
            onPress={() => onEdit(f)}
            style={[styles.row, { backgroundColor: t.card, borderColor: t.border }]}
          >
            <Text style={{ color: t.text, fontSize: 17, fontWeight: '700' }}>{f.name}</Text>
            <Text style={{ color: t.muted, fontSize: 13 }}>por 100 g: {macroLine(f)}</Text>
          </Pressable>
        ))}
        <BigButton label="Fechar" variant="neutral" onPress={onClose} />
      </ScrollView>
    </Modal>
  );
}

/** Escolher refeição favorita para aplicar. */
export function FavoritePicker({
  favorites,
  foods,
  onPick,
  onDelete,
  onClose,
}: {
  favorites: FavoriteMeal[];
  foods: Food[];
  onPick: (f: FavoriteMeal) => void;
  onDelete: (f: FavoriteMeal) => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const name = (id: string) => foods.find((f) => f.id === id)?.name ?? id;
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.body}>
        <Text style={[styles.title, { color: t.text }]}>Refeições favoritas</Text>
        {favorites.map((f) => (
          <Card key={f.id}>
            <Text style={{ color: t.text, fontSize: 17, fontWeight: '800' }}>{f.name}</Text>
            <Text style={{ color: t.muted, fontSize: 14 }}>
              {f.items.map((i) => `${i.grams} g de ${name(i.foodId).toLowerCase()}`).join(' + ')}
              {f.oilSpoons ? ` + óleo (${formatNumber(f.oilSpoons)} colher)` : ''}
            </Text>
            <View style={styles.wrap}>
              <View style={{ flex: 1 }}>
                <BigButton label="Adicionar" compact onPress={() => onPick(f)} />
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Apagar ${f.name}`} onPress={() => onDelete(f)} style={[styles.del, { backgroundColor: t.chip }]}>
                <Text style={{ color: t.danger, fontWeight: '700' }}>Apagar</Text>
              </Pressable>
            </View>
          </Card>
        ))}
        {favorites.length === 0 ? (
          <Text style={{ color: t.muted }}>Nenhuma favorita. Monte uma refeição e toque em “Salvar como favorita”.</Text>
        ) : null}
        <BigButton label="Fechar" variant="neutral" onPress={onClose} />
      </ScrollView>
    </Modal>
  );
}

/** Pedir um nome (Alert.prompt só existe no iOS; este funciona em todos). */
export function NamePrompt({ title, onSave, onClose }: { title: string; onSave: (name: string) => void; onClose: () => void }) {
  const t = useTheme();
  const [name, setName] = useState('');
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Card style={{ width: '88%' }}>
          <Text style={{ color: t.text, fontSize: 18, fontWeight: '800' }}>{title}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            autoFocus
            placeholder="ex.: Almoço padrão"
            placeholderTextColor={t.muted}
            style={[styles.input, { color: t.text, backgroundColor: t.bg, borderColor: t.border }]}
          />
          <BigButton label="Salvar" compact disabled={name.trim().length < 2} onPress={() => onSave(name.trim())} />
          <BigButton label="Cancelar" compact variant="neutral" onPress={onClose} />
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 14, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '800' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  input: { minHeight: 52, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, fontSize: 17 },
  row: { minHeight: TOUCH, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 12, gap: 2 },
  del: { minHeight: 48, borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
});
