// /public/js/CombatUI/EventHandlers.js

import { ActionTypes, getAction } from '../Actions/index.js';

export class EventHandlers {
  constructor(combatManager, modalManager) {
    this.combatManager = combatManager;
    this.modalManager = modalManager;
  }

  setupAttackButtonHandler(attackButton) {
    attackButton.addEventListener('click', () => {
      if (attackButton.disabled) return;

      // const entities = this.combatManager.getEntities();
      // this.selectTarget(ActionTypes.ATTACK, entities, target => {
      //   this.combatManager.performAction(ActionTypes.ATTACK, target.id);
      // });
      this.combatManager.performAction(ActionTypes.ATTACK, null);
    });
  }

  setupCastButtonHandler(castButton) {
    castButton.addEventListener('click', () => {
      if (castButton.disabled) return;

      const localPlayer = this.combatManager.getLocalPlayer();
      this.modalManager.showSpellSelectionModal(
        localPlayer,
        (ability) => this.handleAbilitySelection(ability, localPlayer)
      );
    });
  }

  setupCancelButtonHandler(cancelButton) {
    cancelButton.addEventListener('click', () => {
      this.modalManager.hide();
    });
  }

  handleAbilitySelection(ability, player) {
    if (ability.targetType === 'self') {
      // Self-targeted abilities don't need target selection
      this.combatManager.performAction(`cast:${ability.id}`, player.id);
    } else {
      // Pass null as the target ID - the CombatManager will use the selected target
      // or prompt for selection if needed
      this.combatManager.performAction(`cast:${ability.id}`, null);
    }
  }

  selectTarget(actionId, entities, callback) {
    const action = getAction(actionId);
    if (!action) return;

    const localPlayer = this.combatManager.getLocalPlayer();
    const validTargets = action.getValidTargets(localPlayer, entities);

    // Auto-select if only one target (usually self)
    if (validTargets.length === 1 && action.targetType === 'self') {
      callback(validTargets[0]);
      return;
    }

    // Show selection modal
    this.modalManager.showSelectionModal(
      `Select ${action.targetType} to ${action.name.toLowerCase()}`,
      validTargets.map(entity => ({ id: entity.id, name: entity.name })),
      target => callback({ id: target.id })
    );
  }
}