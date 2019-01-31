import Component from '@ember/component';
import { computed } from '@ember/object';
import { statechart, matchesState } from 'ember-statecharts/computed';
import { getEdges } from "xstate/lib/graph";
import { interpret } from 'xstate/lib/interpreter';
import { flatten } from 'ember-statecharts-viz/utils/statecharts-tooling';
import layout from '../templates/components/statechart-viz';

function initialStateNodes(stateNode) {
  var stateKeys = Object.keys(stateNode.states);
  return stateNode.initialStateNodes.concat(flatten(stateKeys.map(function (key) {
    var childStateNode = stateNode.states[key];

    if (childStateNode.type === "compound" || childStateNode.type === "parallel") {
      return initialStateNodes(stateNode.states[key]);
    }

    return [];
  })));
}

export default Component.extend({
  layout,
  tagName: '',

  machine: null,

  canRenderStatechart: matchesState({
    machinePresent: 'success'
  }),

  statechart: statechart({
    initial: 'idle',
    states: {
      idle: {
        on: {
          machineUpdated: 'machinePresent'
        }
      },
      machinePresent: {
        initial: 'interpretingMachine',
        states: {
          interpretingMachine: {
            onEntry: ['interpretMachine'],
            on: {
              resolve: 'success',
              reject: 'error'
            }
          },
          success: {
            onEntry: ['replaceVizData'],
          },
          error: {
            onEntry: ['logError'],
          }
        },
        on: {
          machineUpdated: 'machinePresent'
        }
      }
    }
  }, {
    actions: {
      interpretMachine({ machine }) {
        // as all these getters can fail even with a machine from xstate
        // we need to fetch this from the statechart and can't use computeds
        // we simply can't assume just because we passed a machine that the
        // machine is a valid machine
        try {
          const interpreter = this.interpretMachine(machine);
          const initialStates = this.getInitialStates(machine);
          const edges = this.getEdges(machine);

          this.statechart.send('resolve', { interpreter, initialStates, edges });
        } catch(e) {
          this.statechart.send('reject', { error: e });
        }
      },
      replaceVizData({ interpreter, initialStates, edges }) {
        this.setProperties({
          interpreter, initialStates, edges
        });
      }
    },

    logError({ error }) {
      this.set('error', error);
    }
  }),

  activeState: computed('machine', 'currentState', function() {
    return this.machine.getStates(this.interpreter.state.value);
  }),

  previewState: computed('machine', 'previewStateValue', function() {
    if (!this.previewStateValue) {
      return null;
    }

    return this.machine.getStates(this.previewStateValue);
  }),

  machineStates: computed('machine', function() {
    const stateNames = Object.keys(this.machine.states);
    return stateNames.map(name => this.machine.states[name])
  }),

  showActionTriggered(n) {
    console.log(`action ${n} was triggered`);
  },

  confirmGuard(n) {
    return confirm(`Checking condition ${n} - continue?`);
  },

  interpretMachine(machine) {
    // parse machine actions // get actions from them and stub them out
    const actionNames = Object.keys(machine.options.actions || {});
    const guardNames = Object.keys(machine.options.guards || {});

    const stubbedActions = actionNames.reduce((acc, n) => { 
      acc[n] = this.showActionTriggered.bind(this, n);
      return acc;
    }, {})
    const stubbedGuards = guardNames.reduce((acc, n) => { 
      acc[n] = this.confirmGuard.bind(this, n);
      return acc;
    }, {})


    const interpreter = interpret(this.machine.withConfig({ actions: stubbedActions, guards: stubbedGuards })).onTransition(nextState => {
      this.set('currentState', nextState);
    })

    return interpreter.start();
  },

  getEdges(machine) {
    const edges = getEdges(machine);
    return edges;
  },

  getInitialStates(machine) {
    return initialStateNodes(machine);
  },

  didReceiveAttrs() {
    this._super(...arguments);

    this.statechart.send('machineUpdated', { machine: this.machine });
  },

  actions: {
    followStateChartTransition(transition) {
      this.interpreter.send(transition.event);
    },

    setPreviewStateValue(transitionEvent, [transitionTargetKey]) {
      debugger;
      this.set('previewStateValue', this.interpreter.nextState(transitionEvent).value);
      // debugger;
      // // use intepreter nextState to determine what would be the next state based on the transition event
      // // if this is the same as the target passed preview it
      // // this might get tricky for guards
      // // we need to send cond name and automatically act like the transition was met 
      // this.set('previewStateValue', transitionTargetKey);
    }
  }
});