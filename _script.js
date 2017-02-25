// our input datasets, cleaned slightly

d3.json("us.json", function(us) {
d3.csv("senators_univs.csv", function(dataset) {

  dataset = _.filter(dataset, function(obj) { return obj.LATITUDE != ""; })

  var sel = d3.select('#map');
  var c = d3.conventions({
    parentSel: sel, 
    totalWidth: sel.node.width, 
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
      .attr("transform", "translate(" + c.margin.left + "," + c.margin.top + ")");;

  // Initially senators are sorted into a 3x3 grid, based on their party & college type
  // Use force-layout for positioning

  yScale = d3.scaleBand().domain(_.uniq(_.pluck(dataset, 'DeVos'))).range([0, c.height]).paddingOuter(1);
  xScale = d3.scaleBand().domain(_.uniq(_.pluck(dataset, 'CONTROL'))).range([0, c.width]).paddingOuter(0.6);

  var simulation = d3.forceSimulation(dataset)
      .force("y", d3.forceY(function(d) { return yScale(d.DeVos); }).strength(1))
      .force("x", d3.forceX(function(d) { return xScale(d.CONTROL); }).strength(1))
      .force("collide", d3.forceCollide(6))
      .stop();

  for (var i = 0; i < 200; ++i) simulation.tick();

  var g = c.svg.append("g")
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
      .on("mouseover", function(d) { 
            d3.select(this).attr("stroke-width", "2");
            return mouseover(d); 
          })
      .on("mousemove", function(d) { return mousemove(d); })
      .on("mouseout", function(d) { 
            d3.select(this).attr("stroke-width", "0");
        return mouseout(d); 
      });

  // When we hit a waypoint, change to map display
  var toMap = function() {

    map
    .transition().delay(800).attr("display", "inline-block").attr("opacity", 0)
    .transition().duration(2000).attr("opacity", 1);

    senators.transition().duration(1000)
      .attr("cx", function(d) { return projection([parseFloat(d.LONGITUDE), parseFloat(d.LATITUDE)])[0]; })
      .attr("cy", function(d) { return projection([parseFloat(d.LONGITUDE), parseFloat(d.LATITUDE)])[1]; })

  }

  $("#turntomap").click(function() {
    toMap();
  })

  // Functions for handling mouse events

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