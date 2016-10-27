/*
This is a modified version of dygraph-extra.js originally released in
 2011 by Juan Manuel Caicedo Carvajal.
The modifications are:
 - Fixed y label positioning.
 - Automatic detectection of fonts for the labels, rather than relying
   on predefined or user-supplied fonts. This still isn't perfect, but
   should be closer to the actual dygraph.
 - Fix overflow of legends for too many series (legends now wrap).
 - A method for registering dygraphs via a drawcallback, primarily
   useful for those using the R version of dygraphs.
 - A function for downloading one or more registered dygraphs where
   the dygraphs to download are identified by their id and where
   multiple plots are zipped together using JSZip.
 - Functions to address some bugs/annoyances with dygraphs:
   - correct automatic resize on visiblity change.
   - correct clearance of selection on mouseleave.
The modified version requires the following:
 - jQuery
 - JSZip (for downloading multiple dygraphs)

The modifications were made by Jimmy Oh for the
  Ministry of Business, Innovation and Employment in New Zealand.
It is released under CC BY: http://creativecommons.org/licenses/by/4.0/
Attribution should be made to MBIE.

Original header retained below.
*/

/**
 * @license
 * Copyright 2011 Juan Manuel Caicedo Carvajal (juan@cavorite.com)
 * MIT-licensed (http://opensource.org/licenses/MIT)
 */

/**
 * @fileoverview This file contains additional features for dygraphs, which
 * are not required but can be useful for certain use cases. Examples include
 * exporting a dygraph as a PNG image.
 */

/**
 * Demo code for exporting a Dygraph object as an image.
 *
 * See: http://cavorite.com/labs/js/dygraphs-export/
 */

Dygraph.Export = {};

Dygraph.Export.DEFAULT_ATTRS = {

    backgroundColor: "transparent",

    //Texts displayed below the chart's x-axis and to the left of the y-axis 
    titleFont: "bold 18px serif",
    titleFontColor: "black",

    //Texts displayed below the chart's x-axis and to the left of the y-axis 
    axisLabelFont: "bold 14px serif",
    axisLabelFontColor: "black",

    // Texts for the axis ticks
    labelFont: "normal 12px serif",
    labelFontColor: "black",

    // Text for the chart legend
    legendFont: "bold 12px serif",
    legendFontColor: "black",

    // Default position for vertical labels
    vLabelLeft: 20,

    legendHeight: 20,    // Height of the legend area
    legendMargin: 20,
    lineHeight: 30,
    maxlabelsWidth: 0,
    labelTopMargin: 35,
    magicNumbertop: 8.5
    
};

Dygraph.Export.ComputeAttrs = function(dygraph, canvas){
  var opts = {};
  
  // Compute fonts
  var divclass = ["dygraph-title", "dygraph-ylabel", "dygraph-axis-label"];
  var optname = ["titleFont", "axisLabelFont", "labelFont"];
  var fontsubs = ["style", "variant", "weight", "size", "family"];
  
  for(var i = 0; i < divclass.length; i++){
    var curdiv = $(dygraph.graphDiv).find("." + divclass[i]);
    var curfont = curdiv.css("font");
    // If font is not specified, compute it from its components
    if(curfont == ""){
      var curfontarr = [];
      for(j = 0; j < fontsubs.length; j++){
        curfontarr.push(curdiv.css("font-" + fontsubs[j]));
      }
      curfont = curfontarr.join(" ");
    }
    opts[[optname[i]]] = curfont;
    opts[[optname[i] + "Color"]] = curdiv.css("color");
  }
  
  // For legends, use label fonts
  opts.legendFont = opts.labelFont;
  opts.legendFontColor = opts.labelFontColor;
  
  // Compute legend attrs
  var ctx = canvas.getContext("2d");
  ctx.font = opts.legendFont;
  // Margin between labels
  var labelMargin = 10;
  // Drop the first element, which is the label for the time dimension
  // Prefix each label with an en dash (\u2013)
  var labels = dygraph.attr_("labels").slice(1).map(function(x){return "\u2013 " + x;});
  // Populate Legend Array
  // Storing the widths of each label, wrapping around to a new row as necessary
  var legendArr = [[]];
  var arli = 0;
  var arlj = 0;
  var rowWidth = 0;
  var curWidth = 0;
  for(var i = 0; i < labels.length; i++){
    curWidth = ctx.measureText(labels[i]).width + labelMargin;
    if(rowWidth + curWidth <= canvas.width){
      // Add to current row
      legendArr[arli][arlj] = {label: labels[i], width: curWidth};
      arlj += 1;
      rowWidth += curWidth;
    } else{
      // Move to new row
      arli += 1;
      legendArr[arli] = [{label: labels[i], width: curWidth}];
      arlj = 1;
      rowWidth = curWidth;
    }
  }
  // Using a fixed line height
  // Should ideally be computed, but non-trivial
  opts.legendHeight = 20 * (arli + 1);
  opts.labelMargin = labelMargin;
  opts.legendArr = legendArr;
  
  // Shift ylabel position slightly further away
  opts.vLabelLeft = 10
  
  return opts;
};

