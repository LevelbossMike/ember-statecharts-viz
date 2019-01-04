import Component from '@ember/component';
import { computed } from '@ember/object';
import { and } from '@ember/object/computed';
import { relative, center } from 'ember-statecharts-viz/utils/svg-tooling';
import layout from '../templates/components/svg-edge';

export default Component.extend({
  layout,
  tagName: '',

  sourceNode: null,

  targetNode: null,

  // rename active/preview to "node"
  isPreview: computed('sourceNode', 'targetNode', 'activeState', 'previewState', function() {
    const { sourceNode, targetNode, activeState, previewState } = this;

    return (activeState && activeState.indexOf(sourceNode) > -1)
      && (previewState && previewState.indexOf(targetNode) > -1);
  }),

  sourceRect: computed('sourceNode', function() {
    const { sourceNode, svg } = this;

    if (!sourceNode) { return; }

    const domElement = document.querySelector(`[data-state-node="${sourceNode.id}"`);

    return relative(
      domElement.getBoundingClientRect(),
      svg.getBoundingClientRect()
    );
  }),

  targetRect: computed('targetNode', 'svg', function() {
    const { targetNode, svg } = this;

    if (!targetNode) { return; }

    const domElement = document.querySelector(`[data-state-node="${targetNode.id}"`);

    return relative(
      domElement.getBoundingClientRect(),
      svg.getBoundingClientRect()
    );
  }),

  eventRect: computed('sourceNode', 'targetNode', 'svg', function() {
    const { sourceNode, targetNode, svg } = this;

    const querySelector=`[data-id="${sourceNode.key}:${this.event}->${targetNode.key}"]`;
    const domElement = document.querySelector(querySelector);

    return relative(
      domElement.getBoundingClientRect(),
      svg.getBoundingClientRect()
    );
  }),

  hasPath: and('sourceRect', 'targetRect', 'eventRect'),

  path: computed('sourceRect', 'targetRect', 'eventRect', 'edge', function() {
    const { sourceRect, targetRect, eventRect, edge } = this;

    if (!sourceRect || !targetRect || !eventRect) {
      return;
    }

    const eventCenterPt = center(eventRect);
    const targetCenterPt = center(targetRect);

    var start = {
      x: eventRect.right - 4,
      y: eventCenterPt.y
    };
    var end = {
      x: 0,
      y: 0
    };
    var m = (targetCenterPt.y - eventCenterPt.y) / (targetCenterPt.x - eventCenterPt.x);
    var b = eventCenterPt.y - m * eventCenterPt.x;
    var endSide;
    var bezierPad = 10;
    
    if (edge.source === edge.target) {
      endSide = "right";
      end.y = start.y + 10;
      end.x = start.x;
    } else {
      if (eventCenterPt.x <= targetCenterPt.x) {
        if (m * targetRect.left + b < targetRect.top) {
          end.y = targetRect.top;
          end.x = (end.y - b) / m;
          endSide = "top";
        } else if (m * targetRect.left + b > targetRect.bottom) {
          end.y = targetRect.bottom;
          end.x = (end.y - b) / m;
          endSide = "bottom";
        } else {
          end.x = targetRect.left;
          end.y = m * end.x + b;
          endSide = "left";
        }
      } else {
        if (m * targetRect.right + b < targetRect.top) {
          end.y = targetRect.top;
          end.x = (end.y - b) / m;
          endSide = "top";
        } else if (m * targetRect.right + b > targetRect.bottom) {
          end.y = targetRect.bottom;
          end.x = (end.y - b) / m;
          endSide = "bottom";
        } else {
          end.x = targetRect.right - bezierPad;

          if (eventCenterPt.y > targetCenterPt.y) {
            end.y = targetRect.bottom;
            endSide = "bottom";
          } else {
            end.y = targetRect.top;
            endSide = "top";
          }
        }
      }
    }
    
    switch (endSide) {
      case "bottom":
        end.y += 4;
        break;

      case "top":
        end.y -= 4;
        break;

      case "left":
        end.x -= 4;
        break;

      case "right":
        end.x += 4;
        break;
    }
    
    var dy = end.y - start.y;

    var preEnd = Object.assign({}, end);

    var postStart = {
      x: start.x + bezierPad,
      y: Math.abs(dy) > bezierPad ? start.x > end.x ? dy > 0 ? start.y + bezierPad : start.y - bezierPad : start.y + bezierPad : start.y
    };
    var points = [start, postStart];

    if (endSide === "top") {
      preEnd.y = preEnd.y - bezierPad;
    } else if (endSide === "bottom") {
      preEnd.y = preEnd.y + bezierPad;
    } else if (endSide === "left") {
      preEnd.y = end.y;
      preEnd.x = end.x - bezierPad;
    } else if (endSide === "right") {
      preEnd.y = end.y;
      preEnd.x = end.x + bezierPad;
    }

    points.push(preEnd);
    points.push(end);
    var path = points.reduce(function (acc, point, i) {
      if (i === 0) {
        return "M " + point.x + "," + point.y;
      }

      if (i === points.length - 1) {
        return acc + (" L " + point.x + "," + point.y);
      }

      var prevPoint = points[i - 1];
      var nextPoint = points[i + 1];

      if (prevPoint.x === point.x || prevPoint.y === point.y) {
        return acc + (" L " + point.x + "," + point.y);
      }

      var nextDx = nextPoint.x - point.x;
      var nextDy = nextPoint.y - point.y;
      var midpoint2 = {
        x: point.x + nextDx / 2,
        y: point.y + nextDy / 2
      };
      return acc + (" Q " + point.x + "," + point.y + " " + midpoint2.x + "," + midpoint2.y);
    }, "");
    return path;
  }),
});