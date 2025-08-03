// Sum Up Fields Power-Up v1.1.0
console.log('Sum Up Fields Power-Up loading...');

// Storage keys
const FIELDS_KEY = 'sumup_fields';
const FIELD_VALUES_KEY = 'sumup_field_values';


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
        const timeoutPromise = new Promise(function(resolve) {
            setTimeout(function() { resolve([]); }, 2000);
        });

        const buttonsPromise = t.get('board', 'shared', FIELDS_KEY)
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

        return Promise.race([buttonsPromise, timeoutPromise]);
    },

    'card-detail-badges': function(t, options) {
        const timeoutPromise = new Promise(function(resolve) {
            setTimeout(function() { resolve([]); }, 2000);
        });

        const detailBadgesPromise = t.get('board', 'shared', FIELDS_KEY)
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
                                color: 'red',
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
            })
            .catch(function(error) {
                console.error('Error in card-detail-badges:', error);
                return [];
            });

        return Promise.race([detailBadgesPromise, timeoutPromise]);
    },

    'card-badges': function (t, options) {
        // Dynamic badges with auto-refresh every 15 seconds
        const timeoutPromise = new Promise(function(resolve) {
            setTimeout(function() { resolve([]); }, 2000);
        });

        const dynamicBadgesPromise = t.get('board', 'shared', FIELDS_KEY)
            .then(function(fields) {
                if (!fields || fields.length === 0) {
                    return [];
                }

                return fields.map(function(field) {
                    return {
                        // Dynamic badge: Trello will call this function again
                        // every `refresh` seconds and repaint the value.
                        dynamic: function () {
                            return getCardBadgeForField(t, options, field)
                                .then(function(badge) {
                                    if (badge) {
                                        // Add refresh interval to the badge
                                        return Object.assign(badge, {
                                            refresh: 15  // seconds – must be ≥ 10
                                        });
                                    }
                                    return null;
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
    // Declare the appKey and appName if you have them
    // appKey: 'your-app-key',
    // appName: 'Sum Up Fields'
});

// Utility functions
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// Calculate sum for cards in the same list with timeout protection
function calculateListSum(t) {
    const timeoutPromise = new Promise(function(resolve) {
        setTimeout(function() {
            resolve(null);
        }, 3000); // 3 second timeout
    });

    const calculationPromise = Promise.all([
        t.card('id', 'idList'),
        t.cards('id', 'idList', 'name', 'pos'),
        t.get('board', 'shared', FIELDS_KEY)
    ]).then(function(results) {
        const currentCard = results[0];
        const allCards = results[1];
        const fields = results[2];

        if (!fields || fields.length === 0) {
            return null;
        }

        // Filter cards in the same list and sort by position
        const listCards = allCards
            .filter(function(card) {
                return card.idList === currentCard.idList;
            })
            .sort(function(a, b) {
                return a.pos - b.pos;
            });

        // Check if this is the first card
        const isFirstCard = listCards.length > 0 && listCards[0].id === currentCard.id;

        if (!isFirstCard) {
            return null;
        }

        // Calculate sums for cards after the first one
        const sums = {};
        fields.forEach(function(field) {
            sums[field.id] = 0;
        });

        const cardsToSum = listCards.slice(1);
        
        // Limit to 20 cards to prevent timeout
        const limitedCards = cardsToSum.slice(0, 20);
        
        const promises = limitedCards.map(function(card) {
            return t.get(card.id, 'shared', FIELD_VALUES_KEY)
                .then(function(values) {
                    if (values) {
                        fields.forEach(function(field) {
                            sums[field.id] += parseFloat(values[field.id]) || 0;
                        });
                    }
                })
                .catch(function(error) {
                    console.warn('Error getting values for card', card.id, error);
                });
        });

        return Promise.all(promises).then(function() {
            return sums;
        });
    }).catch(function(error) {
        console.error('Error calculating list sum:', error);
        return null;
    });

    return Promise.race([calculationPromise, timeoutPromise]);
}

// Get card badge for a specific field
function getCardBadgeForField(t, options, field) {
    const timeoutPromise = new Promise(function(resolve) {
        setTimeout(function() {
            resolve(null);
        }, 3000); // 3 second timeout
    });

    const badgePromise = t.get('card', 'shared', FIELD_VALUES_KEY)
        .then(function(values) {
            values = values || {};
            const value = values[field.id] || 0;

            // Show individual value if it exists
            if (value > 0) {
                return {
                    text: field.name + ': ' + value,
                    color: 'red'
                };
            }

            // Check if this card should show sum
            return calculateListSum(t)
                .then(function(sums) {
                    if (sums && sums[field.id]) {
                        const sum = sums[field.id] || 0;
                        if (sum > 0) {
                            return {
                                text: '∑ ' + field.name + ': ' + sum,
                                color: 'green'
                            };
                        }
                    }
                    return null;
                });
        })
        .catch(function(error) {
            console.warn('Error in getCardBadgeForField:', error);
            return null;
        });

    return Promise.race([badgePromise, timeoutPromise]);
}

// Get card badges - shows individual values and sum if first card (legacy function)
function getCardBadges(t, options) {
    const timeoutPromise = new Promise(function(resolve) {
        setTimeout(function() {
            resolve([]);
        }, 4000); // 4 second timeout for the entire badge calculation
    });

    const badgePromise = t.get('board', 'shared', FIELDS_KEY)
        .then(function(fields) {
            if (!fields || fields.length === 0) {
                return [];
            }

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
                                color: 'red'
                            });
                        }
                    });

                    // Calculate and show sum if this is the first card
                    return calculateListSum(t)
                        .then(function(sums) {
                            if (sums) {
                                // This is the first card, add sum badges
                                fields.forEach(function(field) {
                                    const sum = sums[field.id] || 0;
                                    if (sum > 0) {
                                        badges.push({
                                            text: '∑ ' + field.name + ': ' + sum,
                                            color: 'green'
                                        });
                                    }
                                });
                            }
                            return badges;
                        });
                });
        })
        .catch(function(error) {
            console.warn('Error in getCardBadges:', error);
            return [];
        });

    return Promise.race([badgePromise, timeoutPromise]);
}



console.log('Sum Up Fields Power-Up initialized successfully');