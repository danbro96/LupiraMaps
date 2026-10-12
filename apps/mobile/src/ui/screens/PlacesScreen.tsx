import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { memo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { SavedPlaceDto } from '@lupira/maps-api/models';
import { orderSavedPlaces } from '@lupira/maps-domain/savedPlaces';
import { useSavedPlaces } from '../../state/usePlaces';
import { ICONS } from '../icons';
import type { RootStackParamList } from '../navigation/types';
import { HIT_SLOP, spacing, useColors, type Palette } from '../theme';

type Styles = ReturnType<typeof makeStyles>;

/** Your saved places, favorites first. A row flies the map there; the trailing button opens the place. */
export function PlacesScreen() {
  const c = useColors();
  const styles = makeStyles(c);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const q = useSavedPlaces();
  const places = orderSavedPlaces(q.data ?? []);

  const open = (p: SavedPlaceDto) => navigation.navigate('PlaceDetail', { savedPlaceId: p.id, placeId: p.placeId ?? undefined });
  const show = (p: SavedPlaceDto) => {
    if (p.latitude == null || p.longitude == null) open(p);
    else navigation.navigate('Map', { at: { lon: p.longitude, lat: p.latitude } });
  };

  if (q.isPending && q.fetchStatus !== 'idle') {
    return <View style={styles.loading}><ActivityIndicator /></View>;
  }
  return (
    <FlatList
      style={styles.fill}
      data={places}
      keyExtractor={(p) => p.id}
      ListEmptyComponent={<Text style={styles.empty}>No saved places yet. Long-press the map to save one.</Text>}
      renderItem={({ item }) => (
        <PlaceRow place={item} styles={styles} iconColor={c.textMuted} favoriteColor={c.warning} onShow={show} onOpen={open} />
      )}
    />
  );
}

const PlaceRow = memo(function PlaceRow({ place, styles, iconColor, favoriteColor, onShow, onOpen }: {
  place: SavedPlaceDto;
  styles: Styles;
  iconColor: string;
  favoriteColor: string;
  onShow: (p: SavedPlaceDto) => void;
  onOpen: (p: SavedPlaceDto) => void;
}) {
  const detail = [place.category && place.category !== 'Unknown' ? place.category : null, place.notes].filter(Boolean).join(' · ');
  return (
    <Pressable style={styles.row} onPress={() => onShow(place)} accessibilityRole="button" accessibilityLabel={`Show ${place.label} on the map`}>
      <MaterialIcons
        name={place.isFavorite ? ICONS.star : ICONS.saved}
        size={22}
        color={place.isFavorite ? favoriteColor : iconColor}
      />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{place.label}</Text>
        {detail !== '' && <Text style={styles.detail} numberOfLines={1}>{detail}</Text>}
      </View>
      <Pressable onPress={() => onOpen(place)} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel={`Open ${place.label}`}>
        <MaterialIcons name={ICONS.info} size={22} color={iconColor} />
      </Pressable>
    </Pressable>
  );
});

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    fill: { flex: 1, backgroundColor: c.bg },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.divider,
    },
    body: { flex: 1, gap: 2 },
    title: { fontSize: 16, color: c.text },
    detail: { fontSize: 13, color: c.textMuted },
    empty: { textAlign: 'center', color: c.textSubtle, marginTop: 40, paddingHorizontal: spacing.lg },
  });
