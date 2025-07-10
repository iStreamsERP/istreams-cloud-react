export function formatPrice(
    value,
    { locale = navigator.language, currency = "INR", minimumFractionDigits = 2 } = {}
) {
    // ensure it’s a number
    const amount = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(amount)) return "–";

    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits,
    }).format(amount);
}
