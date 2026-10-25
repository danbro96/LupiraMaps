import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import { PlaceCategory, type PlaceDto, type SavedPlaceDto } from '@lupira/maps-api/models';
import { placeCategoryLabel } from '@lupira/maps-domain/placeCuration';
import { placeItemWhen, placeRole } from '@lupira/maps-domain/placeItems';
import { addressMeta, residentsByPlace } from '@danbro96/lupira-domain-contacts/residents';
import { formatCoords, osmUrl } from '@danbro96/lupira-domain-places/places';
import { useSnackbar } from '@danbro96/lupira-web-mui/SnackbarHost';
import { links } from '../../../config/siblings';
import { useGeoPlace, useLinkSavedToPlace, usePlaceEdits, usePlaceItems, useSavedPlace } from '../../../state/usePlaces';
import { useResidencyRows } from '../../../state/useResidencies';
import { errText } from '../../errText';
import { EntryCodes } from '../places/EntryCodes';
import { CategoryIcon } from '../CategoryIcon';
import { DrawerSection } from '../DrawerSection';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import CloseIcon from '@mui/icons-material/Close';
import { displayTitle } from '@danbro96/lupira-domain-events/itemLabels';
import { Row, RowName } from '../Rows';
import { EditIcon, PlaceIcon } from '@danbro96/lupira-web-mui/icons';

/** The ?place= / ?saved= detail pane: the place (editable), your saved label for it, containment, items, contacts;
 *  a saved spot without a place shows its coordinates and can become one. */
export function PlaceDetailPanel({ placeId, savedPlaceId, onClose, onOpenPlace }: {
  placeId?: string;
  savedPlaceId?: string;
  onClose: () => void;
  onOpenPlace: (placeId: string) => void;
}) {
  const { saved, isLoading: savedLoading } = useSavedPlace({ savedPlaceId, placeId });
  const effectivePlaceId = placeId ?? saved?.placeId ?? undefined;
  const { data: place, isLoading: placeLoading } = useGeoPlace(effectivePlaceId);
  const isLoading = savedLoading || placeLoading;
  const rawSpot = !effectivePlaceId ? saved : null;

  return (
    <Paper
      component="aside"
      elevation={4}
      sx={{
        position: 'absolute',
        zIndex: 6,
        top: { xs: 'auto', sm: 1.5 },
        right: { xs: 0, sm: 1.5 },
        left: { xs: 0, sm: 'auto' },
        bottom: { xs: 0, sm: 1.5 },
        maxHeight: { xs: '60%', sm: 'none' },
        width: { xs: 'auto', sm: 'min(360px, calc(100vw - 24px))' },
        overflowY: 'auto',
        borderRadius: { xs: '12px 12px 0 0', sm: '12px' },
        p: 1.5,
      }}
    >
      <IconButton onClick={onClose} aria-label="Close" sx={{ position: 'absolute', top: 4, right: 4 }}>
        <CloseIcon fontSize="small" />
      </IconButton>
      {isLoading && <Typography variant="caption" sx={{ color: 'text.secondary' }} component="p">Loading…</Typography>}
      {!isLoading && !place && !rawSpot && <Typography component="p" sx={{ textAlign: 'center', color: 'text.subtle', mt: 6 }}>Place not found.</Typography>}
      {place && (
        <>
          <Paper variant="outlined" component="section" sx={{ p: '12px 16px', my: 1.5 }}>
            <PlaceHeading place={place} />
            {(place.containment ?? []).length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, fontSize: 13 }}>
                {(place.containment ?? []).map((a, i) => (
                  <span key={a.id}>
                    {i > 0 && <Box component="span" sx={{ color: 'text.subtle' }}> › </Box>}
                    {a.name}
                  </span>
                ))}
              </Box>
            )}
            {place.formattedAddress && <Typography component="p" sx={{ mb: 1, color: 'text.secondary' }}>{place.formattedAddress}</Typography>}
            <Coords lat={place.latitude} lon={place.longitude} />
          </Paper>
          <SavedPanel place={place} />
          <ItemsPanel placeId={place.id} />
          <ContactsPanel placeId={place.id} />
        </>
      )}
      {rawSpot && (
        <>
          <Paper variant="outlined" component="section" sx={{ p: '12px 16px', my: 1.5 }}>
            <h3 style={{ margin: 0 }}>{rawSpot.label}</h3>
            <Coords lat={rawSpot.latitude} lon={rawSpot.longitude} />
            <MakePlace saved={rawSpot} onLinked={onOpenPlace} />
          </Paper>
          <DrawerSection title="Saved place">
            <SavedPlaceFields saved={rawSpot} onRemoved={onClose} />
          </DrawerSection>
        </>
      )}
    </Paper>
  );
}

