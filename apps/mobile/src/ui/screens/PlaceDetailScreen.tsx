import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { List, Switch, Text } from 'react-native-paper';
import { Button } from '@danbro96/lupira-expo-paper/components/Button';
import { ChoiceChips } from '@danbro96/lupira-expo-paper/components/ChoiceChips';
import { useConfirm } from '@danbro96/lupira-expo-paper/components/ConfirmDialog';
import { TextField } from '@danbro96/lupira-expo-paper/components/TextField';
import { toastError } from '@danbro96/lupira-expo-feedback/toast';
import { useOnline } from '@danbro96/lupira-expo-query/online';
import { formatCoords } from '@danbro96/lupira-domain-places/places';
import { PlaceCategory, type PlaceDto, type SavedPlaceDto } from '@lupira/maps-api/models';
import { placeCategoryLabel } from '@lupira/maps-domain/placeCuration';
import { describePlaceItem } from '@lupira/maps-domain/placeItems';
import { findSavedPlace } from '@lupira/maps-domain/savedPlaces';
import {
  useCreateSavedPlace, useDeleteSavedPlace, useGeoPlace, useLinkSavedToPlace, usePlaceItems, useSavedPlaces, useUpdatePlace,
  useUpdateSavedPlace,
} from '../../state/usePlaces';
import { EntryCodes } from '../components/EntryCodes';
import { ICONS } from '../icons';
import type { RootStackParamList } from '../navigation/types';
import { openSibling } from '../siblingLinks';
import { spacing, useColors } from '../theme';

const CATEGORY_OPTIONS = Object.values(PlaceCategory).map((v) => ({ value: v, label: placeCategoryLabel(v) }));

/** A place: your saved label for it, the gazetteer entry it points at, and the calendar items that reference it. */
export function PlaceDetailScreen() {
  const c = useColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'PlaceDetail'>>();
  const savedQ = useSavedPlaces();
  const saved = findSavedPlace(savedQ.data ?? [], params);
  const placeId = params.placeId ?? saved?.placeId ?? null;
  const placeQ = useGeoPlace(placeId);
  const place = placeQ.data;

  const lat = saved?.latitude ?? place?.latitude;
  const lon = saved?.longitude ?? place?.longitude;
  const title = saved?.label ?? place?.name;
  const loading = (savedQ.isPending && savedQ.fetchStatus !== 'idle') || (placeQ.isPending && placeQ.fetchStatus !== 'idle');

  if (!title) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        {loading ? <ActivityIndicator /> : <Text style={{ color: c.textSubtle }}>Place not found.</Text>}
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.content}>
      <View style={styles.head}>
        <Text variant="titleLarge" style={{ color: c.text }}>{title}</Text>
        {place?.formattedAddress && <Text style={{ color: c.textMuted }}>{place.formattedAddress}</Text>}
        {(place?.containment ?? []).length > 0 && (
          <Text style={{ color: c.textMuted }}>{place!.containment!.map((a) => a.name).join(' › ')}</Text>
        )}
        {formatCoords(lat, lon) && <Text style={{ color: c.textSubtle }}>{formatCoords(lat, lon)}</Text>}
        {lat != null && lon != null && (
          <View style={styles.actions}>
            <Button title="Show on map" onPress={() => navigation.navigate('Map', { at: { lon, lat } })} />
          </View>
        )}
      </View>
      <EntryCodes placeId={placeId} />

      {saved ? (
        <SavedPlaceSection saved={saved} onDeleted={() => navigation.goBack()} onLinked={(ids) => navigation.setParams(ids)} />
      ) : (
        place && <SaveGazetteerPlace place={place} />
      )}
      {place && <GazetteerSection place={place} />}
      {placeId && <ItemsSection placeId={placeId} />}
    </ScrollView>
  );
}

