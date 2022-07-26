import * as d3 from "d3";

const dx = 12;
const dy = 120;
const width = 1000;
const tree = d3.tree().nodeSize([dx, dy]);
const treeLink = d3.linkHorizontal().x(d => d.y).y(d => d.x);

function graph(root, { marginLeft = 40 } = {}) {
  root = tree(root);

  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  root.each(d => {
    if (d.x > x1) x1 = d.x;
    if (d.x < x0) x0 = d.x;
    if (d.y > y1) y1 = d.y;
    if (d.y < y0) y0 = d.y;
  });

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, y1 - y0 + dy * 2, x1 - x0 + dx * 2])
    .style("overflow", "visible");

  const g = svg.append("g")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .attr("transform", `translate(${marginLeft},${dx - x0})`);

  const link = g.append("g")
    .attr("fill", "none")
    .attr("stroke", "#555")
    .attr("stroke-opacity", 0.4)
    .attr("stroke-width", 1.5)
    .selectAll("path")
    .data(root.links())
    .join("path")
    .attr("d", treeLink);

  const node = g.append("g")
    .attr("stroke-linejoin", "round")
    .attr("stroke-width", 3)
    .selectAll("g")
    .data(root.descendants())
    .join("g")
    .attr("transform", d => `translate(${d.y},${d.x})`);

  node.append("circle")
    .attr("fill", d => d.children ? "#555" : "#999")
    .attr("r", 2.5);

  node.append("text")
    .attr("stroke", "white")
    .attr("paint-order", "stroke")
    .attr("dy", "0.31em")
    .attr("x", d => d.children ? -6 : 6)
    .attr("text-anchor", d => d.children ? "end" : "start")
    .text(d => d.data.name);

  return svg.node();
}

function ObjectToHierarchy(obj, root_name = "root", exclude = {}) {
  if (typeof obj !== "object" || obj === null) return {
    name: root_name,
    children: [{ name: obj.toString() }]
  };

  const hierarchical = {
    name: root_name,
    children: []
  };

  for (const [k, v] of Object.entries(obj)) {
    if (k in exclude) continue;
    hierarchical.children.push(ObjectToHierarchy(v, k, exclude));
  }


  return hierarchical;
}

fetch("data.json").then(resp => resp.text()).then(data => {
  data = JSON.parse(data);

  const hierarchy = d3.hierarchy(ObjectToHierarchy(data, undefined, {
    "type": true,
    "range": true,
    "position": true,
    "length": true,
    "token": true,
  }));
  const hierarchy_chart = graph(hierarchy);
  document.body.appendChild(hierarchy_chart);
});
