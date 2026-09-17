import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { TextField } from '@/components/text-field';
import { errorMessage } from '@/lib/format';
import { colors } from '@/lib/theme';

type Props = {
  visible: boolean;
  title: string;
  label: string;
  placeholder?: string;
  submitLabel: string;
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
};

/** Ask for a single name. React Native has no built-in text prompt that works on Android and web. */
export function NamePrompt({ visible, title, onClose, ...rest }: Props) {
  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      {visible ? <NameForm {...rest} /> : null}
    </Sheet>
  );
}

function NameForm({ label, placeholder, submitLabel, onSubmit }: Omit<Props, 'visible' | 'title' | 'onClose'>) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setError('Enter a name.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSubmit(name.trim());
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <>
      <TextField
        label={label}
        value={name}
        onChangeText={setName}
        placeholder={placeholder}
        autoFocus
        onSubmitEditing={submit}
        returnKeyType="done"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label={submitLabel} onPress={submit} loading={busy} />
    </>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, fontSize: 15 },
});
