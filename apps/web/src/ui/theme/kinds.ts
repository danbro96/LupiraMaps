import type { ItemCategory } from '@lupira/maps-api/models';
import { ITEM_CATEGORY_ICONS as TOKEN_ITEM_CATEGORY_ICONS, type IconName } from '@lupira/maps-tokens/icons';
import type { SvgIconComponent } from '@mui/icons-material';
import * as Icons from '@danbro96/lupira-web-mui/icons';
import { HeadingIcon, LocateFixedIcon, LocateIcon } from '../icons';

// Re-typing the token record against the generated enum is the drift tripwire: when the API adds a
// category the tokens package doesn't know, this assignment stops compiling.
export const ITEM_CATEGORY_ICONS: Record<ItemCategory, IconName> = TOKEN_ITEM_CATEGORY_ICONS;

// The second half of the tripwire: a concept named in tokens that nothing here resolves is a
// compile error, not a glyph that silently fails to render.
export const ICON_BY_NAME: Record<IconName, SvgIconComponent> = {
  account: Icons.AccountIcon,
  add: Icons.AddIcon,
  alert: Icons.AlertIcon,
  cake: Icons.CakeIcon,
  calendar: Icons.CalendarIcon,
  celebration: Icons.CelebrationIcon,
  check: Icons.CheckIcon,
  checkBox: Icons.CheckboxIcon,
  checkCircle: Icons.CheckCircleIcon,
  chevronLeft: Icons.ChevronLeftIcon,
  chevronRight: Icons.ChevronRightIcon,
  cleaning: Icons.CleaningIcon,
  clear: Icons.ClearIcon,
  close: Icons.CloseIcon,
  contacts: Icons.ContactsIcon,
  delete: Icons.DeleteIcon,
  email: Icons.EmailIcon,
  event: Icons.EventIcon,
  expand: Icons.ExpandIcon,
  filter: Icons.FilterIcon,
  group: Icons.GroupIcon,
  heading: HeadingIcon,
  hotel: Icons.HotelIcon,
  inbox: Icons.InboxIcon,
  layers: Icons.LayersIcon,
  link: Icons.LinkIcon,
  locate: LocateIcon,
  locateFixed: LocateFixedIcon,
  locationOff: Icons.LocationOffIcon,
  lock: Icons.LockIcon,
  luggage: Icons.LuggageIcon,
  map: Icons.MapIcon,
  medical: Icons.MedicalIcon,
  menu: Icons.MenuIcon,
  more: Icons.MoreIcon,
  person: Icons.PersonIcon,
  photo: Icons.PhotoIcon,
  photos: Icons.PhotosIcon,
  place: Icons.PlaceIcon,
  restaurant: Icons.RestaurantIcon,
  robot: Icons.RobotIcon,
  run: Icons.RunIcon,
  saved: Icons.SavedPlaceIcon,
  schedule: Icons.ScheduleIcon,
  search: Icons.SearchIcon,
  settings: Icons.SettingsIcon,
  star: Icons.StarIcon,
  starOutline: Icons.StarOutlineIcon,
  target: Icons.TargetIcon,
  timeline: Icons.TimelineIcon,
  tools: Icons.ToolsIcon,
  tune: Icons.TuneIcon,
  walk: Icons.WalkIcon,
};
