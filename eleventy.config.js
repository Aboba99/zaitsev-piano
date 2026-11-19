import Image from "@11ty/eleventy-img";
import path from "node:path";
import fs from "node:fs";

const escapeHtml = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export default function (eleventyConfig) {
  // Статика как есть
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/img/*.svg");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy({ "src/_headers": "_headers" });
  eleventyConfig.addPassthroughCopy("src/robots.txt");
  eleventyConfig.addPassthroughCopy("src/sitemap.xml");

  // Пианино из админки: src/pianos/*.md
  eleventyConfig.addCollection("pianos", (api) =>
    api
      .getFilteredByGlob("src/pianos/*.md")
      .sort((a, b) => (a.data.order ?? 999) - (b.data.order ?? 999) || (a.data.price ?? 0) - (b.data.price ?? 0))
  );

  // 45000 -> «45 000 ₽» (неразрывные пробелы, чтобы цена не рвалась)
  eleventyConfig.addFilter("rub", (n) => {
    if (n === undefined || n === null || n === "") return "";
    return Number(n).toLocaleString("ru-RU").replace(/\s/g, " ") + " ₽";
  });

  // «+7 (912) 345-67-89» -> «79123456789» для tel: и wa.me
  eleventyConfig.addFilter("digits", (s = "") => String(s).replace(/\D/g, "").replace(/^8(\d{10})$/, "7$1"));

  // Фото из админки: сжимаем до webp/jpeg нескольких размеров. Нет фото — подписанная рамка.
  eleventyConfig.addAsyncShortcode("photo", async (src, alt, placeholder = "Фото", tall = false) => {
    const frameCls = tall ? "photo__frame photo__frame--tall" : "photo__frame";
    if (!src) return `<div class="${frameCls}">${escapeHtml(placeholder)}</div>`;
    const input = path.join("src", src.replace(/^\//, ""));
    if (!fs.existsSync(input)) return `<div class="${frameCls}">${escapeHtml(placeholder)}</div>`;
    const meta = await Image(input, {
      widths: [480, 960, 1440],
      formats: ["webp", "jpeg"],
      outputDir: "_site/img/opt/",
      urlPath: "/img/opt/",
    });
    return Image.generateHTML(meta, {
      alt: alt || "",
      sizes: "(max-width: 760px) 100vw, 480px",
      loading: "lazy",
      decoding: "async",
      class: tall ? "photo__img photo__img--tall" : "photo__img",
    });
  });

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["njk", "md"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
}
