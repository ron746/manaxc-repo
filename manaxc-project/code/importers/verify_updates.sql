-- Verify BVAL schools were updated
SELECT 
  'BVAL Schools' as category,
  COUNT(*) as count
FROM schools 
WHERE league = 'BVAL';

-- Verify CCS schools were updated  
SELECT 
  'CCS Schools' as category,
  COUNT(*) as count
FROM schools 
WHERE cif_section = 'CCS';

-- Show breakdown by division
SELECT 
  cif_division,
  COUNT(*) as school_count
FROM schools
WHERE cif_section = 'CCS'
GROUP BY cif_division
ORDER BY cif_division;

-- Show sample BVAL schools
SELECT name, league, cif_division, cif_section
FROM schools
WHERE league = 'BVAL'
ORDER BY name
LIMIT 10;

-- Show Westmont specifically
SELECT name, short_name, league, cif_division, cif_section, city
FROM schools
WHERE name ILIKE '%Westmont%' OR short_name ILIKE '%Westmont%';
