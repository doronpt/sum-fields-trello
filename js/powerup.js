// =============================================================================
// SUM UP FIELDS POWER-UP v1.1.0
// =============================================================================
// 
// This Trello Power-Up adds custom numeric fields to cards and automatically
// calculates sums per list. Here's how it works:
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// 1. FIELD MANAGEMENT: Users create custom fields (Story Points, Hours, etc.)
//    - Fields are stored at board level in Trello storage
//    - Each field has: id, name, and created timestamp
//
// 2. VALUE STORAGE: Each card stores its field values independently
//    - Values are stored at card level in Trello storage
//    - Format: { fieldId1: value1, fieldId2: value2, ... }
//
// 3. SUM CALCULATION: Sums are calculated dynamically for each list
//    - Only the FIRST card in each list shows sum badges
//    - Sums include values from all other cards in the same list
//    - Performance optimized with timeouts and card limits
//
// 4. BADGE DISPLAY: Two types of badges are shown
//    - RED badges: Individual card values (e.g., "Story Points: 5")
//    - GREEN badges: List sums (e.g., "∑ Story Points: 15")
//
// 5. REAL-TIME UPDATES: Dynamic badges refresh every 15 seconds
//    - Automatic recalculation when cards move or values change
//    - Timeout protection prevents hanging on slow operations
//
// TRELLO POWER-UP CAPABILITIES USED:
// -----------------------------------
// - show-settings: Field management interface
// - card-buttons: "Edit Field Values" button on cards
// - card-detail-badges: Badges shown in card detail view
// - card-badges: Main badges shown on board view (with dynamic refresh)
//
// =============================================================================

console.log('Sum Up Fields Power-Up loading...');

// Storage keys used to store data in Trello's storage system
const FIELDS_KEY = 'sumup_fields';          // Board-level: stores field definitions (name, id, etc.)
const FIELD_VALUES_KEY = 'sumup_field_values'; // Card-level: stores the actual numeric values

