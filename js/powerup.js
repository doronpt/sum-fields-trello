/*  Sum Up Fields Power-Up v2.0 – 2025-08-02
 *  ---------------------------------------------------------------
 *  • Adds numeric fields to cards
 *  • Shows blue value badges on every card
 *  • Shows green ∑ badges on the *first* card of each list
 *  • Badges are clickable → opens edit-values.html
 *  ---------------------------------------------------------------
 */

const FIELDS_KEY       = 'sumup_fields';
const FIELD_VALUES_KEY = 'sumup_field_values';

/**
 * Board-level button – opens the settings page where fields are created /
 * renamed / deleted.
 */
function boardButtons(t) {
    return [
        {
            icon: 'https://img.icons8.com/ios-filled/50/000000/sigma.png',
            text: 'Sum Up Fields',
            callback: () =>
                t.popup({
                    title: 'Sum Up Fields Settings',
                    url: './settings.html',
                    height: 420,
                }),
        },
    ];
}

/**
 * Card badges – shows (1) blue per-field values on every card and
 * (2) green ∑ totals on the first card of each list.
 */
function cardBadges(t /*, opts */) {
    return Promise.all([
        t.get('board', 'shared', FIELDS_KEY),           // array of field meta
        t.get('card',  'shared', FIELD_VALUES_KEY),     // map {fieldId: value}
        t.list('cards'),                                // cards in this list
    ]).then(([fields = [], values = {}, list]) => {
        const ctx    = t.getContext();                  // { card: id, board: id }
        const badges = [];

        /* ---------- blue value badges on *this* card ---------- */
        fields.forEach((f) => {
            const raw = values[f.id];
            if (raw === undefined || raw === null || isNaN(raw)) return;
            badges.push({
                text: `${f.name}: ${raw}`,
                color: 'blue',
                callback: (tt) =>
                    tt.popup({
                        title: `Edit ${f.name}`,
                        url: './edit-values.html',
                        height: 300,
                    }),
            });
        });

        /* ---------- green ∑ badges on the FIRST card of the list ---------- */
        if (list.cards.length && list.cards[0].id === ctx.card) {
            // build { fieldId: runningTotal }
            const totals = Object.fromEntries(fields.map((f) => [f.id, 0]));

            // gather values from every *other* card in the list
            const totalPromises = list.cards.slice(1).map((c) =>
                t.get(c.id, 'shared', FIELD_VALUES_KEY).then((vals = {}) => {
                    fields.forEach((f) => {
                        const v = parseFloat(vals[f.id]);
                        if (!isNaN(v)) totals[f.id] += v;
                    });
                }),
            );

            return Promise.all(totalPromises).then(() => {
                fields.forEach((f) => {
                    if (totals[f.id] > 0) {
                        badges.push({
                            text: `∑ ${f.name}: ${totals[f.id]}`,
                            color: 'green',
                        });
                    }
                });
                return badges;
            });
        }

        return badges; // not the first card ⇒ just return the blue badges
    });
}

/**
 * Capability map – Trello calls these “hooks”.
 */
TrelloPowerUp.initialize({
    'board-buttons': boardButtons,
    'card-badges'  : cardBadges,
});
