import { TreeData } from "../geckscript/ast.js";
import * as http from "http";
import * as ast from "../geckscript/ast.js";

import * as jsdom from "jsdom";
import * as d3 from "d3";

export class TreeViewServer {
    server: http.Server;
    clients: http.ServerResponse[];
    tree_data: ast.TreeData;

    constructor(port: number, hostname: string) {
        this.clients = [];
        this.tree_data = new ast.TreeData("root");

        this.server = http
            .createServer((req, res) => {
                if (req.url === undefined || req.url === "/" || req.url === "/index.html") {
                    res.statusCode = 200;
                    res.writeHead(200, {
                        "Content-Type": "text/html",
                        "Cache-Control": "no-cache",
                    });
                    res.write(
                        `<body><div id='data'></div><script>
                            const div = document.getElementById('data');
                            const es = new EventSource('data');
                            es.addEventListener('close', () => es.close());
                            es.onmessage = payload => div.innerHTML = payload.data;
                        </script></body>`
                    );
                    res.end();
                } else if (req.url === "/data") {
                    res.writeHead(200, {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache",
                        Connection: "keep-alive",
                    });

                    res.write("\n\n");

                    res.write(`data: ${this.render()}\n\n`);

                    this.clients.push(res);
                } else {
                    res.statusCode = 404;
                    res.end();
                }
            })
            .listen(port, hostname);

        console.log("TreeViewServer running");
    }

    write_tree_data(tree_data: TreeData) {
        this.tree_data = tree_data;
        for (const client of this.clients) {
            client.write(`data: ${this.render()}\n\n`);
        }
    }

    close() {
        for (const res of this.clients) {
            res.write("event: close\ndata: \n\n");
            res.end();
        }
        this.server.close();

        console.log("TreeViewServer closed");
    }

    render(): string {
        global.document = (new jsdom.JSDOM("")).window.document;

        const dx = 12;
        const dy = 120;
        const margin_left = dy;
        const tree = d3.tree<ast.TreeData>().nodeSize([dx, dy]);
        const tree_link = d3.linkHorizontal<d3.HierarchyPointLink<ast.TreeData>, { x: number, y: number }>().x(d => d.y).y(d => d.x);

        function graph(root: d3.HierarchyNode<ast.TreeData>) {
            const tree_node = tree(root);

            let x0 = Infinity;
            let x1 = -Infinity;
            let y0 = Infinity;
            let y1 = -Infinity;
            tree_node.each(d => {
                if (d.x > x1) {
                    x1 = d.x;
                }
                if (d.x < x0) {
                    x0 = d.x;
                }
                if (d.y > y1) {
                    y1 = d.y;
                }
                if (d.y < y0) {
                    y0 = d.y;
                }
            });

            const svg = d3.create("svg")
                .attr("viewBox", [0, 0, y1 - y0 + dy * 2, x1 - x0 + dx * 2])
                .style("overflow", "visible")
                .style("width", "100rem");

            const g = svg.append("g")
                .attr("font-family", "sans-serif")
                .attr("font-size", 10)
                .attr("transform", `translate(${margin_left},${dx - x0})`);

            g.append("g")
                .attr("fill", "none")
                .attr("stroke", "#555")
                .attr("stroke-opacity", 0.4)
                .attr("stroke-width", 1.5)
                .selectAll("path")
                .data(tree_node.links())
                .join("path")
                .attr("d", tree_link);

            const node = g.append("g")
                .attr("stroke-linejoin", "round")
                .attr("stroke-width", 3)
                .selectAll("g")
                .data(tree_node.descendants())
                .join("g")
                .attr("transform", d => `translate(${d.y},${d.x})`);

            node.append("circle")
                .attr("fill", d => d.children ? "#555" : "#999")
                .attr("r", 2.5);

            node.append("text")
                .attr("stroke", "white")
                .attr("paint-order", "stroke")
                .attr("dy", "0.3em")
                .attr("x", -6)
                .attr("text-anchor", "end")
                .text(d => d.data.name);

            return svg.node();
        }

        const hierarchy = d3.hierarchy(this.tree_data);
        const hierarchy_chart = graph(hierarchy);

        return hierarchy_chart?.outerHTML ?? "";
    }
}
