# Public Assets Directory

This directory contains static assets that are served directly by Next.js.

## Directory Structure

### `/images/`
- **`ui/`** - UI components, buttons, icons, and interface elements
- **`avatars/`** - User profile pictures and avatar images
- **`logos/`** - Company logos, brand assets, and branding materials
- **`backgrounds/`** - Background images, patterns, and textures
- **`illustrations/`** - Illustrations, graphics, and visual elements

### `/icons/`
- **`favicons/`** - Favicon files (favicon.ico, apple-touch-icon.png, etc.)
- **`app-icons/`** - Application icons for PWA, mobile apps, and desktop
- **`social/`** - Social media icons and sharing images

## Usage

### In Components
```tsx
// Using Next.js Image component (recommended)
import Image from 'next/image'

<Image
  src="/images/ui/button-icon.svg"
  alt="Button icon"
  width={24}
  height={24}
/>

// Direct path reference
<img src="/images/logos/company-logo.png" alt="Company Logo" />
```

### Favicon Setup
Place favicon files in `/icons/favicons/` and reference them in your app layout:

```tsx
// In app/layout.tsx
export const metadata = {
  icons: {
    icon: '/icons/favicons/favicon.ico',
    apple: '/icons/favicons/apple-touch-icon.png',
  },
}
```

## File Naming Conventions

- Use kebab-case for file names: `user-avatar.png`
- Include size in filename for multiple sizes: `logo-32x32.png`, `logo-64x64.png`
- Use descriptive names: `interview-background.jpg`
- Include format in name when multiple formats exist: `icon-light.svg`, `icon-dark.svg`

## Optimization

- Use WebP format for photos when possible
- Use SVG for icons and simple graphics
- Compress images before adding to this directory
- Consider using Next.js Image component for automatic optimization
