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

// Calculate sum for cards in the same list
function calculateListSum(t) {
    return Promise.all([
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
        const promises = cardsToSum.map(function(card) {
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
}

// Get card badges - shows individual values and sum if first card
function getCardBadges(t, options) {
    return t.get('board', 'shared', FIELDS_KEY)
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
                                color: 'blue'
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
}

var t = window.TrelloPowerUp.iframe();

// Render the initial state of the Power-Up
t.render(function () {
    getCardBadges(t);
});

console.log('Sum Up Fields Power-Up initialized successfully');