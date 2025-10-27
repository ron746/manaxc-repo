// lib/admin/import-utils.ts

interface ParsedResult {
  first_name: string;
  last_name: string;
  school_name: string;
  time_cs: number | null;
  place_overall: number | null;
  gender: boolean | null;
  grade: number | null;
  ath_net_id: string | null;
  bib_number: string | null;
  race_category: string | null;
}

interface RaceGroup {
  name: string;
  gender: 'M' | 'F' | 'Unknown';
  category: string;
  resultsCount: number;
  parsedResults: ParsedResult[];
}

/**
 * Groups parsed results by race category and gender
 * Uses the race_category field from CSV to intelligently detect separate races
 */
export function groupParsedResults(results: ParsedResult[]): RaceGroup[] {
  // Group by race_category + gender combination
  const groups: Record<string, ParsedResult[]> = {};
  
  results.forEach(result => {
    // Create a unique key for each race group
    const category = result.race_category || 'Unknown Race';
    const genderStr = result.gender === true ? 'M' : result.gender === false ? 'F' : 'U';
    const key = `${category}|${genderStr}`;
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(result);
  });
  
  // Convert to RaceGroup array
  const raceGroups: RaceGroup[] = Object.entries(groups).map(([key, results]) => {
    const [category, genderStr] = key.split('|');
    
    // Determine gender
    let gender: 'M' | 'F' | 'Unknown' = 'Unknown';
    if (genderStr === 'M') gender = 'M';
    else if (genderStr === 'F') gender = 'F';
    
    // Create a friendly race name from the category
    // e.g., "2.74 Miles Varsity" + "Boys" = "Varsity Boys 2.74 Miles"
    let raceName = category;
    if (category.toLowerCase().includes('varsity')) {
      raceName = gender === 'M' ? 'Varsity Boys' : gender === 'F' ? 'Varsity Girls' : category;
    } else if (category.toLowerCase().includes('junior varsity') || category.toLowerCase().includes('jv')) {
      raceName = gender === 'M' ? 'JV Boys' : gender === 'F' ? 'JV Girls' : category;
    } else if (category.toLowerCase().includes('reserves') || category.toLowerCase().includes('frosh')) {
      raceName = gender === 'M' ? 'Reserves Boys' : gender === 'F' ? 'Reserves Girls' : category;
    }
    
    return {
      name: raceName,
      gender,
      category,
      resultsCount: results.length,
      parsedResults: results
    };
  });
  
  // Sort by category (Varsity first, then JV, then others) and gender (Boys first)
  raceGroups.sort((a, b) => {
    // Varsity > JV > Reserves > Others
    const categoryOrder: Record<string, number> = {
      'varsity': 1,
      'junior varsity': 2,
      'jv': 2,
      'reserves': 3,
      'frosh': 4
    };
    
    const aOrder = Object.keys(categoryOrder).find(k => a.category.toLowerCase().includes(k));
    const bOrder = Object.keys(categoryOrder).find(k => b.category.toLowerCase().includes(k));
    
    const aValue = aOrder ? categoryOrder[aOrder] : 99;
    const bValue = bOrder ? categoryOrder[bOrder] : 99;
    
    if (aValue !== bValue) return aValue - bValue;
    
    // If same category, boys before girls
    if (a.gender === 'M' && b.gender === 'F') return -1;
    if (a.gender === 'F' && b.gender === 'M') return 1;
    
    return 0;
  });
  
  return raceGroups;
}