/**
 * Tests whether the browser supports the canvas API and its methods for 
 * drawing text and exporting it as a data URL.
 */
Dygraph.Export.isSupported = function () {
    "use strict";
    try {
        var canvas = document.createElement("canvas");
        var context = canvas.getContext("2d");
        return (!!canvas.toDataURL && !!context.fillText);
    } catch (e) {
        // Silent exception.
    }
    return false;
};

/**
 * Exports a dygraph object as a PNG image.
 *
 *  dygraph: A Dygraph object
 *  img: An IMG DOM node
 *  userOptions: An object with the user specified options.
 *
 */
Dygraph.Export.asPNG = function (dygraph, img, userOptions) {
    "use strict";
    var canvas = Dygraph.Export.asCanvas(dygraph, userOptions);
    img.src = canvas.toDataURL();
};

/**
 * Exports a dygraph into a single canvas object.
 *
 * Returns a canvas object that can be exported as a PNG.
 *
 *  dygraph: A Dygraph object
 *  userOptions: An object with the user specified options.
 *
 */
Dygraph.Export.asCanvas = function (dygraph, userOptions) {
    "use strict";
    var options = {};
    var canvas = Dygraph.createCanvas();
    canvas.width = dygraph.width_;
    
    Dygraph.update(options, Dygraph.Export.DEFAULT_ATTRS);
    // Override default options with computed options
    Dygraph.update(options, Dygraph.Export.ComputeAttrs(dygraph, canvas));
    // Override computed options with user-supplied
    Dygraph.update(options, userOptions);
    
    canvas.height = dygraph.height_ + options.legendHeight;

    Dygraph.Export.drawPlot(canvas, dygraph, options);    
    Dygraph.Export.drawLegend(canvas, dygraph, options);
    
    return canvas;
};

/**
 * Adds the plot and the axes to a canvas context.
 */
Dygraph.Export.drawPlot = function (canvas, dygraph, options) {
    "use strict";
    var ctx = canvas.getContext("2d");

    // Add user defined background
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Copy the plot canvas into the context of the new image.
    var plotCanvas = dygraph.hidden_;
    
    var i = 0;
    
    ctx.drawImage(plotCanvas, 0, 0);


    // Add the x and y axes
    var axesPluginDict = Dygraph.Export.getPlugin(dygraph, 'Axes Plugin');
    if (axesPluginDict) {
        var axesPlugin = axesPluginDict.plugin;
        
        for (i = 0; i < axesPlugin.ylabels_.length; i++) {
            Dygraph.Export.putLabel(ctx, axesPlugin.ylabels_[i], options,
                options.labelFont, options.labelFontColor);
        }
        
        for (i = 0; i < axesPlugin.xlabels_.length; i++) {
            Dygraph.Export.putLabel(ctx, axesPlugin.xlabels_[i], options,
                options.labelFont, options.labelFontColor);
        }
    }

    // Title and axis labels

    var labelsPluginDict = Dygraph.Export.getPlugin(dygraph, 'ChartLabels Plugin');
    if (labelsPluginDict) {
        var labelsPlugin = labelsPluginDict.plugin;

        Dygraph.Export.putLabel(ctx, labelsPlugin.title_div_, options, 
            options.titleFont, options.titleFontColor);

        Dygraph.Export.putLabel(ctx, labelsPlugin.xlabel_div_, options, 
            options.axisLabelFont, options.axisLabelFontColor);

        Dygraph.Export.putVerticalLabelY1(ctx, labelsPlugin.ylabel_div_, options, 
            options.axisLabelFont, options.axisLabelFontColor, "center");

        Dygraph.Export.putVerticalLabelY2(ctx, labelsPlugin.y2label_div_, options, 
            options.axisLabelFont, options.axisLabelFontColor, "center");
    }

    // Annotations
    Dygraph.Export.drawAnnotes(dygraph, ctx, options);
};

/**
 * Draws a label (axis label or graph title) at the same position 
 * where the div containing the text is located.
 */
