import type { SvgIconProps } from '@mui/material/SvgIcon';
import type { ItemCategory } from '@lupira/maps-api/models';
import { ICON_BY_NAME, ITEM_CATEGORY_ICONS } from '../theme/kinds';

export function CategoryIcon({ category, ...props }: { category?: ItemCategory | null } & SvgIconProps) {
  const Icon = ICON_BY_NAME[category ? ITEM_CATEGORY_ICONS[category] : 'event'];
  return <Icon fontSize="small" {...props} />;
}
