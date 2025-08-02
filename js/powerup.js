// Sum Up Fields Power-Up
// Storage keys
const FIELDS_KEY = 'sumup_fields';
const FIELD_VALUES_KEY = 'sumup_field_values';

// Initialize the Power-Up
TrelloPowerUp.initialize({
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
                color: 'blue'
              });
            });

            return badges;
          });
      });
  },

  'card-badges': function(t, options) {
    return getCardBadges(t, options);
  }
});

// Utility functions
function generateId() {
  return '_' + Math.random().toString(36).substr(2, 9);
}

function updateListSums() {
  return t.board('all')
    .then(function(board) {
      return t.get('board', 'shared', FIELDS_KEY)
        .then(function(fields) {
          if (!fields || fields.length === 0) {
            return Promise.resolve();
          }

          // Process each list
          const listPromises = board.lists.map(function(list) {
            const cards = list.cards;
            if (cards.length === 0) return Promise.resolve();

            // Calculate sums for each field
            const sums = {};
            fields.forEach(function(field) {
              sums[field.id] = 0;
            });

            // Skip the first card (where we'll display the sum)
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
                // Update the first card with the sum
                const firstCard = cards[0];
                return t.set(firstCard.id, 'shared', 'sum_display', sums);
              })
              .catch(function(error) {
                console.warn('Error setting sum for first card in list', list.id, error);
              });
          });

          return Promise.all(listPromises);
        });
    })
    .catch(function(error) {
      console.error('Error updating list sums:', error);
    });
}

// Function to get sum display for a card
function getSumDisplay(cardId) {
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

// Enhanced card badges to show sums on first cards
function getCardBadges(t, options) {
  const cardId = t.getContext().card;
  
  return t.list('all')
    .then(function(list) {
      const cards = list.cards;
      const isFirstCard = cards.length > 0 && cards[0].id === cardId;
      
      if (isFirstCard) {
        // This is the first card in the list, show sum
        return getSumDisplay(cardId)
          .then(function(sumDisplay) {
            if (sumDisplay) {
              return [{
                text: '∑ ' + sumDisplay,
                color: 'green'
              }];
            }
            return [];
          });
      } else {
        // Regular card, show individual field values
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
                  if (value > 0) {
                    badges.push({
                      text: field.name + ': ' + value,
                      color: 'blue'
                    });
                  }
                });

                return badges;
              });
          });
      }
    })
    .catch(function(error) {
      console.warn('Error getting card badges:', error);
      return [];
    });
}

// Event handlers for real-time updates
function setupEventHandlers() {
  // Handle card moves between lists
  TrelloPowerUp.on('card', 'moveCard', function(t, options) {
    console.log('Card moved, updating sums...');
    setTimeout(function() {
      updateListSums();
    }, 500); // Small delay to ensure move is complete
  });

  // Handle card updates (including field value changes)
  TrelloPowerUp.on('card', 'updateCard', function(t, options) {
    console.log('Card updated, updating sums...');
    setTimeout(function() {
      updateListSums();
    }, 500);
  });

  // Handle new cards being created
  TrelloPowerUp.on('list', 'addCard', function(t, options) {
    console.log('Card added, updating sums...');
    setTimeout(function() {
      updateListSums();
    }, 500);
  });

  // Handle cards being archived/deleted
  TrelloPowerUp.on('card', 'removeCard', function(t, options) {
    console.log('Card removed, updating sums...');
    setTimeout(function() {
      updateListSums();
    }, 500);
  });
}

// Auto-update sums when cards change
function initializeAutoUpdate() {
  // Set up event handlers
  setupEventHandlers();
  
  // Update sums periodically (every 10 seconds when board is active)
  setInterval(function() {
    if (document.visibilityState === 'visible') {
      updateListSums();
    }
  }, 10000);
  
  // Initial update
  setTimeout(function() {
    updateListSums();
  }, 1000);
}

// Initialize auto-update
initializeAutoUpdate();