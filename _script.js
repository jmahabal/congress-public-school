// our input dataset, cleaned slightly
d3.csv("senators.csv", function(dataset) {
  console.log(dataset)

  var schooltypes = _.uniq(_.pluck(dataset, "BA School Type"))
  var parties = _.uniq(_.pluck(dataset, "Party"))

  var sel = d3.select('#chart');
  var c = d3.conventions({
    parentSel: sel, 
    totalWidth: 400, // FIX
    width: 400, 
    height: 400, 
    margin: {left: 50, right: 50, top: 20, bottom: 30}
  });

  var xScale = d3.scaleBand()
                .domain(schooltypes)
                .range([0, c.width])

  var yScale = d3.scaleBand()
                .domain(parties)
                .range([0, c.height])             

  // var color = d3.scaleSequential(d3.interpolateGreens);

  var getcolor = function(school, party) {
    var count = _.filter(dataset, function(obj) { return obj["BA School Type"] == schooltypes[school] && obj["Party"] == parties[party]}).length
    // console.log(count, schooltypes[school], parties[party], count / dataset.length)
    return d3.interpolateYlGn(count / dataset.length * 2) 
  }

  for (var i = schooltypes.length - 1; i >= 0; i--) {
    for (var j = parties.length - 1; j >= 0; j--) {
      c.svg.append('rect')
        .at({width: c.width/schooltypes.length, height: c.height/parties.length, x: xScale(schooltypes[i]), y: yScale(parties[j]), fill: getcolor(i, j), class: "square"})
    }
  }

})
