import type { Faq, FaqCategoryId } from "./faq-data";

export function normalizeFaqText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function filterFaqs(
  faqs: Faq[],
  query: string,
  category: FaqCategoryId | "todas",
): Faq[] {
  const q = normalizeFaqText(query.trim());
  return faqs.filter((faq) => {
    if (category !== "todas" && faq.category !== category) return false;
    if (!q) return true;
    const haystack = normalizeFaqText(
      `${faq.question} ${faq.answer} ${faq.keywords.join(" ")}`,
    );
    return q.split(/\s+/).every((token) => haystack.includes(token));
  });
}
