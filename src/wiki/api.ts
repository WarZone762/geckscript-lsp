import * as https from "https";

import * as xml from "xml2js";


export async function GETRequest(url: string): Promise<string | undefined> {
  console.log(`Starting request GET "${url}"`);

  return new Promise<string | undefined>((resolve) => {
    https.get(url, (response) => {
      let data = "";

      response.on("data", chunk => data += chunk);

      response.on("end", () => {
        console.log(`Request GET "${url}" successful`);

        resolve(data);
      });

      response.on("error", (error) => {
        console.log(`Request GET "${url}" failed (${error})`);

        resolve(undefined);
      });
    }
    );
  });
}

export async function ParsePageWikitext(page_title: string): Promise<any | undefined> {
  const response = await GETRequest(`https://geckwiki.com/api.php?action=parse&page=${page_title}&redirects=1&prop=parsetree&disabletoc=1&format=json`);

  return response != undefined ? await xml.parseStringPromise(JSON.parse(response).parse?.parsetree?.["*"]) : undefined;
}

export async function GetCategoryPages(category: string, types?: string[]): Promise<string[]> {
  const type_string = types != undefined ? "&cmtype=" + types.join("|") : "";

  const items: string[] = [];

  let response = JSON.parse(await GETRequest(
    `https://geckwiki.com/api.php?action=query&list=categorymembers&cmtitle=${category}&cmprop=title|type${type_string}&cmlimit=max&format=json`
  ) ?? "");

  response?.query?.categorymembers.forEach((item: any) => items.push(item?.title));

  while (response?.continue?.cmcontinue != undefined) {
    response = JSON.parse(await GETRequest(
      `https://geckwiki.com/api.php?action=query&list=categorymembers&cmtitle=${category}&cmprop=title|type${type_string}&cmlimit=max&cmcontinue=${response?.continue?.cmcontinue}&format=json`
    ) ?? "");
    response?.query?.categorymembers.forEach((item: any) => items.push(item?.title));
  }

  return items;
}
