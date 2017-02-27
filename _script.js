// our input datasets, cleaned slightly

d3.json("us-named.json", function(us) {
d3.csv("senators_univs.csv", function(dataset) {

  var sel = d3.select('#map');
  var c = d3.conventions({
    parentSel: sel, 
    totalWidth: 600, 
    height: 400, 
    margin: {left: 10, right: 10, top: 20, bottom: 20}
  });

  // MAPS //

  // Declaring now so that it is in the background
  var projection = d3.geoAlbersUsa()
    // .scale(c.width / Math.PI)
    .scale(c.width * 0.9)
    .translate([c.width / 2, c.height / 2])

  var path = d3.geoPath().projection(projection);

  var map = c.svg.append("path")
      .datum(topojson.feature(us, us.objects.states))
      .attr("class", "states")
      .attr("d", path)
      .attr("display", "none")
      .attr("transform", "translate(" + c.margin.left + "," + c.margin.top + ")");

  // Get centroids for each state

  var features = topojson.feature(us, us.objects.states).features;
  var centroids = features.map(function (feature){
    return [feature.properties.name, path.centroid(feature)];
  });
  centroids = _.object(centroids);

  // Build dataset that only has Senators who stayed close to their college
  var names2ABVR = features.map(function (feature){
    return [feature.properties.name, feature.properties.code];
  });
  names2ABVR = _.object(names2ABVR);
  close2home = _.filter(dataset, function(obj) { return names2ABVR[obj.State] == obj.STABBR})

  // Gooey effect to bundle universities (or cities, actually)

  var filter = c.svg.append("defs")
    .append("filter")
    .attr("id","gooey"); //use a unique id to reference again later on
  filter.append("feGaussianBlur")
    .attr("in", "SourceGraphic")
    .attr("stdDeviation", "5")
    //to fix safari:
    //http://stackoverflow.com/questions/24295043/svg-gaussian-blur-in-safari-unexpectedly-lightens-image
    .attr("color-interpolation-filters","sRGB") 
    .attr("result", "blur");
  filter.append("feColorMatrix")
    .attr("class", "blurValues") //used later to transition the gooey effect
    .attr("in", "blur")
    .attr("mode", "matrix")
    .attr("values", "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9")
    .attr("result", "gooey");

    // Only needed for the map, really
    universities = _.uniq(_.pluck(dataset, 'INSTNM'))
    for (var i = universities.length - 1; i >= 0; i--) {
      var g_gooey = c.svg.append("g")
        .style("filter", "url(#gooey)")
        // .attr("stroke", "black").attr("stroke-width", 1)
        .attr("transform", "translate(" + c.margin.left + "," + c.margin.top + ")");

      var gooey_senators = g_gooey.selectAll("circle")
        .data(_.filter(dataset, function(obj) { return obj.INSTNM == universities[i]; })).enter()
        .append("circle")
        .attr("class", "gooey-senators")
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; })
        .attr("fill", function(d) {
          return "#bdc3c7";
        })
        .attr("r", 7)
        .attr("opacity", 0);
    }

  // Initially senators are sorted into a 3x3 grid, based on their party & college type
  // Use force-layout for positioning

  yScale = d3.scaleBand().domain(_.uniq(_.pluck(dataset, 'DeVos'))).range([0, c.height]).paddingOuter(1);
  xScale = d3.scaleBand().domain(_.uniq(_.pluck(dataset, 'CONTROL'))).range([0, c.width]).paddingOuter(0.6);
  // xScale = d3.scaleLinear().domain([0, 4]).range([0, c.width/2]);


  var simulation = d3.forceSimulation(dataset)
      .force("y", d3.forceY(function(d) { return yScale(d.DeVos); }).strength(1))
      .force("x", d3.forceX(function(d) { return xScale(d.CONTROL); }).strength(1))
      // .force("x", d3.forceX(function(d) { return xScale(d.countINSTNM); }).strength(1))
      .force("collide", d3.forceCollide(6))
      .stop();

  for (var i = 0; i < 200; ++i) simulation.tick();

  var g = c.svg.append("g")
    // .style("filter", "url(#gooey)")
    .attr("transform", "translate(" + c.margin.left + "," + c.margin.top + ")");

  var senators = g.selectAll("circle").data(dataset).enter().append("circle")
      .attr("r", 5)
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; })
      .attr("fill", function(d) {
        if (d.Party == "Republican") {
          return "#e74c3c";
        } else if (d.Party == "Democratic") {
          return "#3498db";
        } else {
          return "#f1c40f"
        }
      })
      .attr("stroke", "black")
      .attr("stroke-width", "0")
      .on("mouseover", function(d) { 
            d3.select(this).attr("stroke-width", "1");
            return mouseover(d); 
          })
      .on("mousemove", function(d) { return mousemove(d); })
      .on("mouseout", function(d) { 
            d3.select(this).attr("stroke-width", "0");
        return mouseout(d); 
      });

  // "Axes"

  $.each(_.uniq(_.pluck(dataset, 'DeVos')), function( index, value ) {
      g.append("text")
      .attr("y", yScale(value))
      .attr("x", c.margin.left)
      .attr("class", "axis")
      .text(value)
      .attr("alignment-baseline", "middle");
  });

  $.each(_.uniq(_.pluck(dataset, 'CONTROL')), function( index, value ) {
  // $.each(_.uniq(_.pluck(dataset, 'countINSTNM')), function( index, value ) {
      g.append("text")
      .attr("x", xScale(value))
      .attr("y", c.margin.top)
      .attr("class", "axis")
      .text(value)
      .attr("text-anchor", "middle");
  });

  // When we hit a waypoint, change to map display
  var toMap = function() {

    d3.selectAll(".axis").attr("display", "none")

    map
    .transition().attr("display", "inline-block").attr("opacity", 0)
    .transition().duration(1000).attr("opacity", 1);

    var simulation = d3.forceSimulation(dataset)
        .force("y", d3.forceY(function(d) { return projection([parseFloat(d.LONGITUDE), parseFloat(d.LATITUDE)])[1]; }).strength(1))
        .force("x", d3.forceX(function(d) { return projection([parseFloat(d.LONGITUDE), parseFloat(d.LATITUDE)])[0]; }).strength(1))
        .force("collide", d3.forceCollide(6))
        .stop();

    for (var i = 0; i < 300; ++i) simulation.tick();

    senators.transition().duration(1000)
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; })

    d3.selectAll(".gooey-senators").transition()
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; })
      .transition().duration(1000).attr("opacity", 1)
  }

  var toBeeswarm = function() {

    d3.selectAll(".axis").attr("display", "inline-block")

    map
      .transition().duration(500).attr("opacity", 0).transition().attr("display", "none");

    var simulation = d3.forceSimulation(dataset)
        .force("y", d3.forceY(function(d) { return yScale(d.DeVos); }).strength(1))
        .force("x", d3.forceX(function(d) { return xScale(d.CONTROL); }).strength(1))
        .force("collide", d3.forceCollide(6))
        .stop();

    for (var i = 0; i < 200; ++i) simulation.tick();

    senators.transition().duration(1000)
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; })

    d3.selectAll(".gooey-senators").transition()
      .transition().duration(100).attr("opacity", 0)
  }

  var explainMap = function() {

    c.svg.append("g")      
      .attr("transform", "translate(" + c.margin.left + "," + c.margin.top + ")")
    .selectAll("homestatelines")
      .data(dataset).enter()
      .append("line")
      .attr("stroke", "black")
      .attr("opacity", function(d) {
        // Senator of the same state they went to college in
        if (names2ABVR[d.State] == d.STABBR) { 
          return 0;
        } else {
          return 1;
        }
      })
      .attr("x1", function(d) { return d.x; })
      .attr("y1", function(d) { return d.y; })
      .attr("x2", function(d) { return d.x; })
      .attr("y2", function(d) { return d.y; })
      .transition().duration(10000)
      .attr("x2", function(d) { return centroids[d["State"]][0]; })
      .attr("y2", function(d) { return centroids[d["State"]][1]; })
      
  }

  var toRankingsBeeswarm = function() {

    d3.selectAll(".axis").attr("display", "inline-block")

    map
      .transition().duration(500).attr("opacity", 0).transition().attr("display", "none");

    var xScale = d3.scaleLinear()
    .domain([0, 100])
    .range([0, c.width/2]);

    var simulation = d3.forceSimulation(dataset)
        .force("y", d3.forceY(function(d) { return yScale(d.DeVos); }).strength(1))
        .force("x", d3.forceX(function(d) { return xScale(parseInt(d.rankUSNewsScore)); }).strength(1))
        .force("collide", d3.forceCollide(6))
        .stop();

    for (var i = 0; i < 200; ++i) simulation.tick();

    senators.transition().duration(1000)
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; })

        d3.selectAll(".gooey-senators").transition()
      .transition().duration(100).attr("opacity", 0)
  }

  // Waypoints Handlers

  var waypoint_turntomap = new Waypoint({
      element: document.getElementById("turntomap"),
      handler: function(direction) {
        console.log(direction)
        if (direction == "down") {
          toMap();
          explainMap();
        } else {
          toBeeswarm();
        }
      },
      offset: '50%'
  })

  var waypoint_turntorankbeeswarm = new Waypoint({
      element: document.getElementById("turntorankbeeswarm"),
      handler: function(direction) {
        console.log(direction)
        if (direction == "down") {
          toRankingsBeeswarm();
        } else {
          toMap();
        }
      },
      offset: '50%'
  })

  // Functions for handling mouse over events

  function mouseover(d) {
      tooltip.style("display", "inline");
  }

  function mousemove(d) {
    tooltip
      .html(function() { return d.Name.toUpperCase() + " (" + d.Party.slice(0,1) +", " + d.State + ")" + "<br>" + d.INSTNM })
      .style("left", (d3.event.pageX - 34) + "px")
      .style("top", (d3.event.pageY - 12) + "px");
  }

  function mouseout(d) {
      tooltip.style("display", "none");
  }

  var tooltip = d3.select("body").append("div")
    .style("display", "none")
    .attr("class", "map-tooltip")

})
})