import { NavLink, Outlet, useSearchParams } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import { BottomNav } from './BottomNav';
import { EventCard } from './EventCard';

const NAV = [
  { to: '/', label: 'Map', end: true },
  { to: '/places', label: 'Places' },
];

// NavLink sets .active itself, so the current section needs no state.
// textTransform because Button uppercases, which is an affordance for actions, not for nav labels.
const NAV_LINK_SX = {
  color: 'text.secondary',
  fontWeight: 600,
  textTransform: 'none',
  '&.active': { bgcolor: 'background.paper', color: 'text.primary' },
};

/** Full-width app frame: section nav, routed content, and the ?item= event card host. */
export function AppShell() {
  const [searchParams, setSearchParams] = useSearchParams();
  const itemId = searchParams.get('item');

  const closeItem = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('item');
      return next;
    });

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
        <AppBar
          position="static"
          color="transparent"
          elevation={0}
          sx={{ display: { xs: 'none', md: 'block' }, borderBottom: 1, borderColor: 'divider' }}
        >
          <Toolbar variant="dense">
            <Stack component="nav" direction="row" spacing={1} sx={{ flex: 1 }}>
              {NAV.map(({ to, label, end }) => (
                <Button key={to} component={NavLink} to={to} end={end} sx={NAV_LINK_SX}>
                  {label}
                </Button>
              ))}
            </Stack>
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ flex: 1, minHeight: 0, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </Box>
        <BottomNav />
      </Box>
      {itemId && <EventCard itemId={itemId} onClose={closeItem} />}
    </>
  );
}
