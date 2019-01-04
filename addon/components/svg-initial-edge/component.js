import Component from '@ember/component';
import { computed } from '@ember/object';
import { and, readOnly } from '@ember/object/computed';
import { relative } from 'svg-arrows/utils/svg-tooling';

export default Component.extend({
  tagName: '',

  node: null,

  nodeRect: computed('node', function() {
    const { node, svg } = this;

    if (!node) { return; }

    const domElement = document.querySelector(`[data-state-node="${node.id}"`);

    return relative(
      domElement.getBoundingClientRect(),
      svg.getBoundingClientRect()
    );
  }),

  top: readOnly('nodeRect.top'),
  left: readOnly('nodeRect.left'),

  canDraw: and('top', 'left'),

  path: computed('nodeRect', function() {
    const { nodeRect } = this;

    if (!nodeRect) { return }

    const { top, left } = nodeRect;

    return "M " + (left - 10) + "," + top + " Q " + (left - 10) + "," + (top + 10) + " " + (left - 1) + "," + (top + 10) + " L " + left + "," + (top + 10);
  }),
  
  cx: computed('left', function() {
    return this.left - 10;
  }),

  isActive: computed('node', 'activeState', function() {
    if (!this.activeState) {
      return false;
    }

    return this.activeState.indexOf(this.node) > -1;
  })
})