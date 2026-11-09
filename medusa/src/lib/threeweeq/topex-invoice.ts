import fs from "node:fs"
import path from "node:path"
import PdfPrinter from "pdfmake"
import type {
  Alignment,
  Content,
  TableCell,
  TDocumentDefinitions,
} from "pdfmake/interfaces"
import type { MedusaContainer } from "@medusajs/framework/types"
import { retrieveOrder } from "./orders"

/**
 * The Topex delivery invoice.
 *
 * Topex takes orders through their shipper app or a merchant's own «فاتورة
 * الشركة». They publish no template, so this page is built from the fields
 * their operations ask for — name, phone, emirate, area and the amount
 * including delivery — laid out as a delivery order sheet their team can read
 * in one pass: who receives, where, what, and how much was collected online.
 *
 * Layout notes:
 * - Two Cairo subsets are embedded (arabic + latin) because a font subset
 *   carries only its own script; helpers pick the right one per run.
 * - pdfmake lays out runs left-to-right and has no RTL paragraph direction,
 *   so every mixed line is composed as [value, label] right-aligned — the
 *   value lands left of its Arabic label, which reads correctly in Arabic.
 * - Pure Arabic lines are left as single runs: the shaper renders them
 *   correctly by itself.
 * - The pickup address and the TRN are environment-driven
 *   (`TOPEX_PICKUP_ADDRESS`, `STORE_TRN`), so they can be filled in without
 *   code.
 */

const FONT_DIR = path.resolve(process.cwd(), "assets", "fonts")

const fonts = {
  Cairo: {
    normal: path.join(FONT_DIR, "cairo-v31-arabic-regular.ttf"),
    bold: path.join(FONT_DIR, "cairo-v31-arabic-700.ttf"),
  },
  CairoLatin: {
    normal: path.join(FONT_DIR, "cairo-v31-latin-regular.ttf"),
    bold: path.join(FONT_DIR, "cairo-v31-latin-700.ttf"),
  },
}

/* a Latin letter or a digit means the latin subset must carry that run */
const LATIN_RE = /[A-Za-z0-9]/

type RunOptions = {
  bold?: boolean
  fontSize?: number
  alignment?: Alignment
}

const ar = (text: string, options?: RunOptions): Content => ({
  text,
  font: "Cairo",
  ...options,
})

const en = (text: string, options?: RunOptions): Content => ({
  text,
  font: "CairoLatin",
  ...options,
})

/** customer-entered data: pick the subset by what the value actually contains */
function value(raw: string | null | undefined, options?: RunOptions): Content {
  const clean = (raw ?? "").trim()
  if (!clean) {
    return ar("—", options)
  }
  return LATIN_RE.test(clean) ? en(clean, options) : ar(clean, options)
}

/** an amount, Arabic-style: the currency sits left of the number */
function amount(v: number, options?: RunOptions): Content {
  return {
    text: [
      { text: "د.إ ", font: "Cairo" },
      { text: v.toFixed(2), font: "CairoLatin", ...options },
    ],
  }
}

/** a right-to-left line: the value first, its Arabic label after it */
function field(
  label: string,
  content: Content,
  options?: RunOptions
): Content {
  return {
    text: [content, { text: ` ${label}`, font: "Cairo", bold: true }],
    alignment: "right",
    fontSize: 10,
    ...options,
  }
}

export type TopexInvoiceOrder = {
  id: string
  display_id: number
  created_at: string | null
  currency_code: string
  subtotal: number
  shipping_total: number
  total: number
  shipping_address: {
    first_name?: string | null
    last_name?: string | null
    phone?: string | null
    address_1?: string | null
    city?: string | null
    province?: string | null
  } | null
  items: Array<{
    title: string
    quantity: number
    unit_price: number
  }>
}

export async function loadTopexInvoiceOrder(
  container: MedusaContainer,
  orderId: string
): Promise<TopexInvoiceOrder | null> {
  const order = await retrieveOrder(container, orderId)
  if (!order) {
    return null
  }

  return {
    id: order.id,
    display_id: order.display_id,
    created_at: order.created_at ?? null,
    currency_code: order.currency_code,
    subtotal: Number(order.subtotal ?? 0),
    shipping_total: Number(order.shipping_total ?? 0),
    total: Number(order.total ?? 0),
    shipping_address: order.shipping_address ?? null,
    items: (order.items ?? []).map((item: any) => ({
      title: item.title ?? "",
      quantity: Number(item.quantity ?? 1),
      unit_price: Number(item.unit_price ?? 0),
    })),
  }
}

const PICKUP_ADDRESS =
  process.env.TOPEX_PICKUP_ADDRESS ?? "دبي — الإمارات العربية المتحدة"

const STORE_TRN = process.env.STORE_TRN?.trim()

