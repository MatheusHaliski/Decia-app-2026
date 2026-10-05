// Fixture NEGATIVA do lint do design system (D-11): este arquivo DEVE falhar no ESLint com 6 erros de
// no-restricted-syntax (um por elemento). Fica fora do `npm run lint` (--ignore-pattern) e é exercitado por
// forbidden-elements.lint.test.ts. Se alguém afrouxar a regra, o teste quebra.
export function Forbidden() {
  return (
    <form>
      <a href="/x">link solto</a>
      <button type="button">botão solto</button>
      <input type="text" />
      <select>
        <option>1</option>
      </select>
      <dialog open>diálogo solto</dialog>
      <progress value={1} max={2} />
    </form>
  );
}
