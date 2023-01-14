import { TreeData } from "../geckscript/types/hir";
import * as fs from "fs";
import * as http from "http";
import * as mime from "mime";
import * as path from "path";

const public_path = path.join(__dirname, "../../../tree-view/dist");

export class TreeViewServer {
    server: http.Server;
    clients: http.ServerResponse[];
    last_data: unknown;

    constructor() {
        this.clients = [];
        this.last_data = "{}";

        this.server = http
            .createServer((req, res) => {
                if (req.url === "/data" && req.headers.accept === "text/event-stream") {
                    res.writeHead(200, {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache",
                        Connection: "keep-alive",
                    });

                    res.write("\n\n");

                    res.write(`data: ${this.last_data}\n\n`);

                    this.clients.push(res);

                    return;
                }

                if (req.url === undefined || req.url === "/") {
                    req.url = "/index.html";
                }
                const file_path = path.join(public_path, req.url);

                res.statusCode = 200;
                res.setHeader(
                    "Content-Type",
                    mime.getType(path.extname(req.url).toLowerCase()) ?? "text/plain"
                );
                if (fs.existsSync(file_path)) {
                    res.end(fs.readFileSync(file_path));
                } else {
                    res.end();
                }
            })
            .listen(8000, "localhost");

        console.log("TreeViewServer running");
    }

    write_message(data: unknown) {
        this.last_data = data;
        for (const res of this.clients) {
            res.write(`data: ${data}\n\n`);
        }
    }

    write_tree_data(tree_data: TreeData) {
        this.write_message(JSON.stringify(tree_data));
    }

    close() {
        for (const res of this.clients) {
            res.write("event: close\ndata: \n\n");
            res.end();
        }
        this.server.close();

        console.log("TreeViewServer closed");
    }
}
