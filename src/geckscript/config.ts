export interface ServerConfig {
    keywordStyle: WordStyle;
    functionStyle: WordStyle;
}

export function parseConfig(str: string): ServerConfig {
    const config = JSON.parse(str);
    // TODO: message about wrong config

    return config;
}
export type WordStyle = "lower" | "upper" | "capital";
