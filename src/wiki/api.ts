import * as https from "https";


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

export async function GetWikiPage(page_title: string): Promise<string | undefined> {
  const response = await GETRequest(`https://geckwiki.com/api.php?action=parse&page=${page_title}&redirects=1&prop=text&disabletoc=1&format=json`);

  if (response == undefined) return undefined;

  return JSON.parse(response)?.parse?.text?.["*"];
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

export async function GetFunctions(): Promise<string[]> {
  return GetCategoryPages("Category:Functions (All)", ["page"]);
}
