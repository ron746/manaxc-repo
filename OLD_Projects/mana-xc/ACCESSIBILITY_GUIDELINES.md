# Accessibility Guidelines - Mana XC

**Date:** October 21, 2025
**Purpose:** Ensure all pages are accessible for colorblind users

---

## Colorblind-Friendly Color Palette

### Primary Colors (USE THESE)

**Action/Interactive Elements:**
- **Primary**: `blue-800` (#1E40AF) - Dark blue for buttons, links, active states
- **Hover**: `blue-900` (#1E3A8A) - Darker blue for hover states
- **Background when active**: `blue-50` (#EFF6FF) - Very light blue background

**Highlights/Emphasis:**
- **Warning/Highlight**: `yellow-100` (#FEF3C7) - Light yellow background
- **Warning Border**: `yellow-500` (#EAB308) - Dark yellow border
- **Success/Positive**: `green-700` (#15803D) - Dark green (use sparingly)

**Neutral/Text:**
- **Headings**: `gray-900` (#111827) - Nearly black
- **Body Text**: `gray-800` (#1F2937) - Very dark gray
- **Secondary Text**: `gray-700` (#374151) - Dark gray
- **Muted Text**: `gray-600` (#4B5563) - Medium gray
- **Disabled**: `gray-400` (#9CA3AF) - Light gray

**Backgrounds:**
- **Page Background**: `gray-50` (#F9FAFB) - Very light gray
- **Card Background**: `white` (#FFFFFF)
- **Table Header**: `gray-100` (#F3F4F6) - Light gray
- **Hover Row**: `gray-100` (#F3F4F6)

### DO NOT USE (Problematic for Colorblindness)

❌ **Red** (red-600, red-700) - Invisible to some colorblind users
❌ **Green alone** without text labels - Confusing with red-green colorblindness
❌ **Light blue/pink** (blue-100, pink-100) - Low contrast
❌ **Orange/Red combinations** - Hard to distinguish

---

## Component-Specific Guidelines

### Buttons

**Primary Button:**
```tsx
className="bg-blue-800 text-white px-4 py-2 rounded font-medium hover:bg-blue-900 border-2 border-blue-800"
```

**Secondary Button:**
```tsx
className="bg-white text-gray-700 px-4 py-2 rounded font-medium border-2 border-gray-300 hover:border-gray-400"
```

**Danger/Delete Button:**
```tsx
className="bg-gray-700 text-white px-4 py-2 rounded font-medium hover:bg-gray-800 border-2 border-gray-700"
```

### Links

**Primary Link:**
```tsx
className="text-blue-800 hover:text-blue-900 font-semibold hover:underline"
```

**Breadcrumb Link:**
```tsx
className="text-gray-700 hover:text-blue-800 hover:underline"
```

### Tables

**Table Header:**
```tsx
<thead className="bg-gray-100">
  <tr className="border-b-2 border-gray-300">
    <th className="py-3 px-4 text-left text-xs font-bold text-gray-900 uppercase">
      Column Name
    </th>
  </tr>
</thead>
```

**Table Row (normal):**
```tsx
<tr className="hover:bg-gray-100">
  <td className="py-3 px-4 text-gray-900">Content</td>
</tr>
```

**Table Row (highlighted - top 7, etc.):**
```tsx
<tr className="bg-yellow-100 border-l-4 border-yellow-500 hover:bg-yellow-50">
  <td className="py-3 px-4 text-gray-900 font-bold">Content</td>
</tr>
```

### Navigation Tabs

**Active Tab:**
```tsx
<div className="px-6 py-4 text-sm font-bold text-gray-900 border-b-4 border-blue-800 bg-blue-50">
  Active Tab
</div>
```

**Inactive Tab:**
```tsx
<Link className="px-6 py-4 text-sm font-medium text-gray-700 hover:text-gray-900 border-b-4 border-transparent hover:border-gray-300">
  Inactive Tab
</Link>
```

### Filter Buttons

**Active Filter:**
```tsx
<button className="px-3 py-1 rounded text-sm font-medium bg-blue-800 text-white border-2 border-blue-800">
  Active
</button>
```

**Inactive Filter:**
```tsx
<button className="bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400">
  Inactive
</button>
```

### Info Boxes

**General Info:**
```tsx
<div className="bg-gray-100 border-2 border-gray-400 rounded-lg p-6">
  <h3 className="font-bold text-gray-900">Heading</h3>
  <p className="text-gray-800">Content</p>
</div>
```

**Warning/Important:**
```tsx
<div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
  <h3 className="font-bold text-gray-900">Warning</h3>
  <p className="text-gray-800">Important content</p>
</div>
```

### Badges/Pills

**Grade Badge:**
```tsx
<span className="px-3 py-1 rounded font-medium text-sm bg-gray-200 text-gray-900 border border-gray-400">
  12
</span>
```

**Status Badge (active):**
```tsx
<span className="px-3 py-1 rounded font-medium text-sm bg-green-100 text-green-900 border-2 border-green-600">
  Active
</span>
```

---

## Best Practices

### 1. Always Use Text + Visual Indicators

❌ **Bad:** Color alone
```tsx
<div className="bg-red-500">Error</div>
```

✅ **Good:** Color + icon/text
```tsx
<div className="bg-gray-100 border-2 border-gray-400">
  <strong>Error:</strong> Message here
</div>
```

### 2. Use High Contrast

- Text on background: Minimum 4.5:1 contrast ratio
- Large text (18px+): Minimum 3:1 contrast ratio
- Always use `gray-900` or `gray-800` for body text
- Never use `gray-500` or lighter for important text

### 3. Use Borders Generously

- All cards: 2px border (`border-2 border-gray-200`)
- All buttons: 2px border
- Highlighted rows: 4px left border (`border-l-4`)
- Active states: Thicker/darker borders

### 4. Use Font Weight for Emphasis

- Important text: `font-bold`
- Links: `font-semibold`
- Headers: `font-bold`
- Regular text: `font-medium` or default

### 5. Hover States Should Be Obvious

```tsx
className="hover:bg-gray-100 hover:underline"
```

Always combine:
- Background color change
- Border change
- Underline for links

---

## Testing Checklist

Before deploying any page, verify:

- [ ] No reliance on red/green color alone
- [ ] All interactive elements have visible borders
- [ ] Highlighted items use yellow background + border
- [ ] All text is gray-800 or darker
- [ ] All buttons have 2px borders
- [ ] Links are underlined on hover
- [ ] Active states are clearly different (not just color)
- [ ] Info boxes use gray/yellow, not blue/red
- [ ] Tables have clear row separators
- [ ] No light pastels (blue-100, pink-100, etc.)

---

## Example Component

```tsx
// Accessible Team Table Row
<tr className={`
  hover:bg-gray-100
  transition-colors
  ${isTopSeven ? 'bg-yellow-100 border-l-4 border-yellow-500' : ''}
`}>
  <td className="py-3 px-4 text-gray-700 font-bold">
    {rank}
  </td>
  <td className="py-3 px-4">
    <Link
      href={`/athletes/${id}`}
      className="text-blue-800 hover:text-blue-900 font-semibold hover:underline"
    >
      {name}
    </Link>
  </td>
  <td className="py-3 px-4">
    <span className="px-3 py-1 rounded font-medium text-sm bg-gray-200 text-gray-900 border border-gray-400">
      {grade}
    </span>
  </td>
  <td className="py-3 px-4 font-mono font-bold text-gray-900">
    {time}
  </td>
</tr>
```

---

## Resources

- **WCAG 2.1 AA Standards**: https://www.w3.org/WAI/WCAG21/quickref/
- **Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **Colorblind Simulator**: https://www.color-blindness.com/coblis-color-blindness-simulator/

---

## Summary

**Color Palette:**
- Primary: Blue-800 (dark blue)
- Highlight: Yellow-100 + Yellow-500 border
- Text: Gray-900, Gray-800, Gray-700
- Backgrounds: Gray-50, White, Gray-100

**Key Rules:**
1. No red or light colors
2. All borders 2px minimum
3. High contrast text (gray-800+)
4. Yellow for highlights
5. Blue for actions
6. Font weight for emphasis

**Apply these guidelines to ALL pages going forward!**
