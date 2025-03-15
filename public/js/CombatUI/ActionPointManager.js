// /public/js/CombatUI/ActionPointManager.js

export class ActionPointManager {
    constructor(componentFactory) {
      this.componentFactory = componentFactory;
    }
  
    updateActionPoints(container, player) {
      if (!container || !player) return;
  
      // Create or update action points
      this.ensureActionPointElements(container, player.maxActionPoints);
      this.updateActionPointFills(container, player);
    }
    
    ensureActionPointElements(container, maxPoints) {
      // Only recreate if the number of points changed
      if (container.children.length === maxPoints) return;
      
      container.innerHTML = '';
      
      for (let i = 0; i < maxPoints; i++) {
        const point = document.createElement('div');
        point.className = 'action-point';
        
        const fill = document.createElement('div');
        fill.className = 'action-point-fill';
        
        point.appendChild(fill);
        container.appendChild(point);
      }
    }
    
    updateActionPointFills(container, player) {
      const points = container.querySelectorAll('.action-point');
      
      points.forEach((point, index) => {
        const fill = point.querySelector('.action-point-fill');
        if (!fill) return;
        
        const fillInfo = this.componentFactory.calculateActionPointFill(player, index);
        fill.style.height = `${fillInfo.percentage}%`;
        fill.className = `action-point-fill ${fillInfo.cssClass}`;
      });
    }
  }