function Coords({ lat, lon }: { lat: number | null | undefined; lon: number | null | undefined }) {
  const coords = formatCoords(lat, lon);
  const osm = osmUrl(lat, lon);
  if (!coords) return null;
  return (
    <Typography component="p" sx={{ mb: 1, color: 'text.secondary' }}>
      <PlaceIcon fontSize="small" sx={{ verticalAlign: -5, mr: 0.5 }} />{coords}
      {osm && (
        <>
          {' '}
          <Button variant="text" href={osm} target="_blank" rel="noreferrer">OSM ↗</Button>
        </>
      )}
    </Typography>
  );
}

/** Matches a place within the dedupe radius under the spot's label, else creates one, then opens it. */
function MakePlace({ saved, onLinked }: { saved: SavedPlaceDto; onLinked: (placeId: string) => void }) {
  const link = useLinkSavedToPlace();
  const showSnack = useSnackbar();
  const make = () => link.mutate(saved, {
    onSuccess: ({ placeId }) => onLinked(placeId),
    onError: (e) => showSnack(errText(e) ?? 'Request failed.'),
  });
  return <Button variant="outlined" disabled={link.isPending} onClick={make}>Make it a place</Button>;
}

const CATEGORIES = Object.values(PlaceCategory);

function useEdits() {
  const showSnack = useSnackbar();
  return usePlaceEdits((e) => showSnack(errText(e) ?? 'Request failed.'));
}

/** Name and category, editable in place (PATCH the gazetteer place). */
function PlaceHeading({ place }: { place: PlaceDto }) {
  const { updatePlace } = useEdits();
  const [draft, setDraft] = useState<{ name: string; category: PlaceCategory } | null>(null);

  if (!draft) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <h3 style={{ margin: 0, flex: 1 }}>{place.name}</h3>
        <Chip variant="outlined" label={placeCategoryLabel(place.category)} />
        <IconButton aria-label="Edit place" size="small" onClick={() => setDraft({ name: place.name, category: place.category })}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Box>
    );
  }
  const save = () => updatePlace.mutate(
    { id: place.id, data: { name: draft.name.trim(), category: draft.category } },
    { onSuccess: () => setDraft(null) },
  );
  return (
    <Stack spacing={1.5} sx={{ mb: 1 }}>
      <TextField size="small" label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      <TextField
        select
        size="small"
        label="Category"
        value={draft.category}
        onChange={(e) => setDraft({ ...draft, category: e.target.value as PlaceCategory })}
      >
        {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{placeCategoryLabel(c)}</MenuItem>)}
      </TextField>
      <Stack direction="row" spacing={1}>
        <Button variant="contained" disabled={!draft.name.trim() || updatePlace.isPending} onClick={save}>Save</Button>
        <Button onClick={() => setDraft(null)}>Cancel</Button>
      </Stack>
    </Stack>
  );
}

/** Your own label for the place: name, notes, favorite; or a way to save it. */
function SavedPanel({ place }: { place: PlaceDto }) {
  const { saved, isLoading } = useSavedPlace({ placeId: place.id });
  const { createSaved } = useEdits();
  if (isLoading) return null;
  return (
    <DrawerSection title="Saved place">
      {saved ? (
        <SavedPlaceFields saved={saved} />
      ) : (
        <Button
          variant="outlined"
          disabled={createSaved.isPending}
          onClick={() => createSaved.mutate({ data: { label: place.name, placeId: place.id } })}
        >
          Save place
        </Button>
      )}
    </DrawerSection>
  );
}

