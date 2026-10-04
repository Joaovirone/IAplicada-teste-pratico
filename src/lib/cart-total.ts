export type CartItem = { quantidade: number; preco_unitario: number };

export function calculateCartTotal(items: readonly CartItem[]): number {
  const cents = items.reduce((sum, item) => {
    if (!Number.isInteger(item.quantidade) || item.quantidade < 1 || !Number.isFinite(item.preco_unitario) || item.preco_unitario < 0) {
      throw new Error("Item do carrinho inválido.");
    }
    return sum + item.quantidade * Math.round(item.preco_unitario * 100);
  }, 0);
  if (!Number.isSafeInteger(cents)) throw new Error("Total do carrinho excede o limite seguro.");
  return cents / 100;
}
