export interface ServerConfig {
    keywordStyle: WordStyle;
    functionStyle: WordStyle;
}

export function parseConfig(str: string): ServerConfig {
    const config = JSON.parse(str);
    // TODO: message about wrong config
    let keywordStyle = WordStyle.Lower;
    switch (config.keywordStyle) {
        case "lower":
            keywordStyle = WordStyle.Lower;
            break;
        case "upper":
            keywordStyle = WordStyle.Upper;
            break;
        case "capital":
            keywordStyle = WordStyle.Capital;
            break;
    }
    let functionStyle = WordStyle.Capital;
    switch (config.functionStyle) {
        case "lower":
            functionStyle = WordStyle.Lower;
            break;
        case "upper":
            functionStyle = WordStyle.Upper;
            break;
        case "capital":
            functionStyle = WordStyle.Capital;
            break;
    }

    return { keywordStyle, functionStyle };
}
export const enum WordStyle {
    Lower,
    Upper,
    Capital,
}
