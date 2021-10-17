
export default class BSPNode {

  constructor(xMin=0, yMin=0, xMax=0, yMax=0, parent=null) {
    this.childA = null;
    this.childB = null;
    this.bounds = {
      min : {x: xMin, y: yMin},
      max : {x: xMax, y: yMax},
    };
    this._isLeaf = true;
    this._unlocked = true; // maybe not necessary?
    this.parent = parent;
    // this.name = 'unnamed';
    // this.isGap = false;
    
    // extra bits for other uses
    this.customData = {};

    this.isSplitOnX = false; // maybe should be the axis of the split as an int
    
    this.leftEdgeIsInside = false;
    this.rightEdgeIsInside = false;
    this.topEdgeIsInside = false;
    this.bottomEdgeIsInside = false;

    if (this.parent) {
      this.leftEdgeIsInside = parent.leftEdgeIsInside;
      this.rightEdgeIsInside = parent.rightEdgeIsInside;
      this.topEdgeIsInside = parent.topEdgeIsInside;
      this.bottomEdgeIsInside = parent.bottomEdgeIsInside;
    }
  }

	splitX(offset) {
		if (!this._isLeaf) {
			console.error("Error: tried to split non-leaf bsp node (it seems to be split already)");
			return;
		}
    let bounds = this.bounds;
		this.childA = new BSPNode (
			bounds.min.x,
      bounds.min.y,
			bounds.min.x + offset, 
      bounds.max.y,
      this
    );
    this.childA.rightEdgeIsInside = true; // other edges set from parent (this)

		this.childB = new BSPNode (
			bounds.min.x + offset,
      bounds.min.y,
			bounds.max.x,
      bounds.max.y,
      this
    );
    this.childB.leftEdgeIsInside = true; // other edges set from parent (this)

    this.	_isLeaf = false;
    this.isSplitOnX = true;
	}

	splitY(offset) {
		if (!this._isLeaf) {
			console.error("Error: tried to split non-leaf bsp node (it seems to be split already)");
			return;
		}
    let bounds = this.bounds;
		this.childA = new BSPNode (
			bounds.min.x,
      bounds.min.y,
			bounds.max.x,
      bounds.min.y + offset,
      this
		);
    this.childA.bottomEdgeIsInside = true; // other edges set from parent (this)

		this.childB = new BSPNode (
			bounds.min.x,
      bounds.min.y + offset,
			bounds.max.x,
      bounds.max.y,
      this
    );
    this.childB.topEdgeIsInside = true;

    this._isLeaf = false;
    this.isSplitOnX = false;
	}

	insetXY(xPosInset, yPosInset, xNegInset, yNegInset)  {
    // note yet tested
		let leaves = [];

		let activeNode = this;
    let length = 0;
    
    length = activeNode.bounds.max.y - activeNode.bounds.min.y;
		activeNode.splitY(length - yPosInset); // axis 1, pos ("top edge")
		leaves[1] = activeNode.childB;
		activeNode = activeNode.childA;

    length = activeNode.bounds.max.x - activeNode.bounds.min.x;
		activeNode.splitX (activeNode.bounds.size.x - xPosInset); // axis 2, pos ("right edge")
		leaves[2] = activeNode.childB;
		activeNode = activeNode.childA;

		activeNode.splitY(yNegInset); // axis 1, neg ("bottom edge")
		leaves[3] = activeNode.childA;
		activeNode = activeNode.childB;

		activeNode.splitX (xNegInset); // axis 2, neg ("left edge")
		leaves[4] = activeNode.childA;
		activeNode = activeNode.childB; // this is the center

		leaves [0] = activeNode;

		return leaves;
  }
  
  containsPoint(x,y) {
    let boundsMin = this.bounds.min;
    let boundsMax = this.bounds.max;
    return x > boundsMin.x && x < boundsMax.x && y > boundsMin.y && y < boundsMax.y;
  }

	clear() {
		if (this._unlocked && !this._isLeaf) {
			this._unlocked = false;
			this.childA.clear ();
			this.childB.clear ();
			this.childA = null;
			this.childB = null;
			this._isLeaf = true;
			this._unlocked = true;
		}
	}

	gatherLeaves(leafList) {
		if (this._unlocked) {
			if (!this._isLeaf) {
				this._unlocked = false;
				this.childA.gatherLeaves (leafList);
				this.childB.gatherLeaves (leafList);
				this._unlocked = true;
			} else {
				leafList.push(this);
			}
    }
    return leafList;
  }

