/** @jsxImportSource react */
import { useWireField } from 'wire-bridge/react';
import { reportWriteFailure } from '../../poc/write.js';
import { kr } from '../pricing.js';

/**
 * What the "Add item" picker offers. The catalog is demo data; PHP prices
 * whatever ends up in `items`.
 */
const CATALOG = [
    { id: 'mouse', name: 'Wireless mouse', price: 499 },
    { id: 'stand', name: 'Monitor stand', price: 899 },
    { id: 'webcam', name: '4K webcam', price: 1190 },
];

/**
 * @param {{ bridge: import('wire-bridge').WireBridge }} props
 */
export function LineItems({ bridge }) {
    const [items, setItems] = useWireField(bridge, 'items');
    const list = Array.isArray(items) ? items : [];

    // Snapshots are frozen, so every edit builds a new array and writes it back.
    const write = (next) => reportWriteFailure(setItems(next));

    const changeQty = (id, delta) =>
        write(list.map((item) => (item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item)));

    const remove = (id) => write(list.filter((item) => item.id !== id));

    const add = (id) => {
        const product = CATALOG.find((candidate) => candidate.id === id);

        if (product === undefined) {
            return;
        }

        const existing = list.find((item) => item.id === id);

        write(
            existing === undefined
                ? [...list, { ...product, qty: 1 }]
                : list.map((item) => (item.id === id ? { ...item, qty: item.qty + 1 } : item)),
        );
    };

    return (
        <div className="line-items" data-testid="order-items">
            {list.length === 0 && <p className="muted">No items yet.</p>}

            {list.map((item) => (
                <div className="line-item" key={item.id} data-testid={`item-${item.id}`}>
                    <div className="line-item-name">
                        <strong>{item.name}</strong>
                        <span className="muted">{kr(item.price)}</span>
                    </div>

                    <div className="stepper">
                        <button type="button" aria-label={`Fewer ${item.name}`} onClick={() => changeQty(item.id, -1)}>
                            −
                        </button>
                        <span data-testid={`qty-${item.id}`}>{item.qty}</span>
                        <button
                            type="button"
                            aria-label={`More ${item.name}`}
                            data-testid={`more-${item.id}`}
                            onClick={() => changeQty(item.id, 1)}
                        >
                            +
                        </button>
                    </div>

                    <span className="line-item-total">{kr(item.price * item.qty)}</span>

                    <button
                        type="button"
                        className="link-button"
                        aria-label={`Remove ${item.name}`}
                        onClick={() => remove(item.id)}
                    >
                        ✕
                    </button>
                </div>
            ))}

            <select
                className="add-item"
                data-testid="add-item"
                value=""
                onChange={(event) => add(event.currentTarget.value)}
            >
                <option value="">+ Add item…</option>
                {CATALOG.map((product) => (
                    <option key={product.id} value={product.id}>
                        {product.name} — {kr(product.price)}
                    </option>
                ))}
            </select>
        </div>
    );
}
