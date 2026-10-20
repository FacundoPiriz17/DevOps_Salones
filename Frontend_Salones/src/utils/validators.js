export function isValidCI(value) {
    return typeof value === "string" && /^\d{8}$/.test(value.trim());
}

export function isValidEmail(value) {
    if (typeof value !== "string") return false;
    const v = value.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}