function buildDocument(order: TopexInvoiceOrder): TDocumentDefinitions {
  const address = order.shipping_address ?? {}
  const customerName = [address.first_name, address.last_name]
    .filter(Boolean)
    .join(" ")
  const date = order.created_at
    ? new Date(order.created_at).toISOString().slice(0, 10)
    : "—"

  /* ===== the mandatory delivery block ===== */
  const deliveryLines: Content[] = [
    field("الاسم:", value(customerName)),
    field("الهاتف:", value(address.phone)),
    field("الإمارة:", value(address.province)),
    field("المنطقة:", value(address.city)),
    field("العنوان:", value(address.address_1)),
  ]

  /* ===== the pieces table, right-to-left: product rightmost ===== */
  const itemsHeader: TableCell[] = [
    ar("السعر", { bold: true, alignment: "right" }),
    ar("الكمية", { bold: true, alignment: "center" }),
    ar("المنتج", { bold: true, alignment: "right" }),
  ]

  const itemsRows: TableCell[][] = order.items.map((item) => [
    amount(item.unit_price, { alignment: "right" }),
    en(String(item.quantity), { alignment: "center" }),
    value(item.title, { alignment: "right" }),
  ])

  /* ===== the totals: the amount including delivery closes the sheet ===== */
  const totalsLines: Content[] = [
    field("المجموع الفرعي:", amount(order.subtotal)),
    field("رسوم التوصيل:", amount(order.shipping_total)),
    field("الإجمالي شامل التوصيل:", amount(order.total), {
      bold: true,
      fontSize: 12,
    }),
  ]

  const content: Content[] = [
    /* ===== the header: courier title right, merchant block left ===== */
    {
      columns: [
        {
          width: "*",
          alignment: "left",
          stack: [
            en("3WEEQ", { bold: true, fontSize: 18 }),
            ar("ثري ويك", { fontSize: 10 }),
            ...(STORE_TRN
              ? [
                  {
                    text: [
                      { text: "الرقم الضريبي: ", font: "Cairo" },
                      { text: STORE_TRN, font: "CairoLatin" },
                    ],
                    fontSize: 9,
                  } as Content,
                ]
              : []),
            value(PICKUP_ADDRESS, { fontSize: 9 }),
          ],
        },
        {
          width: "*",
          alignment: "right",
          stack: [
            ar("فاتورة توصيل — توبكس", { bold: true, fontSize: 17 }),
            {
              text: [
                { text: String(order.display_id), font: "CairoLatin" },
                { text: " رقم الفاتورة: ", font: "Cairo" },
              ],
              alignment: "right",
              fontSize: 10,
            },
            {
              text: [
                { text: date, font: "CairoLatin" },
                { text: " التاريخ: ", font: "Cairo" },
              ],
              alignment: "right",
              fontSize: 10,
            },
          ],
        },
      ],
      margin: [0, 0, 0, 12],
    },

    /* ===== delivery details ===== */
    ar("بيانات التوصيل", { bold: true, fontSize: 12 }),
    {
      stack: deliveryLines,
      margin: [0, 4, 0, 10],
    },

    /* ===== the pieces ===== */
    ar("المنتجات", { bold: true, fontSize: 12 }),
    {
      table: {
        widths: ["28%", "18%", "*"],
        headerRows: 1,
        body: [itemsHeader, ...itemsRows],
      },
      layout: {
        hLineColor: () => "#d8d5cd",
        vLineColor: () => "#d8d5cd",
        hLineWidth: () => 0.6,
        vLineWidth: () => 0.6,
        paddingTop: () => 5,
        paddingBottom: () => 5,
      },
      margin: [0, 4, 0, 10],
    },

    /* ===== totals ===== */
    {
      stack: totalsLines,
      margin: [0, 0, 0, 12],
    },

    /* ===== terms and the AWB slot ===== */
    {
      stack: [
        ar("حالة الدفع: مدفوع إلكترونياً — بدون دفع عند الاستلام", {
          fontSize: 10,
        }),
        ar("نوع الشحنة: غير قابلة للتلف — عطور", { fontSize: 10 }),
        ar("رقم التتبع: ______________________", { fontSize: 10 }),
        ar("الاستلام قبل السادسة مساءً في نفس اليوم، وبعدها في اليوم التالي.", {
          fontSize: 9,
        }),
      ],
      margin: [0, 0, 0, 14],
    },

    /* ===== the footer ===== */
    ar(
      "التواصل عبر المجموعة الرسمية فقط — الشركة غير مسؤولة عن أي تواصل مباشر مع المندوب.",
      { fontSize: 8, alignment: "center" }
    ),
  ]

  return {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
    info: {
      title: `فاتورة توصيل توبكس #${order.display_id}`,
      author: "3WEEQ",
    },
    defaultStyle: {
      font: "Cairo",
      fontSize: 10,
      alignment: "right",
      lineHeight: 1.35,
      color: "#0a1628",
    },
    content,
  }
}

export async function buildTopexInvoice(
  container: MedusaContainer,
  orderId: string
): Promise<{ buffer: Buffer; order: TopexInvoiceOrder } | null> {
  const order = await loadTopexInvoiceOrder(container, orderId)
  if (!order) {
    return null
  }

  const printer = new PdfPrinter(fonts)
  const doc = printer.createPdfKitDocument(buildDocument(order))

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)
    doc.end()
  })

  return { buffer, order }
}

/** fonts must exist on disk before the first invoice is built */
export function topexInvoiceFontsReady() {
  return Object.values(fonts)
    .flatMap((pair) => [pair.normal, pair.bold])
    .every((file) => fs.existsSync(file))
}
