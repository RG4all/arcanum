/** Pure command validation; actor identity must be authenticated by transport/host. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ArcanumGameCommands = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const TYPES = Object.freeze({ START_ROUND: 'START_ROUND', SUBMIT_BID: 'SUBMIT_BID', PLAY_CARD: 'PLAY_CARD', CHOOSE_PRIESTESS: 'CHOOSE_PRIESTESS', NEXT_ROUND: 'NEXT_ROUND' });
  function validateCommand(command) {
    if (!command || typeof command !== 'object' || Array.isArray(command)) throw new Error('Command muss Objekt sein');
    if (!Object.values(TYPES).includes(command.type)) throw new Error('Unbekannter Command');
    if (!Number.isSafeInteger(command.sequence) || command.sequence < 1) throw new Error('Ungültige Sequenz');
    if (command.type !== TYPES.START_ROUND && command.type !== TYPES.NEXT_ROUND &&
        (typeof command.actorId !== 'string' || !command.actorId)) throw new Error('actorId fehlt');
    if (command.type === TYPES.SUBMIT_BID && (!Number.isInteger(command.bid) || command.bid < 0)) throw new Error('Ungültiges Gebot');
    if (command.type === TYPES.PLAY_CARD && (typeof command.cardUid !== 'string' || !command.cardUid)) throw new Error('cardUid fehlt');
    if (command.type === TYPES.CHOOSE_PRIESTESS && ![-1, 1].includes(command.delta)) throw new Error('Ungültige Korrektur');
    return true;
  }
  return Object.freeze({ TYPES, validateCommand });
});
