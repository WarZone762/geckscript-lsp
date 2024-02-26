import { TokenSyntaxKind } from "../syntax_kind/generated.js";

export class TokenSet extends Set<TokenSyntaxKind> {
    union(other: TokenSet) {
        return new TokenSet([...this, ...other]);
    }
}