// Initialize the Power-Up with all its capabilities
TrelloPowerUp.initialize({
    
    // BOARD BUTTONS: Buttons that appear in the board menu
    // Currently not used - returns empty array to disable
    'board-buttons': function(t, options) {
        return [];
    },

    // CARD BACK SECTION: Additional sections on the back of cards
    // Currently not used - returns empty array to disable
    'card-back-section': function(t, options) {
        return [];
    },

    // SETTINGS: Shows when user clicks "Settings" for this Power-Up
    // Opens a popup with the settings interface for managing fields
    'show-settings': function(t, options) {
        return t.popup({
            title: 'Sum Up Fields Settings',
            url: './settings.html',    // Opens settings.html in a popup
            height: 500
        });
    },

    // CARD BUTTONS: Buttons that appear on individual cards
    // Shows "Edit Field Values" button only if fields are configured
    'card-buttons': function(t, options) {
        // Create timeout promise to prevent hanging if storage is slow
        const timeoutPromise = new Promise(function(resolve) {
            setTimeout(function() { resolve([]); }, 2000);
        });

        // Get the configured fields from board storage
        const buttonsPromise = t.get('board', 'shared', FIELDS_KEY)
            .then(function(fields) {
                // If no fields are configured, don't show any buttons
                if (!fields || fields.length === 0) {
                    return [];
                }

                // Return the "Edit Field Values" button
                return [{
                    icon: {
                        dark: './icons/edit-icon-dark.svg',   // Icon for dark theme
                        light: './icons/edit-icon-light.svg' // Icon for light theme
                    },
                    text: 'Edit Field Values',
                    callback: function(t) {
                        // When clicked, open the edit values popup
                        return t.popup({
                            title: 'Edit Field Values',
                            url: './edit-values.html',  // Opens edit interface
                            height: 300
                        });
                    }
                }];
            })
            .catch(function(error) {
                console.error('Error in card-buttons:', error);
                return [];
            });

        // Use Promise.race to ensure we don't wait too long
        return Promise.race([buttonsPromise, timeoutPromise]);
    },

    // CARD DETAIL BADGES: Badges shown when viewing card details (back of card)
    // Shows all field values as clickable badges in the card detail view
    'card-detail-badges': function(t, options) {
        // Create timeout promise to prevent hanging
        const timeoutPromise = new Promise(function(resolve) {
            setTimeout(function() { resolve([]); }, 2000);
        });

        // Get fields and create detail badges
        const detailBadgesPromise = t.get('board', 'shared', FIELDS_KEY)
            .then(function(fields) {
                // If no fields configured, return empty array
                if (!fields || fields.length === 0) {
                    return [];
                }

                // Get this card's field values
                return t.get('card', 'shared', FIELD_VALUES_KEY)
                    .then(function(values) {
                        values = values || {};  // Default to empty object if no values
                        const badges = [];

                        // Create a badge for each configured field
                        fields.forEach(function(field) {
                            const value = values[field.id] || 0;  // Get value or default to 0
                            badges.push({
                                title: field.name,
                                text: field.name + ': ' + value,
                                color: 'red',  // Red color for individual values
                                callback: function (t) {
                                    // When clicked, open edit interface for this field
                                    return t.popup({
                                        title: 'Edit ' + field.name,
                                        url: './edit-values.html',
                                        height: 300
                                    });
                                }
                            });
                        });

                        return badges;
                    });
            })
            .catch(function(error) {
                console.error('Error in card-detail-badges:', error);
                return [];
            });

        return Promise.race([detailBadgesPromise, timeoutPromise]);
    },

    // CARD BADGES: Small badges shown on cards in the board view
    // This is where the main functionality happens - shows individual values and sums
    'card-badges': function (t, options) {
        // Create timeout promise to prevent hanging
        const timeoutPromise = new Promise(function(resolve) {
            setTimeout(function() { resolve([]); }, 2000);
        });

        // Get configured fields and create dynamic badges
        const dynamicBadgesPromise = t.get('board', 'shared', FIELDS_KEY)
            .then(function(fields) {
                // If no fields configured, return empty array
                if (!fields || fields.length === 0) {
                    return [];
                }

                // Create a dynamic badge for each field
                // Dynamic badges automatically refresh at specified intervals
                return fields.map(function(field) {
                    return {
                        // Dynamic badge: Trello will call this function repeatedly
                        // to refresh the badge content automatically
                        dynamic: function () {
                            return getCardBadgeForField(t, options, field)
                                .then(function(badge) {
                                    if (badge) {
                                        // Add refresh interval to the badge
                                        return Object.assign(badge, {
                                            refresh: 5  // Refresh every 15 seconds (minimum is 10)
                                        });
                                    }
                                    return null;  // Don't show badge if no content
                                })
                                .catch(function(error) {
                                    console.warn('Error in dynamic badge for field', field.name, error);
                                    return null;
                                });
                        }
                    };
                });
            })
            .catch(function(error) {
                console.error('Error in card-badges:', error);
                return [];
            });

        return Promise.race([dynamicBadgesPromise, timeoutPromise]);
    }
}, {
    // Power-Up configuration options
    // appKey and appName can be declared here if you have them registered with Trello
    // appKey: 'your-app-key',
    // appName: 'Sum Up Fields'
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Generate a unique ID for new fields
// Creates a random string starting with underscore (to avoid conflicts)
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// Calculate the sum of field values for all cards in the same list
// This function determines if the current card should show sum badges
// Returns sums object if this is the first card, null otherwise
function calculateListSum(t) {
    // Set up timeout protection to prevent the function from hanging
    const timeoutPromise = new Promise(function(resolve) {
        setTimeout(function() {
            resolve(null);  // Return null if timeout is reached
        }, 3000); // 3 second timeout
    });

    // Main calculation logic wrapped in a promise
    const calculationPromise = Promise.all([
        t.card('id', 'idList'),              // Get current card ID and list ID
        t.cards('id', 'idList', 'name', 'pos'), // Get all cards on the board
        t.get('board', 'shared', FIELDS_KEY)     // Get configured fields
    ]).then(function(results) {
        const currentCard = results[0];  // Current card being processed
        const allCards = results[1];     // All cards on the board
        const fields = results[2];       // Configured field definitions

        // If no fields are configured, don't calculate anything
        if (!fields || fields.length === 0) {
            return null;
        }

        // Filter to get only cards in the same list as current card
        // Then sort by position to determine which is first
        const listCards = allCards
            .filter(function(card) {
                return card.idList === currentCard.idList;  // Same list only
            })
            .sort(function(a, b) {
                return a.pos - b.pos;  // Sort by position (ascending)
            });

        // Check if the current card is the first card in the list
        // Only the first card shows sum badges
        const isFirstCard = listCards.length > 0 && listCards[0].id === currentCard.id;

        if (!isFirstCard) {
            return null;  // Not first card, don't show sums
        }

        // Initialize sum totals for each field
        const sums = {};
        fields.forEach(function(field) {
            sums[field.id] = 0;  // Start each field sum at 0
        });

        // Get cards to sum (all cards except the first one)
        const cardsToSum = listCards.slice(1);
        
        // Limit to 20 cards to prevent timeout and performance issues
        const limitedCards = cardsToSum.slice(0, 20);
        
        // Create promises to get field values from each card
        const promises = limitedCards.map(function(card) {
            return t.get(card.id, 'shared', FIELD_VALUES_KEY)  // Get card's field values
                .then(function(values) {
                    if (values) {
                        // Add each field's value to the running sum
                        fields.forEach(function(field) {
                            const fieldValue = parseFloat(values[field.id]) || 0;
                            sums[field.id] += fieldValue;
                        });
                    }
                })
                .catch(function(error) {
                    // Log warning but continue processing other cards
                    console.warn('Error getting values for card', card.id, error);
                });
        });

        // Wait for all card values to be retrieved and summed
        return Promise.all(promises).then(function() {
            return sums;  // Return the calculated sums
        });
    }).catch(function(error) {
        console.error('Error calculating list sum:', error);
        return null;
    });

    // Return whichever promise resolves first (calculation or timeout)
    return Promise.race([calculationPromise, timeoutPromise]);
}

// Get the appropriate badge for a specific field on a specific card
// Returns either an individual value badge OR a sum badge (for first card)
// This is called by the dynamic badge system for each field
function getCardBadgeForField(t, options, field) {
    // Set up timeout protection
    const timeoutPromise = new Promise(function(resolve) {
        setTimeout(function() {
            resolve(null);  // Return null if timeout
        }, 3000); // 3 second timeout
    });

    // Main badge logic
    const badgePromise = t.get('card', 'shared', FIELD_VALUES_KEY)  // Get this card's values
        .then(function(values) {
            values = values || {};  // Default to empty object
            const value = values[field.id] || 0;  // Get value for this specific field

            // PRIORITY 1: Show individual value if card has a value for this field
            if (value > 0) {
                return {
                    text: field.name + ': ' + value,  // e.g., "Story Points: 5"
                    color: 'red'  // Red color for individual card values
                };
            }

            // PRIORITY 2: If no individual value, check if this card should show sum
            // This calls calculateListSum which determines if this is the first card
            return calculateListSum(t)
                .then(function(sums) {
                    // If sums were calculated (meaning this is first card) and there's a sum
                    if (sums && sums[field.id]) {
                        const sum = sums[field.id] || 0;
                        if (sum > 0) {
                            return {
                                text: '∑ ' + field.name + ': ' + sum,  // e.g., "∑ Story Points: 15"
                                color: 'green'  // Green color for sum badges
                            };
                        }
                    }
                    return null;  // No badge to show
                });
        })
        .catch(function(error) {
            console.warn('Error in getCardBadgeForField:', error);
            return null;
        });

    // Return whichever promise resolves first (badge logic or timeout)
    return Promise.race([badgePromise, timeoutPromise]);
}

// LEGACY FUNCTION: Get all card badges at once
// This is an older approach that gets all badges in one call
// The newer approach uses dynamic badges (getCardBadgeForField) for better performance
// This function shows both individual values AND sum badges on the same card
function getCardBadges(t, options) {
    // Set up timeout protection (longer timeout since this processes all fields)
    const timeoutPromise = new Promise(function(resolve) {
        setTimeout(function() {
            resolve([]);  // Return empty array if timeout
        }, 4000); // 4 second timeout for the entire badge calculation
    });

    // Main badge calculation logic
    const badgePromise = t.get('board', 'shared', FIELDS_KEY)  // Get configured fields
        .then(function(fields) {
            // If no fields configured, return empty array
            if (!fields || fields.length === 0) {
                return [];
            }

            // Get this card's individual field values
            return t.get('card', 'shared', FIELD_VALUES_KEY)
                .then(function(values) {
                    values = values || {};  // Default to empty object
                    const badges = [];

                    // STEP 1: Add badges for individual field values on this card
                    fields.forEach(function(field) {
                        const value = values[field.id] || 0;
                        if (value > 0) {  // Only show badge if value exists
                            badges.push({
                                text: field.name + ': ' + value,  // e.g., "Story Points: 5"
                                color: 'red'  // Red color for individual values
                            });
                        }
                    });

                    // STEP 2: Check if this card should also show sum badges
                    return calculateListSum(t)
                        .then(function(sums) {
                            if (sums) {
                                // This IS the first card, so add sum badges too
                                fields.forEach(function(field) {
                                    const sum = sums[field.id] || 0;
                                    if (sum > 0) {  // Only show badge if sum exists
                                        badges.push({
                                            text: '∑ ' + field.name + ': ' + sum,  // e.g., "∑ Story Points: 15"
                                            color: 'green'  // Green color for sum badges
                                        });
                                    }
                                });
                            }
                            // If sums is null, this is NOT the first card, so no sum badges
                            return badges;
                        });
                });
        })
        .catch(function(error) {
            console.warn('Error in getCardBadges:', error);
            return [];
        });

    // Return whichever promise resolves first (calculation or timeout)
    return Promise.race([badgePromise, timeoutPromise]);
}



console.log('Sum Up Fields Power-Up initialized successfully');