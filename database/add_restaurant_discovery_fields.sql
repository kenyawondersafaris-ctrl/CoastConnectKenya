ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS slug VARCHAR(180);

ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS cuisines TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurants_slug
ON restaurants(slug)
WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_restaurants_approval_status
ON restaurants(approval_status);

CREATE INDEX IF NOT EXISTS idx_restaurants_average_rating
ON restaurants(average_rating);

CREATE INDEX IF NOT EXISTS idx_restaurants_price_range
ON restaurants(price_range);

CREATE INDEX IF NOT EXISTS idx_restaurants_cuisines
ON restaurants USING GIN(cuisines);