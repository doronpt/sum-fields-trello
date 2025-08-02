// Sum Up Fields Power-Up v1.1.0
console.log('Sum Up Fields Power-Up loading...');

// Storage keys
const FIELDS_KEY = 'sumup_fields';
const FIELD_VALUES_KEY = 'sumup_field_values';

// Store t instance globally for functions that need it
let globalT = null;

// Initialize the Power-Up
TrelloPowerUp.initialize({
    'board-buttons': function(t, options) {
        return [];
    },

    'card-back-section': function(t, options) {
        return [];
    },

    'show-settings': function(t, options) {
        return t.popup({
            title: 'Sum Up Fields Settings',
            url: './settings.html',
            height: 500
        });
    },

    'card-buttons': function(t, options) {
        return t.get('board', 'shared', FIELDS_KEY)
            .then(function(fields) {
                if (!fields || fields.length === 0) {
                    return [];
                }

                return [{
                    icon: {
                        dark: './icons/edit-icon-dark.svg',
                        light: './icons/edit-icon-light.svg'
                    },
                    text: 'Edit Field Values',
                    callback: function(t) {
                        return t.popup({
                            title: 'Edit Field Values',
                            url: './edit-values.html',
                            height: 300
                        });
                    }
                }];
            })
            .catch(function(error) {
                console.error('Error in card-buttons:', error);
                return [];
            });
    },

    'card-detail-badges': function(t, options) {
        // Store t for global use
        globalT = t;

        return t.get('board', 'shared', FIELDS_KEY)
            .then(function(fields) {
                if (!fields || fields.length === 0) {
                    return [];
                }

                return t.get('card', 'shared', FIELD_VALUES_KEY)
                    .then(function(values) {
                        values = values || {};
                        const badges = [];

                        fields.forEach(function(field) {
                            const value = values[field.id] || 0;
                            badges.push({
                                title: field.name,
                                text: field.name + ': ' + value,
                                color: 'blue',
                                refreshOnClick: true,
                                callback: function (t) {
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
            });
    },

    'card-badges': function (t, options) {
        // Store t for global use
        globalT = t;
        return getCardBadges(t, options);
    }
}, {
    // Declare the appKey and appName if you have them
    // appKey: 'your-app-key',
    // appName: 'Sum Up Fields'
});

// Utility functions
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

function updateListSums() {
    // Check if we have a t instance
    if (!globalT) {
        console.warn('No Trello context available for updateListSums');
        return Promise.resolve();
    }

    const t = globalT;

    // Get board lists and cards
    return t.lists('all')
        .then(function(lists) {
            if (!lists || lists.length === 0) {
                console.log('No lists found');
                return Promise.resolve();
            }

            return t.get('board', 'shared', FIELDS_KEY)
                .then(function(fields) {
                    if (!fields || fields.length === 0) {
                        console.log('No fields configured');
                        return Promise.resolve();
                    }

                    console.log('Processing', lists.length, 'lists with', fields.length, 'fields');

                    // Process each list
                    const listPromises = lists.map(function(list) {
                        return t.cards('id', 'name')
                            .then(function(cards) {
                                // Filter cards that belong to this list
                                const listCards = cards.filter(function(card) {
                                    return card.idList === list.id;
                                });

                                if (listCards.length === 0) {
                                    console.log('List', list.name, 'has no cards');
                                    return Promise.resolve();
                                }

                                console.log('List', list.name, 'has', listCards.length, 'cards');

                                // Calculate sums for each field
                                const sums = {};
                                fields.forEach(function(field) {
                                    sums[field.id] = 0;
                                });

                                // Skip the first card (where we'll display the sum)
                                const cardsToSum = listCards.slice(1);

                                const cardPromises = cardsToSum.map(function(card) {
                                    return t.get(card.id, 'shared', FIELD_VALUES_KEY)
                                        .then(function(values) {
                                            values = values || {};
                                            fields.forEach(function(field) {
                                                const value = parseFloat(values[field.id]) || 0;
                                                sums[field.id] += value;
                                                if (value > 0) {
                                                    console.log('Card', card.name, 'field', field.name, 'value:', value);
                                                }
                                            });
                                        })
                                        .catch(function(error) {
                                            console.warn('Error getting values for card', card.id, error);
                                        });
                                });

                                return Promise.all(cardPromises)
                                    .then(function() {
                                        // Update the first card with the sum
                                        const firstCard = listCards[0];
                                        console.log('Setting sum on first card:', firstCard.name, 'sums:', sums);
                                        return t.set(firstCard.id, 'shared', 'sum_display', sums)
                                            .then(function() {
                                                console.log('Sum display set successfully');
                                                // Force a refresh of the badges
                                                return t.render();
                                            });
                                    })
                                    .catch(function(error) {
                                        console.warn('Error setting sum for first card in list', list.id, error);
                                    });
                            });
                    });

                    return Promise.all(listPromises);
                });
        })
        .catch(function(error) {
            console.error('Error updating list sums:', error);
            console.error('Error stack:', error.stack);
        });
}

// Function to get sum display for a card
function getSumDisplay(t, cardId) {
    return t.get(cardId, 'shared', 'sum_display')
        .then(function(sums) {
            if (!sums) return null;

            return t.get('board', 'shared', FIELDS_KEY)
                .then(function(fields) {
                    if (!fields || fields.length === 0) return null;

                    const displayText = fields.map(function(field) {
                        const sum = sums[field.id] || 0;
                        return field.name + ': ' + sum;
                    }).join(' | ');

                    return displayText;
                });
        })
        .catch(function(error) {
            console.warn('Error getting sum display:', error);
            return null;
        });
}

// Enhanced card badges to show sums on first cards and individual values on others
function getCardBadges(t, options) {
    return t.get('board', 'shared', FIELDS_KEY)
        .then(function(fields) {
            if (!fields || fields.length === 0) {
                return [];
            }

            const cardId = t.getContext().card;

            // Get the card's position in its list
            return t.list('all')
                .then(function(list) {
                    return t.cards('id')
                        .then(function(allCards) {
                            // Filter cards in this list
                            const listCards = allCards.filter(function(card) {
                                return card.idList === list.id;
                            });

                            const isFirstCard = listCards.length > 0 && listCards[0].id === cardId;

                            // Get individual field values
                            return t.get('card', 'shared', FIELD_VALUES_KEY)
                                .then(function(values) {
                                    values = values || {};
                                    const badges = [];

                                    // Show individual values
                                    fields.forEach(function(field) {
                                        const value = values[field.id] || 0;
                                        if (value > 0) {
                                            badges.push({
                                                text: field.name + ': ' + value,
                                                color: 'blue',
                                                refresh: 10 // Refresh every 10 seconds
                                            });
                                        }
                                    });

                                    // If this is the first card, also show the sum
                                    if (isFirstCard) {
                                        return t.get(cardId, 'shared', 'sum_display')
                                            .then(function(sums) {
                                                if (sums) {
                                                    fields.forEach(function(field) {
                                                        const sum = sums[field.id] || 0;
                                                        if (sum > 0) {
                                                            badges.push({
                                                                text: '∑ ' + field.name + ': ' + sum,
                                                                color: 'green',
                                                                refresh: 10 // Refresh every 10 seconds
                                                            });
                                                        }
                                                    });
                                                }
                                                return badges;
                                            });
                                    }

                                    return badges;
                                });
                        });
                })
                .catch(function(error) {
                    console.warn('Error getting card badges:', error);
                    // Fall back to just showing individual values
                    return t.get('card', 'shared', FIELD_VALUES_KEY)
                        .then(function(values) {
                            values = values || {};
                            const badges = [];

                            fields.forEach(function(field) {
                                const value = values[field.id] || 0;
                                if (value > 0) {
                                    badges.push({
                                        text: field.name + ': ' + value,
                                        color: 'blue',
                                        refresh: 10
                                    });
                                }
                            });

                            return badges;
                        });
                });
        })
        .catch(function(error) {
            console.warn('Error in getCardBadges:', error);
            return [];
        });
}

// Calculate sum for a specific list
function calculateListSum(t, list, fields) {
    const cards = list.cards || [];
    const sums = {};

    // Initialize sums
    fields.forEach(function(field) {
        sums[field.id] = 0;
    });

    // Skip first card (where sum is displayed) and sum the rest
    const cardsToSum = cards.slice(1);

    const cardPromises = cardsToSum.map(function(card) {
        return t.get(card.id, 'shared', FIELD_VALUES_KEY)
            .then(function(values) {
                values = values || {};
                fields.forEach(function(field) {
                    sums[field.id] += parseFloat(values[field.id]) || 0;
                });
            })
            .catch(function(error) {
                console.warn('Error getting values for card', card.id, error);
            });
    });

    return Promise.all(cardPromises)
        .then(function() {
            return sums;
        });
}

// Auto-update sums when cards change
function initializeAutoUpdate() {
    // Update sums periodically (every 5 seconds when board is active)
    setInterval(function() {
        if (document.visibilityState === 'visible' && globalT) {
            console.log('Periodic update triggered');
            updateListSums();
        }
    }, 5000);

    // Initial update after a short delay
    setTimeout(function() {
        if (globalT) {
            console.log('Initial update triggered');
            updateListSums();
        }
    }, 2000);
}

// Initialize auto-update
initializeAutoUpdate();

// Listen for storage changes using the Trello Power-Up iframe communication
window.addEventListener('message', function(event) {
    // Check if this is a message from Trello
    if (event.origin !== 'https://trello.com') return;

    // Log all messages for debugging
    console.log('Received message:', event.data);

    // Update when we receive any relevant message
    if (event.data && globalT) {
        // Trigger update for various message types
        if (event.data.type === 'render' ||
            event.data.command === 'interactive' ||
            event.data.command === 'update-card') {
            console.log('Message triggered update');
            updateListSums();
        }
    }
});

// Also listen for visibility changes
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible' && globalT) {
        console.log('Visibility change triggered update');
        updateListSums();
    }
});

console.log('Sum Up Fields Power-Up initialized successfully');