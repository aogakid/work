/* ── Texto do bloco ───────────────────────────────────────────────────
   O bloco publica o conteúdo atual (título + seções) para que companions
   possam consumi-lo sem precisar de props — o registry monta os companions
   só com um ref. É um cache do último valor, não estado de UI. */

let textoAtual = ""

export function publicarTextoDoBloco(texto: string): void {
    textoAtual = texto
}

export function lerTextoDoBloco(): string {
    return textoAtual
}
