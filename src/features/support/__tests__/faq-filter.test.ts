import { describe, expect, it } from "vitest";
import { FAQS } from "../faq-data";
import { filterFaqs, normalizeFaqText } from "../faq-filter";

describe("normalizeFaqText", () => {
  it("ignora mayúsculas y tildes", () => {
    expect(normalizeFaqText("Programación")).toBe("programacion");
  });
});

describe("filterFaqs", () => {
  it("devuelve todo con consulta vacía y categoría Todas", () => {
    expect(filterFaqs(FAQS, "", "todas")).toHaveLength(FAQS.length);
  });

  it("filtra por categoría", () => {
    const result = filterFaqs(FAQS, "", "equipos");
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((faq) => faq.category === "equipos")).toBe(true);
  });

  it("encuentra por pregunta sin tildes", () => {
    const result = filterFaqs(FAQS, "programacion", "todas");
    expect(result.some((faq) => faq.id === "generar-jornada")).toBe(true);
  });

  it("encuentra por respuesta y palabras clave", () => {
    expect(filterFaqs(FAQS, "whatsapp", "todas").length).toBe(0);
    expect(
      filterFaqs(FAQS, "arbitro", "todas").some((faq) => faq.id === "arbitro"),
    ).toBe(true);
  });

  it("combina categoría y texto", () => {
    const result = filterFaqs(FAQS, "qr", "equipos");
    expect(result.every((faq) => faq.category === "equipos")).toBe(true);
  });

  it("devuelve vacío sin coincidencias", () => {
    expect(filterFaqs(FAQS, "zzzqqq", "todas")).toHaveLength(0);
  });

  it("mantiene orden estable e ids únicos", () => {
    const ids = FAQS.map((faq) => faq.id);
    expect(new Set(ids).size).toBe(ids.length);
    const filtered = filterFaqs(FAQS, "", "todas");
    expect(filtered.map((faq) => faq.id)).toEqual(ids);
  });
});