Dygraph.Export.putLabel = function (ctx, divLabel, options, font, color) {
    "use strict";

    if (!divLabel || !divLabel.style) {
        return;
    }

    var top = parseInt(divLabel.style.top, 10);
    var left = parseInt(divLabel.style.left, 10);
    
    if (!divLabel.style.top.length) {
        var bottom = parseInt(divLabel.style.bottom, 10);
        var height = parseInt(divLabel.style.height, 10);

        top = ctx.canvas.height - options.legendHeight - bottom - height;
    }

    // FIXME: Remove this 'magic' number needed to get the line-height. 
    top = top + options.magicNumbertop;

    var width = parseInt(divLabel.style.width, 10);

    switch (divLabel.style.textAlign) {
    case "center":
        left = left + Math.ceil(width / 2);
        break;
    case "right":
        left = left + width;
        break;
    }

    Dygraph.Export.putText(ctx, left, top, divLabel, font, color);
};
 
/**
 * Draws a label Y1 rotated 90 degrees counterclockwise.
 */
Dygraph.Export.putVerticalLabelY1 = function (ctx, divLabel, options, font, color, textAlign) {
    "use strict";
    if (!divLabel) {
        return;
    }

    var top = parseInt(divLabel.style.top, 10);
    var left = parseInt(divLabel.style.left, 10) + parseInt(divLabel.style.width, 10) / 2;
    var text = divLabel.innerText || divLabel.textContent;


    // FIXME: The value of the 'left' property is frequently 0, used the option.
    if (!left)
        left = options.vLabelLeft;

    if (textAlign == "center") {
        top = Math.ceil(ctx.canvas.height/2);
    }

    ctx.save();
    ctx.translate(0, ctx.canvas.height);
    ctx.rotate(-Math.PI / 2);

    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = textAlign;
    ctx.fillText(text, top, left);
    
    ctx.restore();
};

/**
 * Draws a label Y2 rotated 90 degrees clockwise.
 */
Dygraph.Export.putVerticalLabelY2 = function (ctx, divLabel, options, font, color, textAlign) {
    "use strict";
    if (!divLabel) {
        return;
    }
        
    var top = parseInt(divLabel.style.top, 10);
    var right = parseInt(divLabel.style.right, 10) + parseInt(divLabel.style.width, 10) * 2;
    var text = divLabel.innerText || divLabel.textContent;

    if (textAlign == "center") {
        top = Math.ceil(ctx.canvas.height / 2);
    }
    
    ctx.save();
    ctx.translate(parseInt(divLabel.style.width, 10), 0);
    ctx.rotate(Math.PI / 2);

    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = textAlign;
    ctx.fillText(text, top, right - ctx.canvas.width);
    
    ctx.restore();
};

/**
 * Draws the text contained in 'divLabel' at the specified position.
 */
Dygraph.Export.putText = function (ctx, left, top, divLabel, font, color) {
    "use strict";
    var textAlign = divLabel.style.textAlign || "left";    
    var text = divLabel.innerText || divLabel.textContent;

    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = textAlign;
    ctx.textBaseline = "middle";
    ctx.fillText(text, left, top);
};

/**
 * Draws the legend of a dygraph
 *
 */
Dygraph.Export.drawLegend = function (canvas, dygraph, options) {
    "use strict";
    var ctx = canvas.getContext("2d");
    var legendArr = options.legendArr;

    // Heights
    var graphHeight = canvas.height - options.legendHeight;
    var lineHeight = options.legendHeight/legendArr.length
    var lineY = lineHeight/2;

    // Margin between labels
    var labelMargin = options.labelMargin;
    
    var colors = dygraph.getColors();
    var usedColorCount = 0;
    var labelVisibility=dygraph.attr_("visibility");
    ctx.font = options.legendFont;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    
    // Draw each legend label
    for(var i = 0; i < legendArr.length; i++){
      // For each row
      var curRow = legendArr[i];
      // Compute total width of row
      var rowWidth = curRow.reduce(function(prev, cur){return prev + cur.width;}, 0);
      var curX = Math.floor((canvas.width - rowWidth) / 2);
      var curY = graphHeight + lineHeight * i + lineY - 0.5;
      for(var j = 0; j < curRow.length; j++){
        if(labelVisibility[i]){
          ctx.fillStyle = colors[usedColorCount];
          usedColorCount++
          ctx.fillText(curRow[j].label, curX, curY);
          curX += curRow[j].width;
        }
      }
    }
};

/* Annote functions */

Dygraph.Export.drawAnnotes = function(dygraph, ctx, options){
  var annotedivs = $(dygraph.graphDiv).find(".dygraphDefaultAnnotation");
  var fontsubs = ["style", "variant", "weight", "size", "family"].map(function(x){return "font-" + x;});
  
  for(i = 0; i < annotedivs.length; i++){
    var curdiv = $(annotedivs[i]);
    var pos = curdiv.position();
    var width = curdiv.width();
    var height = curdiv.height();
    
    /* Assume border color is same all around */
    var bordercolor = curdiv.css("borderTopColor");
    var backgroundcolor = curdiv.css("backgroundColor");
    Dygraph.Export.drawBox(ctx, pos.left, pos.top, width, height,
                           bordercolor, backgroundcolor);
    
    var color = curdiv.css("color");
    var fontall = curdiv.css(fontsubs);
    var font = Object.keys(fontall).map(function(x){return fontall[x];}).join(" ");
    var text = curdiv.text();
    
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, pos.left + width/2, pos.top + height/2);
  }
};

