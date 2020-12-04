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
 * @class
 */
vizuly2.core.util = {};


/**
 * This function converts margin absolute or relative (%) values with a specified width/height into
 * a size object that has the following properties: size.top, size.left, size.height, size.width.
 * This function is used by many of the components and skins to quickly get layout measurements.
 * @example
 *
 * var margin = {top: 10, bottom:10, left:'10%', right: '10%'}
 * var size = vizuly2.core.util.size(margin, 500, 500);
 *
 * //size.width == 400
 * //size.height == 480
 * //size.left == 50
 * //size.top == 10
 *  @function
 *  @param {object} margin - object in this format *{top:10, bottom:10, right:10, left:10}*
 *  @param {Number} width - measured in pixels
 *  @param {Number} height - measured in pixels
 *  @returns {object} Size object in this format: *{top:10, left:10, width:100, height:100}*
 */
vizuly2.core.util.size = function (margin, width, height) {

	var size = {};

	size.width = width - vizuly2.core.util.measure(margin.left, width) - vizuly2.core.util.measure(margin.right, width);
	size.height = height - vizuly2.core.util.measure(margin.top, height) - vizuly2.core.util.measure(margin.bottom, height);
	size.top = vizuly2.core.util.measure(margin.top, height);
	size.left = vizuly2.core.util.measure(margin.left, width);
	size.bottom = vizuly2.core.util.measure(margin.bottom, height);
	size.right = vizuly2.core.util.measure(margin.right, width);

	return size;
}

/**
 * This function creates a scale based on the value being passed into it.
 * It will default to a linear scale if the incoming value is not a string or a date
 * This solves 80% of the use cases for setting up a scale, other use cases can be handled individually at the component
 * or application level
 *  @function
 *  @param {number|string|date} value - Used to determine which type of scale to create.
 *  @returns {vizuly2.d3.scale.linear|vizuly2.d3.scale.ordinal|vizuly2.d3.time.scale }
 */
vizuly2.core.util.getTypedScale = function (value) {
	var scale;
	if (typeof value == 'string') {
		scale = vizuly2.d3.scaleBand();
	}
	else if (value instanceof Date) {
		scale = vizuly2.d3.scaleTime();
	}
	else {
		scale = vizuly2.d3.scaleLinear();
	}
	return scale;
}


/**
 * This function will see if we are using a relative (%) value against a given measure
 * If we are it calculates the percentage value and returns that
 * If we aren't it just returns the original m0 parameter
 * This is primarily used by the vizuly2.core.util.size function.
 * @example
 *
 * var width = vizuly2.core.util.measure(100,100);
 * //width == 100;
 *
 * var width = vizul.util.measure('50%',100);
 * //width == 50;
 *  @function
 *  @param {number|string} m0 - The value we want to get a measur
 *  @param {m1} min - The comparison value we use if we want a relative (%) measure.
 *  @returns {Number} The return value.
 */
vizuly2.core.util.measure = function (m0, m1) {
	if (typeof m0 == 'string' && m0.substr(m0.length - 1) == '%') {
		var r = Math.min(Number(m0.substr(0, m0.length - 1)), 100) / 100;
		return (Math.round(m1 * r));
	}
	else return Number(m0);
};


/**
 * This function generates a unique identifier used by all vizuly2.core.components in their DOM id.
 *  @memberOf vizuly2.core.util
 *  @function
 */
