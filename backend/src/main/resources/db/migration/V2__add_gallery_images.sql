CREATE TABLE IF NOT EXISTS gallery_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(120) NOT NULL,
    category VARCHAR(60),
    image_url VARCHAR(500) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gallery_images_active_sort ON gallery_images(active, sort_order, created_at DESC);

DROP TRIGGER IF EXISTS trg_gallery_images_updated_at ON gallery_images;
CREATE TRIGGER trg_gallery_images_updated_at BEFORE UPDATE ON gallery_images
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
