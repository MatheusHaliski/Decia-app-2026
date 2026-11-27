/**
 * Caminho SÍNCRONO dos catálogos: registra en e es já carregados (import estático). Só para testes (test-utils/setup.ts), SSR
 * que precise renderizar outro idioma e scripts Node — NUNCA importe em componente do app, ou os ~380 KB gzip de en+es voltam
 * para o bundle de todas as rotas (lib/i18n/loader.ts carrega sob demanda).
 */
import en from "./messages/en.json";
import es from "./messages/es.json";
import { registerCatalog, type Catalog } from "./loader";

registerCatalog("en", en as Catalog);
registerCatalog("es", es as Catalog);
