CREATE INDEX IF NOT EXISTS idx_personal_media_free_image
    ON personal_media_uploads(uploaded_by, content_type, charged_amount, uploaded_at DESC);
