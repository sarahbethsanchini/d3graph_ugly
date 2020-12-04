/*
 Copyright (c) 2016, BrightPoint Consulting, Inc.
 
 MIT LICENSE:
 
 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 documentation files (the 'Software'), to deal in the Software without restriction, including without limitation
 the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
 and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 
 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 
 THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
 TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 IN THE SOFTWARE.
 */

// @version 2.1.16


/**
 * The weighted tree renders hierarchical data in an expandable tree format where both branch width and node radius represent data parameters.
 * @class
 * @constructor
 * @param {DOMElement} parent - Container element that will render the component.
 *
 * @fires node_refresh
 * @fires data_prepped
 *
 * @example
 *
 * var myData = [
 *  node {
 *      propertyA: 10,
 *      propertyB: 20,
 *      propertyC: 30,
 *      name: 'myNode1'
 *      values: [
 *          node {...},
 *          node {...},
 *          node {...}
 *      ]
 *  },
 *  node {...}
 * ]
 *
 * var viz = vizuly2.weighted_tree()
 *   .data(myData)
 *   .children('values')
 *   .value('propertyA')  //Used for radius of nodes and thickness of branches
 *   .label('name');      //Used for node labels
 *
 *
 */
vizuly2.viz.WeightedTree = function (parent) {
	
	// This is the object that provides pseudo 'protected' properties that the vizuly2.viz function helps create
	var scope = {};
	
	var d3 = vizuly2.d3;
	
	/** @lends vizuly2.viz.weighted_tree */
	var properties = {
		/**
		 * Hierarchal nested array of nodes to be rendered.
		 * @type {Array}
		 */
		'data': null,
		/**
		 * Margins between tree and border of container
		 * @type {Object}
		 * @default  {top:'5%', bottom:'5%', left:'8%', right:'10%'}
		 */
		'margin': {
			'top': '5%',
			'bottom': '5%',
			'left': '8%',
			'right': '7%'
		},
		/**
		 * width of tree in pixels
		 * @type {Number}
		 */
		'width': 600,
		/**
		 * height of tree in pixels
		 * @type {Number}
		 * @default 600
		 */
		'height': 600,
		/**
		 * object property that is a unique identifier for a given node.
		 * @type {String}
		 */
		'key': null,
		/**
		 * Tree layout that will be used.  You can pass in a different tree layout, or modify this one on the fly.
		 * @type {d3.layout.tree}
		 * @default d3.layout.tree
		 */
		'tree': d3.tree(),
		/**
		 * object property for nested child array
		 * @type {String}
		 */
		'children': null,
		/**
		 * time(in milliseconds) of any animated transitions like the opening/closing of tree branches.
		 * @type {Number}
		 */
		'duration': 500,
		/**
		 * object property for value representing node radius and branch thickness
		 * @type {String}
		 * @default 600
		 */
		'value': null,
		/**
		 * object property for value formatter for data tip
		 * @type {String}
		 * @default 600
		 */
		'valueFormatter': function (d) { return d },
		/**
		 * dynamic function that returns the appropriate label for a given node.
		 * @type {Function}
		 * @default  function (d,i) { return d; }
		 */
		'label': labelFunction,
		/**
		 * Determines vertical node spacing as a percentage of total height;
		 * @type {Number}
		 * @default -1 will use automatic spacing;
		 */
		'maxNodeRadius': -1,
		/**
		 * Determines horizontal node spacing as a fixed pixel amount;
		 * @type {Number}
		 * @default -1 will use automatic spacing;
		 */
		'horizontalPadding': -1,
		/**
		 * Determines vertical node spacing as a fixed pixel amount;
		 * @type {Number}
		 * @default -1 will use automatic spacing;
		 */
		'verticalPadding': -1,
		/**
		 * Use zoom transform
		 * @type {Boolean}
		 * @default Allows automatic zooming of nodes
		 */
		'useZoom': true,
		'useZoomToNode': true,
		'dataTipRenderer': dataTipRenderer
		
	};
	
	var styles = {
		'label-color': '#333',                    // Color of the center label
		'link-colors': ['#bd0026', '#fecc5c', '#fd8d3.', '#f03b20', '#B02D5D', '#9B2C67', '#982B9A', '#692DA7', '#5725AA', '#4823AF', '#d7b5d8', '#dd1c77', '#5A0C7A', '#5A0C7A'],
		'link-stroke': function (d, i) {
			return d.target.data.vz_link_color;
		},
		'link-stroke_opacity': function (d, i) {
			if (viz.value()(d.target) <= 0) return .15;
			return .35;                           // Dynamic function that returns opacity (in this case it is 1, but the WHITE skin uses a dynamic opacity
		},
		'node-fill': function (d, i) {
			return d.data.vz_link_color;
		},
		'node-fill-opacity': function (d, i) {
			if (viz.value()(d) <= 0) return .15;
			return .4;
		},
		'node-stroke': function (d, i) {
			return d.data.vz_link_color;
		},
		'node-stroke-opacity': function (d, i) {
			return .6;
		},
		'text-fill-opacity': function (d, i) {
			if (viz.value()(d) <= 0) return .35;
			return 1;
		},
		'font-size': function () {
			return fontSize + 'px';
		}
	}
	
	var labelFunction = function (d, i) {
		return d;
	};
	
	//Create our viz and type it
	var viz = vizuly2.core.component(parent, scope, properties, ['node_refresh', 'data_prepped']);
	viz.type = 'viz.chart.weighted_tree';
	
	var dataIsDirty = true;
	var refreshNeeded = false;
	viz.on('data_change.internal', onDataChanged);
	viz.on('height_change.internal', resetZoom);
	viz.on('width_change.internal', resetZoom);
	
	
	//Measurements
	var size;                               // Holds the 'size' variable as defined in viz.util.size()
	var tree = scope.tree;                  // Tree layout
	var nodeScale = d3.scaleSqrt();        // Scale used for node radius
	var root, nodes;                         // Data storage for display tree
	var depthSpan;                          // Width to use for horizontal span - can be fixed (scope.horizontalPadding) or dynamically sized by viz.width
	var maxDepth;                           // Deepest level of tree
	var maxValues = {};                       // Maximum value for a given tree level - needed to calc node radius
	var minValues = {};                       // Minimum value for a give tree level - needed to calc node radius
	var diagonal = d3.linkHorizontal()      // Link layout.
	var hieararchy;
	var fontSize = 12;
	var cx, cy;
	
	var zoom = d3.zoom();
	
	//Used to calc our node radius for each node based on min/max values per depth.
	var nodeRadius = function (node) {
		//Set max size/2 for root node.
		var r;
		if (node.depth == 0 || !node.data) {
			r = nodeScale.range()[1] / 2;
		}
		else {
			nodeScale.domain([minValues[node.depth], maxValues[node.depth]]);
			r = nodeScale(scope.value(node.data));
		}
		return isNaN(r) ? 0 : r;
	}
	
	//These are all d3.selection objects we use to insert and update svg elements into
	var svg, g, background, plot, plotBackground, linkPlot, nodePlot, defs;
	
	
	// This is called once at initial object creation and sets up the appropriate SVG container elements.
	function initialize() {
		
		viz.defaultStyles(styles);
		
		scope.selection.attr('class', 'vz-weighted_tree-viz');
		svg = scope.selection.append('svg').attr('id', scope.id).style('overflow', 'hidden').attr('class', 'vizuly vz-weighted_tree-viz');
		defs = vizuly2.core.util.getDefs(viz);
		background = svg.append('rect').attr('class', 'vz-background').style('fill', '#FFF').style('fill-opacity', 0.001);
		g = svg.append('g').attr('class', 'vz-weighted_tree-viz');
		plot = g.append('g').attr('class', 'vz-weighted_tree-plot');
		plotBackground = plot.append('rect').attr('class', 'vz-plot-background');
		linkPlot = plot.append('g').attr('class', 'vz-weighted_tree-link-plot');
		nodePlot = plot.append('g').attr('class', 'vz-weighted_tree-node-plot');
		
		if (scope.useZoom) zoom.on('zoom', onZoom);
		
		background.call(zoom);
		
		// Create horizontal tree by transposing projection
		diagonal.x(function (d) {
			 return d.y
		 })
		 .y(function (d) {
			 return d.x
		 });
		
		// Tell everyone we are done initializing
		scope.dispatch.apply('initialize', this);
	}
	
	
	// This function performs any measurement or layout calcuations prior to making any updates to the SVG element
	function measure() {
		
		// Call our validate routine and make sure all component properties have been set
		viz.validate();
		
		// Get our size based on height, width, and margin
		size = vizuly2.core.util.size(scope.margin, scope.width, scope.height);
		
		// Set size of tree
		tree.size([size.width, size.height]);
		
		// Each time the data changes we need to prep data and other settings for tree layout
		if (dataIsDirty == true || refreshNeeded) {
			
			refreshData();
			
			if (dataIsDirty == true) {
				function collapse(d) {
					if (d.children) {
						d._children = d.children;
						d._children.forEach(collapse);
						d.children = null;
					}
				}
				
				hieararchy.children.forEach(collapse);
			}
			// Let anyone know we have just prepped data (themes, etc may need to adjust settings)
			
			dataIsDirty = false;
			refreshNeeded = false;
			//scope.selection.selectAll('.vz-weighted_tree-node').remove();
		}
		
		//We dynamically size based on how many first level nodes we have
		var scale;
		if (scope.maxNodeRadius == -1) {
			scale = size.height / scope.children(scope.data).length;
		}
		else {
			scale = scope.maxNodeRadius;
		}
		
		if (scope.verticalPadding == -1) {
			tree.nodeSize([scale, 0]);
		}
		else {
			tree.nodeSize([scope.verticalPadding, 0]);
		}
		
		nodeScale.range([1.5, scale / 2]);
		
		depthSpan = (scope.horizontalPadding > 0) ? scope.horizontalPadding : size.width / (maxDepth + 1);
		
		//Set max/min values
		for (var i = 1; i < maxDepth + 1; i++) {
			var vals = nodes.filter(function (d) {
				return d.depth == i
			});
			maxValues[i] = d3.max(vals, function (d) {
				return scope.value(d.data)
			});
			minValues[i] = d3.min(vals, function (d) {
				return scope.value(d.data)
			});
		}
		
		cx = size.left;
		cy = size.top + size.height / 2;
		
		// Tell everyone we are done making our measurements
		scope.dispatch.apply('measure', this);
		
	}
	
	// Re sorts and measures tree layout based on current data hiearachy.
	// Should be called from *viz.update(true)* whenever data structure has changed
	function refreshData() {
		
		function setChildren(node) {
			if (scope.children(node)) {
				if (!node._children) {
					node.children = scope.children(node);
					node.children.forEach(function (d) {
						//Set these from parent node
						d.x0 = node.x;
						d.y0 = node.y;
						setChildren(d);
					});
				}
			}
		}
		
		maxDepth = 0;
		setChildren(scope.data);
		
		root = scope.data;
		root.x0 = 0;
		root.y0 = 0;
		
		hieararchy = d3.hierarchy(root, scope.children);
		
		nodes = tree(hieararchy).descendants();
		
		nodes.forEach(function (node) {
			if (node.depth == 0) return;
			if (!maxValues[node.depth]) {
				maxValues[node.depth] = -Infinity;
				minValues[node.depth] = Infinity;
			}
			maxDepth = Math.max(maxDepth, node.depth)
		})
		scope.dispatch.apply('data_prepped', this);
	}
	
	function onDataChanged() {
		dataIsDirty = true;
		
	}
	
	
	// The update function is the primary function that is called when we want to render the visualiation based on
	// all of its set properties.  A developer can change properties of the components and it will not show on the screen
	// until the update function is called
	function update(refresh) {
		
		// Call measure each time before we update to make sure all our our layout properties are set correctly
		measure();
		
		// Layout all of our primary SVG d3.elements.
		svg.attr('width', scope.width).attr('height', scope.height);
		background.attr('width', scope.width).attr('height', scope.height);
		plot.style('width', size.width).style('height', size.height);
		
		// We make a call to render the root node
		updateNode(root);
		
	}
	
	
	// This function takes a given node and expands its children within the tree.  It gets called each time a user toggles a node.
	function updateNode(rootNode, duration) {
		
		if (!duration) duration = scope.duration;
		
		var nodes = tree(hieararchy).descendants();
		
		// Compute the new tree layout.
		var links = hieararchy.links();
		
		updateTreeSize(rootNode, nodes);
		
		// Update the nodes…
		var node = nodePlot.selectAll('.vz-weighted_tree-node')
		 .data(nodes, function (d) {
			 return d.data.vz_tree_id || (d.data.vz_tree_id = scope.key(d.data));
		 });
		
		// Enter any new nodes at the parent's previous position.
		var nodeEnter = node.enter().append('g')
		 .attr('class', function (d) {
			 return 'vz-weighted_tree-node vz-id-' + d.data.vz_tree_id;
		 })
		 .attr('transform', function (d) {
			 var y = d.y0 ? d.y0 : rootNode.y0;
			 var x = d.x0 ? d.x0 : rootNode.x0;
			 return 'translate(' + y + ',' + x + ')';
		 })
		 .on('click', function (d, i) {
		 	 toggleNode(d);
			 scope.dispatch.apply('click', viz, [this, d, i])
		 })
		 .on('dblclick', function (d, i) {
			 scope.dispatch.apply('dblclick', viz, [this, i])
		 })
		 .on('mouseover', function (d, i) {
			 scope.dispatch.apply('mouseover', viz, [this, d, i])
		 })
		 .on('mouseout', function (d, i) {
			 scope.dispatch.apply('mouseout', viz, [this, d, i])
		 });
		
		nodeEnter.append('circle')
		 .attr('class', '.vz-weighted_tree-node-circle')
		 .attr('r', 1e-6)
		 .style('cursor', 'pointer');
		
		nodeEnter.append('text')
		 .attr('x', function (d) {
			 return d.children || d._children ? -10 : 10;
		 })
		 .attr('dy', '.35em')
		 .attr('text-anchor', function (d) {
			 return d.children || d._children ? 'end' : 'start';
		 })
		 .style('pointer-events', 'none')
		 .text(function (d) {
			 return scope.label(d.data)
		 });
		
		// Transition exiting nodes to the parent's new position.
		var nodeExit = node.exit().transition()
		 .duration(duration)
		 .attr('transform', function (d) {
			 d.x0 = null;
			 d.y0 = null;
			 return 'translate(' + rootNode.y + ',' + rootNode.x + ')';
		 })
		 .remove();
		
		nodeExit.select('circle')
		 .attr('r', 1e-6);
		
		node = nodeEnter.merge(node);
		
		// Update the links…
		var link = linkPlot.selectAll('.vz-weighted_tree-link')
		 .data(links, function (d) {
			 return d.target.data.vz_tree_id;
		 });
		
		// Enter any new links at the parent's previous position.
		var linkEnter = link.enter().append('path')
		 .attr('class', function (d) {
			 return 'vz-weighted_tree-link vz-id-' + d.target.data.vz_tree_id;
		 })
		 .attr('d', function (d) {
			 var y = d.target.y0 ? d.target.y0 : rootNode.y0;
			 var x = d.target.x0 ? d.target.x0 : rootNode.x0;
			 var o = {x: x, y: y};
			 return diagonal({source: o, target: o});
		 })
		 .style('stroke-linecap', 'round')
		 .style('pointer-events', 'none');
		
		
		// Transition exiting nodes to the parent's new position.
		link.exit().transition()
		 .duration(duration)
		 .attr('d', function (d) {
			 var o = {x: rootNode.x, y: rootNode.y};
			 return diagonal({source: o, target: o});
		 })
		 .remove();
		
		link = linkEnter.merge(link);
		
		//Before we fire transition we hit update so any external styles can take effect before we transition.
		scope.dispatch.apply('update', this);
		
		// Transition nodes to their new position.
		var nodeUpdate = node.transition().duration(duration);
		
		endUpdate(nodeUpdate, function () {
			scope.dispatch.apply('node_refresh', viz)
		});
		
		nodeUpdate
		 .attr('transform', function (d) {
			 return 'translate(' + d.y + ',' + d.x + ')';
		 });
		
		nodeUpdate.select('circle')
		 .attr('r', nodeRadius)
		 .style('cursor', function (d) {
			 return (d.children || d._children) ? 'pointer' : 'auto'
		 })
		
		
		// Transition links to their new position.
		link.transition()
		 .duration(duration)
		 .attr('d', diagonal)
		 .style('stroke-width', function (d) {
			 return (nodeRadius(d.target) * 2) + 'px';
		 });
		
		// Stash the old positions for transition.
		nodes.forEach(function (d) {
			d.x0 = d.x;
			d.y0 = d.y;
		});
		
	}
	
	// Repositions nodes according to layout and makes tree bigger with scrolling if it needs to accomodate larger tree
	function updateTreeSize(rootNode, nodes) {
		
		// Figure out our total height of current display
		maxX = -Infinity;
		maxY = -Infinity;
		minX = Infinity;
		minY = Infinity;
		
		nodes.forEach(function (d) {
			d.r = nodeRadius(d);
			maxX = Math.max(d.x, maxX);
			maxY = Math.max(d.y, maxY);
			minX = Math.min(d.x, minX);
			minY = Math.min(d.y, minY);
		})
		
		if (scope.useZoom && zoom) {
			var t = d3.zoomTransform(background.node());
			minY = minY * t.k;
			maxY = maxY * t.k;
			maxX = maxX * t.k;
		}
		
		var h = Math.max(scope.height, maxX - minX + size.top);   // calc height
		var w = Math.max(scope.width, maxY + scope.width * .2 + size.left);               // calc width;
		
		
		// if the span between minY and maxY is less than the total height, but maxY + half the height is MORE than the total height
		// we need to make the height bigger.  i.e.  If expanded node is below the root node and it expands beyond the bottom of the screen.
		if (size.height / 2 + maxY > h) h = size.height / 2 + maxY + tree.nodeSize()[0];
		svg.transition().duration(scope.duration).style('height', h + 'px').style('width', w + 'px');
		
		//Now determine how far above the fold this minY is
		var offsetY = Math.max(0, -minY - size.height / 2) + tree.nodeSize()[0] / 2;
		
		// Normalize for fixed-depth.
		nodes.forEach(function (d) {
			d.y = d.depth * depthSpan + cx;
			
			//Adjust y position to accomodate offset
			d.x = d.x + offsetY + cy - tree.nodeSize()[0];
		});
		
		//Scroll to position of the rootNode node.
		scrollTop(rootNode.x);
	}
	
	// Fired after all transitions for tree are complete
	function endUpdate(transition, callback) {
		var n = 0;
		transition
		 .each(function () {
			 ++n;
		 })
		 .on('end', function () {
			 if (!--n) callback.apply(this, arguments);
		 });
	}
	
	
	// Scrolls to the top measure provided
	function scrollTop(top) {
		scope.selection.transition().duration(scope.duration)
		 .tween('scrolltween', scrollTopTween(top));
		
		function scrollTopTween(scrollTop) {
			return function () {
				var i = d3.interpolateNumber(this.scrollTop, scrollTop);
				return function (t) {
					this.scrollTop = i(t);
				};
			};
		}
	}
	
	function onZoom() {
		if (scope.useZoom) {
			var t = d3.event.transform;
			plot.attr('transform', 'translate(' + t.x + ',' + t.y + ')scale(' + t.k + ')');
			scope.dispatch.apply('zoom', viz);
		}
	}
	
	function zoomToNode(d) {
		if (d && scope.useZoom && scope.useZoomToNode) {
			var scale = d3.zoomTransform(background.node()).k;
			var t = d3.zoomIdentity.translate((-d.y * scale) + size.width / 4, (-d.x * scale) + size.height / 2).scale(scale)
			plot.transition().duration(1000)
			 .attr('transform', 'translate(' + t.x + ',' + t.y + ')scale(' + t.k + ')')
			
			//Disable zoom event so we can reset transform
			zoom.on('zoom', null);
			background.call(zoom.transform, t);
			zoom.on('zoom', onZoom);
			scope.dispatch.apply('zoom', viz)
		}
	}
	
	function resetZoom() {
		if (scope.useZoom) {
			var t = d3.zoomIdentity.translate(0, 0).scale(1)
			zoom.on('zoom', null);
			background.call(zoom.transform, t);
			background.call(zoom);
			zoom.on('zoom', onZoom);
			plot.attr('transform', 'translate(0, 0) scale(1)');
		}
	}
	
	// Toggles node.
	function toggleNode(d) {
		if (d.children) {
			d._children = d.children;
			d.children = null;
			updateNode(d, 0);
			if (d.parent) zoomToNode(d.parent);
		} else {
			d.children = d._children;
			d._children = null;
			updateNode(d, 0);
			if (d.children) zoomToNode(d);
		}
	}
	
	function scaleToHeight() {
		var nodes = nodePlot.selectAll(".vz-weighted_tree-node")
		minX = minY = Infinity;
		maxX = maxY = -Infinity;
		nodes.each(function (d) {
			minX = Math.min(d.x, minX);
			maxX = Math.max(d.x, maxX);
			minY = Math.min(d.y, minY);
			maxY = Math.max(d.y, maxY);
		})
		
		var h = size.height - nodeScale.range()[1];
		
		var scale = h / (maxX - minX);
		
		var t = d3.zoomIdentity.translate(0, -minX * scale + nodeScale.range()[1]).scale(scale)
		background.call(zoom.transform, t);
		
	}
	
	viz.scaleToHeight = function () {
		scaleToHeight();
	}
	
	
	/**
	 *
	 *
	 *  This is will re-render our component
	 *  @param {Boolean} refresh - Passing in a 'TRUE' value will also refresh all data.
	 *  @memberof vizuly2.viz.weighted_tree
	 */
	viz.update = function (refresh) {
		if (refresh == true) refreshNeeded = true;
		update();
		return viz;
	};
	
	/**
	 *
	 * Called to expand or collapse node
	 * @param {Object} d - Datum of node to expand or collapse
	 * @memberof vizuly2.viz.weighted_tree
	 */
	viz.toggleNode = function (d) {
		toggleNode(d);
	};

	var stylesCallbacks = [
		{on: 'update.styles', callback: applyStyles},
		{on: 'measure.styles', callback: styles_prepColorData},
		{on: 'mouseover.styles', callback: styles_onMouseOver},
		{on: 'mouseout.styles', callback: styles_onMouseOut}
	];
	
	viz.applyCallbacks(stylesCallbacks)
	
	//The <code>applyTheme()</code> function is **the heart** of our theme.  This function is triggered on any
	//<code>viz.update()</code> event and is responsible for making all of the primary visual updates to the viz.
	function applyStyles() {
		
		// If we don't have a styles, we want to exit - as there is nothing we can do.
		if (!scope.styles || scope.styles == null) return;
		
		// Grab the d3.**selection** from the viz so we can operate on it.
		var selection = scope.selection;
		
		fontSize = Math.max(8, Math.round(viz.width() / 75));
		
		selection.selectAll('.vz-weighted_tree-node circle')
		 .style('stroke', function (d,i) { return viz.getStyle('node-stroke', arguments) })
		 .style('stroke-opacity', function (d,i) { return viz.getStyle('node-stroke-opacity', arguments) })
		 .style('fill', function (d,i) { return viz.getStyle('node-fill', arguments) })
		 .style('fill-opacity', function (d,i) { return viz.getStyle('node-fill-opacity', arguments) })
		
		selection.selectAll('.vz-weighted_tree-node text')
		 .style('font-size', function (d,i) { return viz.getStyle('font-size', arguments) })
		 .style('fill', function (d,i) { return viz.getStyle('label-color', arguments) })
		 .style('fill-opacity', function (d,i) { return viz.getStyle('text-fill-opacity', arguments) })
		
		selection.selectAll('.vz-weighted_tree-link')
		 .style('stroke', function (d,i) { return viz.getStyle('link-stroke', arguments) })
		 .style('stroke-opacity', function (d,i) { return viz.getStyle('link-stroke-opacity', arguments) })
		
		scope.dispatch.apply('styled', viz);
	}
	
	function styles_prepColorData() {
		
		if (!scope.styles || scope.styles == null) return;
		
		var colors = viz.getStyle('link-colors');
		var nodes = viz.data();
		
		viz.children()(nodes).forEach(function (node, i) {
			node.vz_link_color = colors[i % colors.length];
			styles_setLinkColor(node);
		});

	}
	
	function styles_setLinkColor(node) {
		if (!viz.children()(node)) return;
		viz.children()(node).forEach(function (child) {
			child.vz_link_color = node.vz_link_color;
			styles_setLinkColor(child);
		})
	}
	
	
	//Now we get to some user triggered display changes.
	//For the gauge we simply change the font-weight of the label when a **mouseover** event occurs.
	function styles_onMouseOver(e, d, i) {
		var selection = scope.selection;
		selection.selectAll('.vz-id-' + d.data.vz_tree_id + ' circle').style('fill-opacity', .9);
		selection.selectAll('path.vz-id-' + d.data.vz_tree_id).style('stroke-opacity', .8);
		selection.selectAll('.vz-id-' + d.data.vz_tree_id + ' text').transition().style('font-size', fontSize * 1.25).style('font-weight', 'bold');
		viz.showDataTip(e,d,i);
	}
	
	//On **mouseout** we want to undo any changes we made on the mouseover callback.
	function styles_onMouseOut(e, d, i) {
		
		var selection = scope.selection;
		
		selection.selectAll('.vz-weighted_tree-node circle')
		 .style('fill', function (d,i) { return viz.getStyle('node-fill', arguments) })
		 .style('fill-opacity', function (d,i) { return viz.getStyle('node-fill-opacity', arguments) })
		
		selection.selectAll('.vz-weighted_tree-node text').transition().style('font-size', fontSize).style('font-weight', 'normal');
		
		selection.selectAll('.vz-weighted_tree-link')
		 .style('stroke-opacity', function (d,i) { return viz.getStyle('link-stroke-opacity', arguments) })
		
		viz.removeDataTip();
	}
	
	function dataTipRenderer(tip, e, d, i, x, y) {
		
		var html = '<div class="vz-tip-header1">HEADER1</div>' +
		 '<div class="vz-tip-header-rule"></div>' +
		 '<div class="vz-tip-header2"> HEADER2 </div>' +
		 '<div class="vz-tip-header-rule"></div>' +
		 '<div class="vz-tip-header3" style="font-size:12px;"> HEADER3 </div>';
		
		var h1 = scope.label(d.data);
		var h2 = scope.valueFormatter(scope.value(d.data));
		var h3 = 'Level: ' + d.depth;
		
		html = html.replace("HEADER1", h1);
		html = html.replace("HEADER2", h2);
		html = html.replace("HEADER3", h3);
		
		tip.style('height','80px').html(html);
		
		return [(Number(x) + Number(d3.select(e).attr('width'))),y - 100]
		
	}
	
	
	initialize();
	
	return viz;
	
};