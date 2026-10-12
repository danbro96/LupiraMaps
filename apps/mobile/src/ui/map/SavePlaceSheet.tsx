import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Switch, Text } from 'react-native-paper';
import { Button } from '@danbro96/lupira-expo-paper/components/Button';
import { TextField } from '@danbro96/lupira-expo-paper/components/TextField';
import { toast, toastError } from '@danbro96/lupira-expo-feedback/toast';
import { useOnline } from '@danbro96/lupira-expo-query/online';
import type { GeoPoint } from '@danbro96/lupira-domain-places/geo';
import { pinNameSuggestion } from '@danbro96/lupira-domain-places/pin';
import { formatCoords } from '@danbro96/lupira-domain-places/places';
import { useReverseGeocode, useSavePinnedPlace } from '../../state/usePlaces';
import { Sheet } from '../components/Sheet';
import { spacing, useColors } from '../theme';

/** Saves a long-pressed spot as a catalog place plus a saved place on it; the name starts as the address suggestion. */
export function SavePlaceSheet({ point, onDismiss }: { point: GeoPoint; onDismiss: () => void }) {
  const c = useColors();
  const online = useOnline();
  const geo = useReverseGeocode(point);
  const create = useSavePinnedPlace();
  const [edited, setEdited] = useState<string | null>(null);
  const [isFavorite, setFavorite] = useState(false);
  const label = edited ?? pinNameSuggestion(geo.data) ?? '';

  const save = () =>
    create.mutate(
      { point, name: label.trim(), isFavorite },
      {
        onSuccess: ({ saved, existed }) => {
          toast(existed ? `Already saved as “${saved.label}”` : `Saved “${saved.label}”`);
          onDismiss();
        },
        onError: () => toastError("Couldn't save the place"),
      },
    );

  return (
    <Sheet title="Save place" anchor="top" onDismiss={onDismiss}>
      <View style={styles.body}>
        <Text style={{ color: c.textMuted }}>{geo.data?.displayName ?? formatCoords(point.lat, point.lon)}</Text>
        <TextField label="Name" value={label} onChangeText={setEdited} />
        <View style={styles.row}>
          <Text style={[styles.grow, { color: c.text }]}>Favorite</Text>
          <Switch value={isFavorite} onValueChange={setFavorite} accessibilityLabel="Favorite" />
        </View>
        <View style={styles.row}>
          <Button title="Save" onPress={save} loading={create.isPending} disabled={!online} />
          <Button title="Cancel" variant="text" onPress={onDismiss} />
        </View>
        {!online && <Text style={{ color: c.textSubtle }}>Saving needs a connection.</Text>}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  grow: { flex: 1 },
});
