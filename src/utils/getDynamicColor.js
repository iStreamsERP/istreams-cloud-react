export function getDynamicColor(status) {
    if (status < 20) {
        return "#ef4444"; // Red for less than 50%
    } else if (status >= 20 && status <= 80) {
        return "#f59e0b"; // Amber for 50-99%
    } else {
        return "#10b981"; // Green for 100% and above
    }
}
