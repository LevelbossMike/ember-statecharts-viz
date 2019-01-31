import Component from '@ember/component';
import { computed } from '@ember/object';
import layout from '../templates/components/state-node';

function flatten(array) {
  return [].concat(...array);
}

export default Component.extend({
  layout,
  tagName: '',

  // throw if this is not being set
  stateNode: null,

  activeState: null,
  previewState: null,

  onPreviewTransition() {},
  onUnpreviewTransition() {},
  onClickTransition() {},

  showStates: true,

  isParallel: computed('stateNode.type', function() {
    return this.stateNode.type === 'parallel';
  }),

  isActive: computed('activeState', 'stateNode', function() {
    if (!this.activeState) {
      return false;
    }

    return this.activeState.indexOf(this.stateNode) > -1;
  }),

  isPreview: computed('previewState', 'stateNode', function() {
    if (!this.previewState) {
      return false;
    }

    return this.previewState.indexOf(this.stateNode) > -1;
  }),

  states: computed(function() {
    const stateNames = Object.keys(this.stateNode.states);

    return stateNames.map(name => {
      return this.stateNode.states[name];
    });
  }),

  // we map transitions to make it easier to visualize events with guards
  // events with guards will display as two event handlers which display their
  // guard independently
  transitions: computed(function() {
    const { stateNode } = this;
    return flatten(stateNode.ownEvents.map(event => stateNode.definition.on[event]));
  }),

  onEntries: computed(function() {
    const { stateNode: { definition: { onEntry } } } = this;

    return onEntry.map(action => action);
  }),

  onExits: computed(function() {
    const { stateNode: { definition: { onExit } } } = this;

    return onExit.map(action => action);
  }),

  nestedPreviewState: computed('previewStateValue', function() {
    if (!this.previewStateValue) {
      return null;
    }

    return this.stateNode.getStates(this.previewStateValue);
  }),

  actions: {
    toggleStates() {
      this.toggleProperty('showStates');
    },

    setPreviewStateValue([transitionTargetKey]) {
      this.set('previewStateValue', transitionTargetKey);
    }
  }
})