function SavedPlaceFields({ saved, onRemoved }: { saved: SavedPlaceDto; onRemoved?: () => void }) {
  const { updateSaved, deleteSaved } = useEdits();
  const [draft, setDraft] = useState<{ label: string; notes: string } | null>(null);

  if (draft) {
    const save = () => updateSaved.mutate(
      { id: saved.id, data: { label: draft.label.trim(), notes: draft.notes.trim() || null } },
      { onSuccess: () => setDraft(null) },
    );
    return (
      <Stack spacing={1.5}>
        <TextField size="small" label="Name" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
        <TextField
          size="small"
          label="Notes"
          multiline
          minRows={2}
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
        />
        <Stack direction="row" spacing={1}>
          <Button variant="contained" disabled={!draft.label.trim() || updateSaved.isPending} onClick={save}>Save</Button>
          <Button onClick={() => setDraft(null)}>Cancel</Button>
        </Stack>
      </Stack>
    );
  }
  return (
    <Stack spacing={0.5}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography sx={{ flex: 1, fontWeight: 600 }}>{saved.label}</Typography>
        <IconButton aria-label="Edit saved place" size="small" onClick={() => setDraft({ label: saved.label, notes: saved.notes ?? '' })}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Box>
      {saved.notes && <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>{saved.notes}</Typography>}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <FormControlLabel
          sx={{ flex: 1 }}
          label="Favorite"
          control={(
            <Switch
              checked={saved.isFavorite}
              onChange={(e) => updateSaved.mutate({ id: saved.id, data: { isFavorite: e.target.checked } })}
            />
          )}
        />
        <Button color="error" disabled={deleteSaved.isPending} onClick={() => deleteSaved.mutate({ id: saved.id }, { onSuccess: onRemoved })}>Remove</Button>
      </Stack>
    </Stack>
  );
}

function ItemsPanel({ placeId }: { placeId: string }) {
  const [params] = useSearchParams();
  const { data: items, isLoading } = usePlaceItems(placeId);

  const itemHref = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('item', id);
    next.delete('occ');
    return `?${next.toString()}`;
  };

  return (
    <DrawerSection title="Items here">
      {isLoading && <Typography variant="caption" sx={{ color: 'text.secondary' }} component="p">Loading…</Typography>}
      {!isLoading && (items ?? []).length === 0 && <Typography component="p" sx={{ textAlign: 'center', color: 'text.subtle', mt: 6 }}>No items reference this place.</Typography>}
      {(items ?? []).map((item) => (
        <Row component={Link} key={item.id} to={itemHref(item.id)}>
          {item.category && (
            <CategoryIcon category={item.category} sx={{ fontSize: 22 }} />
          )}
          <RowName>{displayTitle(item.title)}</RowName>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{placeItemWhen(item)}</Typography>
          {placeRole(item, placeId) && <Chip variant="outlined" label={placeRole(item, placeId)} />}
        </Row>
      ))}
    </DrawerSection>
  );
}

function ContactsPanel({ placeId }: { placeId: string }) {
  const { rows } = useResidencyRows();
  const residents = residentsByPlace(rows.filter((r) => r.placeId === placeId)).get(placeId);
  if (!residents) return null;
  return (
    <DrawerSection title="Contacts here">
      <EntryCodes placeId={placeId} editable />
      {[...residents.active, ...residents.other].map((r) => (
        <Row component="a" key={`${r.contactId}-${r.status}`} href={links.calContactUrl(r.contactId)}>
          <RowName>{r.displayName}</RowName>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{addressMeta({ ...r, type: r.addressType })}</Typography>
        </Row>
      ))}
    </DrawerSection>
  );
}
