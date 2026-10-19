import { parseTextoLaudo, type ResultadoExames } from "./parse-exames"

interface ItemLinha {
  str: string
  x: number
  y: number
  w: number
}

interface PdfViewport {
  width: number
  height: number
}

interface PdfPage {
  getTextContent: () => Promise<{ items: unknown[] }>
  getViewport: (opts: { scale: number }) => PdfViewport
  render: (opts: {
    canvasContext: CanvasRenderingContext2D
    viewport: PdfViewport
    transform?: number[]
  }) => { promise: Promise<void> }
  cleanup: () => void
}

interface PdfDocument {
  numPages: number
  getPage: (n: number) => Promise<PdfPage>
  destroy: () => Promise<void>
}

interface PdfJs {
  version?: string
  getDocument: (src: { data: Uint8Array } | { url: string }) => { promise: Promise<PdfDocument> }
  GlobalWorkerOptions: { workerSrc: string }
}

const WORKER_LOCAL = "/pdf.worker.min.mjs"
const PDFJS_CDN = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4"
const cacheMiniaturasPdf = new Map<string, Promise<HTMLCanvasElement>>()

// Import nativo (não passa pelo bundler/Babel) — usado como fallback quando o
// pacote npm "pdfjs-dist" não está resolvível (ex.: preview.html carregando o
// .tsx direto no browser sem bundler).
const importarUrl = new Function("u", "return import(u)") as (u: string) => Promise<PdfJs>

async function carregarPdfjs(): Promise<PdfJs> {
  try {
    const mod = (await import("pdfjs-dist")) as unknown as PdfJs
    if (mod && typeof mod.version === "string" && typeof mod.getDocument === "function") {
      mod.GlobalWorkerOptions.workerSrc = WORKER_LOCAL
      return mod
    }
  } catch {
    /* sem bundler: cai no CDN abaixo */
  }
  const mod = await importarUrl(`${PDFJS_CDN}/build/pdf.min.mjs`)
  mod.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/build/pdf.worker.min.mjs`
  return mod
}

const TOLERANCIA_LINHA = 4

function montarLinhas(itens: ItemLinha[]): string[] {
  const ordenados = [...itens].sort((a, b) => b.y - a.y || a.x - b.x)
  const grupos: ItemLinha[][] = []
  for (const it of ordenados) {
    const atual = grupos[grupos.length - 1]
    if (atual && Math.abs(atual[0].y - it.y) <= TOLERANCIA_LINHA) atual.push(it)
    else grupos.push([it])
  }
  return grupos.map((grupo) => {
    const linhaItens = [...grupo].sort((a, b) => a.x - b.x)
    let linha = ""
    let fimAnterior = -Infinity
    for (const it of linhaItens) {
      if (linha && it.x - fimAnterior > 1) linha += " "
      linha += it.str
      fimAnterior = it.x + (it.w || 0)
    }
    return linha.trimEnd()
  })
}

export async function extrairTextoPdf(data: ArrayBuffer | Uint8Array): Promise<string> {
  const pdfjs = await carregarPdfjs()
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  const doc = await pdfjs.getDocument({ data: bytes }).promise
  const paginas: string[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const conteudo = await page.getTextContent()
    const itens: ItemLinha[] = []
    for (const item of conteudo.items) {
      const it = item as { str?: string; transform?: number[]; width?: number }
      if (!it.str || !it.str.trim() || !it.transform) continue
      itens.push({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width || 0 })
    }
    paginas.push(montarLinhas(itens).join("\n"))
    page.cleanup()
  }
  await doc.destroy()
  return paginas.join("\n")
}

/* Renderiza a primeira página de um PDF num canvas pequeno, usado como
   miniatura nos cards de orientações. `largura` é a largura em px de layout;
   a renderização é feita com devicePixelRatio para não ficar borrada. */
export function renderizarPrimeiraPagina(
  url: string,
  canvas: HTMLCanvasElement,
  largura: number,
): Promise<void> {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
  const chave = `${url}|${largura}|${dpr}`
  const desenharCache = (miniatura: HTMLCanvasElement) => {
    if (miniatura === canvas) return
    canvas.width = miniatura.width
    canvas.height = miniatura.height
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("canvas 2d indisponível")
    ctx.drawImage(miniatura, 0, 0)
  }

  const existente = cacheMiniaturasPdf.get(chave)
  if (existente) {
    return existente.then(desenharCache)
  }

  const renderizacao = (async () => {
    const pdfjs = await carregarPdfjs()
    const doc = await pdfjs.getDocument({ url }).promise
    try {
      const page = await doc.getPage(1)
      const base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: largura / base.width })
      const larguraPx = Math.round(viewport.width)
      const alturaPx = Math.round(viewport.height)
      canvas.width = Math.round(larguraPx * dpr)
      canvas.height = Math.round(alturaPx * dpr)
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("canvas 2d indisponível")
      const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined
      await page.render({ canvasContext: ctx, viewport, transform }).promise
      page.cleanup()
      return canvas
    } finally {
      await doc.destroy()
    }
  })()

  cacheMiniaturasPdf.set(chave, renderizacao)
  renderizacao.catch(() => cacheMiniaturasPdf.delete(chave))
  return renderizacao.then(() => undefined)
}

export async function extrairExamesDePdf(
  data: ArrayBuffer | Uint8Array,
): Promise<ResultadoExames & { texto: string }> {
  const texto = await extrairTextoPdf(data)
  return { ...parseTextoLaudo(texto), texto }
}