vizuly2.core.util.guid = function () {
	/* REAL GUID
	 return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	 var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
	 return v.toString(16);
	 });
	 */

	//Simple ID that is unique enough for an DOM tree.
	return 'vzxxxxxxxx'.replace(/[xy]/g, function (c) {
		var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
};


/**
 * This function will get a reference to the svg.defs element within a component (assumes only one SVG element)
 * If no def's element is present it will create one
 *  @param {vizuly2.core.component} viz - the vizuly2.core.component being referenced.
 *  @function
 *  @returns {vizuly2.d3.selection} svg 'defs' selection.
 */
vizuly2.core.util.getDefs = function (viz) {
	var defs = viz.selection().selectAll('svg defs');
	if (defs.nodes() && defs.nodes().length < 1)
		defs = viz.selection().select('svg').append('defs');
	return defs;
}


/**
 * This function will convert a string to a CSS friendly key.
 *  @param {String} s - the string to be converted
 *  @function
 *  @returns {String} CSS friendly key
 */
vizuly2.core.util.createCSSKey = function (s) {
	s = String(s).replace(',', '_');
	s = s.replace(/[\s+,'+,\.,\(,\),\']/g, '');
	s = 'css' + s.toUpperCase();
	return s;
}


/**
 * This function will take a vizuly2.d3.nest and perform rollup aggregtations against a given set of properties.
 * This is useful for working with hiearhcal data where you want to perform various calculations on properties at each level of the hierarchy.
 *
 * Warning:  This function will mutate the nest by appending new object properties to each object with the following naming convention
 *
 * obj.myProp --> obj.agg_myProp
 *
 * @example
 * var nest = vizuly2.d3.nest()
 *   .key(function (d) { return d.Level1; })
 *   .key(function (d) { return d.Level2; })
 *   .key(function (d) { return d.Level3; })
 *   .entries(values);
 *
 * vizuly2.core.util.aggregateNest(nest, ['propertyA','propertyB'], function (a, b) {
 *      return Number(a) + Number(b);
 * });
 *
 * //nest[0].propertyA == 10
 * //nest[0].agg_propertyA == 100;
 *
 *  @param {vizuly2.d3.nest} nest - A vizuly2.d3.nest() result.
 *  @param {array} properties - A list of object property names.
 *  @param {function} calculation - The function that will peform the aggregation calculation. (i.e. sum, mean, avg. etc..)
 */
vizuly2.core.util.aggregateNest = function (nest, properties, calculation) {

	//Go down to the last depth and get source values so we can roll them up t

	var deepestChildNode = nest[0];

	while (deepestChildNode.values) {
		deepestChildNode = deepestChildNode.values[0]
	}

	var childProperties = [];

	Object.getOwnPropertyNames(deepestChildNode).forEach(function (name) {
		childProperties.push(name);
	})

	aggregateNodes(nest);

	function setSourceFields(child, parent) {
		if (parent) {
			for (var i = 0; i < childProperties.length; i++) {
				var childProperty = childProperties[i];
				if (child[childProperty] != undefined) {
					child['childProp_' + childProperty] = child[childProperty];
				}
				parent['childProp_' + childProperty] = (child['childProp_' + childProperty]) ? child['childProp_' + childProperty] : child[childProperty];
			}
		}
	}

	function aggregateNodes(nodes, parent) {
		for (var y = 0; y < nodes.length; y++) {
			var node = nodes[y];
			if (node.values) {
				aggregateNodes(node.values, node);
				for (var z = 0; z < node.values.length; z++) {
					var child = node.values[z];
					for (var i = 0; i < properties.length; i++) {
						if (isNaN(node['agg_' + properties[i]])) node['agg_' + properties[i]] = 0;
						node['agg_' + properties[i]] = calculation(node['agg_' + properties[i]], child['agg_' + properties[i]]);
					}
				}
			}
			else {
				for (var i = 0; i < properties.length; i++) {
					node['agg_' + properties[i]] = Number(node[properties[i]]);
					if (isNaN(node['agg_' + properties[i]])) {
						node['agg_' + properties[i]] = 0;
					}
				}
			}
			setSourceFields(node, parent);
		}
	}

}

/**
 * This static function is used to dynamically generate dates on a zoomable axis with the following levels of granularity
 *
 * *Year, Month, Mon & Day*
 *
 * *2016, June, Jun 18*
 *
 */
vizuly2.core.util.format_YEAR_Mon_MonDay = function (date) {
	var formatMillisecond = vizuly2.d3.timeFormat('.%L'),
		formatSecond = vizuly2.d3.timeFormat(':%S'),
		formatMinute = vizuly2.d3.timeFormat('%I:%M'),
		formatHour = vizuly2.d3.timeFormat('%I %p'),
		formatDay = vizuly2.d3.timeFormat('%a %d'),
		formatWeek = vizuly2.d3.timeFormat('%b %d'),
		formatMonth = vizuly2.d3.timeFormat('%b'),
		formatYear = vizuly2.d3.timeFormat('%Y');
	
	return (vizuly2.d3.timeSecond(date) < date ? formatMillisecond
		: vizuly2.d3.timeMinute(date) < date ? formatSecond
			: vizuly2.d3.timeHour(date) < date ? formatMinute
				: vizuly2.d3.timeDay(date) < date ? formatHour
					: vizuly2.d3.timeMonth(date) < date ? (vizuly2.d3.timeWeek(date) < date ? formatDay : formatWeek)
						: vizuly2.d3.timeYear(date) < date ? formatMonth
							: formatYear)(date);

}


vizuly2.core.util.stackOffsetBaseline = function (series, order) {
	if (!((n = series.length) > 1)) return;
	for (var i = 1, s0, s1 = series[order[0]], n, m = s1.length; i < n; ++i) {
		s0 = s1, s1 = series[order[i]];
	}
}


/**
 * This function creates a single line path that can be used for texts along an arc.
 *  @memberof vizuly.svg.text
 *  @function
 *  @param {number} radius - The radius
 *  @param {number} color1 - The start angle of the arc in degrees.
 *  @returns {d3.svg.arc} - The d3 arc function to be used.
 */
vizuly2.core.util.textArcPath = function (radius,startAngle) {
	var radian = 0.0174533;
	var d={};
	d.angle=startAngle;
	d.startAngle = d.angle - (179 * radian);
	d.endAngle  = d.angle + (179 * radian);
	var pd=d3.arc().innerRadius(radius).outerRadius(radius)(d);
	var justArc = /[Mm][\d\.\-e,\s]+[Aa][\d\.\-e,\s]+/;
	var arcD = justArc.exec(pd);
	
	if (arcD) arcD=arcD[0];
	return arcD;
	
}


