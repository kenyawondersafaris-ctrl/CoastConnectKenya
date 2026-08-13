ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS preparation_minutes INTEGER;

ALTER TABLE menu_items
ADD CONSTRAINT menu_items_preparation_minutes_check
CHECK (
  preparation_minutes IS NULL
  OR preparation_minutes >= 0
);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_category
ON menu_items(restaurant_id, category);

CREATE INDEX IF NOT EXISTS idx_menu_items_featured
ON menu_items(restaurant_id, is_featured);

CREATE INDEX IF NOT EXISTS idx_menu_items_display_order
ON menu_items(restaurant_id, display_order);