Dygraph.Export.drawBox = function(ctx, x, y, width, height, stroke, fill){
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  if(stroke){
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
  if(fill){
    ctx.fillStyle = fill;
    ctx.fill();
  }
};

/**
 * Finds a plugin by the value returned by its toString method..
 *
 * Returns the the dictionary corresponding to the plugin for the argument.
 * If the plugin is not found, it returns null.
 */
Dygraph.Export.getPlugin = function(dygraph, name) {
    for (var i = 0; i < dygraph.plugins_.length; i++) {
        if (dygraph.plugins_[i].plugin.toString() == name) {
            return dygraph.plugins_[i];
        }
    }
    return null;
}

// Convenience functions for downloading dygraphs
// Allow registration of dygraphs, which are stored in Vars
Dygraph.Export.Vars = {};
Dygraph.Export.VarsNames = function(){
  var names = new Array;
  for(var curname in Dygraph.Export.Vars){names.push(curname);}
  return names;
};
Dygraph.Export.Register = function(dygraph){
  var id = dygraph.maindiv_.id;
  Dygraph.Export.Vars[id] = dygraph;
};

// Allow downloading of registered dygraphs as a PNG
Dygraph.Export.DownloadByID = function(id, usetitle){
  var isArray = function(obj){return Object.prototype.toString.call(obj) === "[object Array]";};
  var getPNG = function(dygraph){
    // If usetitle is true, then get the title from the dygraph
    // Else the file name uses the id
    var name = usetitle === true ? dygraph.user_attrs_.title : id;
    return {
      datauri: Dygraph.Export.asCanvas(dygraph).toDataURL(),
      filename: name + ".png"
    };
  };
  
  if(!isArray(id)){
    // For a single id, simply generate a png
    var curdygraph = Dygraph.Export.Vars[id];
    if(curdygraph != undefined){
      var curPNG = getPNG(curdygraph);
      var datauri = curPNG.datauri;
      var filename = curPNG.filename;
    }
  } else{
    // For multiple ids, need to create a zip
    if(JSZip == undefined){
      console.log("Downloading multiple files requires JSZip");
      return;
    }
    var zipobj = new JSZip();
    
    // Loop through each id and save into zip
    // Stripping the metadata/MIME type "data:image/png;base64,"
    // As JSZip wants raw data uri
    for(var i = 0; i < id.length; i++){
      var curdygraph = Dygraph.Export.Vars[id[i]];
      if(curdygraph != undefined){
        var curPNG = getPNG(curdygraph);
        zipobj.file(curPNG.filename,
                    curPNG.datauri.replace("data:image/png;base64,", ""),
                    {base64: true});
      }
    }
    // Convert the finished zip into a datauri
    var datauri = "data:application/zip;base64," + zipobj.generate({type:"base64"});
    var title = usetitle === true ? Dygraph.Export.Vars[id[0]].user_attrs_.title : id[0];
    var filename = title + " + " + (id.length - 1) + " more plots.zip";
  }
  
  // Generate an invisible <a> download link
  // Click it, then remove
  var downlink = jQuery("<a/>", {
    href: datauri,
    download: filename,
    style: "display: none;"
  }).appendTo("body");
  downlink[0].click();
  downlink.remove();
  
  return;
};

// A function for ensuring dygraphs resize correctly on tab switch in shiny apps
Dygraph.Export.ShinyTabResize = function(){
   $(document).on("click", 'a[data-toggle="tab"]', function(){
      var dyvars = Dygraph.Export.Vars;
      for(var curdy in dyvars){
         if($(dyvars[curdy].maindiv_).css("visibility") == "visible"){
            dyvars[curdy].resize();
         }
      }
   });
};

// A function for ensuring dygraphs clears selection on mouseleave
// May still fail if timeout value is too low
Dygraph.Export.AutoClear = function(timeout){
   if(typeof(timeout) === 'undefined') timeout = 500;
   $(document).on("mouseleave", "div.dygraphs", function(){
      var curdy = Dygraph.Export.Vars[this.id];
      if(curdy){
         window.setTimeout(function(){
            curdy.clearSelection();
            curdy.clearSelection();
            curdy.clearSelection();
         }, timeout);
      }
   });
};
