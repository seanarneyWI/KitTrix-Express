# KitTrix Express Icons

## Design Concept

Icons blend **Concept 2 (Dual Timeline)** and **Concept 4 (Statistical Prediction)** to represent the Y/Ŷ statistical framework.

### Visual Elements

- **Blue solid line**: Y (Production/Actual reality)
- **Purple dashed line**: Ŷ (Scenarios/Predictions)
- **Data points**: Statistical prediction markers
- **Background**: Navy to purple gradient (#1e3a8a → #6b21a8)
- **Grid lines**: Subtle statistical graph aesthetic

## Files

### `icon-source.svg` (512x512)
- **Purpose**: High-resolution app icon, PWA icon, Apple Touch icon
- **Features**:
  - Detailed dual timeline chart
  - Y and Ŷ labels in corners
  - 6 data points per line
  - Subtle grid background
  - Rounded corners (80px radius)
- **Usage**:
  - Apple Touch icon
  - PWA install icon
  - Social media sharing
  - High-res displays

### `favicon.svg` (64x64)
- **Purpose**: Browser tab icon, bookmark icon
- **Features**:
  - Simplified dual lines (better at small sizes)
  - No text labels (too small to read)
  - Indicator dots at line ends
  - Smaller rounded corners (12px radius)
- **Usage**:
  - Browser favicon
  - Browser tabs
  - Bookmarks

## Color Palette

```css
/* Background Gradient */
--bg-start: #1e3a8a;  /* Navy blue */
--bg-end: #6b21a8;    /* Purple */

/* Y (Production) Line */
--y-blue: #3b82f6;
--y-blue-light: #60a5fa;

/* Ŷ (Scenarios) Line */
--yhat-purple: #a855f7;
--yhat-purple-light: #c084fc;

/* Grid lines */
--grid: rgba(255, 255, 255, 0.1);
```

## Alignment with App Design

The icons match the application's visual language:

- **Filter panel tabs**: "📋 Y (Production)" uses blue
- **Y Overlays tab**: "🔮 Ŷ (Scenarios)" uses purple
- **Job badges**: Purple dashed borders for Ŷ overlays
- **Documentation**: Y/Ŷ terminology throughout

## Scalability

Both icons are **vector SVG format** and scale perfectly to any size:

- **Favicon**: 16x16, 32x32, 64x64
- **Apple Touch**: 120x120, 152x152, 180x180
- **PWA Icons**: 192x192, 512x512, 1024x1024
- **High DPI displays**: Retina, 4K, etc.

## Browser Support

- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ iOS Safari (Apple Touch icon)
- ✅ Android Chrome (PWA manifest)
- ✅ Windows desktop (favicon)

## Future Enhancements

- [ ] Add maskable icon variant for Android adaptive icons
- [ ] Create monochrome version for dark/light mode switching
- [ ] Add animation for PWA splash screen
- [ ] Create social media share images (Open Graph, Twitter Card)

---

**Created**: November 16, 2025
**Design System**: Y/Ŷ Statistical Framework
**Format**: SVG (Scalable Vector Graphics)
