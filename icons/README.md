# Icons for Sum Up Fields Power-Up

This folder contains SVG icons used in the Trello Power-Up.

## Available Icons

### Sum Icon (∑ symbol)
- `sum-icon.svg` - Generic version with currentColor
- `sum-icon-light.svg` - Dark text for light backgrounds  
- `sum-icon-dark.svg` - White text for dark backgrounds

### Edit Icon (pencil/edit symbol)
- `edit-icon.svg` - Generic version with currentColor
- `edit-icon-light.svg` - Dark lines for light backgrounds
- `edit-icon-dark.svg` - White lines for dark backgrounds

## Usage in Power-Up

Icons are referenced in the Power-Up JavaScript as:
```javascript
icon: {
  dark: './icons/edit-icon-dark.svg',
  light: './icons/edit-icon-light.svg'
}
```

## Icon URLs

When deployed to GitHub Pages, icons are accessible at:
- `https://yourusername.github.io/repo-name/icons/sum-icon.svg`
- `https://yourusername.github.io/repo-name/icons/edit-icon.svg`
- etc.

All icons are 24x24px SVG format optimized for Trello's interface.