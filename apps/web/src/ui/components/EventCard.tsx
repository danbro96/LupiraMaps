import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { displayTitle } from '@danbro96/lupira-domain-events/itemLabels';
import { calendarColor } from '@danbro96/lupira-tokens-calendar/kinds';
import { PlaceIcon } from '@danbro96/lupira-web-mui/icons';
import { fmtEventSpan } from '@lupira/maps-domain/eventSpan';
import { links } from '../../config/siblings';
import { useContainers } from '../../state/useContainers';
import { useItem } from '../../state/useItem';
import { useGeoPlace } from '../../state/usePlaces';
import { CategoryIcon } from './CategoryIcon';

/** The ?item= card: what an event on the map is, read-only. Editing is the calendar's. */
export function EventCard({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const { data: item, isLoading } = useItem(itemId);
  const { calendars } = useContainers();
  const { data: place } = useGeoPlace(item?.placeId ?? undefined);
  const calendar = calendars.find((c) => (item?.calendars ?? []).some((m) => m.calendarId === c.id));
  const where = place?.name ?? item?.locationLabel ?? null;

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {item && <CategoryIcon category={item.category} style={{ color: calendarColor(calendar ?? null) }} />}
        <Box component="span" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
          {item ? displayTitle(item.title) : isLoading ? 'Loading…' : 'Event not found'}
        </Box>
      </DialogTitle>
      {item && (
        <DialogContent>
          <Typography component="p" sx={{ color: 'text.secondary' }}>{fmtEventSpan(item)}</Typography>
          {where && (
            <Typography component="p" sx={{ color: 'text.secondary', mt: 0.5 }}>
              <PlaceIcon fontSize="small" sx={{ verticalAlign: -5, mr: 0.5 }} />{where}
            </Typography>
          )}
          {calendar && (
            <Typography component="p" variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1, color: 'text.secondary' }}>
              <Box component="span" sx={{ width: 10, height: 10, borderRadius: '50%', flex: 'none' }} style={{ background: calendarColor(calendar) }} />
              {calendar.displayName ?? calendar.slug}
            </Typography>
          )}
        </DialogContent>
      )}
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" component="a" href={links.calItemUrl(itemId)}>Open in calendar</Button>
      </DialogActions>
    </Dialog>
  );
}
