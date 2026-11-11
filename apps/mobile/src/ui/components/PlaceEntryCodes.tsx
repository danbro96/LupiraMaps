import { StyleSheet, View } from 'react-native';
import { EntryCodes } from '@danbro96/lupira-expo-paper/components/EntryCodes';
import { toastError } from '@danbro96/lupira-expo-feedback/toast';
import { useOnline } from '@danbro96/lupira-expo-query/online';
import { usePlaceEntry, useRemoveEntryCode, useResidencyRows, useSetEntryCode } from '../../state/useResidencies';
import { spacing } from '../theme';

/** A place's door codes from the read cache while someone you can see lives there now; `editable` changes them online. */
export function PlaceEntryCodes({ placeId, editable = false }: { placeId: string | null | undefined; editable?: boolean }) {
  const { codes, canAdd } = usePlaceEntry(placeId, useResidencyRows());
  const online = useOnline();
  const set = useSetEntryCode();
  const remove = useRemoveEntryCode();
  const canEdit = editable && online;
  if (!placeId || !canAdd || (!canEdit && codes.length === 0)) return null;
  return (
    <View style={styles.row}>
      <EntryCodes
        codes={codes}
        editable={canEdit}
        onSave={(code) => set.mutate({ placeId, code }, { onError: () => toastError("Couldn't save the door code") })}
        onRemove={(codeId) => remove.mutate({ placeId, codeId }, { onError: () => toastError("Couldn't remove the door code") })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
});
