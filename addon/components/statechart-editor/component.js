import Component from '@ember/component';
import { computed } from '@ember/object';
import { statechart } from 'ember-statecharts/computed';
import { getEdges } from "xstate/lib/graph";
import { interpret } from 'xstate/lib/interpreter';
import { flatten } from 'svg-arrows/utils/statecharts-tooling';

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
  tagName: '',

  machine: computed('statechart', function() {
    const { machine } = this.statechart;

    return machine;
  }),

  showActionTriggered(n) {
    console.log(`action ${n} was triggered`);
  },

  confirmGuard(n) {
    return confirm(`Checking condition ${n} - continue?`);
  },

  interpreter: computed('machine', function() {
    // parse machine actions // get actions from them and stub them out
    const actionNames = Object.keys(this.machine.options.actions || {});
    const guardNames = Object.keys(this.machine.options.guards || {});

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

  edges: computed('machine', function() {
    const edges = getEdges(this.machine);
    return edges;
  }),

  initialStates: computed('machine', function() {
    return initialStateNodes(this.machine);
  }),

  machineStates: computed('machine', function() {
    const stateNames = Object.keys(this.machine.states);
    return stateNames.map(name => this.machine.states[name])
  }),

  statechart: statechart(
    {
      initial: 'idle',
      states: {
        idle: {
          on: {
            open: 'waiting',
          },
        },
        waiting: {
          onEntry: ['wat'],
          on: {
            confirm: 'busy',
            cancel: {
              target: 'idle',
              actions: ['dismissConfirmation'],
            },
          },
        },
        busy: {
          onEntry: ['executeAction'],
          on: {
            resolve: [
              {
                target: 'final',
                actions: ['dismissConfirmation'],
                cond: 'wat'
              },
              {
                target: 'error',
                actions: ['something'],
                cond: 'fubar'
              }
            ],
            reject: 'error',
          },
        },
        error: {
          on: {
            confirm: 'busy',
            cancel: {
              target: 'idle',
              actions: ['dismissConfirmation'],
            },
          },
        },
        final: {},
      },
    },
    {
      actions: {
        dismissConfirmation() {
          return this.onCancel();
        },
        executeAction() {
          return this.confirmationTask.perform();
        },
        something() {
          return this.onCancel();
        }
      },
      guards: {
        wat() {
          return false;
        },
        fubar() {
          return true;
        }
      }
    }
  ),

  actions: {
    followStateChartTransition(transition) {
      this.interpreter.send(transition.event);
    }
  }
});