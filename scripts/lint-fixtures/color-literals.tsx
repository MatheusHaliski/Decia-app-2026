// Fixture NEGATIVA do lint de cor (D-11/D-33): este arquivo DEVE falhar no ESLint com 5 erros de no-restricted-syntax
// (cor literal em style, template em style, classe Tailwind de cor fixa em className literal e template, e em cn()).
// Fica fora do `npm run lint` (--ignore-pattern) e é exercitado por forbidden-elements.lint.test.ts.
const cn = (...p: string[]) => p.join(" ");
const tone = "x";
export function ColorLiterals() {
  return (
    <div style={{ color: "#ff0000" }}>
      <span style={{ background: `rgb(1, 2, 3) ${tone}` }}>a</span>
      <span className="bg-red-500 p-2">b</span>
      <span className={`text-white ${tone}`}>c</span>
      <span className={cn("p-1", "border-slate-200")}>d</span>
      <span className="bg-ws-accent text-ws-on-accent border-ws-border">ok</span>
    </div>
  );
}
