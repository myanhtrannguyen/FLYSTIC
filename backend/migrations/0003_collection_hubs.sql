UPDATE stations
SET
  name = 'Trường Cơ khí',
  address = 'Tòa C7, Đại học Bách khoa Hà Nội'
WHERE id = 'innovation-center';

INSERT OR IGNORE INTO stations (
  id, name, address, latitude, longitude, capacity_kg, created_at
) VALUES
  (
    'soict-b1',
    'Trường Công nghệ Thông tin và Truyền thông',
    'Tòa B1, Đại học Bách khoa Hà Nội',
    NULL,
    NULL,
    25,
    unixepoch() * 1000
  ),
  (
    'chem-life-c3',
    'Trường Hóa và Khoa học Sự sống',
    'Tòa C3, Đại học Bách khoa Hà Nội',
    NULL,
    NULL,
    25,
    unixepoch() * 1000
  );
