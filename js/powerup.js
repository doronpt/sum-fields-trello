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
                  refreshOnClick: true,
                  callback: function (t) {
                      return t.popup({
                          title: 'Edit ' + field.name,
                          url: './edit-values.html',   // reuse what you already have
                          height: 300
                          // args: {                      // let the popup know which field/card it came from
                          //     fieldId: field.id,
                          //     fieldName: field.name
                          // }
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
    },

    storage: function (t, payload) {
        console.log('Storage event received:', payload);
        if (payload.key === FIELD_VALUES_KEY && payload.visibility === 'shared') {
            // Field values changed, update sums
            console.log('Field values changed, updating sums...');
            updateListSums(t)
                .then(() => {
                    console.log('Sums updated successfully after field change');
                })
                .catch(error => {
                    console.error('Error updating sums after field change:', error);
                });
        }
    }
});

// Utility functions
function generateId() {
  return '_' + Math.random().toString(36).substr(2, 9);
}

function updateListSums(t) {
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

// Enhanced card badges to show sums on first cards and individual values on others
function getCardBadges(t, options) {
  return t.get('board', 'shared', FIELDS_KEY)
    .then(function(fields) {
      if (!fields || fields.length === 0) {
        return [];
      }

      // Always show individual field values for now
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
                  refreshOnClick: true,
                  callback: function (t) {
                      return t.popup({
                          title: 'Edit ' + field.name,
                          url: './edit-values.html',   // reuse what you already have
                          height: 300
                          // args: {                      // let the popup know which field/card it came from
                          //     fieldId: field.id,
                          //     fieldName: field.name
                          // }
                      });
                  }
              });
            }
          });

          // Check if this is the first card in list for sum display
          return t.list('all')
            .then(function(list) {
              const cards = list.cards || [];
              const cardId = t.getContext().card;
              const isFirstCard = cards.length > 0 && cards[0].id === cardId;
              
              if (isFirstCard) {
                // Calculate and show sum for this list
                return calculateListSum(t, list, fields)
                  .then(function(sums) {
                    const sumBadges = [];
                    
                    fields.forEach(function(field) {
                      const sum = sums[field.id] || 0;
                      if (sum > 0) {
                        sumBadges.push({
                          text: '∑ ' + field.name + ': ' + sum,
                          color: 'green'
                        });
                      }
                    });
                    
                    return badges.concat(sumBadges);
                  });
              }
              
              return badges;
            });
        });
    })
    .catch(function(error) {
      console.warn('Error getting card badges:', error);
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
  // Get Trello context for updates
  const t = window.TrelloPowerUp.iframe();

  // Update sums periodically (every 10 seconds when board is active)
  setInterval(function() {
    if (document.visibilityState === 'visible') {
      updateListSums(t);
    }
  }, 10000);
  
  // Initial update
  setTimeout(function() {
    updateListSums(t);
  }, 1000);
}

// Initialize auto-update
initializeAutoUpdate();


console.log('Sum Up Fields Power-Up initialized successfully');