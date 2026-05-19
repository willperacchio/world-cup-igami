import { defineRouting } from "next-intl/routing";
import { locales } from "./locales";

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale: "en",
});