function SavedPlaceSection({ saved, onDeleted, onLinked }: {
  saved: SavedPlaceDto;
  onDeleted: () => void;
  onLinked: (ids: { placeId: string; savedPlaceId: string }) => void;
}) {
  const c = useColors();
  const online = useOnline();
  const confirm = useConfirm();
  const update = useUpdateSavedPlace();
  const remove = useDeleteSavedPlace();
  const link = useLinkSavedToPlace();
  const [draft, setDraft] = useState<{ label: string; notes: string } | null>(null);

  const save = () => {
    if (!draft) return;
    update.mutate(
      { id: saved.id, data: { label: draft.label.trim(), notes: draft.notes.trim() || null } },
      { onSuccess: () => setDraft(null), onError: () => toastError("Couldn't save the place") },
    );
  };
  const toggleFavorite = (isFavorite: boolean) =>
    update.mutate({ id: saved.id, data: { isFavorite } }, { onError: () => toastError("Couldn't update the favorite") });
  const onDelete = async () => {
    const ok = await confirm({ title: `Remove “${saved.label}”?`, message: 'The saved place is removed; the map location stays.', confirmLabel: 'Remove', destructive: true });
    if (!ok) return;
    remove.mutate(saved.id, { onSuccess: onDeleted, onError: () => toastError("Couldn't remove the place") });
  };
  const makePlace = () => link.mutate(saved, { onSuccess: onLinked, onError: () => toastError("Couldn't make it a place") });

  return (
    <>
      <List.Subheader>Saved place</List.Subheader>
      {draft ? (
        <View style={styles.form}>
          <TextField label="Name" value={draft.label} onChangeText={(label) => setDraft({ ...draft, label })} />
          <TextField label="Notes" value={draft.notes} multiline onChangeText={(notes) => setDraft({ ...draft, notes })} />
          <View style={styles.actions}>
            <Button title="Save" onPress={save} loading={update.isPending} disabled={!online || draft.label.trim() === ''} />
            <Button title="Cancel" variant="text" onPress={() => setDraft(null)} />
          </View>
        </View>
      ) : (
        <>
          <List.Item
            title={saved.label}
            description={saved.notes || undefined}
            descriptionNumberOfLines={4}
            left={(p) => <List.Icon {...p} icon={ICONS.saved} />}
            onPress={online ? () => setDraft({ label: saved.label, notes: saved.notes ?? '' }) : undefined}
            right={(p) => <List.Icon {...p} icon={ICONS.edit} />}
          />
          <List.Item
            title="Favorite"
            left={(p) => <List.Icon {...p} icon={saved.isFavorite ? ICONS.star : ICONS.starOutline} />}
            right={() => (
              <Switch value={saved.isFavorite} disabled={!online} onValueChange={toggleFavorite} accessibilityLabel="Favorite" />
            )}
          />
          <View style={[styles.actions, styles.inset]}>
            {!saved.placeId && (
              <Button title="Make it a place" variant="secondary" onPress={makePlace} disabled={!online} loading={link.isPending} />
            )}
            <Button title="Remove saved place" variant="destructive" onPress={() => void onDelete()} disabled={!online} loading={remove.isPending} />
          </View>
        </>
      )}
      {!online && <Text style={[styles.inset, { color: c.textSubtle }]}>Editing needs a connection.</Text>}
    </>
  );
}

function SaveGazetteerPlace({ place }: { place: PlaceDto }) {
  const online = useOnline();
  const create = useCreateSavedPlace();
  return (
    <View style={[styles.actions, styles.inset]}>
      <Button
        title="Save place"
        variant="secondary"
        disabled={!online}
        loading={create.isPending}
        onPress={() => create.mutate({ label: place.name, placeId: place.id }, { onError: () => toastError("Couldn't save the place") })}
      />
    </View>
  );
}

function GazetteerSection({ place }: { place: PlaceDto }) {
  const online = useOnline();
  const update = useUpdatePlace();
  const [draft, setDraft] = useState<{ name: string; category: string } | null>(null);

  const save = () => {
    if (!draft) return;
    update.mutate(
      { id: place.id, data: { name: draft.name.trim(), category: draft.category as PlaceCategory } },
      { onSuccess: () => setDraft(null), onError: () => toastError("Couldn't update the place") },
    );
  };

  return (
    <>
      <List.Subheader>Place</List.Subheader>
      {draft ? (
        <View style={styles.form}>
          <TextField label="Name" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} />
          <ChoiceChips options={CATEGORY_OPTIONS} value={draft.category} onChange={(category) => setDraft({ ...draft, category })} required />
          <View style={styles.actions}>
            <Button title="Save" onPress={save} loading={update.isPending} disabled={!online || draft.name.trim() === ''} />
            <Button title="Cancel" variant="text" onPress={() => setDraft(null)} />
          </View>
        </View>
      ) : (
        <List.Item
          title={place.name}
          description={placeCategoryLabel(place.category)}
          left={(p) => <List.Icon {...p} icon={ICONS.place} />}
          onPress={online ? () => setDraft({ name: place.name, category: place.category }) : undefined}
          right={(p) => <List.Icon {...p} icon={ICONS.edit} />}
        />
      )}
    </>
  );
}

function ItemsSection({ placeId }: { placeId: string }) {
  const c = useColors();
  const q = usePlaceItems(placeId);
  const items = q.data ?? [];
  return (
    <>
      <List.Subheader>Items here</List.Subheader>
      {q.isPending && q.fetchStatus !== 'idle' && <ActivityIndicator style={styles.inset} />}
      {!q.isPending && items.length === 0 && (
        <Text style={[styles.inset, { color: c.textSubtle }]}>No items reference this place.</Text>
      )}
      {items.map((item) => {
        const { title, detail } = describePlaceItem(item, placeId);
        return (
          <List.Item
            key={item.id}
            title={title}
            description={detail || undefined}
            left={(p) => <List.Icon {...p} icon={ICONS.event} />}
            onPress={() => void openSibling((l) => l.calItemUrl(item.id))}
          />
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: spacing.xl },
  head: { padding: spacing.lg, gap: spacing.xs },
  form: { paddingHorizontal: spacing.lg, gap: spacing.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  inset: { paddingHorizontal: spacing.lg },
});
