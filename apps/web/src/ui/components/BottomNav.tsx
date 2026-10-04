import { NavLink, useLocation } from 'react-router-dom';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import { MapIcon, PlaceIcon } from '@danbro96/lupira-web-mui/icons';

const TABS = [
  { to: '/', end: true, icon: <MapIcon />, label: 'Map' },
  { to: '/places', icon: <PlaceIcon />, label: 'Places' },
];

/** Phone shell navigation; hidden on desktop. */
export function BottomNav() {
  const path = useLocation().pathname;
  const value = TABS.find((t) => (t.end ? path === t.to : path.startsWith(t.to)))?.to ?? false;

  return (
    <Paper
      elevation={3}
      square
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        display: { md: 'none' },
        zIndex: 'appBar',
        pb: 'env(safe-area-inset-bottom)',
      }}
    >
      <BottomNavigation showLabels value={value}>
        {TABS.map((t) => (
          <BottomNavigationAction key={t.to} component={NavLink} to={t.to} end={t.end} value={t.to} label={t.label} icon={t.icon} />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
