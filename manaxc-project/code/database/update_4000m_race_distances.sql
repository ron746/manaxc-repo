-- Update 8 races from meet d556ac63-9beb-4da0-889e-1b58e67420ac to have distance_meters = 4000
-- All races are "4,000 Meters" events that were incorrectly set to 0

UPDATE races
SET distance_meters = 4000
WHERE id IN (
    'c81c8281-39f3-4ce0-8943-262dc17c4dfe', -- Mens 4,000 Meters Freshmen
    '75941ccf-d59d-42c2-9ed1-13c2d2413875', -- Mens 4,000 Meters Sophomore
    '07a09763-086a-472c-aa0b-de8393d72912', -- Womens 4,000 Meters Freshmen
    '6cfde952-8a7a-446e-ad19-f7f13547d57b', -- Womens 4,000 Meters Sophomore
    'e3e546c5-1b9a-46b3-92de-5a0be3abbb93', -- Mens 4,000 Meters Junior
    '9910b8ee-e65b-4907-bc97-4fc8694e8134', -- Womens 4,000 Meters Junior
    '3c42b260-2868-4b32-a8e3-5ccb4d458678', -- Womens 4,000 Meters Senior
    '8e5cd45a-0ee2-49ae-bcc0-20e9b97f9f3c'  -- Mens 4,000 Meters Senior
);

-- Verify the update
SELECT
    id,
    name,
    distance_meters,
    athletic_net_race_id
FROM races
WHERE id IN (
    'c81c8281-39f3-4ce0-8943-262dc17c4dfe',
    '75941ccf-d59d-42c2-9ed1-13c2d2413875',
    '07a09763-086a-472c-aa0b-de8393d72912',
    '6cfde952-8a7a-446e-ad19-f7f13547d57b',
    'e3e546c5-1b9a-46b3-92de-5a0be3abbb93',
    '9910b8ee-e65b-4907-bc97-4fc8694e8134',
    '3c42b260-2868-4b32-a8e3-5ccb4d458678',
    '8e5cd45a-0ee2-49ae-bcc0-20e9b97f9f3c'
)
ORDER BY name;

-- Summary
SELECT
    'Updated 8 races to distance_meters = 4000' as status,
    COUNT(*) as affected_races
FROM races
WHERE id IN (
    'c81c8281-39f3-4ce0-8943-262dc17c4dfe',
    '75941ccf-d59d-42c2-9ed1-13c2d2413875',
    '07a09763-086a-472c-aa0b-de8393d72912',
    '6cfde952-8a7a-446e-ad19-f7f13547d57b',
    'e3e546c5-1b9a-46b3-92de-5a0be3abbb93',
    '9910b8ee-e65b-4907-bc97-4fc8694e8134',
    '3c42b260-2868-4b32-a8e3-5ccb4d458678',
    '8e5cd45a-0ee2-49ae-bcc0-20e9b97f9f3c'
)
AND distance_meters = 4000;
