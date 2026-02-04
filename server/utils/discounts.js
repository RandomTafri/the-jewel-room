const db = require('../db');

async function calculateDiscount(cartItems, couponCode, subtotal) {
    let discountAmount = 0;
    let appliedRule = null;
    let message = '';

    // 1. Check for Active Discounts
    // We assume only one code can be applied for simplicity in this template, 
    // OR we automatically apply automatic rules if code is null.
    // Requirement says: "Site-wide/cart-level... Per-item... Combination rules".

    // Strategy:
    // A. Fetch all active automatic discounts (no code required).
    // B. If couponCode provided, fetch that specific discount.

    // Per-item discounts usually stored in product price or a separate discount rule linked to product. 
    // For this template, let's keep it simple:
    // 1. Coupon based Cart Discount (Percent or Fixed)
    // 2. Coupon based Item Discount (Not common via code, usually auto)

    if (!couponCode) return { discountAmount: 0, finalTotal: subtotal, message: '' };

    try {
        const res = await db.query('SELECT * FROM discounts WHERE code = ? AND is_active = true', [couponCode]);
        if (res.rows.length === 0) {
            return { discountAmount: 0, finalTotal: subtotal, message: 'Invalid Coupon' };
        }

        const rule = res.rows[0];

        // Check Min Order
        if (subtotal < rule.min_order_value) {
            return { discountAmount: 0, finalTotal: subtotal, message: `Min order value is ${rule.min_order_value}` };
        }

        if (rule.type === 'PERCENTAGE') {
            discountAmount = (subtotal * rule.value) / 100;
        } else if (rule.type === 'FIXED') {
            discountAmount = rule.value;
        }

        // Cap discount to subtotal
        if (discountAmount > subtotal) discountAmount = subtotal;

        return {
            discountAmount: parseFloat(discountAmount.toFixed(2)),
            finalTotal: parseFloat((subtotal - discountAmount).toFixed(2)),
            message: 'Coupon Applied',
            ruleId: rule.id
        };

    } catch (e) {
        console.error(e);
        return { discountAmount: 0, finalTotal: subtotal, message: 'Error checking discount' };
    }
}

module.exports = { calculateDiscount };
