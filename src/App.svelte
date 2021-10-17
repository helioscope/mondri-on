<script>
  import { onMount } from 'svelte';
  import _ from 'lodash';
  import TweakPane from 'tweakpane';

  import BSPNode from './BSPNode.js';
  import {downloadCanvasAsImage} from './exportUtil';

  const Tools = {
    Split : "SPLIT_TOOL",
    Fill : "FILL_TOOL",
    Eyedropper : "EYEDROPPER_TOOL"
  };

  let canvasElem = null;
  let ctx = null;
  let bspRoot = null;

  let activeTool = Tools.Split;
  // let highlightedNeighbors = [];
  // let highlightedTarget = null;

  let leafNodes = [];

  let cursorX = 0;
  let cursorY = 0;
  let cursorAxisLocked = false;
  let cursorPressed = false;
  let cursorLockX = 0;
  let cursorLockY = 0;
  let cursorOnCanvas = true;
  let lastHoveredNode = null; // updated each animation frame (not every mouse event)

  let tweakPane = null;
  let fillModeFolder = null;
  let splitModeFolder = null;
  let tpSplitButton = null;
  let tpFillButton = null;
  let tpEyedropperButton = null;

  let savedEyedropperColor = '#00000000';

  let mainSettings = {
    lineWidth:1,
    strokeStyle:'#FFFFFFFF',
    fillStyle: '#FF000AFF',
    backgroundColor: "#000000",
    splitHorizontally: true,
    drawLines: true
  }

  onMount(()=>{
    ctx = canvasElem.getContext("2d");
    initBSPCanvas();

    canvasElem.addEventListener('mousemove', onMouseMove);
    canvasElem.addEventListener('mousedown', onMouseDown);
    canvasElem.addEventListener('mouseover', onMouseOverCanvas);
    canvasElem.addEventListener('mouseout', onMouseOutCanvas);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keypress', onKeyPress);
    document.addEventListener('keyup', onKeyRelease);

    tweakPane = new TweakPane({title: "controls & settings"});
    tweakPane.addInput(mainSettings, 'backgroundColor', {label: 'canvas'}).on('change', redrawCanvas);
    tweakPane.addInput(mainSettings, 'strokeStyle', {label: 'line'}).on('change', redrawCanvas);
    tweakPane.addInput(mainSettings, 'drawLines', {label: 'draw lines'}).on('change', redrawCanvas);
    
    tweakPane.addSeparator();
    
    tpSplitButton = tweakPane.addButton({title: 'split'}).on('click', ()=>{setActiveTool(Tools.Split)});
    tpFillButton = tweakPane.addButton({title: 'fill'}).on('click', ()=>{setActiveTool(Tools.Fill)});
    tpEyedropperButton = tweakPane.addButton({title: 'sample color'}).on('click', ()=>{setActiveTool(Tools.Eyedropper)});

    tweakPane.addSeparator();

    fillModeFolder = tweakPane.addFolder({title: 'fill mode'});
    fillModeFolder.addInput(mainSettings, 'fillStyle', {label: 'color'}).on('change', redrawCanvas);
    splitModeFolder = tweakPane.addFolder({title: "split mode"});
    splitModeFolder.addInput(mainSettings, 'splitHorizontally', {label: 'split x'});

    updateToolUI();

    redrawCanvas();
    requestAnimationFrame(onAnimationFrame);
	});
  
  function onMouseMove(e) {
    updateCursorState(e);
  }

  function onMouseDown(e) {
    if (e.button < 2) { // in a quick test, left-press button==0; right-press button==2
      cursorPressed = true;
    }
    updateCursorState(e);
    if (activeTool === Tools.Split) {
      let effectiveCursorPos = getEffectiveCursorPos();
      attemptSplit(effectiveCursorPos.x, effectiveCursorPos.y);
    } else if (activeTool === Tools.Fill) {
      assignFill(cursorX, cursorY);
      // highlightNeighbors(cursorX, cursorY);
    } else if (activeTool === Tools.Eyedropper) {
      sampleColor(cursorX, cursorY, true);
    } else {
      throw new Error("unsupported tool click: " + activeTool);
    }
  }

  function onMouseUp(e) {
    if (e.button < 2 || e.buttons === 0) {
      cursorPressed = false;
    }
  }

  function onMouseOverCanvas() {
    cursorOnCanvas = true;
  }
  function onMouseOutCanvas() {
    cursorOnCanvas = false;
  }

  function onKeyPress(e) {
    let lowercaseKeyName = e.key.toLowerCase();
    if (lowercaseKeyName === 'x') {
      mainSettings.splitHorizontally = !mainSettings.splitHorizontally;
      if (cursorAxisLocked) {
        cursorLockX = cursorX;
        cursorLockY = cursorY;
      }
      updateToolUI();
    } else if (lowercaseKeyName === 'z') {
      if (activeTool === Tools.Split) {
        setActiveTool(Tools.Fill);
      } else {
        setActiveTool(Tools.Split);
      }
    } else if (lowercaseKeyName === 'c') {
      setActiveTool(Tools.Eyedropper);
    } else if (lowercaseKeyName === '`' || lowercaseKeyName === '~') {
      mainSettings.drawLines = !mainSettings.drawLines;
      updateToolUI();
    }
  }

  function onKeyRelease(e) {
    let lowercaseKeyName = e.key.toLowerCase();
    if (lowercaseKeyName === 'shift') {
      cursorAxisLocked = false;
    }
  }

  function onClickDownload() {
    downloadCanvasAsImage(canvasElem, 'mondri-on--image');
  }

  function onClickReset() {
    bspRoot.clear(); // just to help garbage collection
    initBSPCanvas();
    redrawCanvas();
  }

  function updateCursorState(e) {
    let lockKeyHeld = e.shiftKey;
    
    cursorX = e.offsetX;
    cursorY = e.offsetY;

    if (cursorAxisLocked !== lockKeyHeld) {
      if (!cursorAxisLocked) {
        cursorLockX = cursorX;
        cursorLockY = cursorY;
      }
    }

    cursorAxisLocked = lockKeyHeld;

    if (e.buttons === 0) {
      cursorPressed = false;
    }
  }

  function getEffectiveCursorPos() {
    let x = cursorX;
    let y = cursorY;
    if (cursorAxisLocked) {
      if (activeTool === Tools.Split) {
        if (mainSettings.splitHorizontally) {
          y = cursorLockY;
        } else {
          x = cursorLockX;
        }
      }
    }
    return {x: x, y: y};
  }

  function initBSPCanvas() {
    bspRoot = new BSPNode(1, 1, canvasElem.width-1, canvasElem.height-1);
    bspRoot.customData.fillStyle = "#00000000";
    leafNodes = [bspRoot];
  }
  
  function setActiveTool(toolId) {
    if (activeTool !== toolId) {
      if (toolId === Tools.Eyedropper) {
        savedEyedropperColor = mainSettings.fillStyle;
      }
      if (activeTool === Tools.Eyedropper) {
        mainSettings.fillStyle = savedEyedropperColor;
      }
    }
    activeTool = toolId;
    updateToolUI();
  }

  function attemptSplit(x,y) {
    let targetNode = getLeafUnderPoint(x,y);
    if (targetNode) {
      if (mainSettings.splitHorizontally) {
        targetNode.splitY(y - targetNode.bounds.min.y);
      } else {
        targetNode.splitX(x - targetNode.bounds.min.x);
      }

      // preserve color after split
      targetNode.childA.customData.fillStyle = targetNode.childB.customData.fillStyle = targetNode.customData.fillStyle;

      leafNodes = [];
      bspRoot.gatherLeaves(leafNodes);
    }
  }

  function assignFill(x,y) {
    let targetNode = getLeafUnderPoint(x,y);
    if (targetNode) {
      targetNode.customData.fillStyle = mainSettings.fillStyle;
    }
  }

  function sampleColor(x,y, commitColor) {
    let targetNode = getLeafUnderPoint(x,y);
    if (targetNode) {
      mainSettings.fillStyle = targetNode.customData.fillStyle;
      updateToolUI();
      if (commitColor) {
        savedEyedropperColor = mainSettings.fillStyle;
        setActiveTool(Tools.Fill);
      }
    }
  }

  // function highlightNeighbors(x,y) {
  //   let targetNode = getLeafUnderPoint(x,y);
  //   if (targetNode) {
  //     if (targetNode == highlightedTarget) {
  //       highlightedTarget = null;
  //       highlightedNeighbors = [];
  //     } else {
  //       let neighbors = targetNode.getNeighboringLeaves();
  //       highlightedNeighbors = neighbors.top.concat(neighbors.right, neighbors.bottom, neighbors.left);
  //       highlightedTarget = targetNode;
  //     }
  //   }
  // }

  function getLeafUnderPoint(x,y) {
    return _.find(leafNodes, (node) => {
      return node.containsPoint(x,y);
    });
  }

  function onAnimationFrame() {
    if (cursorPressed) {
      if (activeTool === Tools.Fill) {
        assignFill(cursorX, cursorY);
      } else if (activeTool === Tools.Split && cursorAxisLocked) {
        let effectiveCursorPos = getEffectiveCursorPos(cursorX, cursorY);
        let hoveredNode = getLeafUnderPoint(effectiveCursorPos.x, effectiveCursorPos.y);
        if (hoveredNode && hoveredNode !== lastHoveredNode) {
          attemptSplit(effectiveCursorPos.x, effectiveCursorPos.y);
        }
      }
    }
    redrawCanvas();
    requestAnimationFrame(onAnimationFrame);
  }

  function redrawCanvas() {
    clearCanvas();
    if (activeTool === Tools.Split) {
      drawLeafNodes();
      if (cursorOnCanvas) {
        drawSplitterLine(); 
      }
    } else if (activeTool === Tools.Fill) {
      // drawHighlightedNodes();
      drawLeafNodes();
      if (cursorOnCanvas) {
        drawFillTarget();
      }
    } else if (activeTool === Tools.Eyedropper) {
      drawLeafNodes();
      sampleColor(cursorX,cursorY, false);
    }
  }

  function drawLeafNodes() {
    _.each(leafNodes, (node) => {
      node.drawToCanvas(ctx, {
        strokeStyle: (mainSettings.drawLines? mainSettings.strokeStyle : '#00000000'),
        lineWidth: mainSettings.lineWidth,
        fillStyle: node.customData.fillStyle
      });
    });
  }

  function clearCanvas() {
    ctx.beginPath();
    ctx.rect(0,0, canvasElem.width, canvasElem.height);
    ctx.fillStyle = mainSettings.backgroundColor;
    ctx.fill();
  }

  // function drawHighlightedNodes() {
  //   if (highlightedTarget) {
  //     highlightedTarget.drawToCanvas(ctx, {fillStyle : 'orange'});
  //   }
  //   _.each(highlightedNeighbors, (node) => {
  //     node.drawToCanvas(ctx, {fillStyle: 'yellow'})
  //   })
  // }

  function drawFillTarget() {
    let highlightedTarget = getLeafUnderPoint(cursorX, cursorY);
    if (highlightedTarget) {
      // first clear canvas to make sure we get the right opacity
      highlightedTarget.drawToCanvas(ctx, {
        strokeStyle: "#00000000",
        lineWidth: 0,
        fillStyle : mainSettings.backgroundColor
      });
      // then draw the actual color
      highlightedTarget.drawToCanvas(ctx, {
        strokeStyle: mainSettings.strokeStyle,
        lineWidth: mainSettings.lineWidth,
        fillStyle : mainSettings.fillStyle
      });
    }
  }

  function drawSplitterLine() {
    let cpos = getEffectiveCursorPos();
    let startX, endX, startY, endY = 0;
    let targetNode = getLeafUnderPoint(cpos.x, cpos.y);

    if (targetNode == null) {
      return;
    }

    if (mainSettings.splitHorizontally) {
      startX = targetNode.bounds.min.x;
      endX = targetNode.bounds.max.x;
      startY = cpos.y;
      endY = cpos.y;
    } else {
      startX = cpos.x;
      endX = cpos.x;
      startY = targetNode.bounds.min.y;
      endY = targetNode.bounds.max.y;
    }

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.lineWidth = 1;
    ctx.strokeStyle = mainSettings.strokeStyle;
    ctx.stroke();
  }

  function updateToolUI() {
    splitModeFolder.hidden = true;
    fillModeFolder.hidden = true;
    tpSplitButton.title = "split";
    tpFillButton.title = "fill";
    tpEyedropperButton.title = "copy color";

    if (activeTool === Tools.Split) {
      tpSplitButton.title = "=> split <=";
      splitModeFolder.hidden = false;
    } else if (activeTool === Tools.Fill) {
      tpFillButton.title = "=> fill <=";
      fillModeFolder.hidden = false;
    } else if (activeTool === Tools.Eyedropper) {
      tpEyedropperButton.title = "=> copy color <=";
      fillModeFolder.hidden = false;
    }

    tweakPane.refresh();
  }
  
</script>

<main>
	<h1 class="app-name">
		mondri-on
  </h1>

  <canvas id="main-canvas" width="800" height="500" bind:this={canvasElem}></canvas>

  <div class="hotkey-info">
    hotkeys: (Z) - toggle between fill & split. (X) - toggle split direction. (C) - enter copy-color mode. (Shift) - lock split X/Y. (~) - toggle lines.
  </div>

  <div id="bottom-buttons">
    <button on:click={onClickDownload}>save image</button>
    <button on:click={onClickReset}>empty canvas</button>
  </div>
</main>

<style>
	main {
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
    text-align: center;
	}

	.app-name {
		color: #737373;
		font-size: 4em;
		font-weight: 100;
		max-width: 400px;
		margin: auto;
    text-align: center;
	}

  .hotkey-info {
    font-size: 12px;
    opacity: 0.75;
  }

  #bottom-buttons {
    margin-top: 20px;
  }

  canvas {
    box-shadow: #0206370a 0px 0px 2px 2px;
  }

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>