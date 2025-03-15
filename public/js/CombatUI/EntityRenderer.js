// /public/js/CombatUI/EntityRenderer.js

export class EntityRenderer {
  constructor(componentFactory) {
    this.componentFactory = componentFactory;
  }

  createEntityElement(entity, combatManager) {
    const entityEl = document.createElement('div');
    entityEl.className = `entity-card ${entity.type}`;
    entityEl.setAttribute('data-entity-id', entity.id);

    // Set basic states
    this.setEntityStateClasses(entity, entityEl, combatManager);

    // First create entity contents as before
    const infoDiv = document.createElement('div');

    // Add name and class row
    infoDiv.appendChild(this.componentFactory.createEntityNameRow(entity));

    // Add stats area
    infoDiv.appendChild(this.componentFactory.createEntityStatsArea(entity));

    // Add to entity card
    entityEl.appendChild(infoDiv);

    // Add action points visualization
    entityEl.appendChild(this.componentFactory.createEntityActionPoints(entity));

    // Add status effects if any
    if (entity.statusEffects?.length > 0) {
      entityEl.appendChild(this.componentFactory.createStatusEffectsElement(entity));
    }

    // Add click handler for target selection
    entityEl.addEventListener('click', () => {
      // console.log('Entity clicked:', entity.id);
      // Only allow targeting if the entity is alive
      if (typeof entity.isAlive === 'function' ? entity.isAlive() : entity.health > 0) {
        combatManager.selectTarget(entity.id);
      }
    });

    return entityEl;
  }

  setEntityStateClasses(entity, entityEl, combatManager) {
    // Check if entity is alive
    const isAlive = typeof entity.isAlive === 'function'
      ? entity.isAlive()
      : (entity.health > 0);

    if (!isAlive) {
      entityEl.classList.add('dead');
    }

    // Mark local player
    const isLocalPlayer = combatManager.isLocalPlayer(entity.id);
    if (isLocalPlayer) {
      entityEl.classList.add('local-player');
    }
  }

  updateEntityElement(entity, entityEl) {
    this.updateEntityHealth(entity, entityEl);
    this.updateEntityAC(entity, entityEl);
    this.updateEntityEnergy(entity, entityEl);
    this.updateEntityActionPoints(entity, entityEl);
    this.updateEntityStatusEffects(entity, entityEl);
    this.updateEntityLifeState(entity, entityEl);
  }

  updateEntityHealth(entity, entityEl) {
    const healthPercentage = entity.getHealthPercentage?.() || (entity.health / entity.maxHealth * 100);
    entityEl.querySelector('.health-bar').style.width = `${healthPercentage}%`;
    entityEl.querySelector('.entity-hp').textContent = `HP: ${entity.health}/${entity.maxHealth}`;
  }

  updateEntityAC(entity, entityEl) {
    const acEl = entityEl.querySelector('.entity-ac');
    if (!acEl) return;

    const displayAC = entity.getAC?.() || entity.ac || 10;
    acEl.textContent = `AC: ${displayAC}`;
  }

  updateEntityEnergy(entity, entityEl) {
    const energyPercentage = entity.getEnergyPercentage?.() || (entity.energy / entity.maxEnergy * 100);

    const energyBarEl = entityEl.querySelector('.energy-bar');
    if (energyBarEl) {
      energyBarEl.style.width = `${energyPercentage}%`;
    }

    const energyTextEl = entityEl.querySelector('.entity-energy > div');
    if (energyTextEl) {
      energyTextEl.textContent = `Energy: ${entity.energy}/${entity.maxEnergy}`;
    }
  }

  updateEntityActionPoints(entity, entityEl) {
    const actionPointElements = entityEl.querySelectorAll('.entity-action-point');
    if (!actionPointElements?.length) return;

    actionPointElements.forEach((point, index) => {
      const fill = point.querySelector('.entity-action-point-fill');
      if (!fill) return;

      const fillInfo = this.componentFactory.calculateActionPointFill(entity, index);
      fill.style.height = `${fillInfo.percentage}%`;
      fill.className = `entity-action-point-fill ${fillInfo.cssClass}`;
    });
  }

  updateEntityStatusEffects(entity, entityEl) {
    // Remove current status effects
    const oldEffectsEl = entityEl.querySelector('.status-effects');
    if (oldEffectsEl) {
      entityEl.removeChild(oldEffectsEl);
    }

    // Add updated status effects if any exist
    if (entity.statusEffects?.length > 0) {
      entityEl.appendChild(this.componentFactory.createStatusEffectsElement(entity));
    }
  }

  updateEntityLifeState(entity, entityEl) {
    const isAlive = entity.isAlive?.() || entity.health > 0;

    if (isAlive) {
      entityEl.classList.remove('dead');
    } else {
      entityEl.classList.add('dead');
    }
  }

  updateSelectedEntity(selectedId) {
    // console.log('Updating selected entity to:', selectedId);

    // Remove 'selected' class from all entity cards
    document.querySelectorAll('.entity-card.selected').forEach(el => {
      el.classList.remove('selected');
    });

    // Add 'selected' class to the targeted entity if one is selected
    if (selectedId) {
      const selectedEl = document.querySelector(`.entity-card[data-entity-id="${selectedId}"]`);
      if (selectedEl) {
        selectedEl.classList.add('selected');
        // console.log('Added selected class to:', selectedId);
      } else {
        console.log('Could not find element for entity:', selectedId);
      }
    }
  }

  showFloatingText(entityId, text, type = 'damage') {
    const entityEl = document.querySelector(`.entity-card[data-entity-id="${entityId}"]`);
    if (!entityEl) return;

    const floatingText = document.createElement('div');
    floatingText.className = `floating-text ${type}`;
    floatingText.textContent = text;

    // Position randomly for visual variety
    const randomOffsetX = Math.floor(Math.random() * 140) - 70;
    floatingText.style.left = `calc(50% + ${randomOffsetX}px)`;
    floatingText.style.top = '40%';

    entityEl.appendChild(floatingText);

    // Auto-remove after animation
    setTimeout(() => {
      if (floatingText.parentNode === entityEl) {
        entityEl.removeChild(floatingText);
      }
    }, 2100);
  }
}