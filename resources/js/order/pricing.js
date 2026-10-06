/**
 * Client-side pricing, shared by the Vue totals and the Lit badge. It mirrors
 * `OrderBuilder::totals()` in PHP: the islands show live numbers while you
 * edit, and PHP renders its own once a request reaches it.
 *
 * @param {any} order the whole `data` root snapshot
 * @returns {{ items: number, subtotal: number, discount: number, shipping: number, total: number }}
 */
export function totals(order) {
    const items = Array.isArray(order?.items) ? order.items : [];
    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const discount = Math.round((subtotal * (order?.coupon?.percentOff ?? 0)) / 100);
    const shipping = order?.shippingRates?.[order?.delivery] ?? 0;

    return {
        items: items.reduce((sum, item) => sum + item.qty, 0),
        subtotal,
        discount,
        shipping,
        total: subtotal - discount + shipping,
    };
}

const formatter = new Intl.NumberFormat('nb-NO');

/**
 * @param {number} amount whole kroner
 */
export function kr(amount) {
    return `${formatter.format(amount)} kr`;
}
