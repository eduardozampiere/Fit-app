import { Linking, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BigButton } from './ui';

/** Regra 9 — sinais de alarme da lombar: alerta em tela cheia. */
export function RedFlagModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <ScrollView style={{ backgroundColor: '#B3261E' }} contentContainerStyle={styles.body}>
        <Text style={styles.icon} accessibilityElementsHidden>
          ⚠️
        </Text>
        <Text style={styles.title} accessibilityRole="header">
          Procure um pronto-socorro
        </Text>
        <Text style={styles.text}>
          Dormência na região da sela, alteração urinária ou intestinal e fraqueza nas pernas podem indicar compressão
          nervosa grave. Não treine. Procure atendimento médico agora.
        </Text>
        <View style={{ gap: 12, marginTop: 12 }}>
          <BigButton label="Ligar 192 (SAMU)" variant="neutral" onPress={() => Linking.openURL('tel:192')} />
          <BigButton label="Fechar" variant="neutral" onPress={onClose} />
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { flexGrow: 1, padding: 28, paddingTop: 96, gap: 18, justifyContent: 'center' },
  icon: { fontSize: 64, textAlign: 'center' },
  title: { color: '#fff', fontSize: 32, fontWeight: '900', textAlign: 'center' },
  text: { color: '#fff', fontSize: 19, lineHeight: 27, textAlign: 'center' },
});