  getNeighboringLeaves() {
    // later: find nodes next to center node within the tree starting at rootNode
    let hasLeft = this.leftEdgeIsInside;
    let rootLeft = null;
    let hasRight = this.rightEdgeIsInside;
    let rootRight = null;
    let hasTop = this.topEdgeIsInside;
    let rootTop = null;
    let hasBottom = this.bottomEdgeIsInside;
    let rootBottom = null;

    let numEdgesLeft = 0;

    let targetParent = this.parent;
    let targetChild = this;
    let iterations = 0;
    let maxIterations = 999;

    let neighbors = {
      top: [],
      right: [],
      bottom: [],
      left: [],
    };

    if (hasLeft) {numEdgesLeft++;}
    if (hasRight) {numEdgesLeft++;}
    if (hasTop) {numEdgesLeft++;}
    if (hasBottom) {numEdgesLeft++;}
    
    // walk down parents, looking for the root-most node that addresses each edge.
    // or, to rephrase:
    // gather root nodes for each interior edge of the "center" node by stepping down the tree
    // (if we encounter another node on the same side further down the tree, it's further away, I think?)
    while (numEdgesLeft > 0 && targetParent != null && iterations < maxIterations) {
      let isChildA = (targetParent.childA === targetChild);
      if (targetParent.isSplitOnX) { // x (left-right) split
        if (isChildA) { // other child is right
          if (rootRight == null) {
            rootRight = targetParent.childB;
            numEdgesLeft--;
          }
        } else { // other child is left
          if (rootLeft == null) {
            rootLeft = targetParent.childA;
            numEdgesLeft--;
          }
        }
      } else { // y (top-bottom) split
        if (isChildA) { // other child is bottom
          if (rootBottom == null) {
            rootBottom = targetParent.childB;
            numEdgesLeft--;
          }
        } else { // other child is top
          if (rootTop == null) {
            rootTop = targetParent.childA;
            numEdgesLeft--;
          }
        }
      }
      // consider looking at next parent
      targetChild = targetParent;
      targetParent = targetParent.parent;

      iterations++;

      // loop will exit if parent is null, 
      //    or if we've found a root for all relevant edges,
      //    or if iterations goes super high
      //    (see loop logic above)
    }
    // now that we have a root node for all edges, let's try to find all their leaf descendents that 
    // border on those edges

    if (rootLeft) {
      neighbors.left = rootLeft.getLeavesOnSide(true, false, this.bounds.min.y, this.bounds.max.y);
    }
    if (rootRight) {
      neighbors.right = rootRight.getLeavesOnSide(true, true, this.bounds.min.y, this.bounds.max.y);
    }
    if (rootTop) {
      neighbors.top = rootTop.getLeavesOnSide(false, false, this.bounds.min.x, this.bounds.max.x);
    }
    if (rootBottom) {
      neighbors.bottom = rootBottom.getLeavesOnSide(false, true, this.bounds.min.x, this.bounds.max.x);
    }

    return neighbors;
  }

  getLeavesOnSide(searchOnXAxis, searchOnMinSide, boundaryMin, boundaryMax) {
    let unsearchedNodes = [this];
    let foundLeaves = [];
    let iterations = 0;
    let maxIterations = 999;

    while (unsearchedNodes.length > 0 && iterations < maxIterations) {
      let targetNode = unsearchedNodes.pop();
      if (targetNode._isLeaf) {
        foundLeaves.push(targetNode);
        continue;
      }
      let childA = targetNode.childA;
      let childB = targetNode.childB;
      if (targetNode.isSplitOnX) { // SPLIT ON X
        if (searchOnXAxis) {
          // add the child that's on the appropriate side (closer, not further, to the search side)
          if (searchOnMinSide) {
            unsearchedNodes.push(childA);
          } else {
            unsearchedNodes.push(childB);
          }
        } else {
          // add whichever children are in bounds
          if (childA.bounds.min.x < boundaryMax && childA.bounds.max.x > boundaryMin) {
            unsearchedNodes.push(childA);
          }
          if (childB.bounds.min.x < boundaryMax && childB.bounds.max.x > boundaryMin) {
            unsearchedNodes.push(childB);
          }
        }
      } else { // SPLIT ON Y
        if (searchOnXAxis) {
          // add whichever children are in bounds
          if (childA.bounds.min.y < boundaryMax && childA.bounds.max.y > boundaryMin) {
            unsearchedNodes.push(childA);
          }
          if (childB.bounds.min.y < boundaryMax && childB.bounds.max.y > boundaryMin) {
            unsearchedNodes.push(childB);
          }
        } else {
          // add the child that's on the appropriate side (closer, not further, to the search side)
          if (searchOnMinSide) {
            unsearchedNodes.push(childA);
          } else {
            unsearchedNodes.push(childB);
          }
        }
      }
      iterations++;
    }
    return foundLeaves;
  }
  
  drawToCanvas(canvasContext, options={lineWidth:1, strokeStyle:'green', fillStyle: 'rgba(255,255,255,0.1)'}) {
    // this is handy for debugging, but should it really be part of the class?
    let bounds = this.bounds;
    let sizeX = bounds.max.x - bounds.min.x;
    let sizeY = bounds.max.y - bounds.min.y;

    canvasContext.beginPath();
    canvasContext.rect(bounds.min.x, bounds.min.y, sizeX, sizeY);
    if (options.strokeStyle !== undefined) {
      canvasContext.lineWidth = options.lineWidth;
      canvasContext.strokeStyle = options.strokeStyle;
      canvasContext.stroke();
    }
    if (options.fillStyle !== undefined) {
      canvasContext.fillStyle = options.fillStyle;
      canvasContext.fill();
    }
  }
}
