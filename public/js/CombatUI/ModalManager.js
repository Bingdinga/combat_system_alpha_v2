// /public/js/CombatUI/ModalManager.js

import { fetchAbilitiesForClass } from '../Actions/index.js';

export class ModalManager {
    constructor(modalElement, titleElement, optionsContainer, componentFactory) {
      this.modalElement = modalElement;
      this.titleElement = titleElement;
      this.optionsContainer = optionsContainer;
      this.componentFactory = componentFactory;
      this.selectionCallback = null;
    }
  
    async showSpellSelectionModal(localPlayer, onAbilitySelected) {
      if (!localPlayer) return;
  
      try {
        const abilities = await fetchAbilitiesForClass(localPlayer.characterClass);
                
        // Filter to valid castable abilities
        const castableAbilities = abilities
          .filter(action => action.type === 'cast')
          .filter(action => action.isValid(localPlayer));
        
        this.titleElement.textContent = 'Select an Ability';
        this.optionsContainer.innerHTML = '';
        
        // Create option for each ability
        castableAbilities.forEach(ability => {
          const option = this.componentFactory.createAbilityOption(
            ability, 
            localPlayer,
            (selectedAbility) => {
              this.hide();
              onAbilitySelected(selectedAbility);
            }
          );
          this.optionsContainer.appendChild(option);
        });
        
        this.show();
      } catch (error) {
        console.error('Error showing spell selection:', error);
        alert('Unable to load abilities. Please try again.');
      }
    }
  
    showSelectionModal(title, options, callback) {
      this.titleElement.textContent = title;
      this.optionsContainer.innerHTML = '';
  
      options.forEach(option => {
        const optionEl = document.createElement('div');
        optionEl.className = 'selection-option';
        optionEl.setAttribute('data-option-id', option.id);
        optionEl.textContent = option.name;
  
        optionEl.addEventListener('click', () => {
          this.hide();
          if (callback) callback(option);
        });
  
        this.optionsContainer.appendChild(optionEl);
      });
  
      this.selectionCallback = callback;
      this.show();
    }
  
    show() {
      this.modalElement.classList.add('active');
    }
  
    hide() {
      this.modalElement.classList.remove('active');
      this.selectionCallback = null;
    }
  }