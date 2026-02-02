
# Complete App Store Review Fix Plan

## Overview

This plan addresses both App Store rejection issues:
1. **Guideline 2.3.2** - Promotional image must be unique (not the app icon)
2. **Guideline 3.1.1** - Missing "Restore Purchases" button

---

## Part 1: Generate Promotional Image (Guideline 2.3.2)

### Image Requirements
- **Size**: 1024x1024 pixels
- **Content**: Must represent the Hexology+ subscription benefits
- **Style**: Must be distinct from the app icon

### Image Design Concept

The promotional image will feature:
- Dark purple/indigo gradient background (matching premium Galaxy skin colors)
- A stylized hex board with glowing premium skin colors
- Golden "Hexology+" text with crown icon
- Visual elements representing premium features:
  - Premium board skin colors (Galaxy: blue/pink, Royal: gold/purple)
  - Subtle sparkle/glow effects
  - "PLUS" badge treatment

### Image Generation Prompt

```text
Generate a 1024x1024 promotional image for a premium subscription called "Hexology+".
The image should feature:
- Dark cosmic purple background with subtle star effects
- A stylized hexagonal game board in the center with glowing hexagons
- Premium color scheme: deep purples, cosmic blues, and golden accents
- "Hexology+" text prominently displayed with a small golden crown
- Glowing edge effects around the hexagons
- Modern, premium, gaming aesthetic
- NO text except "Hexology+"
- Style should feel luxurious and exclusive
```

### Delivery

The generated image will be saved to `public/hexology-plus-promo.png` for your reference. You'll then upload it manually to App Store Connect:

**Upload Steps:**
1. Go to App Store Connect → Your App → Features → In-App Purchases
2. Select "hexology_plus_monthly" subscription
3. Under "Promotional Image", click to replace
4. Upload the generated 1024x1024 image
5. Save changes

---

## Part 2: Add Restore Purchases Button (Guideline 3.1.1)

### Current State Analysis

The native app (`App.native.tsx`) already has restore functionality implemented:
- Line 89-95: Handles `RESTORE_PURCHASES` message type
- Line 107-109: Injects `triggerNativeRestore()` function into WebView

The web app (`Premium.tsx`) is missing:
- A visible "Restore Purchases" button
- An event listener for `iap-restore` event
- State management for restore process

### Implementation Details

#### File: `src/pages/Premium.tsx`

**1. Add restore state (after line 27):**
```typescript
const [restoring, setRestoring] = useState(false);
```

**2. Add RotateCcw icon to imports (line 3):**
```typescript
import { ArrowLeft, Check, Crown, ..., RotateCcw } from 'lucide-react';
```

**3. Add restore handler function (after line 98):**
```typescript
const handleNativeRestore = () => {
  setRestoring(true);
  const win = window as unknown as { triggerNativeRestore?: () => void };
  if (win.triggerNativeRestore) {
    win.triggerNativeRestore();
  } else {
    toast.error('Restore not available');
    setRestoring(false);
  }
};
```

**4. Add iap-restore event listener (inside existing useEffect, after line 86):**
```typescript
const handleRestore = (e: Event) => {
  setRestoring(false);
  const detail = (e as CustomEvent).detail;
  
  if (detail && Array.isArray(detail) && detail.length > 0) {
    // Check if any purchase matches our subscription
    const hasSubscription = detail.some(
      (purchase: { productId?: string }) => 
        purchase.productId === 'hexology_plus_monthly'
    );
    
    if (hasSubscription) {
      toast.success('Subscription restored successfully!');
      window.location.reload();
    } else {
      toast.info('No active Hexology+ subscription found');
    }
  } else {
    toast.info('No previous purchases found');
  }
};

window.addEventListener('iap-restore', handleRestore);
```

**5. Update cleanup in useEffect return (line 88-91):**
```typescript
return () => {
  window.removeEventListener('iap-success', handleSuccess);
  window.removeEventListener('iap-error', handleError);
  window.removeEventListener('iap-restore', handleRestore);
};
```

**6. Add Restore Purchases button in UI (after line 214, inside the `!isPremium` block):**
```tsx
{isIOS && (
  <Button
    onClick={handleNativeRestore}
    disabled={restoring}
    variant="ghost"
    className="w-full text-sm text-muted-foreground hover:text-foreground"
  >
    <RotateCcw className={cn("h-4 w-4 mr-2", restoring && "animate-spin")} />
    {restoring ? 'Restoring...' : 'Restore Purchases'}
  </Button>
)}
```

### UI Layout After Changes

```text
┌────────────────────────────────────────────┐
│     Subscribe via App Store                │  ← Primary CTA (iOS)
├────────────────────────────────────────────┤
│     Or Subscribe via Stripe                │  ← Alternative (Web)
├────────────────────────────────────────────┤
│  ↻  Restore Purchases                      │  ← NEW (iOS only)
└────────────────────────────────────────────┘
```

---

## Part 3: Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Premium.tsx` | Add restore button, handler, event listener, state |
| `public/hexology-plus-promo.png` | NEW: Generated promotional image |

---

## Part 4: Testing Checklist

### Restore Purchases Button
- [ ] Button only appears on iOS native app (not on web)
- [ ] Tapping button shows loading spinner
- [ ] Successful restore shows success toast and reloads
- [ ] No purchases found shows info toast
- [ ] Error cases handled gracefully

### Promotional Image
- [ ] Image is 1024x1024 pixels
- [ ] Image is visually distinct from app icon
- [ ] Image represents Hexology+ premium features
- [ ] Successfully uploaded to App Store Connect

---

## Part 5: App Store Connect Steps (Manual)

After implementation:

1. **Build & Submit**
   - Export to GitHub
   - Run `npx cap sync ios`
   - Build in Xcode
   - Archive and upload to App Store Connect

2. **Update Promotional Image**
   - Navigate to: App Store Connect → Hexology → Features → In-App Purchases
   - Select: hexology_plus_monthly
   - Replace promotional image with the generated `hexology-plus-promo.png`
   - Save

3. **Resubmit for Review**
   - Submit the new build with the code fix
   - Ensure promotional image is updated
   - Reply to the review message explaining changes made

---

## Summary

This plan fully addresses both rejection reasons:

| Issue | Solution |
|-------|----------|
| Guideline 2.3.2 (Promotional Image) | Generate unique 1024x1024 image featuring Hexology+ branding and premium features |
| Guideline 3.1.1 (Restore Purchases) | Add visible "Restore Purchases" button on iOS with proper event handling |

Both changes are minimal and focused, reducing risk of introducing new issues.
