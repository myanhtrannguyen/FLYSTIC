-- Preserve the original station identifier and its existing collection history.
UPDATE stations
SET
  name = 'Trung tâm Đổi mới Sáng tạo - Đại học Bách khoa Hà Nội',
  address = 'Tòa nhà C7, Đại học Bách khoa Hà Nội'
WHERE id = 'innovation-center';

INSERT OR IGNORE INTO stations (
  id, name, address, latitude, longitude, capacity_kg, created_at
) VALUES (
  'mechanical-c7',
  'Trường Cơ khí',
  'Tòa C7, Đại học Bách khoa Hà Nội',
  NULL,
  NULL,
  25,
  unixepoch() * 1000
);
