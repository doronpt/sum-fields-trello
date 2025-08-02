# Sum Up Fields - Trello Power-Up

A Trello Power-Up that allows you to create custom numeric fields for cards and automatically calculates sums per list.

## Features

- **Custom Numeric Fields**: Create multiple numeric fields (e.g., Points, Hours, Cost) that are available for all cards on the board
- **Automatic Sum Calculation**: Automatically calculates the sum of field values for each list
- **Real-time Updates**: Sums update automatically when:
  - Cards are moved between lists
  - Field values are changed
  - New cards are created
  - Cards are archived or deleted
- **Visual Display**: Sums are displayed as badges on the first card of each list with a ∑ symbol
- **Individual Card Values**: Regular cards show their individual field values as blue badges

## Installation

### Development Setup

1. Clone or download this repository
2. Host the files on a web server (can be local for development)
3. In Trello, go to a board and click "Power-Ups" in the menu
4. Click "Custom Power-Up" 
5. Enter the URL to your `manifest.json` file
6. Enable the Power-Up

### Production Deployment

For production use, deploy the files to a web server with HTTPS enabled.

## Usage

### 1. Create Fields

1. Open any Trello board with the Power-Up enabled
2. Go to Board Menu → Power-Ups → Find "Sum Up Fields" → Click "Settings"
3. Enter a field name (e.g., "Story Points", "Hours", "Cost")
4. Click "Add Field"
5. Repeat for additional fields

### 2. Set Field Values on Cards

1. Open any card (except the first card in each list)
2. Click the "Edit Field Values" button
3. Enter numeric values for each field
4. Click "Save Values"

### 3. View Sums

- The first card in each list will automatically display the sum of all field values for that list
- Sums are shown as green badges with the ∑ symbol
- Individual cards show their field values as blue badges

## File Structure

```
SumUpFieldsTrello/
├── manifest.json           # Power-Up configuration
├── index.html              # Main Power-Up entry point
├── settings.html           # Power-Up settings page (field management)
├── edit-values.html        # Card value editing interface
├── css/
│   └── styles.css          # Styling for all interfaces
├── icons/
│   ├── sum-icon.svg        # Sum symbol (∑) icons for light/dark themes
│   ├── edit-icon.svg       # Edit/pencil icons for light/dark themes
│   └── README.md           # Icon documentation
└── js/
    └── powerup.js          # Main Power-Up logic
```

## Technical Details

### Data Storage

- **Fields Configuration**: Stored at board level using key `sumup_fields`
- **Card Field Values**: Stored at card level using key `sumup_field_values`
- **Sum Display**: Stored at card level using key `sum_display` (for first cards only)

### Event Handling

The Power-Up listens for the following Trello events:
- `moveCard`: When cards are moved between lists
- `updateCard`: When card details are changed
- `addCard`: When new cards are created
- `removeCard`: When cards are archived/deleted

### Auto-Update System

- Real-time event handlers update sums immediately when changes occur
- Periodic background updates every 10 seconds when the board is active
- Initial calculation when the Power-Up loads

## Customization

### Adding New Field Types

To add support for different field types (e.g., dropdown, text), modify:
1. `manage-fields.html` - Add field type selection
2. `edit-values.html` - Add appropriate input controls
3. `powerup.js` - Update calculation logic

### Styling

Customize the appearance by modifying `css/styles.css`. The CSS uses Trello's design system colors and conventions.

### Sum Display Location

Currently sums are displayed on the first card of each list. To change this:
1. Modify the `updateListSums()` function in `powerup.js`
2. Update the `getCardBadges()` function logic
3. Consider using list-level storage instead of card-level

## Browser Support

This Power-Up works in all modern browsers that support:
- ES5 JavaScript
- CSS3
- Trello Power-Up API

## Troubleshooting

### Sums Not Updating
- Check browser console for JavaScript errors
- Ensure the Power-Up has proper permissions
- Try refreshing the board

### Fields Not Saving
- Verify you have edit permissions on the board
- Check that field names are unique
- Ensure the Power-Up is properly enabled

### Performance Issues
- The Power-Up updates automatically; avoid manual refresh
- Large boards with many cards may have slight delays in calculation

## Support

For issues or feature requests, please check the browser console for error messages and ensure all files are properly hosted and accessible.